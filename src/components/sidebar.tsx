"use client";

import { useTranslations } from "next-intl";

import { ADMIN_NAV, useAdminNav } from "@/components/admin/admin-nav-context";
import { MosaicLogo } from "@/components/icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarWrapper,
} from "@/components/ui/sidebar";
import { User } from "@/components/user";
import { useNavigation } from "@/hooks/use-navigation";
import { Link, usePathname } from "@/i18n/navigation";

export function Sidebar(props: React.ComponentProps<"div">) {
  const t = useTranslations("sidebar");
  const tAdmin = useTranslations("admin.nav");
  const navigation = useNavigation();
  const adminNav = useAdminNav();
  const pathname = usePathname();

  return (
    <SidebarWrapper {...props}>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-3 mx-3 my-4 select-none">
          <MosaicLogo height={32} className="fill-primary" />
          <span className="font-semibold text-2xl uppercase tracking-wider">MOSAIC ETC</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.href as any}
                        className="flex items-center gap-2 hover:bg-accent py-2 rounded w-full"
                      >
                        <item.icon size={16} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminNav && (
          <SidebarGroup>
            <SidebarGroupLabel>{tAdmin("section")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_NAV.map((item) => {
                  if (item.requires && !item.requires.some((p) => adminNav.permissions.includes(p))) return null;
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href as never} className="flex items-center gap-2 py-2 rounded w-full">
                          <Icon className="w-4 h-4" />
                          <span>{tAdmin(item.key)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-4 mb-2">
        <LocaleSwitcher variant="sidebar" />
        <User variant="sidebar" />
      </SidebarFooter>
    </SidebarWrapper>
  );
}
