import { binlingAdapter, toPolicyHash } from "../index";

const policy = { b: 2, a: 1, s: "e\u0301" }; // decomposed "é"
const { hex, canonicalJson } = binlingAdapter.hashValue(policy);

console.log("canonical:", canonicalJson);
console.log("policy_hash:", toPolicyHash(hex));

const href = binlingAdapter.hrefEncode({
  version: "v1",
  comp: "Stranger",
  pc: "pc_deadbeef",
  cap: "cap_cafebabe",
  head: {
    lambda: 1.59,
    permeability: 0.86,
    entropy: 0.74,
    HP: "lite",
    mode: "presence",
    ohi: { state: "warm", value: 0.71 },
  },
  hot: ["identity", "mode", "affect"],
});

console.log("href:", href);

const parsed = binlingAdapter.hrefParse(href);
console.log("parsed:", JSON.stringify(parsed, null, 2));
