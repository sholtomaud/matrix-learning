import { stateManager } from '../state';
import { Optimizer } from '../services/optimizer';

export class MatrixView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        stateManager.subscribe(() => this.updateGrids());
    }

    private updateGrids() {
        const state = stateManager.getState();
        const currentGrid = this.shadowRoot?.getElementById('grid-current') as any;
        const proposedGrid = this.shadowRoot?.getElementById('grid-proposed') as any;
        const deltaGrid = this.shadowRoot?.getElementById('grid-delta') as any;

        if (state.currentData) {
            currentGrid.data = state.currentData;
            const sc = Optimizer.score(state.currentData);
            this.updateScore('score-current', `fit: ${Math.round(sc.genreFit * 100)}%`);
        }

        if (state.proposedData) {
            proposedGrid.data = state.proposedData;
            const sp = Optimizer.score(state.proposedData);
            this.updateScore('score-proposed', `fit: ${Math.round(sp.genreFit * 100)}%`);

            if (state.currentData) {
                deltaGrid.setDelta(state.currentData, state.proposedData);
                const sc = Optimizer.score(state.currentData);
                const sp = Optimizer.score(state.proposedData);
                const diff = Math.round((sp.genreFit - sc.genreFit) * 100);
                this.updateScore('score-delta', `Δ ${diff >= 0 ? '+' : ''}${diff}%`);
            }
        }
    }

    private updateScore(id: string, text: string) {
        const el = this.shadowRoot?.getElementById(id);
        if (el) el.textContent = text;
    }

    render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .panels-row { display: flex; flex: 1; overflow: hidden; }
            .panel { flex: 1; border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
            .panel:last-child { border-right: none; }
            .panel-head { padding: 8px 14px 6px; border-bottom: 1px solid var(--border); flex-shrink: 0; display: flex; align-items: baseline; gap: 8px; }
            .panel-title { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 13px; color: var(--text); }
            .panel-sub { font-size: 9px; color: var(--text-muted); letter-spacing: 0.07em; text-transform: uppercase; }
            .panel-score { margin-left: auto; font-size: 9px; color: var(--text-dim); }
            .matrix-scroll { flex: 1; overflow: auto; padding: 14px; }
            .legend { display: flex; gap: 14px; padding: 8px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; flex-shrink: 0; }
            .li { display: flex; align-items: center; gap: 5px; font-size: 9.5px; color: var(--text-dim); }
            .ls { width: 10px; height: 10px; border-radius: 1px; flex-shrink: 0; }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        this.shadowRoot!.innerHTML = `
            <div class="legend">
                <div class="li"><div class="ls" style="background:var(--assoc)"></div>Association</div>
                <div class="li"><div class="ls" style="background:var(--disc)"></div>Discrimination</div>
                <div class="li"><div class="ls" style="background:var(--dep)"></div>Dependency</div>
                <div class="li"><div class="ls" style="background:var(--gap)"></div>Deliberate gap</div>
                <div class="li"><div class="ls" style="background:var(--brk);opacity:.7"></div>Break</div>
                <div class="li"><div class="ls" style="background:var(--fixed)"></div>Fixed (proposed)</div>
                <div class="li"><div class="ls" style="background:var(--conflict)"></div>Conflation</div>
            </div>
            <div class="panels-row">
                <div class="panel">
                    <div class="panel-head">
                        <span class="panel-title">Current</span>
                        <span class="panel-sub">as extracted</span>
                        <span class="panel-score" id="score-current">—</span>
                    </div>
                    <div class="matrix-scroll">
                        <matrix-grid id="grid-current"></matrix-grid>
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-head">
                        <span class="panel-title">Proposed</span>
                        <span class="panel-sub">optimised</span>
                        <span class="panel-score" id="score-proposed">—</span>
                    </div>
                    <div class="matrix-scroll">
                        <matrix-grid id="grid-proposed"></matrix-grid>
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-head">
                        <span class="panel-title">Error Δ</span>
                        <span class="panel-sub">proposed − current</span>
                        <span class="panel-score" id="score-delta">—</span>
                    </div>
                    <div class="matrix-scroll">
                        <matrix-grid id="grid-delta"></matrix-grid>
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('matrix-main-view', MatrixView);
