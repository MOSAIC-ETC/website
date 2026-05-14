"use client";

import {
  ClockIcon,
  DatabaseIcon,
  FilterIcon,
  KeyIcon,
  MailIcon,
  ShapesIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { PERMISSIONS } from "@/lib/permissions";

type UserInfo = { permissions: string[] };

type NavKey =
  | "dashboard"
  | "filters"
  | "objects"
  | "tables"
  | "params"
  | "users"
  | "roles"
  | "invites"
  | "audit";

const NAV: Array<{ href: string; key: NavKey; icon: React.ComponentType<{ className?: string }>; requires?: string[] }> = [
  { href: "/admin", key: "dashboard", icon: SettingsIcon },
  { href: "/admin/filters", key: "filters", icon: FilterIcon, requires: [PERMISSIONS.FILES_UPLOAD] },
  { href: "/admin/objects", key: "objects", icon: ShapesIcon, requires: [PERMISSIONS.FILES_UPLOAD] },
  { href: "/admin/tables", key: "tables", icon: DatabaseIcon, requires: [PERMISSIONS.FILES_UPLOAD] },
  { href: "/admin/params", key: "params", icon: SettingsIcon, requires: [PERMISSIONS.PARAMS_EDIT] },
  { href: "/admin/users", key: "users", icon: UsersIcon, requires: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/roles", key: "roles", icon: ShieldIcon, requires: [PERMISSIONS.ROLES_MANAGE] },
  { href: "/admin/invites", key: "invites", icon: MailIcon, requires: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/audit", key: "audit", icon: ClockIcon, requires: [PERMISSIONS.USERS_MANAGE] },
];

export function AdminShell({ user, children }: { user: UserInfo; children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] min-h-[calc(100vh-4rem)]">
      <aside className="flex flex-col gap-1 bg-muted/30 p-4 border-r">
        <div className="flex items-center gap-2 mb-4 px-2 text-muted-foreground text-xs uppercase tracking-wider">
          <KeyIcon className="w-3 h-3" /> {t("section")}
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            if (item.requires && !item.requires.some((p) => user.permissions.includes(p))) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
