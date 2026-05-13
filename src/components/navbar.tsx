"use client";

import { ChevronDownIcon } from "lucide-react";

import { MosaicLogo } from "@/components/icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Search } from "@/components/search";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "@/components/user";
import { useNavigation } from "@/hooks/use-navigation";
import { Link, usePathname } from "@/i18n/navigation";

export function Navbar() {
  const navigation = useNavigation();
  const pathname = usePathname();

  return (
    <nav className="relative flex lg:justify-between items-center md:gap-12 bg-background px-4 lg:px-24 border-border border-b h-16 text-primary">
      <div className="lg:hidden flex-1 justify-start">
        <SidebarTrigger />
      </div>

      <div className="flex lg:flex-none justify-center lg:justify-start">
        <Link href="/">
          <MosaicLogo height={32} className="fill-primary select-none" />
        </Link>
      </div>

      <ul className="hidden lg:flex gap-1 w-full font-medium text-muted-foreground text-sm">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.name} className="flex justify-center items-center mx-3 my-2.5">
              <Link
                href={item.href as any}
                className={`hover:text-primary transition-colors select-none ${isActive && "text-primary"}`}
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
        <LocaleSwitcher className="hidden lg:flex" />
        <User />
      </div>
    </nav>
  );
}
