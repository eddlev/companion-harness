import fs from 'node:fs';
import path from 'node:path';

/**
 * 15-1212.15 - Lattice Retriever (Hybrid)
 * Supports: Server (scan) AND Persistence Runner (fetch)
 * Includes: Safety checks for empty vaults.
 */

// 1. EXPORT THE INTERFACE (Fixes TS2305)
export interface CapsuleRequest {
    capsule_type: string;
    data: any;
}

export class LatticeRetriever {
    private vaultPath: string;
    private indexPath: string;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.indexPath = path.join(vaultPath, "vector_index.json");
    }

    // 2. THE SCAN METHOD (Used by Server)
    public async scan(request: CapsuleRequest): Promise<any> {
        return this.performRetrieval(request);
    }

    // 3. THE FETCH METHOD (Used by Runner - Fixes TS2339)
    public async fetch(request: CapsuleRequest): Promise<any> {
        // For now, we route fetch through the same logic, 
        // as the index is simple.
        return this.performRetrieval(request);
    }

    private async performRetrieval(request: CapsuleRequest): Promise<any> {
        return new Promise((resolve) => {
            // SAFETY: Timeout logic
            const safetyTimer = setTimeout(() => {
                console.log("[Retriever] Warning: Op timed out. Returning empty.");
                resolve({ status: "204_NO_CONTENT", candidates: [] });
            }, 2000);

            try {
                if (!fs.existsSync(this.indexPath)) {
                    clearTimeout(safetyTimer);
                    return resolve({ status: "204_NO_CONTENT", candidates: [] });
                }

                const rawData = fs.readFileSync(this.indexPath, 'utf-8');
                if (!rawData || rawData.trim() === "") {
                    clearTimeout(safetyTimer);
                    return resolve({ status: "204_NO_CONTENT", candidates: [] });
                }

                const index = JSON.parse(rawData);
                // Handle different data structures for query
                const queryText = request.data.query_vector || request.data.id || "";
                const queryTerms = this.tokenize(queryText);

                const candidates = index.filter((entry: any) => {
                    return queryTerms.some(term => 
                        (entry.keywords && entry.keywords.includes(term)) ||
                        (entry.content && entry.content.toLowerCase().includes(term))
                    );
                });

                clearTimeout(safetyTimer);

                if (candidates.length === 0) {
                    resolve({ status: "404_NOT_FOUND", candidates: [] });
                } else {
                    resolve({ 
                        status: "200_OK", 
                        candidates: candidates.map((c: any) => ({ ...c, score: 1.5 })) 
                    });
                }

            } catch (error) {
                console.error("[Retriever] Error:", error);
                clearTimeout(safetyTimer);
                resolve({ status: "500_ERROR", candidates: [] });
            }
        });
    }

    private tokenize(text: string): string[] {
        if (!text) return [];
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);
    }
}