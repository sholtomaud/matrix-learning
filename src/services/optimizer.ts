import { MatrixData, Proposition, Relation, Cluster } from '../state';

export const GENRE_TARGETS: Record<string, any> = {
    expository: { tightness: 0.75, cluster_density: 0.80, breaks_max: 1, density: 0.40 },
    scientific: { tightness: 0.85, cluster_density: 0.85, breaks_max: 0, density: 0.35 },
    argumentative: { tightness: 0.65, cluster_density: 0.70, breaks_max: 2, density: 0.45 },
    narrative: { tightness: 0.40, cluster_density: 0.50, breaks_max: 5, density: 0.25 },
    legal: { tightness: 0.80, cluster_density: 0.80, breaks_max: 1, density: 0.50 },
    lyric: { tightness: 0.30, cluster_density: 0.40, breaks_max: 8, density: 0.20 }
};

export class Optimizer {
    private data: MatrixData;

    constructor(data: MatrixData) {
        this.data = JSON.parse(JSON.stringify(data));
    }

    public static buildRelMap(data: MatrixData) {
        const m: Record<string, Relation> = {};
        for (const r of data.relations) {
            const a = Math.min(r.from, r.to), b = Math.max(r.from, r.to);
            m[`${a}-${b}`] = r;
        }
        return m;
    }

    public static idxMap(data: MatrixData) {
        const m: Record<number, number> = {};
        data.propositions.forEach((p, i) => m[p.id] = i);
        return m;
    }

    public static bandwidth(props: Proposition[], relMap: Record<string, Relation>) {
        const i2i: Record<number, number> = {};
        props.forEach((p, i) => i2i[p.id] = i);
        let s = 0;
        for (const k of Object.keys(relMap)) {
            const [a, b] = k.split('-').map(Number);
            const ia = i2i[a], ib = i2i[b];
            if (ia !== undefined && ib !== undefined) s += Math.abs(ia - ib);
        }
        return s;
    }

    public static clusterDensityFor(_props: Proposition[], relMap: Record<string, Relation>, clusters?: Cluster[]) {
        let t = 0, f = 0;
        for (const cl of (clusters || [])) {
            for (let a = 0; a < cl.ids.length; a++) for (let b = a + 1; b < cl.ids.length; b++) {
                const ka = Math.min(cl.ids[a], cl.ids[b]), kb = Math.max(cl.ids[a], cl.ids[b]);
                t++; if (relMap[`${ka}-${kb}`]) f++;
            }
        }
        return t ? f / t : 0;
    }

    public static breaksFor(props: Proposition[], relMap: Record<string, Relation>) {
        let br = 0;
        for (let i = 0; i < props.length - 1; i++) {
            const ka = Math.min(props[i].id, props[i + 1].id), kb = Math.max(props[i].id, props[i + 1].id);
            if (!relMap[`${ka}-${kb}`]) br++;
        }
        return br;
    }

    public static objectives(props: Proposition[], relMap: Record<string, Relation>, clusters?: Cluster[]) {
        return {
            bw: this.bandwidth(props, relMap),
            cd: this.clusterDensityFor(props, relMap, clusters),
            br: this.breaksFor(props, relMap)
        };
    }

    public static dominates(a: any, b: any) {
        // a dominates b if better or equal on all, strictly better on at least one
        // min bw, max cd, min br
        return a.bw <= b.bw && a.cd >= b.cd && a.br <= b.br &&
            (a.bw < b.bw || a.cd > b.cd || a.br < b.br);
    }

    public static score(data: MatrixData) {
        const props = data.propositions;
        const n = props.length;
        const relMap = this.buildRelMap(data);
        const i2i = this.idxMap(data);
        const targets = GENRE_TARGETS[data.genre] || GENRE_TARGETS.expository;

        let distSum = 0, rc = 0;
        for (const key of Object.keys(relMap)) {
            const [a, b] = key.split('-').map(Number);
            const ia = i2i[a], ib = i2i[b];
            if (ia === undefined || ib === undefined) continue;
            distSum += Math.abs(ia - ib); rc++;
        }
        const tightness = rc ? Math.max(0, 1 - distSum / rc / (n - 1)) : 0;
        const clusterDensity = this.clusterDensityFor(props, relMap, data.clusters);
        const possible = n * (n - 1) / 2;
        const density = possible ? rc / possible : 0;
        const justCov = data.relations.length ? data.relations.filter(r => r.justification).length / data.relations.length : 0;

        const breaks: any[] = [];
        for (let i = 0; i < n - 1; i++) {
            const ia = props[i].id, ib = props[i + 1].id;
            const ka = Math.min(ia, ib), kb = Math.max(ia, ib);
            if (!relMap[`${ka}-${kb}`]) breaks.push({ idx: i, fromId: ia, toId: ib, fromText: props[i].text, toText: props[i + 1].text });
        }

        const hits = [
            Math.min(1, tightness / (targets.tightness || 0.5)),
            Math.min(1, clusterDensity / (targets.cluster_density || 0.5)),
            breaks.length <= (targets.breaks_max || 2) ? 1 : Math.max(0, 1 - (breaks.length - targets.breaks_max) / 5)
        ];
        const genreFit = hits.reduce((a, b) => a + b, 0) / hits.length;

        return { tightness, clusterDensity, density, breaks, justCov, genreFit, relMap, targets, rc };
    }

    public step(): MatrixData {
        const relMap = Optimizer.buildRelMap(this.data);
        const props = [...this.data.propositions];
        const n = props.length;
        let best = Optimizer.bandwidth(props, relMap);

        for (let k = 0; k < n * 2; k++) {
            const i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n);
            if (i === j) continue;
            [props[i], props[j]] = [props[j], props[i]];
            const bw = Optimizer.bandwidth(props, relMap);
            if (bw < best) { best = bw; }
            else { [props[i], props[j]] = [props[j], props[i]]; }
        }
        this.data.propositions = props;
        return JSON.parse(JSON.stringify(this.data));
    }
}
