"use client";

import {
  ClockIcon,
  DatabaseIcon,
  FilterIcon,
  KeyIcon,
  LogOutIcon,
  MailIcon,
  ShapesIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, usePathname } from "@/i18n/navigation";
import { PERMISSIONS } from "@/lib/permissions";

type UserInfo = { name: string; email: string; permissions: string[] };

const NAV: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; requires?: string[] }> = [
  { href: "/admin", label: "Dashboard", icon: SettingsIcon },
  { href: "/admin/filters", label: "Filters", icon: FilterIcon, requires: [PERMISSIONS.FILES_UPLOAD] },
  { href: "/admin/objects", label: "Objects", icon: ShapesIcon, requires: [PERMISSIONS.FILES_UPLOAD] },
  { href: "/admin/tables", label: "Tables", icon: DatabaseIcon, requires: [PERMISSIONS.FILES_UPLOAD] },
  { href: "/admin/params", label: "Instrument", icon: SettingsIcon, requires: [PERMISSIONS.PARAMS_EDIT] },
  { href: "/admin/users", label: "Users", icon: UsersIcon, requires: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/roles", label: "Roles", icon: ShieldIcon, requires: [PERMISSIONS.ROLES_MANAGE] },
  { href: "/admin/invites", label: "Invites", icon: MailIcon, requires: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/audit", label: "Audit log", icon: ClockIcon, requires: [PERMISSIONS.USERS_MANAGE] },
];

export function AdminShell({ user, children }: { user: UserInfo; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] min-h-[calc(100vh-4rem)]">
      <aside className="bg-muted/30 border-r p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-4 px-2 text-muted-foreground text-xs uppercase tracking-wider">
          <KeyIcon className="w-3 h-3" /> Admin
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
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <div className="px-2 text-xs">
          <div className="font-medium">{user.name}</div>
          <div className="text-muted-foreground truncate">{user.email}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start mt-2"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOutIcon className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </aside>

      <main className="p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
