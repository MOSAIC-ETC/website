"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ArchitectureDiagram } from "./architecture-diagram";
import { useCountUp } from "./use-count-up";
import { useInView } from "./use-in-view";

type Stat = Readonly<{
  key: string;
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}>;

const STATS: readonly Stat[] = [
  { key: "computation", target: 1, prefix: "< ", suffix: " s" },
  { key: "drizzle", target: 0.9, decimals: 1, prefix: "~ ", suffix: " ms" },
  { key: "modes", target: 3 },
  { key: "client-side", target: 100, suffix: " %" },
];

function StatTile({ stat, started, locale }: Readonly<{ stat: Stat; started: boolean; locale: string }>) {
  const t = useTranslations("home.architecture.stats");
  const value = useCountUp(stat.target, started);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: stat.decimals ?? 0,
    maximumFractionDigits: stat.decimals ?? 0,
  }).format(value);

  return (
    <div className="px-6 py-5 border rounded-lg">
      <p className="font-semibold text-3xl lg:text-4xl whitespace-nowrap">
        {stat.prefix}
        {formatted}
        {stat.suffix}
      </p>
      <p className="mt-2 text-muted-foreground text-sm">{t(stat.key)}</p>
    </div>
  );
}

export function ArchitectureSection() {
  const t = useTranslations("home.architecture");
  const locale = useLocale();
  const [ref, inView] = useInView<HTMLElement>(0.2);

  return (
    <section ref={ref} className="mx-auto px-4 lg:px-6 py-20 lg:py-28 max-w-7xl">
      <div className={cn("opacity-0 mx-auto max-w-3xl text-center", inView && "animate-fade-in-up")}>
        <h2 className="font-bold text-3xl lg:text-4xl tracking-tight">{t("title")}</h2>
        <p className="mt-6 text-muted-foreground lg:text-lg leading-relaxed">{t("body")}</p>
      </div>

      <div className={cn("opacity-0 mx-auto mt-12 max-w-4xl", inView && "animate-fade-in-up delay-150")}>
        <ArchitectureDiagram
          labels={{
            server: t("diagram.server"),
            "server-note": t("diagram.server-note"),
            manifest: t("diagram.manifest"),
            cache: t("diagram.cache"),
            worker: t("diagram.worker"),
            results: t("diagram.results"),
          }}
        />
      </div>

      <div className={cn("opacity-0 gap-4 grid grid-cols-2 lg:grid-cols-4 mt-12", inView && "animate-fade-in-up delay-300")}>
        {STATS.map((stat) => (
          <StatTile key={stat.key} stat={stat} started={inView} locale={locale} />
        ))}
      </div>

      <div className={cn("opacity-0 flex justify-center mt-10", inView && "animate-fade-in-up delay-[450ms]")}>
        <Button variant="outline" asChild>
          <a href="https://github.com/MOSAIC-ETC/website" target="_blank" rel="noopener noreferrer">
            {t("github")}
            <ExternalLinkIcon />
          </a>
        </Button>
      </div>
    </section>
  );
}
