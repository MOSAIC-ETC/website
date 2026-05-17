"use client";

import { useEffect, useState } from "react";

import { DownloadIcon, HistoryIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ObjectRow = {
  slug: string;
  name: string;
  isActive: boolean;
  versionNum: number | null;
  previewSize: number | null;
  cubeSize: number | null;
};

export function ObjectsAdminClient({ initial }: { initial: ObjectRow[] }) {
  const t = useTranslations("admin");
  const [openUpload, setOpenUpload] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("objects.headers.slug")}</TableHead>
            <TableHead>{t("objects.headers.version")}</TableHead>
            <TableHead>{t("objects.headers.size")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead className="text-right">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={() => setOpenNew(true)}>
                    <PlusIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("objects.new-object")}</TooltipContent>
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                {t("objects.empty")}
              </TableCell>
            </TableRow>
          ) : (
            initial.map((row) => (
              <ObjectTableRow
                key={row.slug}
                row={row}
                onUpload={() => setOpenUpload(row.slug)}
                onHistory={() => setOpenHistory(row.slug)}
              />
            ))
          )}
        </TableBody>
      </Table>

      <UploadVersionDialog open={!!openUpload} slug={openUpload ?? ""} onClose={() => setOpenUpload(null)} />
      <HistoryDialog open={!!openHistory} slug={openHistory ?? ""} onClose={() => setOpenHistory(null)} />
      <NewObjectDialog open={openNew} onClose={() => setOpenNew(false)} />
    </TooltipProvider>
  );
}

