"use client";

import { useMemo, useState } from "react";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
};

export function RolesAdminClient({
  initial,
  availablePermissions,
}: {
  initial: RoleRow[];
  availablePermissions: string[];
}) {
  const t = useTranslations("admin");
  const [editTarget, setEditTarget] = useState<RoleRow | null>(null);
  const [openNew, setOpenNew] = useState(false);

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("roles.headers.permissions")}</TableHead>
            <TableHead>{t("roles.headers.users")}</TableHead>
            <TableHead className="text-right">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" onClick={() => setOpenNew(true)}>
                    <PlusIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("roles.new-role")}</TooltipContent>
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((row) => (
            <RoleRowItem key={row.id} row={row} onEdit={() => setEditTarget(row)} />
          ))}
        </TableBody>
      </Table>

      <RoleDialog
        key={openNew ? "new" : "new-closed"}
        open={openNew}
        mode="create"
        availablePermissions={availablePermissions}
        onClose={() => setOpenNew(false)}
      />
      <RoleDialog
        key={editTarget?.id ?? "edit-closed"}
        open={!!editTarget}
        mode="edit"
        role={editTarget}
        availablePermissions={availablePermissions}
        onClose={() => setEditTarget(null)}
      />
    </TooltipProvider>
  );
}

function RoleRowItem({ row, onEdit }: { row: RoleRow; onEdit: () => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(t("roles.delete-confirm", { name: row.name }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/roles/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("roles.toasts.delete-failed", { status: res.status }));
        return;
      }
      toast.success(t("roles.toasts.deleted"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{row.name}</div>
        {row.description && <div className="text-muted-foreground text-xs">{row.description}</div>}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {row.permissions.length === 0 ? (
            <span className="text-muted-foreground text-xs">{t("roles.no-permissions")}</span>
          ) : (
            row.permissions.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-xs">
                {p}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">{row.userCount}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={onEdit} disabled={busy}>
                <PencilIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("roles.edit")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" onClick={onDelete} disabled={busy || row.userCount > 0}>
                <Trash2Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {row.userCount > 0 ? t("roles.delete-blocked-users") : t("common.delete")}
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RoleDialog({
  open,
  mode,
  role,
  availablePermissions,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  role?: RoleRow | null;
  availablePermissions: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [submitting, setSubmitting] = useState(false);

  function toggle(p: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/admin/roles" : `/api/admin/roles/${role!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          permissions: Array.from(permissions),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const key = mode === "create" ? "roles.toasts.create-failed" : "roles.toasts.update-failed";
        toast.error(body.error ?? t(key, { status: res.status }));
        return;
      }
      toast.success(t(mode === "create" ? "roles.toasts.created" : "roles.toasts.updated"));
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const groups = useMemo(() => groupByPrefix(availablePermissions), [availablePermissions]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("roles.new-dialog.title") : t("roles.edit-dialog.title")}</DialogTitle>
          <DialogDescription>{t("roles.dialog-description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">{t("common.name")}</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t("roles.name-placeholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-description">{t("roles.description")}</Label>
            <Input
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("roles.description-placeholder")}
            />
          </div>

          <div className="space-y-3">
            <Label>{t("roles.permissions")}</Label>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto p-3 border rounded-md">
              {groups.map((group) => (
                <div key={group.prefix} className="space-y-1.5">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">{group.prefix}</div>
                  <div className="space-y-1.5">
                    {group.items.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={permissions.has(perm)}
                          onCheckedChange={() => toggle(perm)}
                        />
                        <span className="font-mono text-xs">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting
                ? mode === "create"
                  ? t("common.creating")
                  : t("roles.saving")
                : mode === "create"
                  ? t("common.create")
                  : t("roles.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function groupByPrefix(perms: string[]): Array<{ prefix: string; items: string[] }> {
  const map = new Map<string, string[]>();
  for (const p of perms) {
    const prefix = p.split(".")[0] ?? p;
    const list = map.get(prefix) ?? [];
    list.push(p);
    map.set(prefix, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, items]) => ({ prefix, items: items.sort() }));
}
