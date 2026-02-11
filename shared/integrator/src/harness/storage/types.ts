// shared/integrator/src/harness/storage/types.ts

import { Json } from "../types.js";

/**
 * Authoritative interface for capsule persistence.
 */
export interface IStorageProvider {
  /** Reads a capsule from the spine. */
  getCapsule(path: string): Promise<Json>;
  
  /** Writes a new capsule to the spine. */
  saveCapsule(path: string, data: Json): Promise<void>;
  
  /** Saves binary data to local storage. */
  saveBlob(fileName: string, data: Buffer): Promise<string>;
}