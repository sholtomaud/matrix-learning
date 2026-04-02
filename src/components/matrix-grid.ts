import { MatrixData, Proposition, Relation } from '../state';
import { Optimizer } from '../services/optimizer';

const REL_COLORS: Record<string, string> = { assoc: 'var(--assoc)', disc: 'var(--disc)', dep: 'var(--dep)', gap: 'var(--gap)' };
const REL_LABELS: Record<string, string> = { assoc: 'Association', disc: 'Discrimination', dep: 'Dependency', gap: 'Deliberate gap' };

export class MatrixGrid extends HTMLElement {
    private _data: MatrixData | null = null;
    private _delta: any[] | null = null;
    private _id: string = Math.random().toString(36).substring(7);

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set data(val: MatrixData) {
        this._data = val;
        this._delta = null;
        this.render();
    }

    setDelta(curr: MatrixData, prop: MatrixData) {
        this._data = prop;
        this._delta = this.computeDelta(curr, prop);
        this.render();
    }

    private computeDelta(curr: MatrixData, prop: MatrixData) {
        const currRelMap = Optimizer.buildRelMap(curr);
        const propRelMap = Optimizer.buildRelMap(prop);
        const allIds = [...new Set([
            ...curr.propositions.map(p => p.id),
            ...prop.propositions.map(p => p.id)
        ])].sort((a, b) => a - b);

        const delta: any[] = [];
        for (let i = 0; i < allIds.length; i++) for (let j = i + 1; j < allIds.length; j++) {
            const a = allIds[i], b = allIds[j];
            const key = `${a}-${b}`;
            const inCurr = !!currRelMap[key];
            const inProp = !!propRelMap[key];

            const ci = curr.propositions.findIndex(p => p.id === a);
            const cj = curr.propositions.findIndex(p => p.id === b);
            const onDiag = ci >= 0 && cj >= 0 && Math.abs(ci - cj) === 1;

            if (!inCurr && inProp) delta.push({ a, b, status: 'added', rel: propRelMap[key] });
            else if (inCurr && !inProp) delta.push({ a, b, status: 'removed', rel: currRelMap[key] });
            else if (!inCurr && !inProp && onDiag) delta.push({ a, b, status: 'break' });
            else if (inCurr && inProp && !onDiag && Math.abs(ci - cj) > 3) delta.push({ a, b, status: 'conflict', rel: currRelMap[key] });
        }
        return delta;
    }

