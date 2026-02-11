// shared/integrator/src/harness/cli.ts

import { HarnessRunner } from "./runner.js";
import { MockAdapter } from "./observers/mock_adapter.js";
import { GitHubStorageProvider } from "./storage/github_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js";
import { decryptEnv } from "./security_utils.js";
import * as readline from "node:readline/promises";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "run") {
    const flowPath = args[1];
    if (!flowPath) {
      console.error("Usage: node cli.js run <flow.json>");
      process.exit(1);
    }
    // Verified: MockAdapter now matches ExecutionAdapter interface
    const runner = new HarnessRunner(new MockAdapter());
    const result = await runner.runFlow(flowPath);
    console.log(JSON.stringify(result, null, 2));

  } else if (command === "boot") {
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

      // Ensure identity/ and governance/ folders exist in eddlev/ext-mem
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
  } else {
    console.log("Commands: \n  run <flow.json>  - Verify structural integrity\n  boot             - Generate Holographic Boot Prompt");
  }
}

main().catch(console.error);