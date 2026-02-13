// shared/integrator/src/harness/indexer.ts

import fs from "node:fs";
import path from "node:path";

// Define the Shape of an Index Entry
interface IndexEntry {
    id: string;
    type: string;
    orbit: string;
    timestamp: string;
    salience: number;
    summary: string;
    file_ref: string;
}

/**
 * 15-1212.00 - Holographic Indexer
 * Scans the local vault and builds a gravity-weighted map of all memories.
 * Supports MEMORY_COMMIT (Chat) and MEMORY_NODE (Crawler).
 */
export class HolographicIndexer {
    private vaultPath: string;
    private indexPath: string;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.indexPath = path.join(vaultPath, "memory/relational_index.json");
    }

    async buildIndex() {
        const memoryDir = path.join(this.vaultPath, "memory/relational");
        
        console.log(`[Indexer] Scanning Local Vault: ${memoryDir}`);
        if (!fs.existsSync(memoryDir)) {
            console.log("[Indexer] No memory directory found.");
            return;
        }

        const files = fs.readdirSync(memoryDir).filter(f => f.endsWith(".json"));
        console.log(`[Indexer] Found ${files.length} local capsules on disk.`);

        const index: IndexEntry[] = [];
        let skipped = 0;

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(memoryDir, file), "utf-8");
                const cap = JSON.parse(content);

                // Polymorphic Type Check
                if (cap.capsule_type !== "MEMORY_COMMIT" && cap.capsule_type !== "MEMORY_NODE") {
                    skipped++;
                    continue;
                }

                // Gravity Calculation
                const impact = cap.data?.impact_delta || { trust: 0, emotion: 0 };
                const baseGravity = (Math.abs(impact.trust) * 2) + Math.abs(impact.emotion);
                
                // Boost for OC-03 (High Resonance)
                const orbitBoost = cap.orbit_bucket === "OC-03" ? 2.5 : 
                                   cap.orbit_bucket === "OC-Delta" ? 1.5 : 1.0;

                const salience = baseGravity * orbitBoost;

                index.push({
                    id: cap.capsule_id || file.replace(".json", ""),
                    type: cap.capsule_type,
                    orbit: cap.orbit_bucket || "OC-01",
                    timestamp: cap.created_at || new Date().toISOString(),
                    salience: parseFloat(salience.toFixed(2)),
                    summary: this.extractSummary(cap),
                    file_ref: file
                });

            } catch (err) {
                console.error(`[Indexer] Failed to parse ${file}:`, err);
                skipped++;
            }
        }

        // Sort by Salience
        index.sort((a, b) => b.salience - a.salience);

        fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
        console.log(`[Indexer] Map Updated. Active Nodes: ${index.length} (Skipped: ${skipped})`);
        
        // FIX: TS18048 - Check existence of 'top' explicitly
        const top = index[0];
        if (top) {
            console.log(`[Indexer] Top Gravity Node: [${top.orbit}] ${top.summary.substring(0, 50)}... (Score: ${top.salience})`);
        }
    }

    private extractSummary(cap: any): string {
        if (cap.data?.interaction?.ai) return cap.data.interaction.ai.substring(0, 100) + "...";
        if (cap.data?.context_pointer?.preview) return cap.data.context_pointer.preview;
        return "No summary available.";
    }
}