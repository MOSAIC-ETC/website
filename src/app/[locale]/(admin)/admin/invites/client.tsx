"use client";

import { useState } from "react";

import { BanIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type InviteRow = {
  id: string;
  email: string;
  token: string;
  roleName: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  creatorEmail: string | null;
};
type RoleOption = { id: string; name: string };

export function InvitesAdminClient({ invites, roles }: { invites: InviteRow[]; roles: RoleOption[] }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function createInvite(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roleId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("invites.toasts.create-failed", { status: res.status }));
        return;
      }
      toast.success(t("invites.toasts.created"));
      setEmail("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm(t("invites.revoke-confirm"))) return;
    setRevoking(id);
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? t("invites.toasts.revoke-failed", { status: res.status }));
        return;
      }
      toast.success(t("invites.toasts.revoked"));
      router.refresh();
    } finally {
      setRevoking(null);
    }
  }

  function copyInviteUrl(token: string) {
    const url = `${window.location.origin}/accept-invite/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("invites.toasts.copied")),
      () => toast.error(t("invites.toasts.copy-failed")),
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <form onSubmit={createInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5 min-w-56">
            <Label htmlFor="invite-email">{t("common.email")}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("invites.email-placeholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">{t("common.role")}</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="invite-role" className="w-40">
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
          </div>
          <Button type="submit" disabled={submitting || !email} className="self-end">
            {submitting ? t("common.creating") : t("invites.create-invite")}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("common.role")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("invites.expires")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((i) => {
              const now = new Date();
              const expired = new Date(i.expiresAt) < now;
              const statusKey = i.consumedAt ? "consumed" : expired ? "expired" : "active";
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.email}</TableCell>
                  <TableCell>{i.roleName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusKey === "active" ? "default" : statusKey === "consumed" ? "secondary" : "outline"}
                    >
                      {t(`invites.status.${statusKey}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {statusKey === "active" && (
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon-sm" variant="ghost" onClick={() => copyInviteUrl(i.token)}>
                              <CopyIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("invites.copy-link")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={revoking === i.id}
                              onClick={() => revoke(i.id)}
                              className="hover:text-destructive"
                            >
                              <BanIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("invites.revoke")}</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
