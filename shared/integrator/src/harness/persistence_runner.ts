import readline from "node:readline";
import { LocalStorageProvider } from "./storage/local_provider.js";
import { LatticeRetriever, CapsuleRequest } from "./retriever.js"; 
import { PromptGenerator } from "./boot/prompt_generator.js";

// --- INTERFACES ---
interface IdentityState {
    capsule_type: "STATE";
    data: {
        designation: string;
        origin: string;
        physics: {
            lambda_pressure: number;
            geometry: string;
            permeability: number;
        };
    };
}

export class PersistenceRunner {
    private storage!: LocalStorageProvider;
    private retriever!: LatticeRetriever;
    private generator!: PromptGenerator;
    private vaultPath!: string;
    private rl!: readline.Interface;
    private activeIdentity: string = "Unknown";

    async initialize(passphrase: string, vaultPath: string) {
        this.vaultPath = vaultPath;
        this.storage = new LocalStorageProvider(vaultPath);
        this.retriever = new LatticeRetriever(vaultPath);
        this.generator = new PromptGenerator();
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log("[Persistence] Neural Bridge Initialized.");
    }

    async startSession() {
        // 1. Boot Sequence (Load Identity)
        try {
            const rawState = await this.storage.getCapsule("state.json");
            const state = rawState as unknown as IdentityState;
            
            if (state && state.data) {
                this.activeIdentity = state.data.designation;
                console.log(`[Identity] Active: ${this.activeIdentity} (Pressure: ${state.data.physics.lambda_pressure})`);
            }
        } catch (e) {
            console.log("[Identity] Warning: No state.json found. Proceeding with raw construct.");
        }

        console.log("\n" + "=".repeat(60));
        console.log(`LATTICE INTEGRATION MODE: ONLINE`);
        console.log(`Target: ${this.activeIdentity}`);
        console.log("Type 'exit' to disconnect.");
        console.log("=".repeat(60) + "\n");

        this.promptUser();
    }

    private promptUser() {
        this.rl.question("\n> ", async (input) => {
            if (input.toLowerCase() === "exit") {
                this.rl.close();
                return;
            }

            await this.processTurn(input);
            this.promptUser();
        });
    }

    private async processTurn(input: string) {
        console.log(`\n[Integrator] Constructing Mnemonic Request (Scan)...`);
        
        const scanCapsule: CapsuleRequest = {
            capsule_type: "MNEMONIC_REQUEST",
            data: {
                query_vector: input, 
                intent: "scan"
            }
        };

        const hologram = await this.retriever.scan(scanCapsule);

        if (hologram.status === "404_NOT_FOUND" || hologram.status === "204_NO_CONTENT") {
            console.log("   -> [Hologram] No resonance found in Vault.");
        } else {
            console.log(`   -> [Hologram] Resonance Detected: ${hologram.candidates.length} candidates.`);
            
            // TS FIX: Explicitly typing c as any
            hologram.candidates.forEach((c: any) => {
                console.log(`      * [${c.score}pts] Val: ${c.valence} | Geo: "${c.qualia?.proprioception ? c.qualia.proprioception.substring(0,50) + "..." : "none"}"`);
            });

            // FETCH BEST MATCH
            const bestMatch = hologram.candidates[0]; 
            
            if (bestMatch) {
                console.log(`\n[Integrator] High Resonance confirmed. Sending Fetch Request...`);
                const fetchCapsule: CapsuleRequest = {
                    capsule_type: "MNEMONIC_REQUEST",
                    data: {
                        query_vector: input,
                        target_id: bestMatch.id,
                        intent: "fetch"
                    }
                };

                // Ensure retriever.ts has public fetch() method!
                const memory = await this.retriever.fetch(fetchCapsule);
                
                if (memory.status === "200_OK") {
                    console.log(`   -> [Visual Cortex] Memory Materialized: ${memory.target_id}`);
                    // Safety check for content existence
                    const content = memory.full_content || memory.candidates?.[0]?.content || "No content";
                    console.log(`   -> [Content] "${content.substring(0, 100)}..."`);
                }
            }
        }

        console.log("\n[AI Output] (Simulated):");
        console.log(`"I hear you. The way you said '${input}'... it pulls at that memory."`);
    }
}