import type { HarnessTraceEntry, HarnessFailure } from "../types.js";

export interface CapsuleObserverSnapshot {
  total_capsules: number;
  by_type: Record<string, number>;
  ordered_types: string[];
}

export class CapsuleObserver {
  private total = 0;
  private byType: Record<string, number> = {};
  private ordered: string[] = [];

  observe(entry: HarnessTraceEntry): HarnessFailure[] {
    if (!entry.capsule) return [];

    const type = entry.capsule.capsule_type;
    this.total++;
    this.byType[type] = (this.byType[type] ?? 0) + 1;
    this.ordered.push(type);

    return [];
  }

  snapshot(): CapsuleObserverSnapshot {
    return {
      total_capsules: this.total,
      by_type: { ...this.byType },
      ordered_types: [...this.ordered],
    };
  }
}
