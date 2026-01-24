import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/inspect-cinode.mjs fixtures/cinode/cv-sv.json");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(file, "utf8"));

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const walk = (node, path, out) => {
  if (Array.isArray(node)) {
    out.arrays[path] = Math.max(out.arrays[path] ?? 0, node.length);
    if (node.length > 0) walk(node[0], `${path}[0]`, out);
    return;
  }
  if (isObj(node)) {
    out.objects[path] = Object.keys(node).slice(0, 50);
    for (const k of Object.keys(node)) {
      const v = node[k];
      const next = path ? `${path}.${k}` : k;
      if (isObj(v) || Array.isArray(v)) walk(v, next, out);
    }
  }
};

const out = { arrays: {}, objects: {} };
walk(raw, "", out);

// Print a focused summary
console.log("Top-level keys:", Object.keys(raw));
console.log("\nLargest arrays (top 20):");
Object.entries(out.arrays)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([p, n]) => console.log(`${n}\t${p}`));

console.log("\nInteresting object nodes (top 30 by key count):");
Object.entries(out.objects)
  .map(([p, ks]) => [p, ks.length, ks])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([p, n, ks]) => console.log(`${n}\t${p}\t[${ks.join(", ")}]`));
