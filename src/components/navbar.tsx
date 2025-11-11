"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronDownIcon, SettingsIcon, User2Icon } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "@/components/search";
import { MosaicIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "./ui/sidebar";
import { useNavigation } from "@/hooks/use-navigation";

export function Navbar() {
  const navigation = useNavigation();
  const pathname = usePathname();

  return (
    <nav className="relative flex lg:justify-between items-center md:gap-12 bg-background px-4 lg:px-24 border-border border-b h-16 text-primary">
      <div className="lg:hidden flex-1 justify-start">
        <SidebarTrigger />
      </div>

      <div className="flex lg:flex-none justify-center lg:justify-start">
        <a href="/">
          <MosaicIcon height={32} className="fill-primary select-none" />
        </a>
      </div>

      <ul className="hidden lg:flex gap-1 w-full font-medium text-muted-foreground text-sm">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          if (item.dropdown) {
            return (
              <li key={item.name} className="group relative mx-3 my-2.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 hover:text-primary transition-colors select-none [&[aria-expanded="true"]_svg]:rotate-180 focus-visible:outline-none ${
                        isActive && "text-primary"
                      }`}
                    >
                      <span>{item.name}</span>
                      <ChevronDownIcon
                        className="rotate-0 transition-transform duration-200"
                        size={16}
                      />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="mt-1.5 min-w-48">
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="flex items-center gap-2 hover:bg-accent/50 px-2.5 py-1.5 rounded-md text-sm"
                      >
                        <subItem.icon size={16} />
                        <span>{subItem.name}</span>
                      </Link>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          }

          return (
            <li key={item.name} className="flex justify-center items-center mx-3 my-2.5">
              <Link
                href={item.href}
                className={`hover:text-primary transition-colors select-none ${
                  isActive && "text-primary"
                }`}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-1 justify-end items-center gap-4">
        <Search />
        <ThemeToggle />
        <LocaleSwitcher className="hidden md:flex" />

        {/* Default user (swap with profile pic when ready) */}
        <Button variant="outline" size="icon-lg" className="hidden md:flex rounded-full">
          <User2Icon />
        </Button>
      </div>
    </nav>
  );
}
