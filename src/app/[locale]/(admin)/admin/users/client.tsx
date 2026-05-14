"use client";

import { useState } from "react";

import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.email")}</TableHead>
            <TableHead>{t("common.role")}</TableHead>
            <TableHead>{t("common.created")}</TableHead>
            <TableHead className="text-right">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name}</TableCell>
              <TableCell className="font-mono text-xs">{u.email}</TableCell>
              <TableCell>
                <Select value={u.roleId} disabled={busyId === u.id} onValueChange={(value) => changeRole(u.id, value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {new Date(u.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={busyId === u.id}
                      onClick={() => deleteUser(u.id, u.email)}
                      className="hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("common.delete")}</TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
