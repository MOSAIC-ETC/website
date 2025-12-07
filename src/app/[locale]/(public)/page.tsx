import Image from "next/image";
import { useTranslations } from "next-intl";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReactIcon, ShadcnIcon, TailwindIcon, TypescriptIcon, NextJSIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function Home() {
  const t = useTranslations("home.hero");

  const technologies = [
    { name: "TypeScript", icon: TypescriptIcon, url: "https://www.typescriptlang.org/" },
    { name: "Shadcn UI", icon: ShadcnIcon, url: "https://ui.shadcn.com/", invert: true },
    { name: "React", icon: ReactIcon, url: "https://react.dev/" },
    { name: "Tailwind CSS", icon: TailwindIcon, url: "https://tailwindcss.com/" },
    { name: "Next.js", icon: NextJSIcon, url: "https://nextjs.org/", invert: true },
  ];

  return (
    <div>
      <section className="relative py-40 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="-z-10 absolute inset-0">
          <Image
            src="/assets/images/square-alt-grid.svg"
            alt="Background Pattern"
            className="opacity-60 dark:opacity-40 dark:invert object-cover mask-[radial-gradient(75%_75%_at_center,white,transparent)]"
            priority
            fill
          />
        </div>

        <div className="flex flex-col items-center gap-6 px-3 text-center">
          <h1 className="opacity-0 font-bold text-2xl lg:text-5xl text-pretty tracking-tight animate-fade-in-up">
            Lorem Ipsum Dolor Sit Amet
          </h1>
          <p className="opacity-0 mx-auto max-w-3xl text-muted-foreground lg:text-xl animate-fade-in-up delay-[90ms]">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Elig doloremque mollitia fugiat omnis! Porro
            facilis quo animi consequatur. Explicabo.
          </p>
          <div className="flex flex-wrap justify-center gap-4 opacity-0 mt-8 animate-fade-in-up delay-[180ms]">
            <Button asChild>
              <Link href="/etc">{t("get-started")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/about">
                {t("learn-more")}
                <ExternalLinkIcon />
              </Link>
            </Button>
          </div>

          <div className="flex flex-col items-center gap-5 mt-20">
            <p className="opacity-0 font-medium text-muted-foreground lg:text-left animate-fade-in-up delay-[270ms]">
              {t("built-with-open-source-technologies")}
            </p>

            <div className="flex flex-wrap justify-center items-center gap-4">
              {technologies.map((tech, idx) => (
                <Button
                  key={tech.name}
                  variant="outline"
                  className="group opacity-0 size-12 animate-fade-in-up"
                  style={{ animationDelay: `${300 + idx * 75}ms` }}
                  asChild
                >
                  <a href={tech.url} target="_blank" rel="noopener noreferrer">
                    <tech.icon
                      className={cn(
                        "saturate-0 group-hover:saturate-100 size-6 transition-all",
                        tech.invert && "dark:invert"
                      )}
                    />
                    <span className="sr-only">{tech.name}</span>
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