    render() {
        if (!this._data) return;

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; }
            .matrix-wrap { display: flex; gap: 20px; align-items: flex-start; }
            .grid-container { display: inline-block; }
            .col-labels { display: flex; margin-bottom: 2px; }
            .label-cell { display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
            .row { display: flex; }
            .row-label { display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0; }
            .grid-wrap { position: relative; display: inline-block; }
            .cell { border: 1px solid transparent; transition: background 0.3s, opacity 0.2s; flex-shrink: 0; cursor: default; }
            .cell-empty { background: var(--empty); }
            .cell-diag { background: var(--surface3); }
            .cell-gen { background: rgba(0,229,160,0.2); border: 1px solid var(--fixed); }
            .prop-list { min-width: 160px; max-width: 280px; }
            .prop-title { font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid var(--border); }
            .prop-item { display: flex; gap: 7px; margin-bottom: 4px; padding: 4px 6px; border-radius: 2px; transition: background 0.1s; border-left: 2px solid transparent; }
            .prop-num { font-size: 9px; color: var(--text-muted); min-width: 16px; flex-shrink: 0; padding-top: 1px; }
            .prop-text { font-size: 10px; line-height: 1.45; color: var(--text-dim); }
            .prop-item.gen { border-left-color: var(--fixed); }
            .prop-item.gen .prop-text { color: var(--fixed); }
            .prop-item.highlight { background: var(--surface2); border-left-color: var(--assoc); }
            .tooltip {
                position: fixed; background: var(--surface2); border: 1px solid var(--border2);
                padding: 9px 12px; font-size: 10px; line-height: 1.6; max-width: 300px;
                pointer-events: none; z-index: 9999; display: none; color: var(--text);
            }
            .tooltip strong { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 3px; }
            .tooltip.assoc strong { color: var(--assoc); }
            .tooltip.disc strong { color: var(--disc); }
            .tooltip.dep strong { color: var(--dep); }
            .tooltip.gap strong { color: var(--gap); }
            .tooltip.fixed strong { color: var(--fixed); }
            .tooltip.conflict strong { color: var(--conflict); }
            .tooltip.brk strong { color: var(--brk); }
            .tooltip .just { margin-top: 5px; font-size: 9px; color: var(--text-muted); font-style: italic; border-top: 1px solid var(--border); padding-top: 4px; }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        const props = this._data.propositions;
        const n = props.length;
        const cs = Math.max(14, Math.min(30, Math.floor(360 / n)));
        const relMap = Optimizer.buildRelMap(this._data);
        const i2i = Optimizer.idxMap(this._data);

        const deltaMap: Record<string, any> = {};
        if (this._delta) {
            for (const d of this._delta) deltaMap[`${Math.min(d.a, d.b)}-${Math.max(d.a, d.b)}`] = d;
        }

        const container = document.createElement('div');
        container.className = 'matrix-wrap';

        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';

        // Column Labels
        const colLabels = document.createElement('div');
        colLabels.className = 'col-labels';
        colLabels.style.paddingLeft = `${cs}px`;
        props.forEach(p => {
            const cell = document.createElement('div');
            cell.className = 'label-cell';
            cell.style.width = `${cs}px`;
            cell.style.height = `${cs}px`;
            cell.style.fontSize = `${Math.max(6, cs * 0.32)}px`;
            cell.textContent = p.id.toString();
            colLabels.appendChild(cell);
        });
        gridContainer.appendChild(colLabels);

        const gridWrap = document.createElement('div');
        gridWrap.className = 'grid-wrap';

        for (let i = 0; i < n; i++) {
            const row = document.createElement('div');
            row.className = 'row';

            const rl = document.createElement('div');
            rl.className = 'row-label';
            rl.style.width = `${cs}px`;
            rl.style.height = `${cs}px`;
            rl.style.fontSize = `${Math.max(6, cs * 0.32)}px`;
            rl.textContent = props[i].id.toString();
            row.appendChild(rl);

            for (let j = 0; j < n; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.width = `${cs}px`;
                cell.style.height = `${cs}px`;

                const a = Math.min(props[i].id, props[j].id);
                const b = Math.max(props[i].id, props[j].id);
                const key = `${a}-${b}`;

                if (i === j) {
                    cell.classList.add('cell-diag');
                    if (props[i].llmGenerated) cell.classList.add('cell-gen');
                } else if (this._delta) {
                    const d = deltaMap[key];
                    if (d) {
                        if (d.status === 'added') { cell.style.background = 'var(--fixed)'; cell.style.opacity = '0.8'; }
                        else if (d.status === 'removed') { cell.style.background = 'var(--brk)'; cell.style.opacity = '0.5'; }
                        else if (d.status === 'conflict') { cell.style.background = 'var(--conflict)'; cell.style.opacity = '0.7'; }
                        else if (d.status === 'break') { cell.style.background = 'var(--brk)'; cell.style.opacity = '0.3'; }
                        cell.addEventListener('mouseenter', (e) => this.showDeltaTooltip(e, d, props[i], props[j]));
                        cell.addEventListener('mouseleave', () => this.hideTooltip());
                    } else {
                        const propRelMap = Optimizer.buildRelMap(this._data!);
                        if (propRelMap[key]) {
                            cell.classList.add('cell-empty');
                            cell.style.opacity = '0.4';
                        } else {
                            cell.classList.add('cell-empty');
                        }
                    }
                } else {
                    const rel = relMap[key];
                    if (rel) {
                        cell.style.background = REL_COLORS[rel.type] || '#666';
                        if (rel.llmGenerated) cell.style.boxShadow = `0 0 0 1px var(--fixed)`;
                        cell.addEventListener('mouseenter', (e) => this.showTooltip(e, rel, props[i], props[j]));
                        cell.addEventListener('mouseleave', () => { this.hideTooltip(); this.clearHighlight(); });
                        cell.addEventListener('mouseenter', () => this.highlightProps(props[i].id, props[j].id));
                    } else {
                        cell.classList.add('cell-empty');
                    }
                }
                row.appendChild(cell);
            }
            gridWrap.appendChild(row);
        }

        this.renderClusterOverlays(gridWrap, cs, n, i2i);

        gridContainer.appendChild(gridWrap);
        container.appendChild(gridContainer);

        // Proposition List
        const propList = document.createElement('div');
        propList.className = 'prop-list';
        const title = document.createElement('div');
        title.className = 'prop-title';
        title.textContent = 'Propositions';
        propList.appendChild(title);

        props.forEach(p => {
            const item = document.createElement('div');
            item.className = `prop-item ${p.llmGenerated ? 'gen' : ''}`;
            item.id = `prop-${this._id}-${p.id}`;
            const num = document.createElement('div');
            num.className = 'prop-num';
            num.textContent = p.id.toString();
            const txt = document.createElement('div');
            txt.className = 'prop-text';
            txt.textContent = p.text;
            item.appendChild(num);
            item.appendChild(txt);
            propList.appendChild(item);
        });
        container.appendChild(propList);

        this.shadowRoot!.innerHTML = '';
        this.shadowRoot!.appendChild(container);

        const tt = document.createElement('div');
        tt.id = 'tooltip';
        tt.className = 'tooltip';
        this.shadowRoot!.appendChild(tt);
    }

