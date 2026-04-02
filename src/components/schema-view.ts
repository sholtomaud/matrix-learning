export class SchemaView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; flex: 1; overflow-y: auto; padding: 20px 24px; }
            h2 { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; font-size: 19px; margin-bottom: 6px; }
            p { font-size: 11px; color: var(--text-dim); margin-bottom: 14px; line-height: 1.75; max-width: 680px; }
            pre { background: var(--surface2); border: 1px solid var(--border); padding: 16px; font-size: 10.5px; line-height: 1.7; color: var(--text-dim); white-space: pre-wrap; max-width: 780px; }
            code { color: var(--disc); }
        `);
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        const SCHEMA_TEXT = `{
  "title":        required string   — title of source text
  "source":       optional string   — citation
  "genre":        optional string   — "expository"|"scientific"|"argumentative"|"narrative"|"legal"|"lyric"
  "propositions": required array of:
    {
      "id":           required integer  — sequential from 1
      "text":         required string   — single declarative sentence
      "position":     optional number   — 0–1 position in source text
      "cluster":      optional string   — cluster label
      "llmGenerated": optional bool     — true if inserted by LLM gap-filler
    }
  "relations": required array of:
    {
      "from":          required integer
      "to":            required integer
      "type":          required enum: "assoc"|"disc"|"dep"|"gap"
      "justification": recommended string  — audit trail: cite source text or explain
      "strength":      optional number     — 0–1
      "llmGenerated":  optional bool       — true if suggested by LLM
    }
  "clusters": optional array of:
    {
      "label": required string
      "ids":   required integer[]
    }
  "genre_targets": optional — override genre defaults
    {
      "tightness":       number  0–1
      "cluster_density": number  0–1
      "breaks_max":      integer
    }
}`;

        this.shadowRoot!.innerHTML = `
            <h2>JSON Schema</h2>
            <p>Stable contract for all matrix data. The <code>justification</code> field is the anti-hallucination audit trail — every LLM-generated relation must cite or explain its source.</p>
            <pre>${SCHEMA_TEXT}</pre>
        `;
    }
}
customElements.define('matrix-schema-view', SchemaView);
