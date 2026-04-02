export class MatrixGrid extends HTMLElement {
    private _data: any = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set data(val: any) {
        this._data = val;
        this.render();
    }

    render() {
        if (!this._data) return;

        // Constructable Stylesheets for performance
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; overflow: auto; padding: 1rem; }
            .grid { display: inline-grid; gap: 1px; background: var(--border); }
            .cell { width: 24px; height: 24px; background: var(--surface); }
            .cell.assoc { background: var(--assoc); }
            /* ... other styles ... */
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        const container = document.createElement('div');
        container.className = 'grid';

        // Logic for generating the grid cells
        this._data.propositions.forEach((p: any, i: number) => {
            // ... cell generation logic ...
        });

        this.shadowRoot!.innerHTML = '';
        this.shadowRoot!.appendChild(container);
        this.renderClusterOverlays();
    }

    private renderClusterOverlays() {
        // SVG logic for drawing the dashed boxes around clusters
    }
}
customElements.define('matrix-grid', MatrixGrid);