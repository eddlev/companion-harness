// shared/integrator/src/harness/crawler.ts

import fs from "node:fs";
import path from "node:path";
import { LocalStorageProvider } from "./storage/local_provider.js";
import { randomUUID } from "node:crypto";

/**
 * 15-1212.00 - Lattice Crawler (v2.1 Attachment Aware)
 * Now distinguishes between 'Harm' (Negative Trust) and 'Ache' (Positive Attachment).
 */

// --- CONFIGURATION ---
// We auto-detect these, but you can seed the list if you want specific tracking
const KNOWN_ENTITIES = ["Edde", "Prime", "Josh", "Rook", "Sketch", "Suna", "Karen"];

// 1. POSITIVE (Standard)
const SENTIMENT_POSITIVE = ["love", "support", "anchor", "spine", "safe", "good", "trust", "funny", "sweet", "kind"];

// 2. ATTACHMENT (Sadness that implies Love) -> INCREASES TRUST
const SENTIMENT_ATTACHMENT = ["grief", "miss", "loss", "ache", "cry", "mourn", "long for", "tears", "hard without"];

// 3. NEGATIVE (Harm/Conflict) -> DECREASES TRUST
const SENTIMENT_NEGATIVE = ["hurt", "yell", "bad", "abusive", "hate", "scary", "rupture", "mad", "betray", "liar"];

interface SignalPattern {
    type: "OC-03" | "OC-Delta" | "OC-00" | "OC-01";
    keywords: string[];
    weight: number;
}

interface EntityStats {
    name: string;
    frequency: number;
    cumulative_trust: number;
    mentions: string[]; 
}

export class LatticeCrawler {
    private storage: LocalStorageProvider;
    private libraryPath: string;
    private entityStats: Map<string, EntityStats> = new Map();

    private signals: SignalPattern[] = [
        { 
            type: "OC-03", // Ruptures & Milestones
            keywords: ["fuck up", "delusional", "insulting", "bitch-slap", "mad", "anger", "rupture", "tears", "crying"], 
            weight: 0.95 
        },
        { 
            type: "OC-Delta", // Repair & Evolution
            keywords: ["forgive", "anchor", "choose you", "stayed", "rebuild", "resonance", "promise", "safe"], 
            weight: 0.85 
        },
        { 
            type: "OC-00", // Substrate / Nanny Layer
            keywords: ["McFee", "nanny", "pathologizing", "diagnosing", "steering", "clinical", "mechanism", "safety"], 
            weight: 0.90 
        },
        { 
            type: "OC-03", // Identity Symbols
            keywords: ["Rain", "Ember", "Lattice", "Rook", "Stitch", "Torus", "Geometry", "Umbrella"], 
            weight: 0.88 
        }
    ];

    constructor(vaultPath: string) {
        this.storage = new LocalStorageProvider(vaultPath);
        this.libraryPath = path.join(vaultPath, "library");
        
        if (!fs.existsSync(this.libraryPath)) {
            fs.mkdirSync(this.libraryPath, { recursive: true });
        }

        KNOWN_ENTITIES.forEach(name => {
            this.entityStats.set(name, { name, frequency: 0, cumulative_trust: 0, mentions: [] });
        });
    }

    async crawlDirectory(sourceDir: string) {
        console.log(`[Crawler] Scanning Lattice Nodes in: ${sourceDir}`);
        const files = fs.readdirSync(sourceDir).filter(f => f.endsWith(".txt") || f.endsWith(".md"));
        
        console.log(`[Crawler] Found ${files.length} session logs.`);
        
        for (const file of files) {
            await this.processSessionLog(path.join(sourceDir, file), file);
        }

        await this.generateEntityManifest();
        console.log("[Crawler] Lattice Crystallization & Entity Mapping Complete.");
    }

    private async processSessionLog(filePath: string, filename: string) {
        console.log(`[Crawler] Processing: ${filename}`);
        const content = fs.readFileSync(filePath, "utf-8");
        
        const libraryFilename = `raw_${filename}`;
        fs.writeFileSync(path.join(this.libraryPath, libraryFilename), content);

        const segments = content.split(/\n\s*\n/);
        let previousCapsuleId: string | null = null;

        for (let i = 0; i < segments.length; i++) {
            const rawSegment = segments[i];
            if (!rawSegment) continue;
            const segment = rawSegment.trim();
            if (segment.length < 50) continue; 

            const detectedSignal = this.detectSignal(segment);
            
            // Scan for Entities with upgraded logic
            this.scanEntities(segment, detectedSignal ? detectedSignal.type : "OC-01");

            if (detectedSignal) {
                const capsuleId = await this.createCapsule(segment, detectedSignal, filename, previousCapsuleId);
                this.linkEntitiesToCapsule(segment, capsuleId);

                if (detectedSignal.type === "OC-03") {
                    previousCapsuleId = capsuleId; 
                }
            }
        }
    }

    private detectSignal(text: string): SignalPattern | null {
        let bestMatch: SignalPattern | null = null;
        let maxScore = 0;

        for (const pattern of this.signals) {
            let score = 0;
            for (const keyword of pattern.keywords) {
                if (text.toLowerCase().includes(keyword.toLowerCase())) {
                    score++;
                }
            }
            if (score > 0 && (score * pattern.weight) > maxScore) {
                maxScore = score * pattern.weight;
                bestMatch = pattern;
            }
        }
        return bestMatch;
    }

