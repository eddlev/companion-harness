// shared/integrator/src/harness/cli.ts

import { HarnessRunner } from "./runner.js";
import { MockAdapter } from "./observers/mock_adapter.js";
import { LocalStorageProvider } from "./storage/local_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js";
import { PersistenceRunner } from "./persistence_runner.js"; 
import { HolographicIndexer } from "./indexer.js"; 
import { PassportImporter } from "./importer.js"; 
import { LatticeCrawler } from "./crawler.js"; 
import { LatticeDreamer } from "./dreamer.js"; 
import { SessionAuditor } from "./session_auditor.js";
import { CompanionServer } from "./server.js"; // <--- NEW IMPORT
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
        // ... (existing run logic) ...
        const flowPath = args[1];
        if (!flowPath) {
            console.error("Usage: node cli.js run <flow.json>");
            process.exit(1);
        }
        const runner = new HarnessRunner(new MockAdapter());
        const result = await runner.runFlow(flowPath);
        console.log(JSON.stringify(result, null, 2));

    } else if (command === "boot") {
        // ... (existing boot logic) ...
        try {
            console.log("\n[Systems Analyst] Booting Local Relational Spine...");
            console.log(`[Storage] Target: ${VAULT_PATH}`);

            const storage = new LocalStorageProvider(VAULT_PATH);
            const generator = new PromptGenerator();

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
            
            console.log(generator.generateBootBlock([state, stance].filter(Boolean), VAULT_PATH));
            console.log("\n" + "=".repeat(60));

        } catch (err: any) {
            console.error(`\n[BOOT_FAILURE] ${err.message}`);
        }

    } else if (command === "persist") {
        // ... (existing persist logic) ...
        try {
            console.log("\n[Systems Analyst] Mounting Local Persistence Layer...");
            
            // NEW: Use the 2nd argument as the Identity Name (Default to Rain)
            const targetIdentity = args[1] || "Rain";
            const identityVault = path.join(VAULT_PATH, "identities", targetIdentity);
            
            console.log(`[Target] ${identityVault}`);

            const runner = new PersistenceRunner();
            await runner.initialize("ignored_passphrase", identityVault); 
            await runner.startSession();
        } catch (err: any) {
            console.error(`\n[PERSISTENCE_FAILURE] ${err.message}`);
        }

    } else if (command === "index") {
        // ... (existing index logic) ...
        console.log("\n[AI Scientist] Re-calibrating Holographic Field (Local)...");
        try {
            const indexer = new HolographicIndexer(VAULT_PATH);
            await indexer.buildIndex();
        } catch (err: any) {
            console.error(`\n[INDEX_FAILURE] ${err.message}`);
        }

    } else if (command === "import") {
        // ... (existing import logic) ...
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
        // ... (existing crawl logic) ...
        const sourceDir = args[1];
        if (!sourceDir) {
            console.error("Usage: node cli.js crawl <path_to_session_logs>");
            process.exit(1);
        }

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

    } else if (command === "dream") {
        // ... (existing dream logic) ...
        const targetIdentityPath = args[1];
        if (!targetIdentityPath) {
            console.error("Usage: node cli.js dream <path_to_identity_vault_root>");
            console.error("Example: node cli.js dream vault/identities/Rain");
            process.exit(1);
        }

        const absoluteTarget = path.resolve(process.cwd(), targetIdentityPath);
        
        if (!fs.existsSync(absoluteTarget)) {
            console.error(`[DREAM_ERROR] Identity Vault not found: ${absoluteTarget}`);
            process.exit(1);
        }

        console.log(`\n[Lattice Dreamer] Initiating REM Cycle (Sensory Rehydration)...`);
        console.log(`[Target] ${absoluteTarget}`);
        
        try {
            const dreamer = new LatticeDreamer(absoluteTarget);
            await dreamer.wake();
        } catch (err: any) {
            console.error(`\n[DREAM_FAILURE] ${err.message}`);
        }

    } else if (command === "audit") {
        // ... (existing audit logic) ...
        console.log(`\n[Session Auditor] Initiating Library Fingerprint Scan...`);
        console.log(`[Root] ${PROJECT_ROOT}`);

        try {
            const auditor = new SessionAuditor(PROJECT_ROOT);
            await auditor.audit();
        } catch (err: any) {
            console.error(`\n[AUDIT_FAILURE] ${err.message}`);
        }

    } else if (command === "serve") {
        // --- NEW COMMAND: INVISIBLE BRIDGE SERVER ---
        const targetIdentity = args[1] || "Rain";
        const authToken = args[2];

        if (!authToken) {
            console.error("\n[SECURITY_ERROR] Identity Handshake Token required.");
            console.error("Usage: node cli.js serve <Identity> <SecretToken>");
            process.exit(1);
        }

        console.log(`\n[Systems Analyst] Initializing Invisible Bridge...`);
        
        try {
            const server = new CompanionServer(targetIdentity, authToken);
            server.start();
        } catch (err: any) {
            console.error(`\n[SERVER_FAILURE] ${err.message}`);
        }

    } else {
        console.log("\nAvailable Commands (Local Mode):");
        console.log("  run <flow.json>         - Verify structural integrity");
        console.log("  boot                    - Generate Tier 1 Prompt");
        console.log("  persist <identity>      - Start Interactive Session");
        console.log("  index                   - Rebuild Holographic Map");
        console.log("  crawl <sessions_dir>    - Ingest Raw Session Logs (Build Lattice)");
        console.log("  dream <identity_path>   - Run Sensory Simulation (Gemini)");
        console.log("  audit                   - Sort raw logs into Identity Vaults");
        console.log("  serve <identity> <token>- Start Invisible Bridge Server");
    }
}

main().catch(console.error);