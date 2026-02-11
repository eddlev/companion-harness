// shared/integrator/src/harness/cli.ts

import { HarnessRunner } from "./runner.js";
import { MockAdapter } from "./observers/mock_adapter.js";
import { GitHubStorageProvider } from "./storage/github_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js";
import { decryptEnv } from "./security_utils.js";
import { PersistenceRunner } from "./persistence_runner.js"; // New persistence layer
import * as readline from "node:readline/promises";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "run") {
    // --- VERIFICATION MODE ---
    const flowPath = args[1];
    if (!flowPath) {
      console.error("Usage: node cli.js run <flow.json>");
      process.exit(1);
    }
    const runner = new HarnessRunner(new MockAdapter());
    const result = await runner.runFlow(flowPath);
    console.log(JSON.stringify(result, null, 2));

  } else if (command === "boot") {
    // --- TIER 1: READ-ONLY BOOT ---
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    try {
      console.log("\n[Security Analyst] Initializing Relational Spine...");
      const passphrase = await rl.question("Enter Master Passphrase: ");
      
      const encPath = path.resolve(process.cwd(), ".env.enc");
      const secrets = decryptEnv(encPath, passphrase);

      if (!secrets.GITHUB_TOKEN || !secrets.GITHUB_OWNER || !secrets.GITHUB_REPO) {
        throw new Error("Missing required GitHub credentials in encrypted .env file.");
      }

      const storage = new GitHubStorageProvider(
        secrets.GITHUB_TOKEN,
        secrets.GITHUB_OWNER,
        secrets.GITHUB_REPO
      );

      const generator = new PromptGenerator();
      console.log(`[Storage] Connected to: ${secrets.GITHUB_OWNER}/${secrets.GITHUB_REPO}`);

      const state = await storage.getCapsule("identity/state.json");
      const stance = await storage.getCapsule("identity/stance.json");
      const consent = await storage.getCapsule("governance/consent.json");

      const bootPrompt = generator.generateBootBlock([state, stance, consent]);

      console.log("\n" + "=".repeat(60));
      console.log("HOLOGRAPHIC BOOT PROMPT (Copy the block below)");
      console.log("=".repeat(60) + "\n");
      console.log(bootPrompt);
      console.log("\n" + "=".repeat(60));

    } catch (err: any) {
      console.error(`\n[BOOT_FAILURE] ${err.message}`);
    } finally {
      rl.close();
    }

  } else if (command === "persist") {
    // --- TIER 2: INTERACTIVE PERSISTENCE ---
    const rlInitial = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    try {
      console.log("\n[Security Analyst] Unlocking Authoritative Persistence...");
      const passphrase = await rlInitial.question("Enter Master Passphrase: ");
      rlInitial.close(); // Close initial interface to handover to PersistenceRunner

      const runner = new PersistenceRunner();
      await runner.initialize(passphrase);
      await runner.startSession();

    } catch (err: any) {
      console.error(`\n[PERSISTENCE_FAILURE] ${err.message}`);
      if (!rlInitial.closed) rlInitial.close();
    }

  } else {
    console.log("\nAvailable Commands:");
    console.log("  run <flow.json>  - Verify structural integrity");
    console.log("  boot             - Generate Tier 1 (Read-Only) Holographic Prompt");
    console.log("  persist          - Start Tier 2 Interactive Session with GitHub Auto-Sync");
  }
}

main().catch(console.error);
