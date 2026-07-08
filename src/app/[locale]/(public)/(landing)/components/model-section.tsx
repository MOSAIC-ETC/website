"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ModelTerm, SignalPathDiagram } from "./signal-path-diagram";
import { useInView } from "./use-in-view";

const TERM_STYLES: Record<ModelTerm, string> = {
  signal: "decoration-(--chart-1) data-active:bg-(--chart-1)/15",
  background: "decoration-(--chart-3) data-active:bg-(--chart-3)/15",
  noise: "decoration-(--chart-5) data-active:bg-(--chart-5)/15",
};

type TermProps = Readonly<{
  term: ModelTerm;
  highlight: ModelTerm | null;
  onHighlight: (term: ModelTerm | null) => void;
  children: React.ReactNode;
}>;

function Term({ term, highlight, onHighlight, children }: TermProps) {
  return (
    <span
      className={cn(
        "px-1 rounded underline decoration-2 decoration-dotted underline-offset-4 transition-colors cursor-default",
        TERM_STYLES[term],
      )}
      data-active={highlight === term || undefined}
      tabIndex={0}
      onMouseEnter={() => onHighlight(term)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(term)}
      onBlur={() => onHighlight(null)}
    >
      {children}
    </span>
  );
}

export function ModelSection() {
  const t = useTranslations("home.model");
  const [ref, inView] = useInView<HTMLElement>(0.15);
  const [highlight, setHighlight] = useState<ModelTerm | null>(null);
  const termProps = { highlight, onHighlight: setHighlight };

  return (
    <section
      ref={ref}
      className="bg-muted/40 border-y"
      data-highlight={highlight ?? undefined}
    >
      <div className="mx-auto px-4 lg:px-6 py-20 lg:py-28 max-w-7xl">
        <div className={cn("opacity-0 mx-auto max-w-3xl text-center", inView && "animate-fade-in-up")}>
          <h2 className="font-bold text-3xl lg:text-4xl tracking-tight">{t("title")}</h2>
          <p className="mt-6 text-muted-foreground lg:text-lg leading-relaxed">{t("intro")}</p>
        </div>

        {/* Interactive equation — hovering a term highlights the matching
            stage of the photon path and the matching card. */}
        <div className={cn("opacity-0 mt-12", inView && "animate-fade-in-up delay-150")}>
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 mx-auto px-6 py-6 border rounded-lg w-fit max-w-full overflow-x-auto font-mono text-sm lg:text-base bg-background">
            <span className="font-semibold">SNR</span>
            <span>=</span>
            <span className="inline-flex flex-col items-center">
              <span className="px-2 pb-1">
                <Term term="signal" {...termProps}>
                  C<sub>s</sub>
                </Term>{" "}
                · √NDIT
              </span>
              <span className="px-2 pt-1 border-t-2 border-foreground/70">
                √(
                <Term term="signal" {...termProps}>
                  C<sub>s</sub>
                </Term>{" "}
                +{" "}
                <Term term="background" {...termProps}>
                  C<sub>b</sub>
                </Term>{" "}
                +{" "}
                <Term term="noise" {...termProps}>
                  N<sub>pix</sub>·(RON² + DARK·DIT)
                </Term>
                )
              </span>
            </span>
          </div>
          <p className="mt-3 text-center text-muted-foreground text-xs">{t("equation-hint")}</p>
        </div>

        <div className={cn("opacity-0 mx-auto mt-12 max-w-4xl", inView && "animate-fade-in-up delay-300")}>
          <SignalPathDiagram
            labels={{
              source: t("diagram.source"),
              sky: t("diagram.sky"),
              telescope: t("diagram.telescope"),
              disperser: t("diagram.disperser"),
              detector: t("diagram.detector"),
            }}
            onHighlight={setHighlight}
          />
        </div>

        <div className={cn("opacity-0 gap-6 grid md:grid-cols-3 mt-12", inView && "animate-fade-in-up delay-[450ms]")}>
          {(
            [
              { key: "signal", term: "signal" },
              { key: "background", term: "background noise" },
              { key: "inputs", term: undefined },
            ] as const
          ).map((card) => (
            <Card key={card.key} className={cn(card.term && "dim-target")} data-term={card.term}>
              <CardHeader>
                <CardTitle>{t(`cards.${card.key}.title`)}</CardTitle>
                <CardDescription>{t(`cards.${card.key}.subtitle`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed">
                  {(t.raw(`cards.${card.key}.items`) as string[]).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 rounded-full size-1 bg-muted-foreground/60 shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
