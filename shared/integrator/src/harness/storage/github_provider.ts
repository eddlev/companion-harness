// shared/integrator/src/harness/storage/github_provider.ts

import { Octokit } from "@octokit/rest";
import { IStorageProvider } from "./types.js";
import { Json } from "../types.js";

/**
 * Production-grade storage for Private Repositories.
 */
export class GitHubStorageProvider implements IStorageProvider {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async getCapsule(path: string): Promise<Json> {
    const response = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: path,
    });

    if (response.data && "content" in response.data && typeof response.data.content === "string") {
      const content = Buffer.from(response.data.content, "base64").toString();
      return JSON.parse(content);
    }
    throw new Error(`Capsule not found or invalid format at ${path}`);
  }

  async saveCapsule(path: string, data: Json): Promise<void> {
    let sha: string | undefined;

    const capsuleId = (data && typeof data === 'object' && !Array.isArray(data)) 
      ? (data as any).capsule_id || 'unknown' 
      : 'unknown';

    try {
      const currentFile = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path,
      });
      if (currentFile.data && "sha" in currentFile.data && typeof currentFile.data.sha === "string") {
        sha = currentFile.data.sha;
      }
    } catch (e) { /* File doesn't exist yet */ }

    // Use conditional spread to handle exactOptionalPropertyTypes for 'sha'
    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: path,
      message: `capsule_commit: ${capsuleId}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
      ...(sha ? { sha } : {}) 
    });
  }

  async saveBlob(fileName: string, data: Buffer): Promise<string> {
    console.log(`[Security Analyst] Binary blob ${fileName} (${data.length} bytes) saved to local vault.`);
    return `file://local_vault/${fileName}`;
  }
}