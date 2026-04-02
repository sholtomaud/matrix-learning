export class PromptView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    private async copyPrompt() {
        const prompt = this.shadowRoot?.getElementById('prompt-pre')?.textContent;
        if (prompt) {
            await navigator.clipboard.writeText(prompt);
            const btn = this.shadowRoot?.getElementById('copy-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 1500);
            }
        }
    }

    render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; flex: 1; overflow-y: auto; padding: 20px 24px; }
            h2 { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; font-size: 19px; margin-bottom: 6px; }
            p { font-size: 11px; color: var(--text-dim); margin-bottom: 14px; line-height: 1.75; max-width: 680px; }
            pre { background: var(--surface2); border: 1px solid var(--border); padding: 16px; font-size: 10.5px; line-height: 1.7; color: var(--text-dim); white-space: pre-wrap; max-width: 780px; }
            .btn {
                background: none; border: 1px solid var(--border2); color: var(--text-dim);
                font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.07em;
                text-transform: uppercase; padding: 6px 12px; cursor: pointer;
                transition: all 0.12s; margin-top: 10px;
            }
            .btn:hover { background: var(--surface2); color: var(--text); }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        const PROMPT_TEXT = `You are an expert in knowledge structure analysis and formal logic.
Extract a conceptual matrix from the text below using FOUR PASSES.

━━━ SOURCE TEXT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[PASTE SOURCE TEXT HERE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ PASS 1: EXTRACTION ━━━━━━━━━━━━━━━━━━━━━━━━━
List every distinct claim the text establishes.
Format: N. [proposition] | source: "[brief quote]"

━━━ PASS 2: RELATION MAPPING ━━━━━━━━━━━━━━━━━━━
Identify relations (assoc, disc, dep, gap) between propositions.
Focus on the logical dependency (j requires i to be true/understood).

━━━ PASS 3: GAP IDENTIFICATION ━━━━━━━━━━━━━━━━━
Scan the sequence. Where does the author make a "leap"?
Identify "Non-Sequiturs" where Proposition N does not lead to N+1.
Flag these as "Logical Breaks."

━━━ PASS 4: SYNTHETIC BRIDGE (ENTHYMEMES) ━━━━━━
For every Logical Break identified in Pass 3:
1. Synthesize a "Bridging Proposition" (Enthymeme).
2. This must be the unstated premise required to make the jump logical.
3. Mark these clearly as [SYNTHETIC].

━━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Emit ONLY valid JSON. Ensure synthetic propositions have "llmGenerated": true.

{
  "title": "...",
  "genre": "expository",
  "propositions": [
    {"id":1, "text":"...", "llmGenerated": false},
    {"id":2, "text":"[The synthesized bridge]", "llmGenerated": true}
  ],
  "relations": [
    {"from":1, "to":2, "type":"dep", "justification":"Required enthymeme to bridge the gap...", "llmGenerated": true}
  ]
}`;

        this.shadowRoot!.innerHTML = `
            <h2>LLM Extraction Prompt (3-pass)</h2>
            <p>Copy this into any LLM (Claude, GPT-4, Gemini). The three-pass structure forces justification before JSON emission. Paste your source text where indicated.</p>
            <pre id="prompt-pre">${PROMPT_TEXT}</pre>
            <button class="btn" id="copy-btn">Copy Prompt</button>
        `;

        this.shadowRoot!.getElementById('copy-btn')?.addEventListener('click', () => this.copyPrompt());
    }
}
customElements.define('matrix-prompt-view', PromptView);
