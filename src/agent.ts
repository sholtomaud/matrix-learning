import { Optimizer } from './services/optimizer';
import { LLMService } from './services/llm';
import { MatrixData, Proposition } from './state';

/**
 * runAgentLogic
 * Implements the 3-phase optimization loop for the Conceptual Matrix.
 * 1. Reordering (Bandwidth optimization)
 * 2. Gap-filling (LLM Bridge synthesis)
 * 3. Prose regeneration
 */
export const runAgentLogic = async (data?: MatrixData, apiKey?: string, sourceText?: string): Promise<MatrixData | void> => {
    console.log('Agent logic starting...');
    if (!data) {
        console.log('No data provided to agent logic.');
        return;
    }

    const optimizer = new Optimizer(data);
    let working = JSON.parse(JSON.stringify(data));

    // Phase 1: Bandwidth Optimization (50 generations)
    console.log('Phase 1: Bandwidth optimization...');
    for (let gen = 0; gen < 50; gen++) {
        working = optimizer.step();
    }

    const llm = new LLMService();
    if (apiKey) {
        // Phase 2: LLM Gap-filling
        console.log('Phase 2: LLM gap-filling...');
        const sc = Optimizer.score(working);
        if (sc.breaks.length > 0) {
            try {
                const system = `You are a Logic Engineer. Analyze conceptual breaks. If a bridge is missing from the text, synthesize the required logical premise (Enthymeme).`;
                const user = `SOURCE: ${(sourceText || '').slice(0, 4000)}
SEQUENCE: ${working.propositions.map((p: Proposition) => `${p.id}. ${p.text}`).join('\n')}
FIX BREAKS: ${sc.breaks.map((b: any) => `${b.fromId} -> ${b.toId}`).join(', ')}`;

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

                const raw = await llm.complete('anthropic', apiKey, system, user, undefined, schema);
                const result = JSON.parse(raw);
                const bridges = result.bridges;

                for (const sug of bridges) {
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
                }
            } catch (e: any) {
                console.error(`Phase 2 Error: ${e.message}`);
            }
        }

        // Phase 3: Prose regeneration
        if (sourceText) {
            console.log('Phase 3: Prose regeneration...');
            try {
                const clusters = working.clusters || [{ label: "Full Text", ids: working.propositions.map((p: any) => p.id) }];
                for (const cluster of clusters) {
                    const clusterProps = working.propositions.filter((p: any) => cluster.ids.includes(p.id));
                    const system = `You are an expert editor. Rewrite the section titled "${cluster.label}". Maintain the depth and nuance. Do not summarize.`;
                    const user = `Context: ${sourceText.slice(0, 1000)}...
Target Propositions for this section:
${clusterProps.map((p: any) => `${p.id}: ${p.text}`).join('\n')}`;

                    await llm.complete('anthropic', apiKey, system, user);
                }
            } catch (e: any) {
                console.error(`Phase 3 Error: ${e.message}`);
            }
        }
    }

    console.log('Agent logic complete.');
    return working;
};
