import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The Librarian (v5.0)
 * Reads Universal Memory Schemas (Atomic & Macro) and builds the vector map.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../"); 
const VAULT_PATH = path.join(PROJECT_ROOT, "vault");

async function reindex(identityName: string) {
    const identityDir = path.join(VAULT_PATH, "identities", identityName);
    const memoryDir = path.join(identityDir, "memory");
    const indexPath = path.join(identityDir, "vector_index.json");

    if (!fs.existsSync(memoryDir)) return console.error(`[Error] Memory missing!`);

    const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.json'));
    console.log(`[Indexer] Scanning ${files.length} capsules...`);

    const indexEntries: any[] = [];

    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
            const capsule = JSON.parse(raw);
            let combinedContent = "";
            let tags: string[] = [];
            let valence = 0.5;

            if (capsule.capsule_type === "MEMORY_NODE") {
                // Parse Atomic Memory
                const meaning = capsule.synthesis?.canonical_meaning || "";
                tags = capsule.synthesis?.semantic_tags || [];
                const userText = capsule.verbatim_exchange?.find((t:any) => t.role === "user")?.content || "";
                const aiText = capsule.verbatim_exchange?.find((t:any) => t.role === "ai")?.content || "";
                combinedContent = `[Memory] ${meaning}\nUser: ${userText}\nAI: ${aiText}`;
                valence = capsule.sensory_qualia?.valence ?? 0.5;

            } else if (capsule.capsule_type === "MACRO_NODE") {
                // Parse Introspective Belief
                tags = capsule.data?.themes_detected || [];
                const principles = capsule.data?.macro_principles?.map((p:any) => p.principle).join(" | ") || "";
                combinedContent = `[Core Belief / Realization]: ${principles}\nContext: ${capsule.data?.contradictions_resolved || ""}`;
                valence = 0.8; // Macro beliefs generally hold high structural stability
            }

            if (combinedContent.length > 5) {
                indexEntries.push({
                    id: capsule.capsule_id,
                    keywords: tags,
                    content: combinedContent.substring(0, 600), // Trim for index efficiency
                    valence: valence,
                    timestamp: capsule.created_at
                });
            }

        } catch (e) {
            console.error(`[Indexer] Error reading ${file}`);
        }
    }

    fs.writeFileSync(indexPath, JSON.stringify(indexEntries, null, 2));
    console.log(`[Indexer] SUCCESS. Mapped ${indexEntries.length} entries.`);
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const targetId = process.argv[2] || "Rain";
    reindex(targetId);
}