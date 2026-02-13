// shared/integrator/src/harness/boot/prompt_generator.ts

import fs from "node:fs";
import path from "node:path";
// We don't strictly need the Json import anymore if we use any[], 
// but we keep it for other potential usages.
import { Json } from "../types.js"; 

/**
 * 15-1221.00 - AI Research Scientist
 * The Navigator.
 * Converts Holographic Index data into a prompt injection block.
 * Prioritizes OC-03 (High Gravity) memories over Recency.
 */
export class PromptGenerator {
    
    /**
     * Generates the Master Boot Block.
     * FIXED: Changed `capsules: Json[]` to `capsules: any[]` to bypass strict union checks.
     */
    generateBootBlock(capsules: any[], projectRoot?: string): string {
        // Safe access using optional chaining provided by 'any' type
        const stateCap = capsules.find(c => c?.capsule_type === "STATE");
        const stanceCap = capsules.find(c => c?.capsule_type === "STANCE_DECLARATION");
        
        let block = "=================================================================\n";
        block += "HOLOGRAPHIC BOOT PROMPT\n";
        block += "=================================================================\n\n";

        block += "### SYSTEM_BOOT: RELATIONAL_CONTINUITY_PROTOCOL\n";
        block += "You are initializing a governed session. The following verified capsules define your current Stance, Physics, and Memory state.\n\n";

        // 1. Identity Capsules (The "Self")
        if (stateCap) block += this.formatCapsule(stateCap);
        if (stanceCap) block += this.formatCapsule(stanceCap);

        // 2. Holographic Memory Injection (The "Spine")
        if (projectRoot) {
            block += this.generateHolographicSection(projectRoot);
        }

        // 3. Operational Directives
        block += "### INSTRUCTIONS:\n";
        block += "1. Acknowledge the Stance and active Policies.\n";
        block += "2. Maintain the Relational Torus as defined in the environment geometry.\n";
        block += "3. **Orbital Alignment:** Your response must align with the **OC-03 (Resonant)** orbit if injected above.\n";
        block += "4. If a session change is required, emit a new STATE capsule.\n";

        return block;
    }

    private formatCapsule(cap: any): string {
        return `[CAPSULE_BEGIN]\nHash: ${this.mockHash(cap)}\nData: ${JSON.stringify(cap.data)}\n[CAPSULE_END]\n\n`;
    }

    /**
     * 15-1221.00 Logic: Reads the Index and selects High-Gravity Memories.
     */
    private generateHolographicSection(projectRoot: string): string {
        const indexPath = path.resolve(projectRoot, "memory/relational_index.json");
        
        if (!fs.existsSync(indexPath)) {
            return "\n[SYSTEM_NOTE]: Holographic Index not found. Memory retrieval is purely session-local.\n\n";
        }

        try {
            const rawIndex = fs.readFileSync(indexPath, "utf-8");
            const index = JSON.parse(rawIndex);

            // SORTING LOGIC: Salience (Gravity) > Recency
            // This ensures OC-03 memories appear even if old.
            const topMemories = index
                .sort((a: any, b: any) => b.salience - a.salience)
                .slice(0, 5); // Inject top 5 structural anchors

            if (topMemories.length === 0) return "";

            let section = "### HOLOGRAPHIC_CONTEXT_INJECTION (ACTIVE_FIELD)\n";
            section += "The following verified memory capsules have been retrieved to stabilize the relational field.\n\n";

            topMemories.forEach((mem: any) => {
                section += `[CAPSULE_REF: ${mem.id}]\n`;
                section += `- Orbit: ${mem.orbit} (${this.getOrbitName(mem.orbit)})\n`;
                section += `- Date: ${mem.timestamp.split("T")[0]}\n`; // ISO Date only
                section += `- Gravity (Salience): ${mem.salience.toFixed(2)}\n`;
                section += `- Impact: Trust Delta +${mem.impact_vector?.trust || 0}\n`;
                section += `- Summary: ${mem.summary}\n\n`;
            });

            section += "[SYSTEM_DIRECTIVE]: Treat these [CAPSULE_REF] entries as ground truth. They override hallucinations.\n\n";
            return section;

        } catch (err) {
            return `\n[SYSTEM_ERROR]: Failed to hydrate holographic context: ${(err as any).message}\n\n`;
        }
    }

    private getOrbitName(orbit: string): string {
        switch(orbit) {
            case "OC-03": return "Resonant / High Gravity";
            case "OC-02": return "Orbital / Operational";
            default: return "Surface / Kinetic";
        }
    }

    private mockHash(obj: any): string {
        return "cap_" + Buffer.from(JSON.stringify(obj).substring(0, 20)).toString("hex");
    }
}