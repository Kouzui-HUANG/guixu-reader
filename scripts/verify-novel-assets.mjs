import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRoot = resolve(repositoryRoot, "歸墟");
const builtRoots = [
  resolve(repositoryRoot, ".pages-dist", "novel"),
  resolve(repositoryRoot, "reader", "dist", "client", "novel"),
];

async function markdownFiles(root) {
  return (await readdir(root))
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort();
}

const canonicalFiles = await markdownFiles(canonicalRoot);

for (const builtRoot of builtRoots) {
  const builtFiles = await markdownFiles(builtRoot);
  assert.deepEqual(builtFiles, canonicalFiles, `${builtRoot} 的章節清單不同步`);

  for (const file of canonicalFiles) {
    const [canonical, built] = await Promise.all([
      readFile(resolve(canonicalRoot, file)),
      readFile(resolve(builtRoot, file)),
    ]);
    assert.deepEqual(built, canonical, `${builtRoot}/${file} 的內容不同步`);
  }
}

console.log(`Verified ${canonicalFiles.length} canonical manuscript files in both builds.`);
