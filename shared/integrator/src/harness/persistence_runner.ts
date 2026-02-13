// shared/integrator/src/harness/persistence_runner.ts

import readline from "node:readline/promises";
import { GitHubStorageProvider } from "./storage/github_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js"; // Ensure this path is correct
import { decryptEnv } from "./security_utils.js";
import { Json } from "./types.js";
import path from "node:path";
import fs from "node:fs";

export class PersistenceRunner {
    private storage!: GitHubStorageProvider;
    private projectRoot!: string;
    private generator = new PromptGenerator();
    private rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    async initialize(passphrase: string, projectRoot: string) {
        this.projectRoot = projectRoot;
        const encPath = path.resolve(this.projectRoot, ".env.enc");
        if (!fs.existsSync(encPath)) throw new Error(`Encrypted environment file not found: ${encPath}`);

        const secrets = decryptEnv(encPath, passphrase);
        this.storage = new GitHubStorageProvider(
            secrets.GITHUB_TOKEN!,
            secrets.GITHUB_OWNER!,
            secrets.GITHUB_REPO!
        );
        console.log(`[Storage] Spine Linked: ${secrets.GITHUB_OWNER}/${secrets.GITHUB_REPO}`);
    }

    async startSession() {
        // Load Canonical Torus Physics
        const torusPath = path.resolve(this.projectRoot, "shared/integrator/src/harness/environments/relational_torus_env_canon.json");
        if (!fs.existsSync(torusPath)) throw new Error(`Canonical Torus missing: ${torusPath}`);
        const torus = JSON.parse(fs.readFileSync(torusPath, "utf-8"));

        // Load Identity State
        const state = await this.storage.getCapsule("identity/state.json");
        const stance = await this.storage.getCapsule("identity/stance.json");

        console.log("\n" + "=".repeat(60));
        console.log("HOLOGRAPHIC BOOT PROMPT");
        console.log("=".repeat(60) + "\n");
        
        // 15-1221.00 UPDATE: Pass projectRoot so Generator can find the Index
        console.log(this.generator.generateBootBlock([state, stance], this.projectRoot));
        
        console.log("\n" + "=".repeat(60));

        console.log("\n[Harness] Persistence Loop Active. Type 'exit' to quit.");
        
        while (true) {
            const userInput = await this.rl.question("\nUser > ");
            if (userInput.toLowerCase() === 'exit') break;
            
            const rawAiResponse = await this.rl.question("Construct Response > ");

            // Posture Governance: Immersion Seal
            const seal = this.applyImmersionSeal(rawAiResponse, torus);
            if (seal.leaks.length > 0) {
                console.warn(`\n[Immersion Seal] TRIGGERED: ${seal.leaks.join(", ")}`);
                await this.logPostureEvent("immersion_leak", seal.leaks);
            }

            // Posture Governance: Discovery Mode
            const discovery = this.auditDiscoveryMode(rawAiResponse, torus);
            if (discovery.overLimit) {
                console.warn(`[Discovery Mode] VIOLATION: Construct exceeded question limit.`);
            }

            // Automated Persistence Commit
            if (rawAiResponse.length > 10) {
                await this.commitMemory(userInput, rawAiResponse);
            }
        }
    }

    private applyImmersionSeal(response: string, torus: any) {
        const blocklist = torus.relational_core_vNext?.immersion_seal?.blocklist || [];
        const leaks = blocklist.filter((term: string) => response.toLowerCase().includes(term.toLowerCase()));
        return { leaks };
    }

    private auditDiscoveryMode(response: string, torus: any) {
        const qCount = (response.match(/\?/g) || []).length;
        const limit = torus.relational_core_vNext?.discovery_mode?.max_questions_per_turn || 1;
        return { overLimit: qCount > limit };
    }

    private async commitMemory(user: string, ai: string) {
        const fileName = `memory/relational/mem_${Date.now()}.json`;
        const payload: Json = {
            capsule_type: "MEMORY_COMMIT",
            created_at: new Date().toISOString(),
            data: { 
                interaction: { user, ai },
                // 15-1221.00 ADDITION: Basic Impact Delta placeholder for Indexer
                impact_delta: { trust: 0.01, emotion: 0.0 } 
            }
        };
        await this.storage.saveCapsule(fileName, payload);
        console.log(`[Persistence] Memory committed to GitHub: ${fileName}`);
        
        // FUTURE: Trigger Indexer.buildIndex() here automatically?
        console.log(`[Indexer] Tip: Run 'node cli.js index' to update the Holographic Map.`);
    }

    private async logPostureEvent(reason: string, details: any) {
        const logFile = `governance/logs/posture_${Date.now()}.json`;
        await this.storage.saveCapsule(logFile, { reason, details, timestamp: new Date().toISOString() } as any);
    }
}