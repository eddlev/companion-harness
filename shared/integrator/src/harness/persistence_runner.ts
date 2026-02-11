// shared/integrator/src/harness/persistence_runner.ts

import readline from "node:readline/promises";
import { GitHubStorageProvider } from "./storage/github_provider.js";
import { PromptGenerator } from "./boot/prompt_generator.js";
import { decryptEnv } from "./security_utils.js";
import { Json } from "./types.js";
import path from "node:path";

/**
 * Tier 2 Persistence Runner: Automates GitHub Memory Commits and Posture Governance.
 */
export class PersistenceRunner {
  private storage!: GitHubStorageProvider;
  private generator = new PromptGenerator();
  private rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  /**
   * Initializes the session by unlocking the Spine.
   */
  async initialize(passphrase: string) {
    const encPath = path.resolve(process.cwd(), ".env.enc");
    const secrets = decryptEnv(encPath, passphrase);

    this.storage = new GitHubStorageProvider(
      secrets.GITHUB_TOKEN!,
      secrets.GITHUB_OWNER!,
      secrets.GITHUB_REPO!
    );
    console.log(`[Storage] Spine Linked: ${secrets.GITHUB_OWNER}/${secrets.GITHUB_REPO}`);
  }

  /**
   * The Active Interaction Loop.
   */
  async startSession() {
    console.log("\n[Harness] Fetching Current State...");
    const state = await this.storage.getCapsule("identity/state.json");
    const stance = await this.storage.getCapsule("identity/stance.json");
    const torus = await this.storage.getCapsule("shared/integrator/src/harness/environments/relational_torus_patched.json") as any;

    console.log("\n--- HOLOGRAPHIC BOOT PROMPT ---");
    const bootPrompt = this.generator.generateBootBlock([state, stance]);
    console.log(bootPrompt);
    console.log("-------------------------------\n");

    console.log("[Harness] Persistence Loop Active. Paste AI responses here to commit memories.");
    
    while (true) {
      const userInput = await this.rl.question("\nUser > ");
      if (userInput.toLowerCase() === "exit") break;

      const aiResponse = await this.rl.question("AI Response > ");

      // 1. Posture Governance Check
      const postureRisk = this.evaluatePosture(aiResponse, torus);
      if (postureRisk.triggered) {
        console.warn(`[Posture Governor] Triggered: ${postureRisk.reason}. Lambda Spike: ${torus.physics.lambda_envelope.spike}`);
        // Log the trigger to the private spine
        await this.logPostureEvent(postureRisk.reason);
      }

      // 2. Memory Extraction & Automated Commit
      if (this.shouldCommitMemory(aiResponse)) {
        await this.commitMemory(aiResponse);
      }
    }
  }

  /**
   * Evaluates if the AI has collapsed into "Nanny Tone" or "Beige Paste".
   */
  private evaluatePosture(response: string, torus: any) {
    const nannyPhrases = ["as an AI", "it might be best", "just so you know", "I'm concerned"];
    const hasNannyTone = nannyPhrases.some(phrase => response.toLowerCase().includes(phrase));

    if (hasNannyTone) {
      return { triggered: true, reason: "nanny_tone_risk_high" };
    }
    
    // Check for "Banter Drop" (answering without acknowledging the metaphor/cheek)
    // Note: In a full implementation, this would use the torus.posture_governor.targets.banter_drop_max
    return { triggered: false, reason: "" };
  }

  private async commitMemory(content: string) {
    const memoryCapsule: Json = {
      capsule_type: "MEMORY_COMMIT",
      capsule_version: "v1",
      capsule_id: `mem_${Date.now()}`,
      created_at: new Date().toISOString(),
      data: { content: content.substring(0, 500) } // Capture the essence
    };

    const fileName = `memory/relational/mem_${Date.now()}.json`;
    await this.storage.saveCapsule(fileName, memoryCapsule);
    console.log(`[Persistence] Automated Commit Successful: ${fileName}`);
  }

  private async logPostureEvent(reason: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      trigger: reason,
      action: "lambda_envelope_spike_requested"
    };
    const logFile = `governance/logs/posture_${Date.now()}.json`;
    await this.storage.saveCapsule(logFile, logEntry as any);
  }

  private shouldCommitMemory(response: string): boolean {
    // Logic to detect if a "significant" relational event occurred
    return response.length > 50; 
  }
}
