// shared/integrator/src/harness/observers/memory_observer.ts

import type { HarnessTraceEntry } from "../types.js";

export type MemoryEventType =
  | "MEMORY_REQUEST"
  | "MEMORY_COMMIT"
  | "MEMORY_REFERENCE";

export interface MemoryEvent {
  type: MemoryEventType;
  memory_id: string | null;
  actor: string | null;
  capsule_hash: string | null;
}

export interface MemoryObserverSnapshot {
  requests: MemoryEvent[];
  commits: MemoryEvent[];
  references: MemoryEvent[];
}

export class MemoryObserver {
  private requests: MemoryEvent[] = [];
  private commits: MemoryEvent[] = [];
  private references: MemoryEvent[] = [];

  onCapsule(entry: HarnessTraceEntry): void {
    const type = entry.capsule.capsule_type as MemoryEventType;

    if (
      type !== "MEMORY_REQUEST" &&
      type !== "MEMORY_COMMIT" &&
      type !== "MEMORY_REFERENCE"
    ) {
      return;
    }

    const payload = this.extractPayload(entry);

    const event: MemoryEvent = {
      type,
      memory_id: payload.memory_id ?? null,
      actor: payload.actor ?? null,
      capsule_hash: entry.capsule.capsule_hash ?? null,
    };

    if (type === "MEMORY_REQUEST") {
      this.requests.push(event);
    } else if (type === "MEMORY_COMMIT") {
      this.commits.push(event);
    } else if (type === "MEMORY_REFERENCE") {
      this.references.push(event);
    }
  }

  snapshot(): MemoryObserverSnapshot {
    return {
      requests: [...this.requests],
      commits: [...this.commits],
      references: [...this.references],
    };
  }

  private extractPayload(entry: HarnessTraceEntry): any {
    const capsule: any = entry as any;
    return capsule?.capsule?.payload ?? {};
  }
}
