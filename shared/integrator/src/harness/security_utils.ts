// shared/integrator/src/harness/security_utils.ts

import crypto from "node:crypto";
import fs from "node:fs";

/**
 * Securely decrypts .env.enc using AES-256-CBC.
 */
export function decryptEnv(encPath: string, passphrase: string): Record<string, string> {
  if (!fs.existsSync(encPath)) {
    throw new Error(`Encrypted environment file not found at: ${encPath}`);
  }

  const data = fs.readFileSync(encPath);
  if (data.length < 32) throw new Error("Invalid .env.enc file format.");
  
  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 32);
  const ciphertext = data.subarray(32);

  const key = crypto.scryptSync(passphrase, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString();

  const env: Record<string, string> = {};
  decrypted.split(/\r?\n/).forEach(line => {
    const [k, v] = line.split("=");
    if (k && v) env[k.trim()] = v.trim();
  });

  return env;
}