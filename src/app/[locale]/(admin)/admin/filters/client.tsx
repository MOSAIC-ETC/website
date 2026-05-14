"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenNew(true)}>{t("filters.new-filter")}</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-3 font-medium">{t("filters.headers.slug")}</th>
              <th className="py-2 pr-3 font-medium">{t("common.name")}</th>
              <th className="py-2 pr-3 font-medium">{t("filters.headers.wavelength")}</th>
              <th className="py-2 pr-3 font-medium">{t("filters.headers.version")}</th>
              <th className="py-2 pr-3 font-medium">{t("common.status")}</th>
              <th className="py-2 font-medium text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((row) => {
              const wl = row.currentVersion?.metadata
                ? `${row.currentVersion.metadata.effWavelengthNm} ${row.currentVersion.metadata.effWavelengthUnit.toLowerCase()}`
                : "—";
              return (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-mono text-xs">{row.slug}</td>
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3">{wl}</td>
                  <td className="py-2 pr-3">v{row.currentVersion?.versionNum ?? "—"}</td>
                  <td className="py-2 pr-3">{row.isActive ? t("common.active") : t("common.deleted")}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOpenUpload(row.slug)}>
                        {t("filters.upload-version")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpenHistory(row.slug)}>
                        {t("filters.history")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openUpload && <UploadVersionDialog slug={openUpload} onClose={() => setOpenUpload(null)} />}
      {openHistory && <HistoryDialog slug={openHistory} onClose={() => setOpenHistory(null)} />}
      {openNew && <NewFilterDialog onClose={() => setOpenNew(false)} />}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useTranslations("admin.common");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">{title}</h2>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label={t("close")}>✕</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UploadVersionDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const meta = {
      effWavelengthNm: Number(form.get("effWavelengthNm")),
      effWavelengthUnit: form.get("effWavelengthUnit"),
      zeroPoint: Number(form.get("zeroPoint")),
    };
    form.set("filterMetadata", JSON.stringify(meta));
    form.delete("effWavelengthNm");
    form.delete("effWavelengthUnit");
    form.delete("zeroPoint");

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
    <Modal title={t("filters.upload-dialog.title", { slug })} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label htmlFor="file">{t("filters.upload-dialog.file-label")}</Label>
          <Input id="file" name="file" type="file" accept=".txt" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="effWavelengthNm">{t("filters.upload-dialog.eff-wavelength")}</Label>
            <Input id="effWavelengthNm" name="effWavelengthNm" type="number" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="effWavelengthUnit">{t("filters.upload-dialog.unit")}</Label>
            <select id="effWavelengthUnit" name="effWavelengthUnit" defaultValue="NM" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="NM">NM</option>
              <option value="UM">UM</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="zeroPoint">{t("filters.upload-dialog.zero-point")}</Label>
          <Input id="zeroPoint" name="zeroPoint" type="number" step="any" required />
        </div>
        <div>
          <Label htmlFor="notes">{t("common.notes-optional")}</Label>
          <Input id="notes" name="notes" type="text" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("common.uploading") : t("common.upload")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NewFilterDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const meta = {
      effWavelengthNm: Number(form.get("effWavelengthNm")),
      effWavelengthUnit: form.get("effWavelengthUnit"),
      zeroPoint: Number(form.get("zeroPoint")),
    };
    form.set("filterMetadata", JSON.stringify(meta));
    form.delete("effWavelengthNm");
    form.delete("effWavelengthUnit");
    form.delete("zeroPoint");

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
    <Modal title={t("filters.new-dialog.title")} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="slug">{t("filters.new-dialog.slug")}</Label>
            <Input id="slug" name="slug" type="text" required pattern="[a-z0-9][a-z0-9_-]{0,63}" placeholder={t("filters.new-dialog.slug-placeholder")} />
          </div>
          <div>
            <Label htmlFor="name">{t("filters.new-dialog.display-name")}</Label>
            <Input id="name" name="name" type="text" required placeholder={t("filters.new-dialog.name-placeholder")} />
          </div>
        </div>
        <div>
          <Label htmlFor="file">{t("filters.upload-dialog.file-label")}</Label>
          <Input id="file" name="file" type="file" accept=".txt" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="effWavelengthNm">{t("filters.upload-dialog.eff-wavelength")}</Label>
            <Input id="effWavelengthNm" name="effWavelengthNm" type="number" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="effWavelengthUnit">{t("filters.upload-dialog.unit")}</Label>
            <select id="effWavelengthUnit" name="effWavelengthUnit" defaultValue="NM" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="NM">NM</option>
              <option value="UM">UM</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="zeroPoint">{t("filters.upload-dialog.zero-point")}</Label>
          <Input id="zeroPoint" name="zeroPoint" type="number" step="any" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("common.creating") : t("common.create")}
          </Button>
        </div>
      </form>
    </Modal>
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

function HistoryDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/filters/${slug}/versions`)
      .then((r) => r.json())
      .then((d: { versions: VersionRow[] }) => setVersions(d.versions))
      .catch(() => setVersions([]));
  }, [slug]);

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
    <Modal title={t("filters.history-dialog.title", { slug })} onClose={onClose}>
      {!versions ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : versions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("filters.history-dialog.no-versions")}</p>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 border rounded-md p-2 text-sm">
              <div>
                <div className="font-medium">v{v.versionNum} · {v.filename}</div>
                <div className="text-muted-foreground text-xs">
                  {new Date(v.uploadedAt).toLocaleString()} · {v.uploader?.email ?? t("common.unknown-user")} · {v.fileSize} B
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
    </Modal>
  );
}
