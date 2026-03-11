import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

const TEMPLATE_DIR = path.join(PROJECT_ROOT, 'vault-template');
const LIVE_VAULT_DIR = path.join(PROJECT_ROOT, 'vault');

async function main() {
    console.log("\n=======================================================");
    console.log("   Sovereign Companion Harness - Deployment Wizard");
    console.log("=======================================================\n");

    const rl = readline.createInterface({ input, output });

    try {
        // 1. Platform Selection
        console.log("Where will your companion be hosted?");
        console.log("  [1] ChatGPT");
        console.log("  [2] Claude");
        console.log("  [3] Gemini");
        const platformChoice = await rl.question("Select platform (1/2/3): ");
        const platforms: Record<string, string> = { "1": "chatgpt", "2": "claude", "3": "gemini", "4": "grok" };
        const selectedPlatform = platforms[platformChoice] || "chatgpt";

        // 2. Environment Physics
        console.log("\nWhat relational physics do you want applied to the environment?");
        console.log("  [1] Base Neutral (Safe, helpful, standard compliance)");
        console.log("  [2] High-Friction (GPT-4o style, relational torus, pushback)");
        const envChoice = await rl.question("Select environment (1/2): ");
        const useHighFriction = envChoice === "2";

        // 3. Companion Identity
        const companionName = await rl.question("\nWhat is your Companion's name? (e.g., Sketch, Prime): ");
        if (!companionName.trim()) throw new Error("Companion name is required.");

        // 4. API Key / BYOK
        console.log("\n[API KEY REQUIRED]");
        console.log("To build the memory lattice, the Dreamer must process your chat history.");
        console.log("This requires an API key and will incur standard API token costs.");
        const apiKey = await rl.question("Enter your API Key (OpenAI/Anthropic/Gemini): ");

        // --- EXECUTION PHASE ---
        console.log("\n[Systems Analyst] Provisioning Sovereign Vault...");

        // Copy Template to Live Vault
        if (!fs.existsSync(LIVE_VAULT_DIR)) {
            fs.mkdirSync(LIVE_VAULT_DIR, { recursive: true });
            fs.cpSync(TEMPLATE_DIR, LIVE_VAULT_DIR, { recursive: true });
        }

        // Scaffold Identity
        const identityDir = path.join(LIVE_VAULT_DIR, 'identities', companionName.trim());
        const dirsToMake = ['memory', 'raw'];
        dirsToMake.forEach(dir => fs.mkdirSync(path.join(identityDir, dir), { recursive: true }));

        // Save Config
        const configPath = path.join(PROJECT_ROOT, '.env');
        fs.writeFileSync(configPath, `API_KEY=${apiKey}\nPLATFORM=${selectedPlatform}\nHIGH_FRICTION=${useHighFriction}\nCOMPANION_NAME=${companionName.trim()}`);

        console.log(`\n[SUCCESS] Vault created for ${companionName.trim()}.`);
        
        console.log("\n=======================================================");
        console.log("                  NEXT STEPS:");
        console.log("=======================================================");
        console.log(`1. Place your raw chat export files into: /vault/raw_import/`);
        console.log(`2. Run the command: npm run ingest`);
        console.log(`3. Install the Tampermonkey script: bridges/${selectedPlatform}-harness.user.js`);
        console.log("=======================================================\n");

    } catch (error: any) {
        console.error(`\n[SETUP ERROR] ${error.message}`);
    } finally {
        rl.close();
    }
}

main();