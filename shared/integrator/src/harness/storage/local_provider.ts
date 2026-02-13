// shared/integrator/src/harness/storage/local_provider.ts

import fs from "node:fs";
import path from "node:path";
import { IStorageProvider } from "./types.js";
import { Json } from "../types.js";

/**
 * 15-1212.00 - Systems Analyst
 * Production-grade local storage provider.
 * Implements the IStorageProvider interface for seamless architectural swapping.
 */
export class LocalStorageProvider implements IStorageProvider {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.ensureRootExists();
  }

  private ensureRootExists() {
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /**
   * Reads a capsule from the local file system.
   */
  async getCapsule(filePath: string): Promise<Json> {
    const fullPath = path.resolve(this.rootDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[LocalStorage] File not found: ${fullPath}`);
    }

    const content = await fs.promises.readFile(fullPath, "utf-8");
    try {
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`[LocalStorage] Invalid JSON in file: ${filePath}`);
    }
  }

  /**
   * Saves a capsule to the local file system.
   * Ensures parent directories exist.
   */
  async saveCapsule(filePath: string, data: Json): Promise<void> {
    const fullPath = path.resolve(this.rootDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    const content = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(fullPath, content, "utf-8");
  }

  /**
   * Saves binary data to local storage (Vault).
   */
  async saveBlob(fileName: string, data: Buffer): Promise<string> {
    const blobDir = path.resolve(this.rootDir, "vault");
    
    if (!fs.existsSync(blobDir)) {
      await fs.promises.mkdir(blobDir, { recursive: true });
    }

    const fullPath = path.resolve(blobDir, fileName);
    await fs.promises.writeFile(fullPath, data);
    
    return `file://${fullPath}`;
  }
}