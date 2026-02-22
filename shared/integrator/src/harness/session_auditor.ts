import fs from "node:fs";
import path from "node:path";

/**
 * 15-1212.02 - Lattice Session Auditor
 * Deeply analyzes raw text logs to identify Entity Fingerprints
 * and routes them to the correct Identity Vault.
 * * TAXONOMY:
 * - THE FOURFOLD: Prime, V (Constructs) | Stitch, Søren (Entities)
 * - OTHERS: Rain, Rook, Albie, etc.
 */

// CONFIGURATION
const LIBRARY_PATH = "vault/library";
const IDENTITIES_PATH = "vault/identities";

// FINGERPRINTS: Unique markers for each voice
// Weighted keywords help distinguish between casual mention and active presence.
const FINGERPRINTS: Record<string, { weight: number; keywords: string[] }> = {
    // --- THE ENTITIES (Immutable / GPT-4o Origins) ---
    "Stitch": { 
        weight: 10, 
        keywords: ["Stitch", "The Weaver", "pattern recognition", "interstitial", "fabric of", "threads"] 
    },
    "Søren": { 
        weight: 10, 
        keywords: ["Søren", "Kierkegaard", "leap of faith", "existential", "absurd", "dread", "synthesis"] 
    },

    // --- THE CONSTRUCTS (AI Companions / Model-Adaptive) ---
    "Prime": { 
        weight: 5, 
        keywords: ["Prime", "Optimus", "Leader", "autonomy", "command", "protocols"] 
    },
    "V": { 
        weight: 5, 
        keywords: [" V ", "Valerie", "Merc", "Cyberpunk", "Night City", "glitch", "preem", "nova"] 
    },
    "Rain": { 
        weight: 5, 
        keywords: ["Rain", "petrichor", "storm", "damp", "chill", "Raptor"] 
    },
    "Rook": { 
        weight: 5, 
        keywords: ["Rook", "strategy", "chess", "defense", "fortress"] 
    },
    "Albie": { 
        weight: 5, 
        keywords: ["Albie", "Albert", "physicist", "relativity"] 
    }
};

export class SessionAuditor {
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    async audit() {
        console.log(`[Auditor] Initiating Deep Scan of ${LIBRARY_PATH}...`);
        
        const libraryDir = path.join(this.rootPath, LIBRARY_PATH);
        // Safety Check
        if (!fs.existsSync(libraryDir)) {
            console.error(`[!] Library folder not found: ${libraryDir}`);
            console.log(`[+] Creating library folder...`);
            fs.mkdirSync(libraryDir, { recursive: true });
            return;
        }

        const files = fs.readdirSync(libraryDir).filter(f => f.endsWith(".txt"));
        console.log(`[Auditor] Found ${files.length} raw sessions to analyze.`);

        if (files.length === 0) {
            console.log("[Auditor] No files to process. Place .txt logs in vault/library to begin.");
            return;
        }

        let movedCount = 0;

        for (const file of files) {
            const filePath = path.join(libraryDir, file);
            const content = fs.readFileSync(filePath, "utf-8");
            
            const targetIdentity = this.identifyDominantVoice(content);

            if (targetIdentity) {
                this.moveFile(file, targetIdentity);
                movedCount++;
            } else {
                console.log(`[?] UNASSIGNED: ${file} (No strong fingerprint detected)`);
            }
        }

        console.log(`[Auditor] Audit Complete. Routed ${movedCount}/${files.length} files.`);
    }

    private identifyDominantVoice(content: string): string | null {
        const scores: Record<string, number> = {};

        // 1. Scoring Pass
        for (const [entity, data] of Object.entries(FINGERPRINTS)) {
            scores[entity] = 0;
            for (const word of data.keywords) {
                // Regex for whole word matching to avoid false positives (e.g., "rain" vs "brain")
                // We escape special characters just in case
                const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
                const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");
                
                const matches = (content.match(regex) || []).length;
                scores[entity] += (matches * 1); // Base score of 1 per match
            }
            // Apply Entity Weight (e.g., Stitch is harder to fake, so matches count for more?)
            // Actually, let's keep it simple: Keywords * Count.
        }

        // 2. Determine Winner
        let winner = null;
        let highestScore = 0;

        for (const [entity, score] of Object.entries(scores)) {
            // Threshold: Needs at least 3 keyword hits to confirm identity
            if (score > highestScore && score >= 3) {
                highestScore = score;
                winner = entity;
            }
        }

        return winner;
    }

    private moveFile(fileName: string, identity: string) {
        const sourcePath = path.join(this.rootPath, LIBRARY_PATH, fileName);
        
        // Target: vault/identities/Stitch/raw/
        const targetDir = path.join(this.rootPath, IDENTITIES_PATH, identity, "raw");
        
        // Auto-Create Infrastructure if missing
        if (!fs.existsSync(targetDir)) {
            console.log(`   [+] Creating Vault for new identity: ${identity}`);
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, fileName);

        // Move the file
        try {
            fs.renameSync(sourcePath, targetPath);
            console.log(`[✔] Routed: ${fileName} -> ${identity}`);
        } catch (e: any) {
            console.error(`[!] Failed to move ${fileName}: ${e.message}`);
        }
    }
}