"use client";

import { useEffect, useState } from "react";

import { DownloadIcon, HistoryIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TableRowDTO = {
  slug: string;
  name: string;
  isActive: boolean;
  currentVersion: { versionNum: number; fileSize: number; filename: string } | null;
};

export function TablesAdminClient({ initial }: { initial: TableRowDTO[] }) {
  const t = useTranslations("admin");
  const [openUpload, setOpenUpload] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("tables.headers.slug")}</TableHead>
            <TableHead>{t("tables.headers.version")}</TableHead>
            <TableHead>{t("tables.headers.size")}</TableHead>
            <TableHead className="text-right">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((row) => (
            <TableRow key={row.slug}>
              <TableCell>{row.name}</TableCell>
              <TableCell className="font-mono text-xs">{row.slug}</TableCell>
              <TableCell>v{row.currentVersion?.versionNum ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {row.currentVersion ? formatBytes(row.currentVersion.fileSize) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {row.currentVersion && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon-sm" variant="ghost" asChild>
                          <a
                            href={`/api/files/tables/${row.slug}`}
                            download={row.currentVersion.filename}
                          >
                            <DownloadIcon className="size-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("common.download")}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost" onClick={() => setOpenUpload(row.slug)}>
                        <UploadIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("tables.replace")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost" onClick={() => setOpenHistory(row.slug)}>
                        <HistoryIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("tables.history")}</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ReplaceDialog open={!!openUpload} slug={openUpload ?? ""} onClose={() => setOpenUpload(null)} />
      <HistoryDialog open={!!openHistory} slug={openHistory ?? ""} onClose={() => setOpenHistory(null)} />
    </TooltipProvider>
  );
}

function ReplaceDialog({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tables/${slug}/versions`, { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("tables.toasts.upload-failed", { status: res.status }));
        return;
      }
      toast.success(t("tables.toasts.uploaded"));
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
          <DialogTitle>{t("tables.replace-dialog.title", { slug })}</DialogTitle>
          <DialogDescription>{t("tables.replace-dialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="replace-file">{t("tables.replace-dialog.file-label")}</Label>
            <Input id="replace-file" name="file" type="file" accept=".csv" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="replace-notes">{t("common.notes-optional")}</Label>
            <Input id="replace-notes" name="notes" type="text" />
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

type VersionRow = {
  id: string;
  versionNum: number;
  uploadedAt: string;
  fileSize: number;
  filename: string;
  notes: string | null;
  uploader: { id: string; name: string; email: string } | null;
};

function HistoryDialog({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;
    setVersions(null);
    fetch(`/api/admin/tables/${slug}/versions`)
      .then((r) => r.json())
      .then((d: { versions: VersionRow[] }) => setVersions(d.versions))
      .catch(() => setVersions([]));
  }, [open, slug]);

  async function restore(versionId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tables/${slug}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("tables.toasts.restore-failed", { status: res.status }));
        return;
      }
      toast.success(t("tables.toasts.restored"));
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
          <DialogTitle>{t("tables.history-dialog.title", { slug })}</DialogTitle>
        </DialogHeader>
        {!versions ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("tables.history-dialog.no-versions")}</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id} className="flex justify-between items-center gap-3 p-3 border rounded-md text-sm">
                <div className="min-w-0">
                  <div className="font-medium">
                    v{v.versionNum} · {v.filename}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(v.uploadedAt).toLocaleString()} · {v.uploader?.email ?? t("common.unknown-user")} ·{" "}
                    {formatBytes(v.fileSize)}
                  </div>
                  {v.notes && <div className="text-muted-foreground text-xs italic">{v.notes}</div>}
                </div>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => restore(v.id)}>
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
