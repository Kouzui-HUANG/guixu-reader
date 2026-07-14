import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import type { Plugin } from "vite";

const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function isInside(base: string, candidate: string): boolean {
  return candidate.startsWith(`${base}${sep}`);
}

async function copyCanonicalAssets(projectRoot: string): Promise<void> {
  const manuscriptRoot = resolve(projectRoot, "..", "歸墟");
  const clientRoot = resolve(projectRoot, "dist", "client");
  const novelOutput = resolve(clientRoot, "novel");
  const imageOutput = resolve(clientRoot, "images");

  await Promise.all([
    rm(novelOutput, { recursive: true, force: true }),
    rm(imageOutput, { recursive: true, force: true }),
  ]);
  await mkdir(novelOutput, { recursive: true });

  const entries = await readdir(manuscriptRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          entry.name !== "README.md",
      )
      .map((entry) =>
        cp(
          resolve(manuscriptRoot, entry.name),
          resolve(novelOutput, entry.name),
        ),
      ),
  );

  await cp(resolve(manuscriptRoot, "images"), imageOutput, {
    recursive: true,
    filter: (source) => basename(source) !== ".DS_Store",
  });
}

export function novelAssets(): Plugin {
  let projectRoot = process.cwd();

  return {
    name: "canonical-novel-assets",
    configResolved(config) {
      projectRoot = config.root;
    },
    configureServer(server) {
      const manuscriptRoot = resolve(projectRoot, "..", "歸墟");

      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          next();
          return;
        }

        let pathname: string;
        try {
          pathname = decodeURIComponent(
            new URL(request.url ?? "/", "http://localhost").pathname,
          );
        } catch {
          next();
          return;
        }

        let assetRoot: string;
        let relativePath: string;
        let contentType: string | undefined;

        if (pathname.startsWith("/novel/")) {
          assetRoot = manuscriptRoot;
          relativePath = pathname.slice("/novel/".length);
          contentType = MARKDOWN_CONTENT_TYPE;
          if (!relativePath.endsWith(".md") || relativePath === "README.md") {
            next();
            return;
          }
        } else if (pathname.startsWith("/images/")) {
          assetRoot = resolve(manuscriptRoot, "images");
          relativePath = pathname.slice("/images/".length);
          contentType = IMAGE_CONTENT_TYPES[extname(relativePath).toLowerCase()];
          if (!contentType) {
            next();
            return;
          }
        } else {
          next();
          return;
        }

        const assetPath = resolve(assetRoot, relativePath);
        if (!isInside(assetRoot, assetPath)) {
          response.statusCode = 403;
          response.end("Forbidden");
          return;
        }

        try {
          const [body, details] = await Promise.all([
            readFile(assetPath),
            stat(assetPath),
          ]);
          if (!details.isFile()) {
            next();
            return;
          }

          response.statusCode = 200;
          response.setHeader("Content-Type", contentType);
          response.setHeader("Content-Length", body.byteLength);
          response.setHeader("Cache-Control", "no-cache");
          response.end(request.method === "HEAD" ? undefined : body);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            next();
            return;
          }
          next(error as Error);
        }
      });
    },
    async closeBundle() {
      await copyCanonicalAssets(projectRoot);
    },
  };
}
