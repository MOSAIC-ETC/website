"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useNavigation } from "@/hooks/use-navigation";
import { Link } from "@/i18n/navigation";
import { MosaicLogo } from "@/components/icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar as SidebarWrapper,
  SidebarContent,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { User } from "@/components/user";

export function Sidebar(props: React.ComponentProps<"div">) {
  const t = useTranslations("sidebar");
  const navigation = useNavigation();

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
                if (item.dropdown) {
                  return (
                    <Collapsible defaultOpen key={item.name}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="group flex justify-between w-full">
                            <div className="flex items-center gap-2">
                              <item.icon size={16} />
                              <span>{item.name}</span>
                            </div>

                            <ChevronRightIcon
                              size={16}
                              className="group-data-[state=open]:rotate-90 transition-transform duration-200 ease-in-out"
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub key={item.name}>
                            {item.dropdown.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.name}>
                                <SidebarMenuSubButton asChild>
                                  <Link
                                    href={subItem.href as any}
                                    className="flex items-center gap-2 hover:bg-accent py-2 rounded w-full"
                                  >
                                    <subItem.icon size={16} />
                                    <span>{subItem.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

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
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-4 mb-2">
        <LocaleSwitcher variant="sidebar" />
        <User variant="sidebar" />
      </SidebarFooter>
    </SidebarWrapper>
  );
}
