// shared/integrator/src/harness/cli.ts

import { HarnessRunner } from "./runner.js";
import { MockAdapter } from "./observers/mock_adapter.js";
import { LocalStorageProvider } from "./storage/local_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js";
import { PersistenceRunner } from "./persistence_runner.js"; 
import { HolographicIndexer } from "./indexer.js"; 
import { PassportImporter } from "./importer.js"; 
import { LatticeCrawler } from "./crawler.js"; // NEW: Crawler Import
import * as readline from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve to the project root (up from shared/integrator/dist/harness)
const PROJECT_ROOT = path.resolve(__dirname, "../../../../"); 

// Define the Production Vault Path (Git-Ignored)
const VAULT_PATH = path.join(PROJECT_ROOT, "vault");

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === "run") {
        // Structural Integrity Check
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
            console.log("\n[Systems Analyst] Booting Local Relational Spine...");
            console.log(`[Storage] Target: ${VAULT_PATH}`);

            const storage = new LocalStorageProvider(VAULT_PATH);
            const generator = new PromptGenerator();

            // Try to load state (might not exist on first run)
            let state, stance;
            try {
                state = await storage.getCapsule("identity/state.json");
                stance = await storage.getCapsule("identity/stance.json");
            } catch (e) {
                console.log("[Boot] No existing identity found. Booting blank slate.");
            }

            console.log("\n" + "=".repeat(60));
            console.log("HOLOGRAPHIC BOOT PROMPT");
            console.log("=".repeat(60) + "\n");
            
            // Pass VAULT_PATH so generator can find the index
            console.log(generator.generateBootBlock([state, stance].filter(Boolean), VAULT_PATH));
            console.log("\n" + "=".repeat(60));

        } catch (err: any) {
            console.error(`\n[BOOT_FAILURE] ${err.message}`);
        }

    } else if (command === "persist") {
        try {
            console.log("\n[Systems Analyst] Mounting Local Persistence Layer...");
            
            const runner = new PersistenceRunner();
            // Initialize with the secure VAULT_PATH
            await runner.initialize("ignored_passphrase", VAULT_PATH); 
            await runner.startSession();

        } catch (err: any) {
            console.error(`\n[PERSISTENCE_FAILURE] ${err.message}`);
        }

    } else if (command === "index") {
        console.log("\n[AI Scientist] Re-calibrating Holographic Field (Local)...");
        try {
            // Indexer now looks inside the Vault
            const indexer = new HolographicIndexer(VAULT_PATH);
            await indexer.buildIndex();
        } catch (err: any) {
            console.error(`\n[INDEX_FAILURE] ${err.message}`);
        }

    } else if (command === "import") {
        // Migration Passport Ingestion
        const passportPath = args[1];
        if (!passportPath) {
            console.error("Usage: node cli.js import <passport.json>");
            process.exit(1);
        }
        try {
            const importer = new PassportImporter(VAULT_PATH);
            await importer.importPassport(passportPath);
        } catch (err: any) {
            console.error(`\n[IMPORT_FAILURE] ${err.message}`);
        }

    } else if (command === "crawl") {
        // NEW: Lattice Crawler Command
        const sourceDir = args[1];
        if (!sourceDir) {
            console.error("Usage: node cli.js crawl <path_to_session_logs>");
            process.exit(1);
        }

        // Allow flexible pathing (absolute or relative to CWD)
        const absoluteSource = path.resolve(process.cwd(), sourceDir);
        
        if (!fs.existsSync(absoluteSource)) {
            console.error(`[CRAWL_ERROR] Directory not found: ${absoluteSource}`);
            process.exit(1);
        }

        console.log(`\n[Lattice Crawler] Initiating Scan on: ${absoluteSource}`);
        
        try {
            const crawler = new LatticeCrawler(VAULT_PATH);
            await crawler.crawlDirectory(absoluteSource);
        } catch (err: any) {
            console.error(`\n[CRAWL_FAILURE] ${err.message}`);
        }

    } else {
        console.log("\nAvailable Commands (Local Mode):");
        console.log("  run <flow.json>         - Verify structural integrity");
        console.log("  boot                    - Generate Tier 1 Prompt (Read from Vault)");
        console.log("  persist                 - Start Interactive Session (Write to Vault)");
        console.log("  index                   - Rebuild Holographic Map");
        console.log("  import <passport.json>  - Ingest Migration Passport");
        console.log("  crawl <sessions_dir>    - Ingest Raw Session Logs (Build Lattice)");
    }
}

main().catch(console.error);