// Filesystem abstraction for the file catalog. See TCC.md §3.5 for the atomic
// upload pipeline (temp write → DB tx → atomic rename).

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import type { AssetRole, FileCategory } from "@prisma/client";

function storageRoot(): string {
  const root = process.env.STORAGE_PATH;
  if (!root) throw new Error("STORAGE_PATH is not set");
  return path.resolve(root);
}

const CATEGORY_DIR: Record<FileCategory, string> = {
  FILTER: "filters",
  OBJECT: "objects",
  TABLE: "tables",
};

const ASSET_FILENAME: Record<AssetRole, string> = {
  DATA: "data",
  PREVIEW: "preview.fits",
  CUBE: "cube.fits",
};

export type StoredFile = {
  storagePath: string; // relative path under STORAGE_PATH, persisted in DB
  fileHash: string;
  fileSize: number;
};

export function finalRelativePath(args: {
  category: FileCategory;
  slug: string;
  assetRole: AssetRole;
  versionNum: number;
  fileHash: string;
  originalFilename: string;
}): string {
  const ext = path.extname(args.originalFilename);
  const filename = args.assetRole === "DATA" ? `${ASSET_FILENAME.DATA}${ext}` : ASSET_FILENAME[args.assetRole];
  return path.join(CATEGORY_DIR[args.category], args.slug, `v${args.versionNum}-${args.fileHash.slice(0, 8)}`, filename);
}

export function absolutePath(relative: string): string {
  return path.join(storageRoot(), relative);
}

// Streams a Node.js Readable into a temp file under STORAGE_PATH/_tmp, hashing
// while writing. The caller then either commits with `commitTempFile` (which
// performs the atomic rename) or aborts with `abortTempFile`.
export async function writeTempFile(stream: NodeJS.ReadableStream): Promise<{ tmpPath: string; fileHash: string; fileSize: number }> {
  const tmpDir = path.join(storageRoot(), "_tmp");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${randomUUID()}.part`);

  const hash = createHash("sha256");
  let fileSize = 0;
  const out = createWriteStream(tmpPath);
  await pipeline(
    stream,
    async function* (src) {
      for await (const chunk of src as AsyncIterable<Buffer>) {
        hash.update(chunk);
        fileSize += chunk.length;
        yield chunk;
      }
    },
    out,
  );

  return { tmpPath, fileHash: hash.digest("hex"), fileSize };
}

export async function commitTempFile(tmpPath: string, relativeFinal: string): Promise<void> {
  const abs = absolutePath(relativeFinal);
  await mkdir(path.dirname(abs), { recursive: true });
  await rename(tmpPath, abs);
}

export async function abortTempFile(tmpPath: string): Promise<void> {
  await unlink(tmpPath).catch(() => undefined);
}

// Convenience for the seed script: copy a source file into storage at a final
// path, computing hash + size. Used to bootstrap /public/data/ into the catalog.
export async function importLocalFile(args: {
  sourcePath: string;
  category: FileCategory;
  slug: string;
  assetRole: AssetRole;
  versionNum: number;
}): Promise<StoredFile & { mimeType: string }> {
  const { sourcePath, category, slug, assetRole, versionNum } = args;

  const hash = createHash("sha256");
  let fileSize = 0;
  for await (const chunk of createReadStream(sourcePath) as AsyncIterable<Buffer>) {
    hash.update(chunk);
    fileSize += chunk.length;
  }
  const fileHash = hash.digest("hex");

  const relative = finalRelativePath({
    category,
    slug,
    assetRole,
    versionNum,
    fileHash,
    originalFilename: path.basename(sourcePath),
  });
  const abs = absolutePath(relative);

  await mkdir(path.dirname(abs), { recursive: true });
  await pipeline(createReadStream(sourcePath), createWriteStream(abs));

  // Sanity check: ensure size matches what we just hashed.
  const s = await stat(abs);
  if (s.size !== fileSize) throw new Error(`size mismatch importing ${sourcePath}`);

  return {
    storagePath: relative,
    fileHash,
    fileSize,
    mimeType: guessMimeType(sourcePath),
  };
}

function guessMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".txt":
      return "text/plain";
    case ".csv":
      return "text/csv";
    case ".fits":
      return "application/fits";
    default:
      return "application/octet-stream";
  }
}

export function streamFromDisk(relative: string): NodeJS.ReadableStream {
  return createReadStream(absolutePath(relative));
}
