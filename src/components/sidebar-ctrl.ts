import { stateManager } from '../state';
import { Optimizer } from '../services/optimizer';

export class MatrixSidebar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        stateManager.subscribe(() => this.updateUI());
    }

    private updateUI() {
        const state = stateManager.getState();
        const runBtn = this.shadowRoot?.getElementById('btn-optimise') as HTMLButtonElement;
        const stopBtn = this.shadowRoot?.getElementById('btn-stop') as HTMLButtonElement;

        if (runBtn) runBtn.disabled = state.isLoopRunning || !state.currentData;
        if (stopBtn) stopBtn.disabled = !state.isLoopRunning;

        this.renderScores();
    }

    private renderScores() {
        const state = stateManager.getState();
        const panel = this.shadowRoot?.getElementById('scores-panel');
        if (!panel) return;

        if (!state.currentData) {
            panel.innerHTML = `<div style="color:var(--text-muted);font-size:10px;font-style:italic">Load a matrix to begin.</div>`;
            return;
        }

        const sc = Optimizer.score(state.currentData);
        const sp = state.proposedData ? Optimizer.score(state.proposedData) : null;
        const genre = state.currentData.genre || 'expository';

        const bar = (label: string, val: number, color: string, target: number, val2?: number) => {
            const pct = Math.round(val * 100);
            const pct2 = val2 !== undefined ? Math.round(val2 * 100) : null;
            const tpct = Math.round((target || 0) * 100);
            return `<div class="score-row">
                <div class="score-label">${label}</div>
                <div class="score-bar-wrap" title="Target: ${tpct}%">
                    <div class="score-bar" style="width:${pct}%;background:${color}"></div>
                </div>
                <div class="score-val">${pct}%${pct2 !== null ? ` → <span style="color:var(--fixed)">${pct2}%</span>` : ''}
                </div>
            </div>`;
        };

        let html = `<div class="sec-head">Scores — ${genre}</div>
            ${bar('Diag. tightness', sc.tightness, 'var(--assoc)', sc.targets.tightness, sp?.tightness)}
            ${bar('Cluster density', sc.clusterDensity, 'var(--dep)', sc.targets.cluster_density, sp?.clusterDensity)}
            ${bar('Justification', sc.justCov, 'var(--gap)', 1, sp?.justCov)}
            ${bar('Genre fit', sc.genreFit, 'var(--text)', 1, sp?.genreFit)}
        `;

        if (sc.breaks.length) {
            html += `<div class="sec-head">Breaks (${sc.breaks.length})</div>`;
            for (const b of sc.breaks) {
                html += `<div class="gap-item"><div class="gap-ids">${b.fromId}→${b.toId}</div>${b.fromText.slice(0, 55)}…</div>`;
            }
        } else {
            html += `<div class="sec-head" style="color:var(--fixed)">✓ No diagonal breaks</div>`;
        }

        panel.innerHTML = html;
    }

    private handleParse() {
        const jsonInput = this.shadowRoot?.getElementById('json-input') as HTMLTextAreaElement;
        const errMsg = this.shadowRoot?.getElementById('err-msg');
        if (!jsonInput || !errMsg) return;

        try {
            const data = JSON.parse(jsonInput.value);
            stateManager.setState({ currentData: data, proposedData: null, logLines: [] });
            stateManager.log("Matrix loaded and rendered.");
            errMsg.textContent = "";
        } catch (e: any) {
            errMsg.textContent = "✗ " + e.message;
        }
    }

    private loadExample() {
        const EXAMPLE = {
            title: "Ohm's Law — Rules 1–12",
            source: "Leith, G. (1967). What Is Programmed Learning? BBC Publications.",
            genre: "expository",
            propositions: [
                { id: 1, text: "An electric charge is produced by friction.", position: 0.02 },
                { id: 2, text: "The electron is the basic unit of charge.", position: 0.05 },
                { id: 3, text: "The electron is an impractical unit of charge.", position: 0.08 },
                { id: 4, text: "The coulomb is the practical unit of charge.", position: 0.11 },
                { id: 5, text: "Current is a flow of charge.", position: 0.20 },
                { id: 6, text: "Current is measured in coulombs per second.", position: 0.24 },
                { id: 7, text: "One coulomb per second is called an ampere.", position: 0.27 },
                { id: 8, text: "When current flows, work is done.", position: 0.35 },
                { id: 9, text: "Energy is used when work is done.", position: 0.38 },
                { id: 10, text: "Energy must be supplied for current to flow.", position: 0.42 },
                { id: 11, text: "EMF measures the rate at which energy is supplied.", position: 0.46 },
                { id: 12, text: "Energy is measured in joules.", position: 0.50 }
            ],
            relations: [
                { from: 1, to: 2, type: "assoc", justification: "Both establish the concept of electric charge." },
                { from: 1, to: 4, type: "assoc", justification: "Both concern defining charge." },
                { from: 2, to: 3, type: "assoc", justification: "Both address the electron as a unit." },
                { from: 2, to: 4, type: "disc", justification: "Electron vs coulomb: practical vs impractical unit." },
                { from: 3, to: 4, type: "disc", justification: "Direct contrast: impractical vs practical unit." },
                { from: 4, to: 5, type: "dep", justification: "Current as flow of charge requires prior definition of charge unit." },
                { from: 5, to: 6, type: "dep", justification: "Measuring current in coulombs/sec requires understanding current." },
                { from: 6, to: 7, type: "dep", justification: "Ampere is defined as one coulomb per second." },
                { from: 7, to: 8, type: "assoc", justification: "Current flow is associated with work being done." },
                { from: 8, to: 9, type: "dep", justification: "Energy use depends on understanding that work is done." },
                { from: 9, to: 10, type: "dep", justification: "Energy must be supplied follows from energy being used." },
                { from: 10, to: 11, type: "dep", justification: "EMF is defined in terms of energy supply rate." },
                { from: 9, to: 12, type: "assoc", justification: "Both concern energy; joules measure the energy in rule 9." },
                { from: 11, to: 12, type: "assoc", justification: "EMF rate is measured in units related to joules." },
                { from: 5, to: 8, type: "assoc", justification: "Current flow and work done are associated phenomena." },
                { from: 6, to: 9, type: "assoc", justification: "Rate of charge flow associated with rate of energy use." }
            ],
            clusters: [
                { label: "Charge", ids: [1, 2, 3, 4] },
                { label: "Current", ids: [5, 6, 7] },
                { label: "Energy & EMF", ids: [8, 9, 10, 11, 12] }
            ]
        };
        const jsonInput = this.shadowRoot?.getElementById('json-input') as HTMLTextAreaElement;
        if (jsonInput) {
            jsonInput.value = JSON.stringify(EXAMPLE, null, 2);
            this.handleParse();
        }
    }

    render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host {
                width: 272px;
                min-width: 272px;
                border-right: 1px solid var(--border);
                display: flex;
                flex-direction: column;
                background: var(--surface);
                overflow: hidden;
            }
            .sb-section { border-bottom: 1px solid var(--border); flex-shrink: 0; }
            .sb-label {
                padding: 7px 12px;
                font-size: 9px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--text-muted);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .sb-label button {
                background: none; border: 1px solid var(--border); color: var(--text-dim);
                font-family: 'DM Mono', monospace; font-size: 8.5px; padding: 2px 7px;
                cursor: pointer; transition: all 0.12s;
            }
            .sb-label button:hover { border-color: var(--assoc); color: var(--assoc); }
            textarea {
                background: var(--surface); border: none; color: var(--text);
                font-family: 'DM Mono', monospace; font-size: 10px; line-height: 1.6;
                padding: 10px 12px; resize: none; outline: none; width: 100%;
            }
            .api-row { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--border); align-items: center; }
            .api-row input, .api-row select {
                flex: 1; background: var(--surface2); border: 1px solid var(--border);
                color: var(--text); font-family: 'DM Mono', monospace; font-size: 10px;
                padding: 5px 8px; outline: none;
            }
            .btn-row { display: flex; gap: 5px; padding: 8px 12px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
            .btn {
                flex: 1; min-width: 60px; background: none; border: 1px solid var(--border2);
                color: var(--text-dim); font-family: 'DM Mono', monospace; font-size: 9px;
                letter-spacing: 0.07em; text-transform: uppercase; padding: 6px 4px;
                cursor: pointer; transition: all 0.12s; white-space: nowrap;
            }
            .btn:hover { background: var(--surface2); color: var(--text); }
            .btn:disabled { opacity: 0.35; cursor: not-allowed; }
            .btn.primary { border-color: var(--assoc); color: var(--assoc); }
            .btn.go { border-color: var(--fixed); color: var(--fixed); }
            .btn.danger { border-color: var(--brk); color: var(--brk); }
            .err { padding: 5px 12px; font-size: 9.5px; color: var(--disc); min-height: 20px; }
            .scores-panel { flex: 1; overflow-y: auto; padding: 10px 12px; }
            .score-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .score-label { font-size: 9.5px; color: var(--text-dim); flex: 1; }
            .score-bar-wrap { width: 80px; height: 5px; background: var(--surface3); border-radius: 3px; overflow: hidden; flex-shrink: 0; margin: 0 8px; }
            .score-bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
            .score-val { font-size: 9.5px; color: var(--text); min-width: 28px; text-align: right; }
            .sec-head { font-size: 8.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
            .gap-item { padding: 5px 7px; margin-bottom: 4px; background: var(--surface2); border-left: 2px solid var(--brk); font-size: 9.5px; line-height: 1.45; color: var(--text-dim); }
            .gap-ids { font-size: 8.5px; color: var(--brk); margin-bottom: 1px; }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        this.shadowRoot!.innerHTML = `
            <div class="sb-section">
                <div class="sb-label">JSON Input <button id="load-example">Example</button></div>
                <textarea id="json-input" style="height:160px" placeholder='Paste matrix JSON here...'></textarea>
            </div>
            <div class="sb-section">
                <div class="sb-label">Source Text</div>
                <textarea id="source-text" style="height:80px" placeholder='Paste original source text here...'></textarea>
            </div>
            <div class="api-row">
                <select id="api-provider">
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                    <option value="local">Local (llama.cpp)</option>
                </select>
                <input type="password" id="api-key" placeholder="API Key...">
            </div>
            <div class="btn-row">
                <button class="btn primary" id="btn-render">Render →</button>
                <button class="btn go" id="btn-optimise" disabled>▶ Run Loop</button>
                <button class="btn danger" id="btn-stop" disabled>■ Stop</button>
            </div>
            <div class="err" id="err-msg"></div>
            <div class="scores-panel" id="scores-panel">
                <div style="color:var(--text-muted);font-size:10px;font-style:italic">Load a matrix to begin.</div>
            </div>
        `;

        this.shadowRoot!.getElementById('load-example')?.addEventListener('click', () => this.loadExample());
        this.shadowRoot!.getElementById('btn-render')?.addEventListener('click', () => this.handleParse());
        this.shadowRoot!.getElementById('btn-optimise')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('run-loop', { bubbles: true, composed: true }));
        });
        this.shadowRoot!.getElementById('btn-stop')?.addEventListener('click', () => {
            stateManager.setState({ isLoopRunning: false });
        });
        this.shadowRoot!.getElementById('source-text')?.addEventListener('input', (e) => {
            stateManager.setState({ sourceText: (e.target as HTMLTextAreaElement).value });
        });
        this.shadowRoot!.getElementById('api-provider')?.addEventListener('change', (e) => {
            stateManager.setState({ apiProvider: (e.target as HTMLSelectElement).value });
        });
        this.shadowRoot!.getElementById('api-key')?.addEventListener('input', (e) => {
            stateManager.setState({ apiKey: (e.target as HTMLInputElement).value });
        });
    }
}
customElements.define('matrix-sidebar', MatrixSidebar);
