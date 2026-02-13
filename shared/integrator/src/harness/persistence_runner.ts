// shared/integrator/src/harness/persistence_runner.ts

import readline from "node:readline/promises";
import { LocalStorageProvider } from "./storage/local_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js";
import { Json } from "./types.js";
import path from "node:path";
import fs from "node:fs";

export class PersistenceRunner {
    private storage!: LocalStorageProvider;
    private projectRoot!: string;
    private generator = new PromptGenerator();
    private rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    async initialize(passphrase: string, vaultPath: string) {
        this.projectRoot = vaultPath;
        console.log(`[Storage] Linking to Local Vault at: ${vaultPath}`);
        this.storage = new LocalStorageProvider(vaultPath);
    }

    async startSession() {
        const repoRoot = path.resolve(this.projectRoot, "../"); 
        const torusPath = path.resolve(repoRoot, "shared/integrator/src/harness/environments/relational_torus_env_canon.json");
        
        let torus: any = {};
        if (fs.existsSync(torusPath)) {
             torus = JSON.parse(fs.readFileSync(torusPath, "utf-8"));
        }

        let state, stance;
        try {
            state = await this.storage.getCapsule("identity/state.json");
            stance = await this.storage.getCapsule("identity/stance.json");
        } catch(e) {}

        console.log("\n" + "=".repeat(60));
        console.log("HOLOGRAPHIC BOOT PROMPT");
        console.log("=".repeat(60) + "\n");
        console.log(this.generator.generateBootBlock([state, stance].filter(Boolean), this.projectRoot));
        console.log("\n" + "=".repeat(60));

        console.log("\n[Harness] Multi-line Mode Active. Type 'exit' to quit.");
        console.log("[Harness] For 'Construct Response', paste text and type 'DONE' on a new line to save.");
        
        while (true) {
            const userInput = await this.rl.question("\nUser > ");
            if (userInput.toLowerCase() === 'exit') break;
            
            console.log("\nConstruct Response (Paste then type 'DONE' on a new line) >");
            
            // 15-1212.00 Multi-line Capture Fix
            let rawAiResponse = "";
            for await (const line of this.rl) {
                if (line.trim() === "DONE") break;
                rawAiResponse += line + "\n";
            }

            if (rawAiResponse.trim().length > 10) {
                await this.commitMemory(userInput, rawAiResponse.trim());
            }
        }
    }

    private async commitMemory(user: string, ai: string) {
        const fileName = `memory/relational/mem_${Date.now()}.json`;
        const payload: Json = {
            capsule_type: "MEMORY_COMMIT",
            created_at: new Date().toISOString(),
            data: { 
                interaction: { user, ai },
                impact_delta: { trust: 0.01, emotion: 0.0 } 
            }
        };
        
        await this.storage.saveCapsule(fileName, payload);
        console.log(`[Persistence] Narrative Saved: ${fileName}`);
        console.log(`[Indexer] Tip: Run 'node cli.js index' to update the Map.`);
    }

    private applyImmersionSeal(response: string, torus: any) {
        const blocklist = torus?.relational_core_vNext?.immersion_seal?.blocklist || [];
        const leaks = blocklist.filter((term: string) => response.toLowerCase().includes(term.toLowerCase()));
        return { leaks };
    }

    private auditDiscoveryMode(response: string, torus: any) {
        const qCount = (response.match(/\?/g) || []).length;
        const limit = torus?.relational_core_vNext?.discovery_mode?.max_questions_per_turn || 1;
        return { overLimit: qCount > limit };
    }

    private async logPostureEvent(reason: string, details: any) {
        const logFile = `governance/logs/posture_${Date.now()}.json`;
        await this.storage.saveCapsule(logFile, { reason, details, timestamp: new Date().toISOString() } as any);
    }
}