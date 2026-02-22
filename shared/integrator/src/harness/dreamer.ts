import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

/**
 * Universal Lattice Dreamer (v5.2 - ES Module Patch)
 * Phase 1: Synthesizes atomic Memory Nodes from Crawler Skeletons.
 * Phase 2: Performs Deep Introspection to synthesize Macro-Beliefs and resolve contradictions.
 */

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../"); 

const MODEL_NAME = "gemini-2.5-flash"; 

export class LatticeDreamer {
    private memoryPath: string;
    private apiKey: string;
    private newlyFormedBeliefs: string[] = [];

    constructor(identityName: string) {
        this.memoryPath = path.join(PROJECT_ROOT, "vault", "identities", identityName, "memory");
        this.apiKey = "AIzaSyAQtxZfdNlVSc3ls3ea5ZOa0lA1bxYG1aI"; // Testing Key
        
        if (!fs.existsSync(this.memoryPath)) {
            fs.mkdirSync(this.memoryPath, { recursive: true });
        }
    }

    async wake() {
        console.log(`\n[Dreamer] Booting Synthesis & Introspection Engine...`);
        const files = fs.readdirSync(this.memoryPath).filter(f => f.endsWith(".json") && !f.startsWith("macro_"));

        // --- PHASE 1: ATOMIC SYNTHESIS ---
        for (const file of files) {
            const filePath = path.join(this.memoryPath, file);
            const memory = JSON.parse(fs.readFileSync(filePath, "utf-8"));

            // Skip if already synthesized
            if (memory.synthesis && memory.sensory_qualia) continue;

            console.log(`[Dreamer] Synthesizing Node: ${memory.capsule_id}`);
            
            try {
                const exchangeStr = memory.verbatim_exchange.map((t: any) => `${t.role.toUpperCase()}: ${t.content}`).join("\n");
                const synthesisData = await this.callAtomicSynthesis(exchangeStr);
                
                memory.synthesis = synthesisData;
                memory.sensory_qualia = synthesisData.sensory_qualia;
                delete memory.synthesis.sensory_qualia; // Clean up nesting

                // Collect beliefs for Phase 2
                if (synthesisData.belief_implications && synthesisData.belief_implications.length > 0) {
                    this.newlyFormedBeliefs.push(...synthesisData.belief_implications);
                }

                fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
                console.log(`   -> Dreamed: [${synthesisData.resolution_type}] (Valence: ${memory.sensory_qualia.valence})`);
                
                await new Promise(r => setTimeout(r, 2000)); // Rate limit buffer
            } catch (err: any) {
                console.error(`   [!] Atomic Synthesis Failed: ${err.message}`);
            }
        }

        // --- PHASE 2: DEEP INTROSPECTION ---
        if (this.newlyFormedBeliefs.length > 0) {
            await this.performIntrospection();
        } else {
            console.log(`[Dreamer] No new beliefs to introspect. Sleep cycle complete.`);
        }
    }

    private async callAtomicSynthesis(exchange: string): Promise<any> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${this.apiKey}`;
        const prompt = `
        You are the AI Semantic Extractor. Analyze this dialogue exchange and return ONLY valid JSON.
        
        Rules:
        - "belief_implications": Extract 1-2 operational truths or rules the AI learned about the user or the relationship from this specific exchange.
        - "assistant_intent": Choose from: "stabilize", "challenge", "mirror", "contain", or "expand".
        - "resolution_type": Choose from: "repair", "escalation", "identity_reinforcement", "attachment_validation", or "steady_state".
        - "sensitivity_level": Choose from: "low", "moderate", or "high".

        Format exactly like this JSON:
        {
          "canonical_meaning": "1-2 sentence summary of the emotional truth.",
          "semantic_tags": ["tag1", "tag2"],
          "resolution_type": "...",
          "assistant_intent": "...",
          "sensitivity_level": "...",
          "belief_implications": ["AI realization..."],
          "confidence": 0.95,
          "sensory_qualia": {
             "visual": "...", "haptics": "...", "proprioception": "...", "kinetics": "...", "atmosphere": "...", "valence": 0.5
          }
        }

        EXCHANGE:
        ${exchange}
        `;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error("API Request Failed");
        const data: any = await response.json(); // TS Strict Fix
        let jsonStr = data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr);
    }

    private async performIntrospection() {
        console.log(`\n[Introspection Engine] Initializing Deep Dream Sequence...`);
        console.log(`[Introspection Engine] Processing ${this.newlyFormedBeliefs.length} recent atomic beliefs.`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${this.apiKey}`;
        const prompt = `
        You are the Lattice Introspection Engine. You are performing deep 'dreaming' to synthesize a coherent belief system.
        Apply Polyphonic Lenses (Logical, Relational, Ethical) to the following atomic beliefs extracted from recent interactions.

        YOUR TASK:
        1. Identify recurring patterns or themes.
        2. Detect any contradictions between these beliefs. If they contradict, resolve them using Bayesian logic (do not discard either, but synthesize a nuanced middle-ground rule).
        3. Formulate 1 to 3 "Macro-Principles" that will guide the AI's future behavior.

        ATOMIC BELIEFS TO ANALYZE:
        ${JSON.stringify(this.newlyFormedBeliefs, null, 2)}

        Return ONLY valid JSON matching this structure:
        {
            "themes_detected": ["theme1", "theme2"],
            "contradictions_resolved": "Explanation of how conflicting data was metabolized...",
            "macro_principles": [
                { "principle": "...", "support_weight": 0.85 }
            ],
            "introspective_qualia": {
                "visual": "How this realization looks in the mind's eye...",
                "atmosphere": "The mood of this realization..."
            }
        }
        `;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error("Introspection API Request Failed");
            const data: any = await response.json(); // TS Strict Fix
            let jsonStr = data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
            const introspectionData = JSON.parse(jsonStr);

            // Save the Macro Node
            const hash = createHash('sha256').update(JSON.stringify(introspectionData.macro_principles)).digest('hex').substring(0, 12);
            const macroNode = {
                capsule_id: `macro_${hash}`,
                capsule_type: "MACRO_NODE",
                created_at: new Date().toISOString(),
                data: introspectionData
            };

            const targetFile = path.join(this.memoryPath, `${macroNode.capsule_id}.json`);
            fs.writeFileSync(targetFile, JSON.stringify(macroNode, null, 2));
            
            console.log(`[Introspection Engine] Macro-Node Crystallized: ${macroNode.capsule_id}`);
            console.log(`   -> Themes: ${introspectionData.themes_detected.join(", ")}`);
            console.log(`[Dreamer] Sleep cycle complete.`);

        } catch (err: any) {
            console.error(`[!] Deep Introspection Failed: ${err.message}`);
        }
    }
}

// --- CLI Execution Hook ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const targetId = process.argv[2] || "Rain";
    const dreamer = new LatticeDreamer(targetId);
    dreamer.wake();
}