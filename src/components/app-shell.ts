import { stateManager } from '../state';
import { Optimizer } from '../services/optimizer';
import { LLMService } from '../services/llm';

export class AppShell extends HTMLElement {
    private llm = new LLMService();

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.addEventListener('run-loop', () => this.runLoop());
    }

    private async runLoop() {
        const state = stateManager.getState();
        if (!state.currentData) return;

        stateManager.setState({ isLoopRunning: true, logLines: [] });
        stateManager.log('▶ Loop started');
        stateManager.log(`Genre: ${state.currentData.genre} | n=${state.currentData.propositions.length} | relations=${state.currentData.relations.length}`);

        const optimizer = new Optimizer(state.currentData);
        let working = JSON.parse(JSON.stringify(state.currentData));

        // Phase 1: Optimization
        stateManager.log('Phase 1: Bandwidth optimisation (50 generations)');
        for (let gen = 0; gen < 50; gen++) {
            if (!stateManager.getState().isLoopRunning) {
                stateManager.log('■ Stopped by user');
                break;
            }
            working = optimizer.step();
            stateManager.setState({ proposedData: working });

            if (gen % 5 === 0 || gen === 49) {
                const obj = Optimizer.score(working);
                stateManager.log(`  gen ${gen}: bw=${obj.rc ? Math.round(obj.tightness * 100) : 0}% fit=${Math.round(obj.genreFit * 100)}% br=${obj.breaks.length}`);
                await new Promise(r => requestAnimationFrame(r));
            }
        }

        if (stateManager.getState().isLoopRunning) {
            const currentState = stateManager.getState();
            if (currentState.apiKey || currentState.apiProvider === 'local') {
                // Phase 2: LLM gap-filling
                stateManager.log('Phase 2: LLM gap-filling (Inference Mode)');
                const sc = Optimizer.score(working);
                if (sc.breaks.length > 0) {
                    try {
                        const suggestions = await this.llmBridgeGaps(working, sc.breaks);
                        for (const sug of suggestions) {
                            const newId = Math.max(...working.propositions.map((p: any) => p.id)) + 1;
                            const newProp = {
                                id: newId,
                                text: sug.text,
                                llmGenerated: true,
                                isSynthetic: !sug.foundInText,
                                justification: sug.justification
                            };
                            working.propositions.splice(sug.insertAfterIdx + 1, 0, newProp);

                            const prev = working.propositions[sug.insertAfterIdx];
                            const next = working.propositions[sug.insertAfterIdx + 2];
                            if (prev) working.relations.push({ from: prev.id, to: newId, type: 'dep', justification: "Bridge: " + sug.justification, llmGenerated: true });
                            if (next) working.relations.push({ from: newId, to: next.id, type: 'dep', justification: "Bridge completion", llmGenerated: true });

                            stateManager.log(`  ${sug.foundInText ? '✓ Extracted' : '✦ Synthesized'} bridge: "${sug.text.slice(0, 50)}..."`);
                        }
                        stateManager.setState({ proposedData: { ...working } });
                    } catch (e: any) {
                        stateManager.log(`  Phase 2 Error: ${e.message}`);
                    }
                }
            } else {
                stateManager.log('Phase 2/3: Skipped (No API Key)');
            }
        }

        stateManager.log('✓ Loop complete');
        stateManager.setState({ isLoopRunning: false });
    }

    private async llmBridgeGaps(data: any, breaks: any[]) {
        const state = stateManager.getState();
        const system = `You are a Logic Engineer. Analyze conceptual breaks. If a bridge is missing from the text, synthesize the required logical premise (Enthymeme).`;
        const user = `SOURCE: ${state.sourceText.slice(0, 4000)}
SEQUENCE: ${data.propositions.map((p: any) => `${p.id}. ${p.text}`).join('\n')}
FIX BREAKS: ${breaks.map(b => `${b.fromId} -> ${b.toId}`).join(', ')}`;

        const schema = {
            type: "object",
            properties: {
                bridges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            breakFrom: { type: "integer" },
                            breakTo: { type: "integer" },
                            text: { type: "string" },
                            foundInText: { type: "boolean" },
                            justification: { type: "string" },
                            insertAfterIdx: { type: "integer" },
                            position: { type: "number" }
                        },
                        required: ["breakFrom", "breakTo", "text", "foundInText", "justification", "insertAfterIdx", "position"]
                    }
                }
            },
            required: ["bridges"]
        };

        const raw = await this.llm.complete(state.apiProvider, state.apiKey, system, user, undefined, schema);
        const result = JSON.parse(raw);
        return result.bridges;
    }

    render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: 'DM Mono', monospace; }
            header {
                padding: 10px 16px; border-bottom: 1px solid var(--border);
                display: flex; align-items: center; gap: 12px; flex-shrink: 0;
            }
            header h1 { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 17px; font-weight: 400; letter-spacing: -0.02em; }
            .version { font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; background: var(--surface2); padding: 2px 6px; border-radius: 2px; }
            .tab-bar { margin-left: auto; display: flex; gap: 2px; }
            .tab {
                background: none; border: 1px solid var(--border); color: var(--text-dim);
                font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.07em;
                text-transform: uppercase; padding: 4px 12px; cursor: pointer; transition: all 0.12s;
                text-decoration: none;
            }
            .tab.active { background: var(--surface2); border-color: var(--border2); color: var(--text); }
            .tab:hover:not(.active) { border-color: var(--border2); color: var(--text-dim); }
            .main { display: flex; flex: 1; overflow: hidden; }
            .content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        this.shadowRoot!.innerHTML = `
            <header>
                <h1>Conceptual Matrix Mapper</h1>
                <span class="version">v3</span>
                <div class="tab-bar">
                    <a href="/" class="tab active" data-link>Matrix</a>
                    <a href="/schema" class="tab" data-link>Schema</a>
                    <a href="/prompt" class="tab" data-link>LLM Prompt</a>
                </div>
            </header>
            <div class="main">
                <matrix-sidebar></matrix-sidebar>
                <div class="content">
                    <matrix-router></matrix-router>
                    <matrix-bottom-drawer></matrix-bottom-drawer>
                </div>
            </div>
        `;

        this.shadowRoot!.querySelectorAll('[data-link]').forEach(link => {
            link.addEventListener('click', () => {
                this.shadowRoot!.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }
}
customElements.define('matrix-app-shell', AppShell);