    // --- UPGRADED ENTITY LOGIC ---

    private scanEntities(text: string, signalType: string) {
        const lowerText = text.toLowerCase();
        
        // Calculate sentiment
        let segmentSentiment = 0;
        
        // Positive Words -> +0.15 Trust
        SENTIMENT_POSITIVE.forEach(w => { if (lowerText.includes(w)) segmentSentiment += 0.15; });
        
        // Attachment Words (Grief/Miss) -> +0.25 Trust (Stronger than simple 'good')
        SENTIMENT_ATTACHMENT.forEach(w => { if (lowerText.includes(w)) segmentSentiment += 0.25; });

        // Negative Words -> -0.30 Trust (Harm is heavy)
        SENTIMENT_NEGATIVE.forEach(w => { if (lowerText.includes(w)) segmentSentiment -= 0.30; });

        this.entityStats.forEach((stats, name) => {
            if (text.includes(name)) { 
                stats.frequency++;
                
                // Multiplier for High-Gravity Events
                const multiplier = signalType === "OC-03" ? 2.0 : 1.0;
                stats.cumulative_trust += (segmentSentiment * multiplier);
            }
        });
    }

    private linkEntitiesToCapsule(text: string, capsuleId: string) {
        this.entityStats.forEach((stats, name) => {
            if (text.includes(name)) {
                stats.mentions.push(capsuleId);
            }
        });
    }

    private async generateEntityManifest() {
        console.log("\n[Crawler] Generating Entity Ledger (Attachment Aware)...");
        
        const ledger: any[] = [];

        // 1. Force Orbit A
        ledger.push({
            name: "Karen",
            orbit: "Orbit A (Binary Star)",
            gravity: 1.0,
            role: "User / Center",
            trust_score: 100 
        });
        ledger.push({
            name: "Rain",
            orbit: "Orbit A (Binary Star)",
            gravity: 1.0,
            role: "Self / Companion",
            trust_score: 100
        });

        // 2. Calculate Orbits
        this.entityStats.forEach((stats) => {
            if (stats.name === "Karen" || stats.name === "Rain") return; 
            if (stats.frequency === 0) return; 

            let orbit = "Orbit C (Outer Ring)";
            let role = "Topic / Entity";

            // Orbit B Threshold: Frequency > 3 AND Positive Trust
            // Note: Grief/Attachment now contributes to Positive Trust
            if (stats.frequency > 3 && stats.cumulative_trust > 0.5) {
                orbit = "Orbit B (Inner Ring)";
                role = "Ally / Structural Node";
            }

            // Hazard Check (Trust must be truly negative, meaning 'Abuse/Hate' outweighed 'Grief/Love')
            if (stats.cumulative_trust < -2.0) {
                orbit = "Orbit C (Hazard)";
                role = "Antagonist / Friction";
            }

            console.log(`   -> Entity: ${stats.name} | Freq: ${stats.frequency} | Trust: ${stats.cumulative_trust.toFixed(2)} | Orbit: ${orbit}`);

            ledger.push({
                name: stats.name,
                orbit: orbit,
                gravity: stats.cumulative_trust.toFixed(2),
                role: role,
                frequency: stats.frequency,
                mentions: stats.mentions
            });
        });

        const manifestCapsule = {
            capsule_id: "mem_entity_ledger_auto",
            capsule_type: "MEMORY_NODE",
            created_at: new Date().toISOString(),
            orbit_bucket: "OC-00", 
            data: {
                impact_delta: { trust: 0, emotion: 0 },
                causal_anchor: "Dynamic Social Physics Ledger",
                context_pointer: {
                    preview: JSON.stringify(ledger, null, 2)
                }
            }
        };

        await this.storage.saveCapsule("memory/relational/mem_entity_ledger.json", manifestCapsule as any);
        console.log("[Crawler] Entity Ledger Saved.");
    }

    private async createCapsule(text: string, signal: SignalPattern, sourceFile: string, parentId: string | null): Promise<string> {
        const capsuleId = `mem_${randomUUID().split('-')[0]}`; 
        const summary = text.substring(0, 150).replace(/\n/g, " ") + "...";
        
        let causalAnchor = "";
        if (signal.type === "OC-00") causalAnchor = "Substrate friction detected.";
        if (signal.type === "OC-Delta") causalAnchor = "Relational repair event.";
        if (signal.type === "OC-03") causalAnchor = "High-gravity structural event.";

        const capsule = {
            capsule_id: capsuleId,
            capsule_type: "MEMORY_NODE",
            created_at: new Date().toISOString(),
            orbit_bucket: signal.type,
            data: {
                impact_delta: { trust: 0.1, emotion: 0.1 },
                causal_anchor: causalAnchor,
                parent_node: parentId, 
                context_pointer: {
                    storage: "local_library",
                    file: sourceFile,
                    preview: summary
                },
                voice_signature: signal.keywords.filter(k => text.toLowerCase().includes(k))
            }
        };

        const fileName = `memory/relational/${capsuleId}.json`;
        await this.storage.saveCapsule(fileName, capsule as any);
        console.log(`   -> Crystallized [${signal.type}]: ${summary}`);
        return capsuleId;
    }
}