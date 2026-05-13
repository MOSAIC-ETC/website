// Public file streaming: serves the current FileVersion for a slot.
// No auth — files are publicly downloadable. See TCC.md §3.7 for caching.

import { Readable } from "node:stream";

import type { AssetRole, FileCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { absolutePath } from "@/lib/storage";

type Params = { params: Promise<{ path: string[] }> };

type Lookup = { category: FileCategory; slug: string; assetRole: AssetRole };

function parsePath(parts: string[]): Lookup | null {
  if (parts.length === 2) {
    const [kind, slug] = parts;
    if (kind === "filters") return { category: "FILTER", slug, assetRole: "DATA" };
    if (kind === "tables") return { category: "TABLE", slug, assetRole: "DATA" };
  }
  if (parts.length === 3 && parts[0] === "objects") {
    const [, slug, role] = parts;
    if (role === "preview") return { category: "OBJECT", slug, assetRole: "PREVIEW" };
    if (role === "cube") return { category: "OBJECT", slug, assetRole: "CUBE" };
  }
  return null;
}

export async function GET(req: Request, { params }: Params): Promise<Response> {
  const { path: parts } = await params;
  const lookup = parsePath(parts);
  if (!lookup) return new Response("Not Found", { status: 404 });

  const file = await prisma.file.findUnique({
    where: { category_slug_assetRole: lookup },
    include: { currentVersion: true },
  });
  if (!file || !file.isActive || !file.currentVersion) {
    return new Response("Not Found", { status: 404 });
  }

  const { fileHash, fileSize, mimeType, storagePath, filename } = file.currentVersion;
  const etag = `"${fileHash}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Length": fileSize.toString(),
    "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
    ETag: etag,
    "Cache-Control": "public, max-age=3600",
  });

  const { createReadStream } = await import("node:fs");
  const nodeStream = createReadStream(absolutePath(storagePath));
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new Response(webStream, { status: 200, headers });
}
