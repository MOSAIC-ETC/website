"use client";

import {
  ClockIcon,
  DatabaseIcon,
  FilterIcon,
  MailIcon,
  SettingsIcon,
  ShapesIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PERMISSIONS } from "@/lib/permissions";

export type AdminNavKey =
  | "dashboard"
  | "filters"
  | "objects"
  | "tables"
  | "params"
  | "users"
  | "roles"
  | "invites"
  | "audit";

export const ADMIN_NAV: Array<{
  href: string;
  key: AdminNavKey;
  icon: React.ComponentType<{ className?: string }>;
  requires?: string[];
}> = [
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

// Module-level store so Sidebar can read permissions regardless of tree position.
// AdminShell (deep in the tree) writes here; Sidebar (sibling at layout level) subscribes.
let _permissions: string[] | null = null;
const _listeners = new Set<(perms: string[] | null) => void>();

function _notify() {
  _listeners.forEach((fn) => fn(_permissions));
}

/** Rendered by AdminShell — registers permissions for the duration admin pages are mounted. */
export function AdminNavProvider({
  permissions,
  children,
}: {
  permissions: string[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    _permissions = permissions;
    _notify();
    return () => {
      _permissions = null;
      _notify();
    };
  }, [permissions]);

  return <>{children}</>;
}

/** Called by Sidebar — returns permissions when inside admin pages, null otherwise. */
export function useAdminNav() {
  const [permissions, setPermissions] = useState<string[] | null>(_permissions);

  useEffect(() => {
    setPermissions(_permissions);
    _listeners.add(setPermissions);
    return () => {
      _listeners.delete(setPermissions);
    };
  }, []);

  return permissions !== null ? { permissions } : null;
}
