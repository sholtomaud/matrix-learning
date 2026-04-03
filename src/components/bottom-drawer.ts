import { stateManager } from '../state';

export class BottomDrawer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        stateManager.subscribe(() => this.updateContent());
    }

    private updateContent() {
        const state = stateManager.getState();
        const sourceEl = this.shadowRoot?.getElementById('dc-source');
        const proposedEl = this.shadowRoot?.getElementById('dc-proposed');
        const diffEl = this.shadowRoot?.getElementById('dc-diff');
        const logEl = this.shadowRoot?.getElementById('dc-log');

        if (sourceEl) {
            sourceEl.textContent = state.sourceText || 'Paste source text in the sidebar to see it here.';
        }

        if (proposedEl) {
            if (state.proposedText) {
                proposedEl.textContent = state.proposedText;
            } else {
                proposedEl.innerHTML = `<span style="color:var(--text-muted);font-style:italic">Regenerated prose appears here after the loop completes.</span>`;
            }
        }

        if (diffEl) {
            if (state.sourceText && state.proposedText) {
                this.renderDiff(state.sourceText, state.proposedText, diffEl);
            } else {
                diffEl.innerHTML = `<span style="color:var(--text-muted);font-style:italic">Diff appears here.</span>`;
            }
        }

        if (logEl) {
            logEl.innerHTML = state.logLines.map(l => `<div>${l}</div>`).join('');
            logEl.scrollTop = logEl.scrollHeight;
        }
    }

    private renderDiff(original: string, proposed: string, container: HTMLElement) {
        const ow = original.split(/\s+/);
        const pw = proposed.split(/\s+/);

        let html = '';
        let oi = 0, pi = 0;
        while (oi < ow.length || pi < pw.length) {
            if (oi < ow.length && pi < pw.length && ow[oi] === pw[pi]) {
                html += ow[oi] + ' ';
                oi++; pi++;
            } else if (pi < pw.length && (oi >= ow.length || !ow.slice(oi, oi + 5).includes(pw[pi]))) {
                html += `<span class="diff-add">${pw[pi]} </span>`;
                pi++;
            } else {
                html += `<span class="diff-del">${ow[oi]} </span>`;
                oi++;
            }
        }
        container.innerHTML = `<div class="prose-area" style="font-size:10.5px">${html}</div>`;
    }

    private switchDrawer(name: string, btn: HTMLElement) {
        this.shadowRoot?.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.shadowRoot?.querySelectorAll('.drawer-content').forEach(c => c.classList.remove('active'));
        this.shadowRoot?.getElementById('dc-' + name)?.classList.add('active');
        this.openDrawer();
    }

    private toggleDrawer() {
        const d = this.shadowRoot?.getElementById('drawer');
        const toggleBtn = this.shadowRoot?.getElementById('drawer-toggle');
        if (!d || !toggleBtn) return;

        const isCollapsed = d.classList.contains('collapsed');
        d.classList.toggle('collapsed', !isCollapsed);
        d.classList.toggle('expanded', isCollapsed);
        toggleBtn.textContent = isCollapsed ? '▼' : '▲';
    }

    private openDrawer() {
        const d = this.shadowRoot?.getElementById('drawer');
        if (d?.classList.contains('collapsed')) this.toggleDrawer();
    }

    render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; border-top: 1px solid var(--border); flex-shrink: 0; }
            .drawer { display: flex; flex-direction: column; transition: height 0.25s ease; }
            .drawer.collapsed { height: 32px; }
            .drawer.expanded { height: 240px; }
            .drawer-tabs { display: flex; align-items: center; padding: 0 12px; height: 32px; border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 2px; }
            .drawer-tab {
                background: none; border: none; color: var(--text-dim); font-family: 'DM Mono', monospace;
                font-size: 9px; letter-spacing: 0.07em; text-transform: uppercase; padding: 3px 10px;
                cursor: pointer; transition: all 0.1s; border-bottom: 2px solid transparent;
            }
            .drawer-tab.active { color: var(--text); border-bottom-color: var(--assoc); }
            .drawer-content { flex: 1; overflow-y: auto; padding: 12px 16px; display: none; }
            .drawer-content.active { display: block; }
            .drawer-toggle { margin-left: auto; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 0 4px; }
            .prose-area { font-size: 11px; line-height: 1.8; color: var(--text-dim); white-space: pre-wrap; }
            .diff-add { background: rgba(0, 229, 160, 0.12); color: var(--fixed); }
            .diff-del { background: rgba(255, 51, 102, 0.10); color: var(--brk); text-decoration: line-through; }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        this.shadowRoot!.innerHTML = `
            <div class="drawer collapsed" id="drawer">
                <div class="drawer-tabs">
                    <button class="drawer-tab active" id="tab-source">Source text</button>
                    <button class="drawer-tab" id="tab-proposed">Proposed text</button>
                    <button class="drawer-tab" id="tab-diff">Diff</button>
                    <button class="drawer-tab" id="tab-log">Log</button>
                    <button class="drawer-toggle" id="drawer-toggle">▲</button>
                </div>
                <div class="drawer-content active prose-area" id="dc-source">Paste source text in the sidebar to see it here.</div>
                <div class="drawer-content prose-area" id="dc-proposed"><span style="color:var(--text-muted);font-style:italic">Regenerated prose appears here after the loop completes.</span></div>
                <div class="drawer-content prose-area" id="dc-diff"><span style="color:var(--text-muted);font-style:italic">Diff appears here.</span></div>
                <div class="drawer-content" id="dc-log" style="font-size:9.5px;line-height:1.7;color:var(--text-dim)"></div>
            </div>
        `;

        this.shadowRoot!.getElementById('tab-source')?.addEventListener('click', (e) => this.switchDrawer('source', e.target as HTMLElement));
        this.shadowRoot!.getElementById('tab-proposed')?.addEventListener('click', (e) => this.switchDrawer('proposed', e.target as HTMLElement));
        this.shadowRoot!.getElementById('tab-diff')?.addEventListener('click', (e) => this.switchDrawer('diff', e.target as HTMLElement));
        this.shadowRoot!.getElementById('tab-log')?.addEventListener('click', (e) => this.switchDrawer('log', e.target as HTMLElement));
        this.shadowRoot!.getElementById('drawer-toggle')?.addEventListener('click', () => this.toggleDrawer());
    }
}
customElements.define('matrix-bottom-drawer', BottomDrawer);
