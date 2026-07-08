import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";

import { ArchitectureSection } from "./components/architecture-section";
import { CitationSection } from "./components/citation-section";
import { DrizzleAnimation } from "./components/drizzle-animation";
import { HeroMirror } from "./components/hero-mirror";
import { InstrumentSection } from "./components/instrument-section";
import { ModelSection } from "./components/model-section";
import { Reveal } from "./components/reveal";

import "./components/landing.css";

const SPEC_ROWS = ["resolution", "aperture", "pixels", "dark", "ron"] as const;

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="landing">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="-z-10 absolute inset-0">
          <Image
            src="/assets/images/square-alt-grid.svg"
            alt=""
            className="opacity-40 dark:opacity-25 dark:invert object-cover mask-[radial-gradient(75%_75%_at_center,white,transparent)]"
            priority
            fill
          />
        </div>

        <div className="items-center gap-10 lg:gap-16 grid lg:grid-cols-[1fr_460px] mx-auto px-4 lg:px-6 py-16 lg:py-24 max-w-7xl min-h-[calc(100vh-4rem)] content-center">
          <div className="max-lg:text-center">
            <p className="opacity-0 font-mono text-muted-foreground text-xs lg:text-sm uppercase tracking-widest animate-fade-in-up">
              {t("hero.eyebrow")}
            </p>
            <h1 className="opacity-0 mt-4 font-bold text-4xl lg:text-5xl text-pretty tracking-tight animate-fade-in-up delay-[90ms]">
              {t("hero.title")}
            </h1>
            <p className="opacity-0 mt-6 max-w-2xl max-lg:mx-auto text-muted-foreground lg:text-lg leading-relaxed animate-fade-in-up delay-[180ms]">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap max-lg:justify-center gap-4 opacity-0 mt-8 animate-fade-in-up delay-[270ms]">
              <Button size="lg" asChild>
                <Link href="/etc">{t("hero.open-calculator")}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">
                  {t("hero.read-docs")}
                  <ExternalLinkIcon />
                </Link>
              </Button>
            </div>
          </div>

          <HeroMirror className="max-lg:hidden" />
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-muted/50 border-y">
        <div className="flex items-start gap-4 mx-auto px-4 lg:px-6 py-8 max-w-5xl">
          <InfoIcon className="mt-1 size-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{t("disclaimer.title")}</h2>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              {t.rich("disclaimer.body", {
                b: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                link: (chunks) => (
                  <a
                    href="https://etc.eso.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Instrument overview */}
      <InstrumentSection />

      {/* SNR model */}
      <ModelSection />

      {/* 2D SNR maps */}
      <section className="mx-auto px-4 lg:px-6 py-20 lg:py-28 max-w-7xl">
        <div className="items-center gap-12 lg:gap-20 grid lg:grid-cols-2">
          <Reveal className="max-lg:order-last mx-auto w-full max-w-lg lg:max-w-none">
            <DrizzleAnimation
              inputLabel={t("snr-map.drizzle.input")}
              outputLabel={t("snr-map.drizzle.output")}
              arrowLabel="drizzle"
            />
          </Reveal>

          <Reveal delay={150}>
            <h2 className="font-bold text-3xl lg:text-4xl tracking-tight">{t("snr-map.title")}</h2>
            <p className="mt-6 text-muted-foreground lg:text-lg leading-relaxed">{t("snr-map.body")}</p>
            <p className="mt-6 text-muted-foreground text-xs leading-relaxed">{t("snr-map.caveat")}</p>
          </Reveal>
        </div>
      </section>

      {/* Client-side architecture */}
      <div className="bg-muted/40 border-y">
        <ArchitectureSection />
      </div>

      {/* Technical specifications */}
      <section className="mx-auto px-4 lg:px-6 py-20 lg:py-28 max-w-5xl">
        <Reveal className="text-center">
          <h2 className="font-bold text-3xl lg:text-4xl tracking-tight">{t("specs.title")}</h2>
        </Reveal>
        <Reveal delay={150} className="mt-10">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("specs.columns.parameter")}</TableHead>
                  <TableHead className="text-right">MOS VIS</TableHead>
                  <TableHead className="text-right">MOS NIR</TableHead>
                  <TableHead className="text-right">IFU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SPEC_ROWS.map((row) => (
                  <TableRow key={row}>
                    <TableCell className="text-muted-foreground">{t(`specs.rows.${row}.label`)}</TableCell>
                    <TableCell className="font-mono text-right">{t(`specs.rows.${row}.vis`)}</TableCell>
                    <TableCell className="font-mono text-right">{t(`specs.rows.${row}.nir`)}</TableCell>
                    <TableCell className="font-mono text-right">{t(`specs.rows.${row}.ifu`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-4 text-muted-foreground text-xs leading-relaxed">{t("specs.caption")}</p>
        </Reveal>
      </section>

      {/* Provenance & citation */}
      <div className="bg-muted/40 border-t">
        <CitationSection />
      </div>
    </div>
  );
}
