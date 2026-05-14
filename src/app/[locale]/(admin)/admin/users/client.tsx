"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type UserRow = { id: string; email: string; name: string; roleId: string; roleName: string; createdAt: string };
type RoleOption = { id: string; name: string };

export function UsersAdminClient({ users, roles }: { users: UserRow[]; roles: RoleOption[] }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(userId: string, roleId: string) {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("users.toasts.update-failed", { status: res.status }));
        return;
      }
      toast.success(t("users.toasts.updated"));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(t("users.delete-confirm", { email }))) return;
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("users.toasts.delete-failed", { status: res.status }));
        return;
      }
      toast.success(t("users.toasts.deleted"));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="py-2 pr-3 font-medium">{t("common.name")}</th>
            <th className="py-2 pr-3 font-medium">{t("common.email")}</th>
            <th className="py-2 pr-3 font-medium">{t("common.role")}</th>
            <th className="py-2 pr-3 font-medium">{t("common.created")}</th>
            <th className="py-2 font-medium text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-b-0">
              <td className="py-2 pr-3">{u.name}</td>
              <td className="py-2 pr-3 font-mono text-xs">{u.email}</td>
              <td className="py-2 pr-3">
                <select
                  value={u.roleId}
                  disabled={busyId === u.id}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </td>
              <td className="py-2 pr-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="py-2 text-right">
                <Button size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => deleteUser(u.id, u.email)}>
                  {t("common.delete")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
