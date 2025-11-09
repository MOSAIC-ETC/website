"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const locales = [
  { code: "en", name: "English (US)", flag: "/flags/en.svg" },
  { code: "pt", name: "Português (BR)", flag: "/flags/pt.svg" },
  { code: "fr", name: "Français", flag: "/flags/fr.svg" },
];

export function LocaleSwitcher() {
  const currentLocale = locales[0]; // Placeholder

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full select-none">
          <Image src={currentLocale.flag} alt={currentLocale.name} width={24} height={24} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            className="flex items-center gap-2"
            disabled={locale.code === currentLocale.code} // Disable current locale
          >
            <Image src={locale.flag} alt={locale.name} width={24} height={24} />
            <span>{locale.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
