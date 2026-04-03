import { stateManager, AppState } from '../state';
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
        let lastData: any = null;
        stateManager.subscribe((state) => {
            if (state.currentData !== lastData) {
                lastData = state.currentData;
                this.updateStatusBar(state);
            }
        });
    }

    private async runLoop() {
        const state = stateManager.getState();
        if (!state.currentData) return;

        stateManager.setState({
            isLoopRunning: true,
            logLines: [],
            paretoFront: [],
            proposedText: '',
            isDrawerExpanded: true,
            activeDrawerTab: 'log'
        });
        stateManager.log('▶ Loop started');
        stateManager.log(`Genre: ${state.currentData.genre} | n=${state.currentData.propositions.length} | relations=${state.currentData.relations.length}`);

        const optimizer = new Optimizer(state.currentData);
        const relMap = Optimizer.buildRelMap(state.currentData);
        let working = JSON.parse(JSON.stringify(state.currentData));
        let paretoFront: any[] = [];

        // Phase 1: Optimization
        stateManager.log('Phase 1: Bandwidth optimisation (50 generations)');
        for (let gen = 0; gen < 50; gen++) {
            if (!stateManager.getState().isLoopRunning) {
                stateManager.log('■ Stopped by user');
                break;
            }
            working = optimizer.step();
            const obj = Optimizer.objectives(working.propositions, relMap, working.clusters);

            // Update Pareto front
            const dominated = paretoFront.some(p => Optimizer.dominates(p, obj));
            if (!dominated) {
                paretoFront = paretoFront.filter(p => !Optimizer.dominates(obj, p));
                paretoFront.push({ ...obj, gen, snapshot: JSON.parse(JSON.stringify(working.propositions)) });
                stateManager.setState({ paretoFront: [...paretoFront] });
            }

            if (gen % 5 === 0 || gen === 49) {
                stateManager.setState({ proposedData: { ...working } });
                stateManager.log(`  gen ${gen}: bw=${obj.bw} cd=${(obj.cd * 100).toFixed(0)}% br=${obj.br}`);
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

                // Phase 3: Prose regeneration
                if (currentState.sourceText) {
                    stateManager.log('Phase 3: Prose regeneration');
                    try {
                        await this.llmRegenerateProse(working, currentState.sourceText);
                        stateManager.log('  ✓ Prose regenerated — see Proposed Text tab');
                    } catch (e: any) {
                        stateManager.log(`  Phase 3 Error: ${e.message}`);
                    }
                } else {
                    stateManager.log('Phase 3: Skipped (No source text in sidebar)');
                }
            } else {
                stateManager.log('Phase 2/3: Skipped (No API Key)');
            }
        }

        stateManager.log('✓ Loop complete');
        stateManager.setState({ isLoopRunning: false });
    }

    private async llmRegenerateProse(data: any, sourceText: string) {
        const clusters = data.clusters || [{ label: "Full Text", ids: data.propositions.map((p: any) => p.id) }];
        stateManager.setState({ proposedText: '' });

        for (const cluster of clusters) {
            const clusterProps = data.propositions.filter((p: any) => cluster.ids.includes(p.id));
            const system = `You are an expert editor. Rewrite the section titled "${cluster.label}".
Maintain the 19-minute-read depth and nuance. Do not summarize.`;

            const user = `Context: ${sourceText.slice(0, 1000)}...
Target Propositions for this section:
${clusterProps.map((p: any) => `${p.id}: ${p.text}`).join('\n')}`;

            const state = stateManager.getState();
            await this.llm.complete(state.apiProvider, state.apiKey, system, user, (chunk) => {
                const currentText = stateManager.getState().proposedText;
                stateManager.setState({ proposedText: currentText + chunk });
            });

            const currentText = stateManager.getState().proposedText;
            stateManager.setState({ proposedText: currentText + "\n\n" });
        }
    }

    private updateStatusBar(state: AppState) {
        const bar = this.shadowRoot?.getElementById('status-bar');
        if (!bar) return;

        if (!state.currentData) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'flex';
        const data = state.currentData;
        const sc = Optimizer.score(data);
        const counts: any = {};
        for (const r of data.relations) counts[r.type] = (counts[r.type] || 0) + 1;

        bar.innerHTML = `
            <div class="stat"><span>n:</span><span class="stat-val">${data.propositions.length}</span></div>
            <div class="stat"><span>rel:</span><span class="stat-val">${sc.rc}</span></div>
            <div class="stat"><span>density:</span><span class="stat-val">${Math.round(sc.density * 100)}%</span></div>
            <div class="stat"><span style="color:var(--assoc)">▪</span><span class="stat-val">${counts.assoc || 0}</span></div>
            <div class="stat"><span style="color:var(--disc)">▪</span><span class="stat-val">${counts.disc || 0}</span></div>
            <div class="stat"><span style="color:var(--dep)">▪</span><span class="stat-val">${counts.dep || 0}</span></div>
            <div class="stat"><span style="color:var(--gap)">▪</span><span class="stat-val">${counts.gap || 0}</span></div>
            <div class="stat"><span>breaks:</span><span class="stat-val" style="color:${sc.breaks.length ? 'var(--brk)' : 'var(--fixed)'}">${sc.breaks.length}</span></div>
            <div class="stat"><span>fit:</span><span class="stat-val">${Math.round(sc.genreFit * 100)}%</span></div>
            <span class="status-msg" id="status-msg"></span>
        `;
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
            matrix-router { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .legend { display: flex; gap: 14px; padding: 8px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; flex-shrink: 0; }
            .li { display: flex; align-items: center; gap: 5px; font-size: 9.5px; color: var(--text-dim); }
            .ls { width: 10px; height: 10px; border-radius: 1px; flex-shrink: 0; }
            .status-bar { padding: 6px 16px; border-top: 1px solid var(--border); display: flex; gap: 16px; font-size: 9.5px; color: var(--text-dim); flex-shrink: 0; flex-wrap: wrap; align-items: center; }
            .stat { display: flex; gap: 4px; align-items: center; }
            .stat-val { color: var(--text); }
            .status-msg { margin-left: auto; font-size: 9px; color: var(--text-muted); }
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
                    <div class="legend">
                        <div class="li"><div class="ls" style="background:var(--assoc)"></div>Association</div>
                        <div class="li"><div class="ls" style="background:var(--disc)"></div>Discrimination</div>
                        <div class="li"><div class="ls" style="background:var(--dep)"></div>Dependency</div>
                        <div class="li"><div class="ls" style="background:var(--gap)"></div>Deliberate gap</div>
                        <div class="li"><div class="ls" style="background:var(--brk);opacity:.7"></div>Break</div>
                        <div class="li"><div class="ls" style="background:var(--fixed)"></div>Fixed (proposed)</div>
                        <div class="li"><div class="ls" style="background:var(--conflict)"></div>Conflation</div>
                    </div>
                    <matrix-router></matrix-router>
                    <div class="status-bar" id="status-bar" style="display:none"></div>
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
