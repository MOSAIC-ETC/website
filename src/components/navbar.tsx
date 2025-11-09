"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User2 } from "lucide-react";

import { MosaicIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Search } from "@/components//search";

const navigation = [
  { name: "Home", href: "/" },
  { name: "ETC", href: "/etc" },
  { name: "Documentation", href: "/documentation" },
  { name: "About", href: "/about" },
  { name: "Administration", href: "/admin" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-between items-center gap-12 bg-background px-24 border-border border-b h-16 text-primary">
      <a href="/">
        <MosaicIcon height={32} className="fill-primary select-none" />
      </a>

      <ul className="flex gap-1 w-full font-medium text-muted-foreground text-sm">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.name} className="mx-3 my-2.5">
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

      <div className="flex items-center gap-4">
        <Search />
        <ThemeToggle />
        <LocaleSwitcher />

        {/* Default user (swap with profile pic when ready) */}
        <Button variant="outline" size="icon-lg" className="rounded-full">
          <User2 />
        </Button>
      </div>
    </nav>
  );
}
