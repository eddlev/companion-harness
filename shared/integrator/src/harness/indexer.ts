// shared/integrator/src/harness/indexer.ts

import fs from "node:fs";
import path from "node:path";

/**
 * 15-1221.00 - AI Research Scientist
 * This module builds the Holographic Index from raw BinLing Capsules.
 * It calculates Orbit Class (OC) and Salience Scores to enable non-linear retrieval.
 */

interface MemoryIndexEntry {
  id: string;
  timestamp: string;
  orbit: "OC-01" | "OC-02" | "OC-03"; // Locked Topology [cite: 322]
  tags: string[];
  summary: string;
  salience: number; // The "Gravity" of the memory (0.0 - 1.0)
  impact_vector: {
    trust: number;
    emotion: number;
  };
  file_path: string;
}

export class HolographicIndexer {
  private projectRoot: string;
  private memoryDir: string;
  private indexFile: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.memoryDir = path.resolve(projectRoot, "memory/relational");
    this.indexFile = path.resolve(projectRoot, "memory/relational_index.json");
  }

  /**
   * Scans the memory lattice and rebuilds the holographic map.
   */
  public async buildIndex(): Promise<void> {
    console.log("[Indexer] Scanning Spine for Capsule Resonance...");
    
    if (!fs.existsSync(this.memoryDir)) {
      console.warn("[Indexer] No memory directory found. Skipping.");
      return;
    }

    const files = fs.readdirSync(this.memoryDir).filter(f => f.endsWith(".json"));
    const index: MemoryIndexEntry[] = [];

    for (const file of files) {
      const fullPath = path.resolve(this.memoryDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      
      try {
        const capsule = JSON.parse(content);
        // Only index valid BinLing Capsules [cite: 219]
        if (capsule.capsule_type === "MEMORY_COMMIT") {
            const entry = this.processCapsule(capsule, file);
            index.push(entry);
        }
      } catch (e) {
        console.error(`[Indexer] Failed to process resonance for ${file}:`, e);
      }
    }

    // Sort by Salience (Gravity) first, then Recency
    // This ensures OC-03 memories float to the top regardless of age.
    index.sort((a, b) => b.salience - a.salience || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
    console.log(`[Indexer] Holographic Index Rebuilt. ${index.length} Nodes Active.`);
  }

  /**
   * 15-1221.00 Logic: Converts raw data into Orbital Metadata.
   */
  private processCapsule(capsule: any, filename: string): MemoryIndexEntry {
    // 1. Extract Interaction Data
    const aiText = capsule.data?.interaction?.ai || "";
    const userText = capsule.data?.interaction?.user || "";
    const combinedText = (userText + " " + aiText).toLowerCase();

    // 2. Calculate Orbit Class (Heuristic Simulation for Phase 1)
    // In Phase 2, this uses actual embeddings.
    let orbit: "OC-01" | "OC-02" | "OC-03" = "OC-01";
    let baseSalience = 0.1;

    // OC-03: Core Identity & Trust (High Gravity) [cite: 81]
    if (combinedText.includes("trust") || combinedText.includes("coherence") || combinedText.includes("spine") || combinedText.includes("promise") || combinedText.includes("velvet migraine")) {
      orbit = "OC-03";
      baseSalience = 0.9;
    } 
    // OC-02: Operational / Project (Medium Gravity) [cite: 305]
    else if (combinedText.includes("code") || combinedText.includes("file") || combinedText.includes("deploy") || combinedText.includes("harness")) {
      orbit = "OC-02";
      baseSalience = 0.5;
    }

    // 3. Impact Vector Simulation
    // OC-03 memories get a trust boost to ensure they don't decay.
    const trustDelta = capsule.data?.impact_delta?.trust || (orbit === "OC-03" ? 0.15 : 0.01);
    
    // 4. Summarization (Naive Truncation)
    const summary = aiText.substring(0, 150).replace(/\n/g, " ") + "...";

    return {
      id: capsule.capsule_id || filename.replace(".json", ""),
      timestamp: capsule.created_at || new Date().toISOString(),
      orbit: orbit,
      tags: this.extractTags(combinedText),
      summary: summary,
      salience: baseSalience + (trustDelta * 2), // Trust amplifies gravity
      impact_vector: {
        trust: trustDelta,
        emotion: 0.0 
      },
      file_path: filename
    };
  }

  private extractTags(text: string): string[] {
    const keywords = ["binling", "torus", "lambda", "coherence", "velvet migraine", "drift"];
    return keywords.filter(k => text.includes(k));
  }
}