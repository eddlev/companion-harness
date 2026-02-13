// shared/integrator/src/harness/cli.ts

import { HarnessRunner } from "./runner.js";
import { MockAdapter } from "./observers/mock_adapter.js";
import { GitHubStorageProvider } from "./storage/github_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js"; // Corrected Filename
import { decryptEnv } from "./security_utils.js";
import { PersistenceRunner } from "./persistence_runner.js"; 
import { HolographicIndexer } from "./indexer.js"; // New 15-1221.00 Module
import * as readline from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../"); 

/**
 * Securely prompts for a passphrase without echoing characters.
 */
async function hiddenQuestion(query: string): Promise<string> {
    const rl = (readline as any).createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    return new Promise<string>((resolve) => {
        (rl as any)._writeToOutput = (stringToWrite: string) => {
            if (stringToWrite === '\n' || stringToWrite === '\r' || stringToWrite === query) {
                (rl as any).output.write(stringToWrite);
            }
        };

        (rl as any).question(query, (answer: string) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === "run") {
        const flowPath = args[1];
        if (!flowPath) {
            console.error("Usage: node cli.js run <flow.json>");
            process.exit(1);
        }
        const runner = new HarnessRunner(new MockAdapter());
        const result = await runner.runFlow(flowPath);
        console.log(JSON.stringify(result, null, 2));

    } else if (command === "boot") {
        try {
            console.log("\n[Security Analyst] Initializing Relational Spine...");
            const passphrase = await hiddenQuestion("Enter Master Passphrase: ");
            process.stdout.write("\n"); 

            const encPath = path.resolve(PROJECT_ROOT, ".env.enc");
            const secrets = decryptEnv(encPath, passphrase);

            const storage = new GitHubStorageProvider(
                secrets.GITHUB_TOKEN!,
                secrets.GITHUB_OWNER!,
                secrets.GITHUB_REPO!
            );

            const generator = new PromptGenerator();
            console.log(`[Storage] Connected to: ${secrets.GITHUB_OWNER}/${secrets.GITHUB_REPO}`);

            const state = await storage.getCapsule("identity/state.json");
            const stance = await storage.getCapsule("identity/stance.json");
            const consent = await storage.getCapsule("governance/consent.json");

            console.log("\n" + "=".repeat(60));
            console.log("HOLOGRAPHIC BOOT PROMPT");
            console.log("=".repeat(60) + "\n");
            // Pass PROJECT_ROOT so generator can find the index
            console.log(generator.generateBootBlock([state, stance, consent], PROJECT_ROOT));
            console.log("\n" + "=".repeat(60));

        } catch (err: any) {
            console.error(`\n[BOOT_FAILURE] ${err.message}`);
        }

    } else if (command === "persist") {
        try {
            console.log("\n[Security Analyst] Unlocking Authoritative Persistence...");
            const passphrase = await hiddenQuestion("Enter Master Passphrase: ");
            process.stdout.write("\n"); 

            if (passphrase) {
                const runner = new PersistenceRunner();
                await runner.initialize(passphrase, PROJECT_ROOT);
                await runner.startSession();
            }
        } catch (err: any) {
            console.error(`\n[PERSISTENCE_FAILURE] ${err.message}`);
        }

    } else if (command === "index") {
        // New Command: Rebuilds the Holographic Map
        console.log("\n[AI Scientist] Re-calibrating Holographic Field...");
        try {
            const indexer = new HolographicIndexer(PROJECT_ROOT);
            await indexer.buildIndex();
        } catch (err: any) {
            console.error(`\n[INDEX_FAILURE] ${err.message}`);
        }

    } else {
        console.log("\nAvailable Commands:");
        console.log("  run <flow.json>  - Verify structural integrity");
        console.log("  boot             - Generate Tier 1 (Read-Only) Prompt");
        console.log("  persist          - Start Tier 2 Interactive Session");
        console.log("  index            - Rebuild Holographic Memory Map (OC-03 Priority)");
    }
}

main().catch(console.error);