    private renderClusterOverlays(gridWrap: HTMLElement, cs: number, n: number, i2i: Record<number, number>) {
        if (!this._data?.clusters?.length) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = `position:absolute;top:0;left:${cs}px;pointer-events:none;overflow:visible;`;
        svg.setAttribute('width', (cs * n).toString());
        svg.setAttribute('height', (cs * n).toString());

        const strokes = ['#e2e2dc', '#aaaaaa', '#dddddd', '#bbbbbb', '#cccccc'];
        this._data.clusters.forEach((cl, ci) => {
            const idxs = cl.ids.map(id => i2i[id]).filter(x => x !== undefined).sort((a, b) => a - b);
            if (!idxs.length) return;
            const minI = idxs[0], maxI = idxs[idxs.length - 1];
            const x = minI * cs, y = minI * cs, sz = (maxI - minI + 1) * cs;
            const col = strokes[ci % strokes.length];

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x.toString());
            rect.setAttribute('y', y.toString());
            rect.setAttribute('width', sz.toString());
            rect.setAttribute('height', sz.toString());
            rect.setAttribute('fill', 'none');
            rect.setAttribute('stroke', col);
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('stroke-dasharray', '3 3');
            rect.setAttribute('opacity', '0.4');
            svg.appendChild(rect);

            const lfs = Math.max(7, Math.min(9, cs * 0.35));
            const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt.setAttribute('x', (x + 3).toString());
            txt.setAttribute('y', (y + lfs + 3).toString());
            txt.setAttribute('fill', col);
            txt.setAttribute('font-size', lfs.toString());
            txt.setAttribute('font-family', 'DM Mono,monospace');
            txt.setAttribute('opacity', '0.6');
            txt.textContent = cl.label;
            svg.appendChild(txt);
        });
        gridWrap.appendChild(svg);
    }

    private showTooltip(e: MouseEvent, rel: Relation, fp: Proposition, tp: Proposition) {
        const tt = this.shadowRoot!.getElementById('tooltip')!;
        tt.className = `tooltip ${rel.type}`;
        tt.innerHTML = `<strong>${REL_LABELS[rel.type] || rel.type}</strong>${fp.id}. ${fp.text}<br><br>${tp.id}. ${tp.text}${rel.justification ? `<div class="just">"${rel.justification}"</div>` : ''}`;
        tt.style.display = 'block';
        this.positionTooltip(e);
    }

    private showDeltaTooltip(e: MouseEvent, d: any, pa: Proposition, pb: Proposition) {
        const tt = this.shadowRoot!.getElementById('tooltip')!;
        const st = d.status;
        const labels: Record<string, string> = { added: 'Added — break fixed', removed: 'Removed relation', conflict: 'Possible conflation', break: 'Structural gap (not in text)' };
        tt.className = `tooltip ${st === 'added' ? 'fixed' : st === 'conflict' ? 'conflict' : 'brk'}`;
        tt.innerHTML = `<strong>${labels[st] || st}</strong>${pa.id}. ${pa.text}<br><br>${pb.id}. ${pb.text}`;
        tt.style.display = 'block';
        this.positionTooltip(e);
    }

    private positionTooltip(e: MouseEvent) {
        const tt = this.shadowRoot!.getElementById('tooltip')!;
        tt.style.left = (e.clientX + 14) + 'px';
        tt.style.top = (e.clientY - 10) + 'px';
    }

    private hideTooltip() {
        const tt = this.shadowRoot!.getElementById('tooltip');
        if (tt) tt.style.display = 'none';
    }

    private highlightProps(id1: number, id2: number) {
        [id1, id2].forEach(id => {
            const el = this.shadowRoot?.getElementById(`prop-${this._id}-${id}`);
            if (el) el.classList.add('highlight');
        });
    }

    private clearHighlight() {
        this.shadowRoot?.querySelectorAll('.prop-item').forEach(el => el.classList.remove('highlight'));
    }
}
customElements.define('matrix-grid', MatrixGrid);