function ObjectTableRow({
  row,
  onUpload,
  onHistory,
}: {
  row: ObjectRow;
  onUpload: () => void;
  onHistory: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(t("objects.delete-confirm", { name: row.name }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/objects/${row.slug}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("objects.toasts.delete-failed", { status: res.status }));
        return;
      }
      toast.success(t("objects.toasts.deleted"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const sizeLabel =
    row.previewSize !== null && row.cubeSize !== null
      ? `${formatBytes(row.previewSize)} + ${formatBytes(row.cubeSize)}`
      : "—";

  return (
    <TableRow>
      <TableCell>{row.name}</TableCell>
      <TableCell className="font-mono text-xs">{row.slug}</TableCell>
      <TableCell>v{row.versionNum ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-xs">{sizeLabel}</TableCell>
      <TableCell>
        <Badge variant={row.isActive ? "default" : "destructive"}>
          {row.isActive ? t("common.active") : t("common.deleted")}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {row.versionNum !== null && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" disabled={busy}>
                      <DownloadIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t("common.download")}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={`/api/files/objects/${row.slug}/preview`} download>
                    {t("objects.download-preview")}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/api/files/objects/${row.slug}/cube`} download>
                    {t("objects.download-cube")}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={onUpload} disabled={busy}>
                <UploadIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("objects.upload-version")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={onHistory} disabled={busy}>
                <HistoryIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("objects.history")}</TooltipContent>
          </Tooltip>
          {row.isActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost" onClick={onDelete} disabled={busy}>
                  <Trash2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("common.delete")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function UploadVersionDialog({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/objects/${slug}/versions`, { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("objects.toasts.upload-failed", { status: res.status }));
        return;
      }
      toast.success(t("objects.toasts.uploaded"));
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("objects.upload-dialog.title", { slug })}</DialogTitle>
          <DialogDescription>{t("objects.upload-dialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upload-preview">{t("objects.upload-dialog.preview-label")}</Label>
            <Input id="upload-preview" name="preview" type="file" accept=".fits,.fit" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upload-cube">{t("objects.upload-dialog.cube-label")}</Label>
            <Input id="upload-cube" name="cube" type="file" accept=".fits,.fit" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upload-notes">{t("common.notes-optional")}</Label>
            <Input id="upload-notes" name="notes" type="text" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.uploading") : t("common.upload")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewObjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/objects", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("objects.toasts.create-failed", { status: res.status }));
        return;
      }
      toast.success(t("objects.toasts.created"));
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("objects.new-dialog.title")}</DialogTitle>
          <DialogDescription>{t("objects.new-dialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-slug">{t("objects.new-dialog.slug")}</Label>
              <Input
                id="new-slug"
                name="slug"
                type="text"
                required
                pattern="[a-z0-9][a-z0-9_-]{0,63}"
                placeholder={t("objects.new-dialog.slug-placeholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">{t("objects.new-dialog.display-name")}</Label>
              <Input
                id="new-name"
                name="name"
                type="text"
                required
                placeholder={t("objects.new-dialog.name-placeholder")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-preview">{t("objects.upload-dialog.preview-label")}</Label>
            <Input id="new-preview" name="preview" type="file" accept=".fits,.fit" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-cube">{t("objects.upload-dialog.cube-label")}</Label>
            <Input id="new-cube" name="cube" type="file" accept=".fits,.fit" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-notes">{t("common.notes-optional")}</Label>
            <Input id="new-notes" name="notes" type="text" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.creating") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PairedVersion = {
  versionNum: number;
  uploadedAt: string;
  preview: { fileSize: number; filename: string } | null;
  cube: { fileSize: number; filename: string } | null;
  uploaderEmail: string | null;
  notes: string | null;
};

type HistorySlot = {
  id: string;
  assetRole: "PREVIEW" | "CUBE";
  versions: Array<{
    id: string;
    versionNum: number;
    uploadedAt: string;
    fileSize: number;
    filename: string;
    notes: string | null;
    uploader: { id: string; name: string; email: string } | null;
  }>;
};

function HistoryDialog({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [paired, setPaired] = useState<PairedVersion[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;
    setPaired(null);
    fetch(`/api/admin/objects/${slug}/versions`)
      .then((r) => r.json())
      .then((d: { slots: HistorySlot[] }) => setPaired(pairVersions(d.slots)))
      .catch(() => setPaired([]));
  }, [open, slug]);

  async function restore(versionNum: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/objects/${slug}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNum }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("objects.toasts.restore-failed", { status: res.status }));
        return;
      }
      toast.success(t("objects.toasts.restored"));
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("objects.history-dialog.title", { slug })}</DialogTitle>
        </DialogHeader>
        {!paired ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : paired.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("objects.history-dialog.no-versions")}</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {paired.map((v) => (
              <li
                key={v.versionNum}
                className="flex justify-between items-center gap-3 p-3 border rounded-md text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">v{v.versionNum}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(v.uploadedAt).toLocaleString()} · {v.uploaderEmail ?? t("common.unknown-user")}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {v.preview ? `preview ${formatBytes(v.preview.fileSize)}` : "—"} ·{" "}
                    {v.cube ? `cube ${formatBytes(v.cube.fileSize)}` : "—"}
                  </div>
                  {v.notes && <div className="text-muted-foreground text-xs italic">{v.notes}</div>}
                </div>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => restore(v.versionNum)}>
                  {t("common.restore")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function pairVersions(slots: HistorySlot[]): PairedVersion[] {
  const preview = slots.find((s) => s.assetRole === "PREVIEW");
  const cube = slots.find((s) => s.assetRole === "CUBE");
  const map = new Map<number, PairedVersion>();
  for (const v of preview?.versions ?? []) {
    map.set(v.versionNum, {
      versionNum: v.versionNum,
      uploadedAt: v.uploadedAt,
      preview: { fileSize: v.fileSize, filename: v.filename },
      cube: null,
      uploaderEmail: v.uploader?.email ?? null,
      notes: v.notes,
    });
  }
  for (const v of cube?.versions ?? []) {
    const entry = map.get(v.versionNum) ?? {
      versionNum: v.versionNum,
      uploadedAt: v.uploadedAt,
      preview: null,
      cube: null,
      uploaderEmail: v.uploader?.email ?? null,
      notes: v.notes,
    };
    entry.cube = { fileSize: v.fileSize, filename: v.filename };
    map.set(v.versionNum, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.versionNum - a.versionNum);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
