// shared/integrator/src/harness/observers/capsule_observer.ts

import type { HarnessTraceEntry } from "../types.js";

export interface CapsuleObserverSnapshot {
  total_capsules: number;
  by_type: Record<string, number>;
  ordered_types: string[];
}

export class CapsuleObserver {
  private total = 0;
  private byType: Record<string, number> = {};
  private orderedTypes: string[] = [];

  onCapsule(entry: HarnessTraceEntry): void {
    const type = entry.capsule.capsule_type;

    this.total += 1;
    this.byType[type] = (this.byType[type] ?? 0) + 1;
    this.orderedTypes.push(type);
  }

  snapshot(): CapsuleObserverSnapshot {
    return {
      total_capsules: this.total,
      by_type: { ...this.byType },
      ordered_types: [...this.orderedTypes],
    };
  }
}
