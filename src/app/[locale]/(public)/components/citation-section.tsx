"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useInView } from "./use-in-view";

const BIBTEX = `@thesis{seara:mosaicetc2026,
  author      = {Seara, Ítalo Santana},
  title       = {Interface Web de Simulador de Tempo de Exposição
                 do Instrumento MOSAIC do E-ELT},
  type        = {Bachelor's thesis},
  institution = {Universidade Estadual de Santa Cruz},
  address     = {Ilhéus, Brazil},
  year        = {2026},
  url         = {https://github.com/MOSAIC-ETC/website}
}`;

const INSTITUTIONS = [
  { name: "UESC", href: "https://uesc.br", logo: "/assets/images/institutions/uesc.png" },
  { name: "FAPESB", href: "https://www.fapesb.ba.gov.br/", logo: "/assets/images/institutions/fapesb.png" },
  { name: "CNPq", href: "https://www.cnpq.br/", logo: "/assets/images/institutions/cnpq.png" },
];

export function CitationSection() {
  const t = useTranslations("home.citation");
  const [ref, inView] = useInView<HTMLElement>(0.2);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(BIBTEX);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={ref} className="mx-auto px-4 lg:px-6 py-20 lg:py-28 max-w-4xl">
      <div className={cn("opacity-0 text-center", inView && "animate-fade-in-up")}>
        <h2 className="font-bold text-3xl lg:text-4xl tracking-tight">{t("title")}</h2>
        <p className="mx-auto mt-6 max-w-3xl text-muted-foreground lg:text-lg leading-relaxed">{t("body")}</p>
      </div>

      <div className={cn("opacity-0 relative mt-10", inView && "animate-fade-in-up delay-150")}>
        <pre className="p-5 border rounded-lg overflow-x-auto font-mono text-xs lg:text-sm bg-muted/40">
          <code>{BIBTEX}</code>
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="top-3 right-3 absolute"
          onClick={copy}
          aria-label={t("copy")}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>

      <div className={cn("opacity-0 flex flex-wrap justify-center items-center gap-10 mt-12", inView && "animate-fade-in-up delay-300")}>
        {INSTITUTIONS.map((institution) => (
          <a
            key={institution.name}
            href={institution.href}
            aria-label={`${institution.name} Website`}
            target="_blank"
            rel="noopener noreferrer"
            title={institution.name}
          >
            <img
              src={institution.logo}
              alt={institution.name}
              height={56}
              width={896}
              className="w-auto h-14 select-none"
              draggable={false}
            />
          </a>
        ))}
      </div>
    </section>
  );
}
