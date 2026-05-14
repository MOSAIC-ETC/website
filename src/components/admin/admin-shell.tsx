"use client";

import { useTranslations } from "next-intl";

import { ADMIN_NAV, AdminNavProvider } from "@/components/admin/admin-nav-context";
import { Link, usePathname } from "@/i18n/navigation";

type UserInfo = { permissions: string[] };

export function AdminShell({ user, children }: { user: UserInfo; children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  return (
    <AdminNavProvider permissions={user.permissions}>
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] min-h-[calc(100vh-4rem)]">
        <aside className="hidden lg:flex flex-col gap-1 bg-muted/30 p-4 border-r">
          <div className="flex items-center gap-2 mb-4 px-2 text-muted-foreground text-xs uppercase tracking-wider">
            {t("section")}
          </div>
          <nav className="flex flex-col gap-0.5">
            {ADMIN_NAV.map((item) => {
              if (item.requires && !item.requires.some((p) => user.permissions.includes(p))) return null;
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href as never}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
    </AdminNavProvider>
  );
}
