import Image from "next/image";
import { useTranslations } from "next-intl";

import { MosaicLogo } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");

  const items = [
    { href: "/about", text: t("about") },
    { href: "/contact", text: t("contact") },
    { href: "/privacy-policy", text: t("privacy-policy") },
    { href: "/terms-of-service", text: t("terms-of-service") },
  ];

  return (
    <footer>
      <Separator />

      <div className="flex max-lg:flex-col justify-between items-center gap-4 mx-auto px-4 lg:px-6 py-6 lg:py-6 max-w-7xl">
        <div className="flex items-center gap-3">
          <MosaicLogo height={32} className="fill-primary" />
          <span className="font-semibold text-2xl uppercase tracking-wider select-none">
            MOSAIC ETC
          </span>
        </div>

        <div className="flex lg:flex-row flex-col items-center gap-2 lg:gap-4 font-medium whitespace-nowrap">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href as any}
              className="hover:text-muted-foreground transition-colors select-none"
            >
              {item.text}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6 pointer-events-none select-none">
          <a
            href="https://uesc.br"
            aria-label="UESC Website"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/assets/images/uesc.png"
              alt="UESC Logo"
              width={64}
              height={64}
              className="w-full h-16"
            />
          </a>

          <a
            href="https://uesc.br"
            aria-label="FAPESB Website"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/assets/images/fapesb.png"
              alt="FAPESB Logo"
              width={64}
              height={64}
              className="w-full h-16"
            />
          </a>
        </div>
      </div>

      <Separator />

      <div className="flex justify-center mx-auto px-4 sm:px-6 py-8 max-w-7xl">
        <p className="font-medium text-center text-balance">
          {`©${new Date().getFullYear()}`}{" "}
          <a
            href="https://uesc.br"
            aria-label="UESC Website"
            target="_blank"
            rel="noopener noreferrer"
          >
            Universidade Estadual de Santa Cruz
          </a>
          , {t("developed-by")}{" "}
          <a
            href="https://github.com/italoseara"
            aria-label="Ítalo Seara GitHub"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ítalo Seara
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
