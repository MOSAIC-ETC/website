"use client";

import { useEffect, useState } from "react";

import { HistoryIcon, PlusIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FilterRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  currentVersion: {
    versionNum: number;
    fileHash: string;
    fileSize: number;
    filename: string;
    metadata: { effWavelengthNm: number; effWavelengthUnit: "NM" | "UM"; zeroPoint: number } | null;
  } | null;
};

export function FilterAdminClient({ initial }: { initial: FilterRow[] }) {
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
            <TableHead>{t("filters.headers.wavelength")}</TableHead>
            <TableHead>{t("filters.headers.version")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead className="text-right">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={() => setOpenNew(true)}>
                    <PlusIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("filters.new-filter")}</TooltipContent>
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((row) => {
            const wl = row.currentVersion?.metadata
              ? `${row.currentVersion.metadata.effWavelengthNm} ${row.currentVersion.metadata.effWavelengthUnit.toLowerCase()}`
              : "—";
            return (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{wl}</TableCell>
                <TableCell>v{row.currentVersion?.versionNum ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={row.isActive ? "default" : "destructive"}>
                    {row.isActive ? t("common.active") : t("common.deleted")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon-sm" variant="ghost" onClick={() => setOpenUpload(row.slug)}>
                          <UploadIcon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("filters.upload-version")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon-sm" variant="ghost" onClick={() => setOpenHistory(row.slug)}>
                          <HistoryIcon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("filters.history")}</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <UploadVersionDialog open={!!openUpload} slug={openUpload ?? ""} onClose={() => setOpenUpload(null)} />
      <HistoryDialog open={!!openHistory} slug={openHistory ?? ""} onClose={() => setOpenHistory(null)} />
      <NewFilterDialog open={openNew} onClose={() => setOpenNew(false)} />
    </TooltipProvider>
  );
}

function UploadVersionDialog({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);
  const [unit, setUnit] = useState<"NM" | "UM">("NM");

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const meta = {
      effWavelengthNm: Number(form.get("effWavelengthNm")),
      effWavelengthUnit: unit,
      zeroPoint: Number(form.get("zeroPoint")),
    };
    form.set("filterMetadata", JSON.stringify(meta));
    form.delete("effWavelengthNm");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/filters/${slug}/versions`, { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("filters.toasts.upload-failed", { status: res.status }));
        return;
      }
      toast.success(t("filters.toasts.uploaded"));
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("filters.upload-dialog.title", { slug })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upload-file">{t("filters.upload-dialog.file-label")}</Label>
            <Input id="upload-file" name="file" type="file" accept=".txt" required />
          </div>
          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="upload-effWavelengthNm">{t("filters.upload-dialog.eff-wavelength")}</Label>
              <Input id="upload-effWavelengthNm" name="effWavelengthNm" type="number" step="0.01" required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("filters.upload-dialog.unit")}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as "NM" | "UM")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NM">NM</SelectItem>
                  <SelectItem value="UM">UM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upload-zeroPoint">{t("filters.upload-dialog.zero-point")}</Label>
            <Input id="upload-zeroPoint" name="zeroPoint" type="number" step="any" required />
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

function NewFilterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);
  const [unit, setUnit] = useState<"NM" | "UM">("NM");

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const meta = {
      effWavelengthNm: Number(form.get("effWavelengthNm")),
      effWavelengthUnit: unit,
      zeroPoint: Number(form.get("zeroPoint")),
    };
    form.set("filterMetadata", JSON.stringify(meta));
    form.delete("effWavelengthNm");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/filters", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("filters.toasts.create-failed", { status: res.status }));
        return;
      }
      toast.success(t("filters.toasts.created"));
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("filters.new-dialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-slug">{t("filters.new-dialog.slug")}</Label>
              <Input
                id="new-slug"
                name="slug"
                type="text"
                required
                pattern="[a-z0-9][a-z0-9_-]{0,63}"
                placeholder={t("filters.new-dialog.slug-placeholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">{t("filters.new-dialog.display-name")}</Label>
              <Input
                id="new-name"
                name="name"
                type="text"
                required
                placeholder={t("filters.new-dialog.name-placeholder")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-file">{t("filters.upload-dialog.file-label")}</Label>
            <Input id="new-file" name="file" type="file" accept=".txt" required />
          </div>
          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-effWavelengthNm">{t("filters.upload-dialog.eff-wavelength")}</Label>
              <Input id="new-effWavelengthNm" name="effWavelengthNm" type="number" step="0.01" required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("filters.upload-dialog.unit")}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as "NM" | "UM")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NM">nm</SelectItem>
                  <SelectItem value="UM">μm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-zeroPoint">{t("filters.upload-dialog.zero-point")}</Label>
            <Input id="new-zeroPoint" name="zeroPoint" type="number" step="any" required />
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

type VersionRow = {
  id: string;
  versionNum: number;
  uploadedAt: string;
  fileHash: string;
  fileSize: number;
  filename: string;
  notes: string | null;
  uploader: { name: string; email: string } | null;
  filterMetadata: { effWavelengthNm: number; effWavelengthUnit: string; zeroPoint: number } | null;
};

function HistoryDialog({ open, slug, onClose }: { open: boolean; slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;
    setVersions(null);
    fetch(`/api/admin/filters/${slug}/versions`)
      .then((r) => r.json())
      .then((d: { versions: VersionRow[] }) => setVersions(d.versions))
      .catch(() => setVersions([]));
  }, [open, slug]);

  async function restore(versionId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/filters/${slug}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("filters.toasts.restore-failed", { status: res.status }));
        return;
      }
      toast.success(t("filters.toasts.restored"));
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("filters.history-dialog.title", { slug })}</DialogTitle>
        </DialogHeader>
        {!versions ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("filters.history-dialog.no-versions")}</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id} className="flex justify-between items-center gap-3 p-3 border rounded-md text-sm">
                <div>
                  <div className="font-medium">
                    v{v.versionNum} · {v.filename}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(v.uploadedAt).toLocaleString()} · {v.uploader?.email ?? t("common.unknown-user")} ·{" "}
                    {v.fileSize} B
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
