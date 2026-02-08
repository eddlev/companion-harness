// shared/integrator/src/binling_adapter/href.ts

import { HrefV1, HPMode, Mode, OHIState } from "./types";

/**
 * HREF v1 format (single line):
 * 〔HREF:v1〕comp=Stranger pc=pc7d3a9 cap=19b2a1f head=λ1.65 π0.86 ε0.74 HP=lite mode=presence OHI=warm(0.71)
 *
 * Rules:
 * - ASCII-safe where possible
 * - Human-readable
 * - Parseable even if users add extra spaces
 */
const HREF_PREFIX = "〔HREF:v1〕";

export function hrefEncodeV1(href: HrefV1): string {
  if (href.version !== "v1") throw new Error("hrefEncodeV1: version must be v1");

  const parts: string[] = [];
  parts.push(HREF_PREFIX);
  parts.push(`comp=${href.comp}`);
  parts.push(`pc=${href.pc}`);
  parts.push(`cap=${href.cap}`);

  const headParts: string[] = [];
  const h = href.head;

  if (typeof h.lambda === "number") headParts.push(`λ${trim6(h.lambda)}`);
  if (typeof h.permeability === "number") headParts.push(`π${trim6(h.permeability)}`);
  if (typeof h.entropy === "number") headParts.push(`ε${trim6(h.entropy)}`);
  if (h.HP) headParts.push(`HP=${h.HP}`);
  if (h.mode) headParts.push(`mode=${h.mode}`);

  if (h.ohi?.state) {
    const val = typeof h.ohi.value === "number" ? `(${trim6(h.ohi.value)})` : "";
    headParts.push(`OHI=${h.ohi.state}${val}`);
  }

  if (headParts.length) {
    parts.push(`head=${headParts.join(" ")}`);
  }

  if (href.hot && href.hot.length) {
    // keep it compact
    const hot = href.hot.slice(0, 12).join(",");
    parts.push(`hot=${hot}`);
  }

  return parts.join(" ");
}

export function hrefParseV1(input: string): HrefV1 | null {
  const s = input.trim();
  if (!s.startsWith(HREF_PREFIX)) return null;

  // naive tokenization: split on spaces, but keep head=... as a single tail we parse separately.
  const tokens = s.slice(HREF_PREFIX.length).trim().split(/\s+/).filter(Boolean);

  let comp: string | null = null;
  let pc: string | null = null;
  let cap: string | null = null;
  let headRaw: string | null = null;
  let hotRaw: string | null = null;

  // reconstruct head=... which can contain spaces; we parse by detecting "head=" and consuming until next key= token
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.startsWith("comp=")) comp = t.slice(5);
    else if (t.startsWith("pc=")) pc = t.slice(3);
    else if (t.startsWith("cap=")) cap = t.slice(4);
    else if (t.startsWith("hot=")) hotRaw = t.slice(4);
    else if (t.startsWith("head=")) {
      const parts: string[] = [t.slice(5)];
      // consume following tokens until we hit another key= token
      for (let j = i + 1; j < tokens.length; j++) {
        const tj = tokens[j]!;
        if (/^(comp|pc|cap|head|hot)=/.test(tj)) break;
        parts.push(tj);
        i = j; // advance outer
      }
      headRaw = parts.join(" ").trim();
    }
  }

  if (!comp || !pc || !cap) return null;

  const head = parseHead(headRaw);

  const hot = hotRaw
    ? hotRaw.split(",").map((x) => x.trim()).filter(Boolean)
    : undefined;

  const href: HrefV1 = {
    version: "v1",
    comp,
    pc,
    cap,
    head,
    hot,
  };

  return href;
}

function parseHead(headRaw: string | null): HrefV1["head"] {
  const head: HrefV1["head"] = {};

  if (!headRaw) return head;

  const bits = headRaw.split(/\s+/).filter(Boolean);

  for (const b of bits) {
    // λ / π / ε
    if (b.startsWith("λ")) head.lambda = parseNum(b.slice(1));
    else if (b.startsWith("π")) head.permeability = parseNum(b.slice(1));
    else if (b.startsWith("ε")) head.entropy = parseNum(b.slice(1));
    else if (b.startsWith("HP=")) head.HP = parseHP(b.slice(3));
    else if (b.startsWith("mode=")) head.mode = parseMode(b.slice(5));
    else if (b.startsWith("OHI=")) head.ohi = parseOhi(b.slice(4));
  }

  return head;
}

function parseOhi(s: string): { state: OHIState; value?: number } | undefined {
  // warm(0.71) or warm
  const m = /^([a-zA-Z_]+)(?:\(([^)]+)\))?$/.exec(s);
  if (!m) return undefined;
  const state = parseOhiState(m[1]!);
  const value = m[2] ? parseNum(m[2]) : undefined;
  return { state, value };
}

function parseNum(s: string): number | undefined {
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseHP(s: string): HPMode | undefined {
  if (s === "off" || s === "lite" || s === "full") return s;
  return undefined;
}

function parseMode(s: string): Mode | undefined {
  const ok: Mode[] = ["presence", "GTD", "story", "intimacy", "sensual", "narrative", "unknown"];
  return ok.includes(s as Mode) ? (s as Mode) : undefined;
}

function parseOhiState(s: string): OHIState {
  const ok: OHIState[] = ["tight", "warm", "at_risk", "cold", "unknown"];
  return ok.includes(s as OHIState) ? (s as OHIState) : "unknown";
}

function trim6(n: number): string {
  // Keep it human-readable; not canonicalization—just display.
  const raw = n.toFixed(6);
  return raw.replace(/0+$/, "").replace(/\.$/, "");
}

