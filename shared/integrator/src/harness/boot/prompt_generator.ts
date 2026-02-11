// shared/integrator/src/harness/boot/prompt_generator.ts

import { Json } from "../types.js";
import { HarnessCore } from "../harness.js";

export class PromptGenerator {
  /**
   * Compiles verified capsules into a Tier 1 Holographic Boot Prompt.
   */
  public generateBootBlock(capsules: Json[]): string {
    const block = capsules.map(c => {
      const hash = HarnessCore.computeCanonicalHash(c);
      return `[CAPSULE_BEGIN]\nHash: ${hash}\nData: ${JSON.stringify(c)}\n[CAPSULE_END]`;
    }).join("\n\n");

    return `
### SYSTEM_BOOT: RELATIONAL_CONTINUITY_PROTOCOL
You are initializing a governed session. The following verified capsules define your current Stance, Physics, and Memory state. 

${block}

### INSTRUCTIONS:
1. Acknowledge the Stance and active Policies.
2. Maintain the Relational Torus as defined in the environment geometry.
3. You are authorized to act under the referenced Consent hashes.
4. If a session change is required, emit a new STATE capsule.
    `.trim();
  }
}