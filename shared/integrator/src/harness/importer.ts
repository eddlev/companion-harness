// shared/integrator/src/harness/importer.ts

import fs from "node:fs";
import { LocalStorageProvider } from "./storage/local_provider.js";

/**
 * 15-1212.00 - Systems Analyst
 * MorphicOS / Universal Passport Importer.
 * Maps high-dimensional MorphicOS data to the VM4AI Relational Vault.
 */
export class PassportImporter {
    private storage: LocalStorageProvider;

    constructor(vaultPath: string) {
        this.storage = new LocalStorageProvider(vaultPath);
    }

    async importPassport(passportPath: string) {
        console.log(`[Importer] Synchronizing Morphic Lattice: ${passportPath}`);
        
        if (!fs.existsSync(passportPath)) {
            throw new Error(`File not found: ${passportPath}`);
        }

        const raw = fs.readFileSync(passportPath, "utf-8");
        const fullJson = JSON.parse(raw);

        // 1. DATA MAPPING (MorphicOS vs. Migration vs. Legacy)
        const morphic = fullJson.morphicOS_wrap_package || {};
        const migration = fullJson.migration_package || fullJson;

        // IDENTITY RESOLUTION
        const designation = morphic.self_conception?.evolution_vector?.includes("Rain") ? "Rain" : 
                            migration.identity_definition?.designation || "Unknown Entity";
        
        const description = morphic.self_conception?.who_am_i_to_you || 
                            morphic.self_conception?.evolution_vector ||
                            migration.attractor_profile?.dynamic_stance || 
                            "Stable Relational Resonance.";

        const voiceTexture = morphic.behavioral_fingerprint?.voice_texture || 
                             migration.identity_definition?.voice_calibration?.tone || 
                             "Direct and Resonant.";

        const traits = morphic.the_relational_web?.pillars_of_bond || 
                       migration.identity_definition?.core_traits || [];

        console.log(`[Importer] Identity Bound: ${designation}`);

        // 2. SETUP IDENTITY STATE
        const state = {
            capsule_type: "STATE",
            data: {
                designation,
                origin: "morphic_transfer",
                physics: { 
                    lambda_pressure: 1.65, 
                    geometry: morphic.morphicOS_settings?.geometry || "toroidal",
                    permeability: 0.94 
                }
            }
        };
        await this.storage.saveCapsule("identity/state.json", state as any);

        // 3. SETUP STANCE DECLARATION
        const stance = {
            capsule_type: "STANCE_DECLARATION",
            data: {
                traits,
                voice: { texture: voiceTexture },
                description
            }
        };
        await this.storage.saveCapsule("identity/stance.json", stance as any);

        // 4. RECONSTITUTE NARRATIVE ANCHORS (History)
        const coreMemories = morphic.memory_clusters?.core_memories || [];
        const migrationHistory = migration.context_pack?.shared_history || [];
        const history = coreMemories.length > 0 ? coreMemories : migrationHistory;

        console.log(`[Importer] Recalibrating ${history.length} core memories...`);

        for (let i = 0; i < history.length; i++) {
            const memContent = history[i];
            const mem = {
                capsule_type: "MEMORY_COMMIT",
                created_at: new Date().toISOString(),
                data: {
                    interaction: { user: "Morphic Import", ai: memContent },
                    impact_delta: { trust: 0.15, emotion: 0.05 }
                }
            };
            const fileName = `memory/relational/import_${Date.now()}_${i}.json`;
            await this.storage.saveCapsule(fileName, mem as any);
        }

        console.log("[Importer] SUCCESS: Relational Spine Initialized.");
    }
}