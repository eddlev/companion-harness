// shared/integrator/src/harness/io.ts

import fs from "node:fs";
import path from "node:path";
import { Json } from "./types.js";

export function resolvePath(baseDir: string, p: string): string {
  if (!p) throw new Error("resolvePath: empty path");
  // Absolute (Windows or POSIX) => return as-is
  if (path.isAbsolute(p)) return p;
  return path.resolve(baseDir, p);
}

export function readJsonFile(absPath: string): Json {
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const raw = fs.readFileSync(absPath, "utf-8");
  try {
    return JSON.parse(raw) as Json;
  } catch {
    throw new Error(`Invalid JSON: ${absPath}`);
  }
}

export function writeJsonFile(absPath: string, data: unknown): void {
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });
  const out = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(absPath, out, "utf-8");
}
