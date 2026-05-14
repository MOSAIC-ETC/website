"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { type InstrumentParams, INSTRUMENT_PARAMS_SCHEMA_VERSION } from "@/lib/schemas/instrument-params";

type Snapshot = {
  id: string;
  version: number;
  isCurrent: boolean;
  notes: string | null;
  createdAt: string;
  creator: { name: string; email: string } | null;
};

type FormShape = {
  eltDiameterM: number;
  mangaPixelScaleArcsec: number;
  mosaicPixelScaleArcsec: number;
  mosVis: { resolution: number; apertureDiameterArcsec: number; pixelsPerObject: number };
  mosNir: { resolution: number; apertureDiameterArcsec: number; pixelsPerObject: number };
  ifu: { resolution: number; spaxelSizeArcsec: number; spaxelsPerSpaxel: number };
  detectors: {
    vis: { darkCurrentEPerSecPerPixel: number; ronEPerPixel: number };
    nir: { darkCurrentEPerSecPerPixel: number; ronEPerPixel: number };
  };
};

export function ParamsAdminClient({ current, snapshots }: { current: InstrumentParams; snapshots: Snapshot[] }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [form, setForm] = useState<FormShape>(() => stripSchemaVersion(current));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  async function onSave() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: { ...form, schemaVersion: INSTRUMENT_PARAMS_SCHEMA_VERSION },
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("params.toasts.save-failed", { status: res.status }));
        return;
      }
      toast.success(t("params.toasts.saved"));
      setNotes("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function onRevert(id: string) {
    setReverting(id);
    try {
      const res = await fetch(`/api/admin/params/${id}/revert`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("params.toasts.revert-failed", { status: res.status }));
        return;
      }
      toast.success(t("params.toasts.reverted"));
      router.refresh();
    } finally {
      setReverting(null);
    }
  }

  return (
    <div className="space-y-6">
      <Section title={t("params.sections.telescope")}>
        <NumField label={t("params.fields.elt-diameter")} value={form.eltDiameterM} onChange={(v) => setForm({ ...form, eltDiameterM: v })} />
        <NumField label={t("params.fields.manga-pixel-scale")} value={form.mangaPixelScaleArcsec} onChange={(v) => setForm({ ...form, mangaPixelScaleArcsec: v })} />
        <NumField label={t("params.fields.mosaic-pixel-scale")} value={form.mosaicPixelScaleArcsec} onChange={(v) => setForm({ ...form, mosaicPixelScaleArcsec: v })} />
      </Section>

      <Section title={t("params.sections.mos-vis")}>
        <NumField label={t("params.fields.resolution")} value={form.mosVis.resolution} onChange={(v) => setForm({ ...form, mosVis: { ...form.mosVis, resolution: v } })} />
        <NumField label={t("params.fields.aperture")} value={form.mosVis.apertureDiameterArcsec} onChange={(v) => setForm({ ...form, mosVis: { ...form.mosVis, apertureDiameterArcsec: v } })} />
        <NumField label={t("params.fields.pixels-per-object")} value={form.mosVis.pixelsPerObject} integer onChange={(v) => setForm({ ...form, mosVis: { ...form.mosVis, pixelsPerObject: v } })} />
      </Section>

      <Section title={t("params.sections.mos-nir")}>
        <NumField label={t("params.fields.resolution")} value={form.mosNir.resolution} onChange={(v) => setForm({ ...form, mosNir: { ...form.mosNir, resolution: v } })} />
        <NumField label={t("params.fields.aperture")} value={form.mosNir.apertureDiameterArcsec} onChange={(v) => setForm({ ...form, mosNir: { ...form.mosNir, apertureDiameterArcsec: v } })} />
        <NumField label={t("params.fields.pixels-per-object")} value={form.mosNir.pixelsPerObject} integer onChange={(v) => setForm({ ...form, mosNir: { ...form.mosNir, pixelsPerObject: v } })} />
      </Section>

      <Section title={t("params.sections.ifu")}>
        <NumField label={t("params.fields.resolution")} value={form.ifu.resolution} onChange={(v) => setForm({ ...form, ifu: { ...form.ifu, resolution: v } })} />
        <NumField label={t("params.fields.spaxel-size")} value={form.ifu.spaxelSizeArcsec} onChange={(v) => setForm({ ...form, ifu: { ...form.ifu, spaxelSizeArcsec: v } })} />
        <NumField label={t("params.fields.spaxels-per-spaxel")} value={form.ifu.spaxelsPerSpaxel} integer onChange={(v) => setForm({ ...form, ifu: { ...form.ifu, spaxelsPerSpaxel: v } })} />
      </Section>

      <Section title={t("params.sections.detectors")}>
        <div className="col-span-full text-sm text-muted-foreground">{t("params.detectors-vis")}</div>
        <NumField label={t("params.fields.dark-current")} value={form.detectors.vis.darkCurrentEPerSecPerPixel} onChange={(v) => setForm({ ...form, detectors: { ...form.detectors, vis: { ...form.detectors.vis, darkCurrentEPerSecPerPixel: v } } })} />
        <NumField label={t("params.fields.ron")} value={form.detectors.vis.ronEPerPixel} onChange={(v) => setForm({ ...form, detectors: { ...form.detectors, vis: { ...form.detectors.vis, ronEPerPixel: v } } })} />
        <div className="col-span-full text-sm text-muted-foreground mt-2">{t("params.detectors-nir")}</div>
        <NumField label={t("params.fields.dark-current")} value={form.detectors.nir.darkCurrentEPerSecPerPixel} onChange={(v) => setForm({ ...form, detectors: { ...form.detectors, nir: { ...form.detectors.nir, darkCurrentEPerSecPerPixel: v } } })} />
        <NumField label={t("params.fields.ron")} value={form.detectors.nir.ronEPerPixel} onChange={(v) => setForm({ ...form, detectors: { ...form.detectors, nir: { ...form.detectors.nir, ronEPerPixel: v } } })} />
      </Section>

      <Separator />

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="notes">{t("common.notes-optional")}</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("params.notes-placeholder")} />
        </div>
        <Button onClick={onSave} disabled={submitting}>
          {submitting ? t("params.saving") : t("params.save-snapshot")}
        </Button>
      </div>

      <Separator />

      <div>
        <h2 className="font-semibold text-lg mb-3">{t("params.history")}</h2>
        <ul className="space-y-2">
          {snapshots.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 border rounded-md p-3 text-sm">
              <div>
                <div className="font-medium">
                  v{s.version}{" "}
                  {s.isCurrent && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {t("common.current")}
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {new Date(s.createdAt).toLocaleString()} · {s.creator?.email ?? t("common.system")}
                </div>
                {s.notes && <div className="text-muted-foreground text-xs italic mt-1">{s.notes}</div>}
              </div>
              {!s.isCurrent && (
                <Button size="sm" variant="outline" disabled={reverting === s.id} onClick={() => onRevert(s.id)}>
                  {reverting === s.id ? t("params.reverting") : t("params.revert")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-sm mb-2">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function NumField({ label, value, onChange, integer }: { label: string; value: number; onChange: (v: number) => void; integer?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={integer ? 1 : "any"}
        value={value}
        onChange={(e) => {
          const v = integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
      />
    </div>
  );
}

function stripSchemaVersion(p: InstrumentParams): FormShape {
  const { schemaVersion: _ignored, ...rest } = p;
  void _ignored;
  return rest;
}
