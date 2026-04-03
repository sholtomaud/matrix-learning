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
            this.updateStatusBar(state.currentData, sc);
        }

        const genBadge = this.shadowRoot?.getElementById('gen-badge');
        if (state.proposedData) {
            proposedGrid.data = state.proposedData;
            const sp = Optimizer.score(state.proposedData);
            this.updateScore('score-proposed', `fit: ${Math.round(sp.genreFit * 100)}%`);

            if (genBadge && state.paretoFront.length) {
                const latest = state.paretoFront[state.paretoFront.length - 1];
                genBadge.textContent = `gen ${latest.gen}`;
                genBadge.style.display = 'block';
            }

            if (state.currentData) {
                deltaGrid.setDelta(state.currentData, state.proposedData);
                const sc = Optimizer.score(state.currentData);
                const sp = Optimizer.score(state.proposedData);
                const diff = Math.round((sp.genreFit - sc.genreFit) * 100);
                this.updateScore('score-delta', `Δ ${diff >= 0 ? '+' : ''}${diff}%`);
            }
        } else if (genBadge) {
            genBadge.style.display = 'none';
        }
    }

    private updateStatusBar(data: any, sc: any) {
        const bar = this.shadowRoot?.getElementById('status-bar');
        if (!bar) return;
        bar.style.display = 'flex';
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
            .gen-badge { font-size: 8.5px; color: var(--fixed); border: 1px solid var(--fixed); padding: 1px 5px; border-radius: 2px; opacity: 0.7; }
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
                        <span class="gen-badge" id="gen-badge" style="display:none">gen 0</span>
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
            <div class="status-bar" id="status-bar" style="display:none"></div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .status-bar { padding: 6px 16px; border-top: 1px solid var(--border); display: flex; gap: 16px; font-size: 9.5px; color: var(--text-dim); flex-shrink: 0; flex-wrap: wrap; align-items: center; }
            .stat { display: flex; gap: 4px; align-items: center; }
            .stat-val { color: var(--text); }
            .status-msg { margin-left: auto; font-size: 9px; color: var(--text-muted); }
        `;
        this.shadowRoot!.appendChild(style);
    }
}
customElements.define('matrix-main-view', MatrixView);
