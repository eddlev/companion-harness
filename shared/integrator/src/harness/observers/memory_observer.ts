import type { HarnessTraceEntry, HarnessFailure } from "../types.js";

export interface MemoryObserverSnapshot {
  requests: string[];
  commits: string[];
  references: string[];
}

export class MemoryObserver {
  private requests: string[] = [];
  private commits: string[] = [];
  private references: string[] = [];

  observe(entry: HarnessTraceEntry): HarnessFailure[] {
    if (!entry.capsule) return [];

    const { capsule_type, capsule_hash } = entry.capsule;

    if (!capsule_hash) return [];

    if (capsule_type === "MEMORY_REQUEST") {
      this.requests.push(capsule_hash);
    }

    if (capsule_type === "MEMORY_COMMIT") {
      this.commits.push(capsule_hash);
    }

    if (capsule_type === "MEMORY_REFERENCE") {
      this.references.push(capsule_hash);
    }

    return [];
  }

  snapshot(): MemoryObserverSnapshot {
    return {
      requests: [...this.requests],
      commits: [...this.commits],
      references: [...this.references],
    };
  }
}
