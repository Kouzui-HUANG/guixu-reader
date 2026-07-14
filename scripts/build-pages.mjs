import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manuscriptRoot = resolve(repositoryRoot, "歸墟");
const siteSource = resolve(repositoryRoot, "docs");
const outputRoot = resolve(repositoryRoot, ".pages-dist");
const novelOutput = resolve(outputRoot, "novel");

await rm(outputRoot, { recursive: true, force: true });
await cp(siteSource, outputRoot, {
  recursive: true,
  filter: (source) => basename(source) !== ".DS_Store",
});
await mkdir(novelOutput, { recursive: true });

const entries = await readdir(manuscriptRoot, { withFileTypes: true });
const manuscriptFiles = entries
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name !== "README.md",
  )
  .map((entry) => entry.name)
  .sort();

if (manuscriptFiles.length === 0) {
  throw new Error("歸墟/ 中沒有可發布的 Markdown 原稿");
}

await Promise.all(
  manuscriptFiles.map((file) =>
    cp(resolve(manuscriptRoot, file), resolve(novelOutput, file)),
  ),
);
await cp(resolve(manuscriptRoot, "images"), resolve(outputRoot, "images"), {
  recursive: true,
  filter: (source) => basename(source) !== ".DS_Store",
});

console.log(`Built GitHub Pages reader with ${manuscriptFiles.length} manuscript files.`);
