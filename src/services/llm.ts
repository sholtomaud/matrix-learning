/**
 * @service LLMService
 * @description Provider-agnostic LLM client supporting Anthropic, Gemini, and Local (llama.cpp)
 */
export class LLMService {
    constructor() {}

    /**
     * Main entry point for completions.
     * @param {string} provider - anthropic | gemini | local
     * @param {string} key - API Key (can be empty for local)
     * @param {string} system - The system prompt
     * @param {string} user - The user prompt
     * @param {function} onChunk - Optional callback for streaming
     * @param {object} schema - Optional JSON Schema for structured outputs
     * @param {string} baseUrl - Base URL for local provider
     * @param {string} model - Model identifier for local provider
     */
    async complete(
        provider: string,
        key: string,
        system: string,
        user: string,
        onChunk?: (chunk: string, fullText: string) => void,
        schema: any = null,
        baseUrl: string = "http://localhost:8080",
        model: string = "local"
    ): Promise<string> {
        if (provider === 'local') {
            return this._local(baseUrl, model, key, system, user, onChunk, schema);
        } else if (provider === 'anthropic') {
            return this._anthropic(key, system, user, onChunk);
        } else if (provider === 'gemini') {
            return this._gemini(key, system, user, onChunk, schema);
        } else {
            throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async _local(
        baseUrl: string,
        model: string,
        key: string,
        system: string,
        user: string,
        onChunk?: (chunk: string, fullText: string) => void,
        schema?: any
    ): Promise<string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (key) headers["Authorization"] = `Bearer ${key}`;

        const schemaInstruction = schema
            ? `\nYou MUST respond with a single valid JSON object matching this exact schema (no markdown, no commentary):\n${JSON.stringify(schema, null, 2)}`
            : "";

        const body = {
            model: model,
            messages: [
                { role: "system", content: system.trim() + schemaInstruction },
                { role: "user",   content: user },
            ],
            response_format: schema ? { type: "json_object" } : undefined,
            temperature: schema ? 0.1 : 0.7,
            stream: !!onChunk
        };

        const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
        const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

        if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            throw new Error(`Local LLM returned ${resp.status}: ${text.substring(0, 300)}`);
        }

        if (!onChunk) {
            const data = await resp.json();
            return data.choices[0].message.content;
        }

        // Handle Streaming
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const raw = line.slice(5).trim();
                if (raw === '[DONE]') continue;
                try {
                    const data = JSON.parse(raw);
                    const text = data.choices[0].delta?.content || "";
                    if (text) {
                        fullText += text;
                        onChunk(text, fullText);
                    }
                } catch (e) {}
            }
        }
        return fullText;
    }

    private async _gemini(key: string, system: string, user: string, onChunk?: (chunk: string, fullText: string) => void, schema?: any): Promise<string> {
        const modelName = "gemini-1.5-flash"; // updated from the older one in inspiration
        const isStreaming = !!onChunk && !schema;
        const endpoint = isStreaming ? 'streamGenerateContent?alt=sse' : 'generateContent';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${endpoint}`;

        const payload: any = {
            contents: [{
                role: "user",
                parts: [{ text: user }]
            }],
            systemInstruction: {
                parts: [{ text: system }]
            },
            generationConfig: {
                temperature: schema ? 0.1 : 0.7,
                maxOutputTokens: 4096
            }
        };

        if (schema) {
            payload.generationConfig.responseMimeType = "application/json";
            payload.generationConfig.responseJsonSchema = schema;
        }

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
            throw new Error(errData.error?.message || `Gemini Error: ${resp.status}`);
        }

        if (!isStreaming) {
            const data = await resp.json();
            return data.candidates[0].content.parts[0].text;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                try {
                    const data = JSON.parse(line.slice(5));
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (text) {
                        fullText += text;
                        onChunk!(text, fullText);
                    }
                } catch (e) {}
            }
        }
        return fullText;
    }

    private async _anthropic(key: string, system: string, user: string, onChunk?: (chunk: string, fullText: string) => void): Promise<string> {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 4096,
                stream: !!onChunk,
                system: system,
                messages: [{ role: 'user', content: user }]
            })
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
            throw new Error(errData.error?.message || `Anthropic Error: ${resp.status}`);
        }

        if (!onChunk) {
            const data = await resp.json();
            return data.content.map((b: any) => b.text || '').join('');
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value).split('\n');
            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const raw = line.slice(5).trim();
                if (raw === '[DONE]') continue;

                try {
                    const ev = JSON.parse(raw);
                    if (ev.type === 'content_block_delta' && ev.delta?.text) {
                        fullText += ev.delta.text;
                        onChunk(ev.delta.text, fullText);
                    }
                } catch (e) {}
            }
        }
        return fullText;
    }
}
