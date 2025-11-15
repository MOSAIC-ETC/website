"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRightIcon, LanguagesIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { locales, routing } from "@/i18n/routing";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type LocaleSwitcherProps = React.ComponentProps<"button"> & {
  variant?: "icon" | "sidebar";
};

export function LocaleSwitcher({ variant = "icon", ...props }: LocaleSwitcherProps) {
  const t = useTranslations("locale-switcher");

  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const current = locales[currentLocale];

  function switchTo(locale: string) {
    router.replace(pathname || "/", { locale });
  }

  if (variant === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("rounded-full select-none", props.className)}
            {...props}
          >
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

  return (
    <Collapsible>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="group flex justify-between w-full">
            <div className="flex items-center gap-2">
              <LanguagesIcon size={16} />
              <span>{t("select-language")}</span>
            </div>

            <ChevronRightIcon
              size={16}
              className="group-data-[state=open]:rotate-90 transition-transform duration-200 ease-in-out"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {routing.locales.map((locale) => {
              const meta = locales[locale];
              return (
                <SidebarMenuSubItem key={locale}>
                  <SidebarMenuSubButton
                    className="flex items-center gap-2 w-full"
                    onClick={() => switchTo(locale)}
                    disabled={locale === currentLocale}
                  >
                    <Image src={meta.flag} alt={meta.name} width={16} height={16} />
                    <span>{meta.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
