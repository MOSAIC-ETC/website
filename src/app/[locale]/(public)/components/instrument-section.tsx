"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { FocalPlaneDiagram } from "./focal-plane-diagram";
import { useInView } from "./use-in-view";

type Mode = "vis" | "nir" | "ifu" | "field";

const FACTS: ReadonlyArray<{ key: string; mode?: Mode; swatch?: string }> = [
  { key: "aperture" },
  { key: "mos-vis", mode: "vis", swatch: "var(--chart-1)" },
  { key: "mos-nir", mode: "nir", swatch: "var(--chart-3)" },
  { key: "ifu", mode: "ifu", swatch: "var(--chart-2)" },
  { key: "field", mode: "field" },
  { key: "resolution" },
];

export function InstrumentSection() {
  const t = useTranslations("home.instrument");
  const [ref, inView] = useInView<HTMLElement>(0.2);
  const [highlight, setHighlight] = useState<Mode | null>(null);

  return (
    <section ref={ref} className="mx-auto px-4 lg:px-6 py-20 lg:py-28 max-w-7xl" data-highlight={highlight ?? undefined}>
      <div className="items-center gap-12 lg:gap-20 grid lg:grid-cols-2">
        <div className={cn("opacity-0", inView && "animate-fade-in-up")}>
          <h2 className="font-bold text-3xl lg:text-4xl tracking-tight">{t("title")}</h2>
          <p className="mt-6 text-muted-foreground lg:text-lg leading-relaxed">{t("body")}</p>

          <dl className="mt-10 border rounded-lg divide-y overflow-hidden">
            {FACTS.map((fact) => (
              <div
                key={fact.key}
                className={cn(
                  "flex justify-between items-baseline gap-4 px-4 py-3",
                  fact.mode && "hover:bg-muted/60 transition-colors cursor-default",
                )}
                onMouseEnter={fact.mode ? () => setHighlight(fact.mode!) : undefined}
                onMouseLeave={fact.mode ? () => setHighlight(null) : undefined}
                onFocus={fact.mode ? () => setHighlight(fact.mode!) : undefined}
                onBlur={fact.mode ? () => setHighlight(null) : undefined}
                tabIndex={fact.mode ? 0 : undefined}
              >
                <dt className="flex items-center gap-2 text-muted-foreground text-sm">
                  {fact.swatch && (
                    <span
                      className="inline-block rounded-full size-2.5 shrink-0"
                      style={{ backgroundColor: fact.swatch }}
                      aria-hidden="true"
                    />
                  )}
                  {t(`facts.${fact.key}.label`)}
                </dt>
                <dd className="font-mono font-medium text-sm text-right whitespace-nowrap">
                  {t(`facts.${fact.key}.value`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-muted-foreground text-xs">{t("facts-hint")}</p>
        </div>

        <div className={cn("opacity-0 mx-auto w-full max-w-md lg:max-w-none", inView && "animate-fade-in-up delay-150")}>
          <FocalPlaneDiagram lit={inView} fieldLabel={t("diagram.field-label")} className="text-foreground" />
          <p className="mt-2 text-center text-muted-foreground text-xs">{t("diagram.caption")}</p>
        </div>
      </div>
    </section>
  );
}
