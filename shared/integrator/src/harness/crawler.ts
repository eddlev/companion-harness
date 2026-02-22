import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

/**
 * Universal Crawler (v5.2.1 - Strict Array Patch)
 * Handles both automated Bridge logs and manual ChatGPT pastes.
 * Automatically strips <system_internal_state> injections from memories.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../"); 

export class LatticeCrawler {
    private rawPath: string;
    private memoryPath: string;

    constructor(identityName: string) {
        const identityDir = path.join(PROJECT_ROOT, "vault", "identities", identityName);
        this.rawPath = path.join(identityDir, "raw");
        this.memoryPath = path.join(identityDir, "memory");

        if (!fs.existsSync(this.memoryPath)) fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    async crawlDirectory(sourceDir?: string) {
        console.log(`\n[Crawler] Initializing V5.2 Multi-Format Extraction...`);
        const targetDir = sourceDir || this.rawPath;

        if (!fs.existsSync(targetDir)) return console.log(`[Crawler] No raw logs at ${targetDir}`);
        
        const files = fs.readdirSync(targetDir).filter(f => f.endsWith(".txt") && !f.endsWith(".processed"));
        console.log(`[Crawler] Found ${files.length} raw session logs.`);

        for (const file of files) {
            this.processSessionLog(path.join(targetDir, file), file);
        }
    }

    private processSessionLog(filePath: string, filename: string) {
        console.log(`[Crawler] Slicing: ${filename}`);
        const content = fs.readFileSync(filePath, "utf-8");
        
        // Smart Split: Use dashes for Bridge, or User Prompts for manual pastes
        let blocks: string[] = [];
        if (content.includes('----------------------------------------')) {
            blocks = content.split('----------------------------------------');
        } else {
            blocks = content.split(/(?=\bYou said:|\bDu sagde:|\bUSER:|\bKaren:|\bEdde:)/gi);
        }

        blocks = blocks.map(b => b.trim()).filter(b => b.length > 20);
        
        let previousCapsuleId: string | null = null;
        const parsedNodes: any[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (!block) continue;
            
            let timestamp = new Date().toISOString();
            let userText = "";
            let aiText = "";

            // Attempt 1: Bridge Format (USER: ... AI: ...)
            const bridgeMatch = block.match(/(?:\[(.*?)\])?\s*USER:\s*([\s\S]*?)\r?\nAI:\s*([\s\S]*)/i);
            
            if (bridgeMatch && bridgeMatch[2] && bridgeMatch[3]) {
                timestamp = bridgeMatch[1] || timestamp;
                userText = bridgeMatch[2].trim();
                aiText = bridgeMatch[3].trim();
            } else {
                // Attempt 2: Manual Paste Format
                const aiSplitRegex = /\r?\n(?:ChatGPT said:|ChatGPT sagde:|Agent M said:|Agent M sagde:|AI:|Rain:)\s*\r?\n/i;
                const parts = block.split(aiSplitRegex);
                
                if (parts.length >= 2) {
                    const userCleanRegex = /^(?:You said:|Du sagde:|USER:|Karen:|Edde:)\s*\r?\n?/i;
                    // TS Strict Fix: Fallback to empty string if undefined
                    userText = (parts[0] || "").replace(userCleanRegex, "").trim();
                    aiText = parts.slice(1).join("\n").trim();
                }
            }

            if (!userText || !aiText) continue; 

            // CRITICAL BUG FIX: Strip system state injections from manual copies
            userText = userText.replace(/<system_internal_state>[\s\S]*?<\/system_internal_state>/gi, "").trim();

            if (userText.length < 2 && aiText.length < 2) continue;

            const hash = createHash('sha256').update(userText + aiText).digest('hex').substring(0, 12);
            const capsuleId = `mem_${hash}`;

            const memorySkeleton = {
                capsule_id: capsuleId,
                capsule_type: "MEMORY_NODE",
                session_id: filename.replace(".txt", ""),
                created_at: timestamp,
                context_links: { previous: previousCapsuleId, next: null },
                temporal_dynamics: { salience_score: 0.5, reference_count: 0, last_referenced_at: timestamp },
                verbatim_exchange: [
                    { role: "user", content: userText },
                    { role: "ai", content: aiText }
                ]
            };

            parsedNodes.push(memorySkeleton);
            previousCapsuleId = capsuleId;
        }

        // Backfill "Next" Links and Save
        let savedCount = 0;
        for (let i = 0; i < parsedNodes.length; i++) {
            if (i < parsedNodes.length - 1) parsedNodes[i].context_links.next = parsedNodes[i+1].capsule_id;
            
            const targetFile = path.join(this.memoryPath, `${parsedNodes[i].capsule_id}.json`);
            if (!fs.existsSync(targetFile)) {
                fs.writeFileSync(targetFile, JSON.stringify(parsedNodes[i], null, 2));
                savedCount++;
            }
        }

        fs.renameSync(filePath, `${filePath}.processed`);
        console.log(`[Crawler] Created ${savedCount} atomic skeletons from ${filename}.`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const targetId = process.argv[2] || "Rain";
    new LatticeCrawler(targetId).crawlDirectory();
}