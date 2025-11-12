"use client";

import { useTranslations } from "next-intl";
import {
  BookTextIcon,
  CalculatorIcon,
  HomeIcon,
  InfoIcon,
  SettingsIcon,
  ShieldIcon,
  User2Icon,
} from "lucide-react";

export function useNavigation() {
  const t = useTranslations("navigation");

  const navigation = [
    { name: t("home"), href: "/", icon: HomeIcon },
    { name: t("etc"), href: "/etc", icon: CalculatorIcon },
    { name: t("documentation"), href: "/docs", icon: BookTextIcon },
    { name: t("about"), href: "/about", icon: InfoIcon },
    {
      name: t("administration"),
      href: "/admin",
      icon: ShieldIcon,
      dropdown: [
        { name: t("users"), href: "/admin/users", icon: User2Icon },
        { name: t("settings"), href: "/admin/settings", icon: SettingsIcon },
      ],
    },
  ];

  return navigation;
}
