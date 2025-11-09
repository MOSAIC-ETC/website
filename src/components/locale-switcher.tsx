"use client";

import Image from "next/image";
import { useLocale } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { locales, routing } from "@/i18n/routing";
import { useRouter, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const currentLocale = useLocale(); // Full locale code
  const router = useRouter();
  const pathname = usePathname(); // Path without a locale prefix

  const current = locales[currentLocale];

  function switchTo(locale: string) {
    router.replace(pathname || "/", { locale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full select-none">
          {current && <Image src={current.flag} alt={current.name} width={24} height={24} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {routing.locales.map((locale) => {
          const meta = locales[locale];
          return (
            <DropdownMenuItem
              key={locale}
              className="flex items-center gap-2"
              disabled={locale === currentLocale}
              onSelect={() => switchTo(locale)}
            >
              <Image src={meta.flag} alt={meta.name} width={24} height={24} />
              <span>{meta.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
