"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  async function createInvite(e: React.FormEvent) {
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
    <div className="space-y-6">
      <form onSubmit={createInvite} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-56">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t("invites.email-placeholder")}
          />
        </div>
        <div>
          <Label htmlFor="roleId">{t("common.role")}</Label>
          <select
            id="roleId"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={submitting || !email}>
          {submitting ? t("common.creating") : t("invites.create-invite")}
        </Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-3 font-medium">{t("common.email")}</th>
              <th className="py-2 pr-3 font-medium">{t("common.role")}</th>
              <th className="py-2 pr-3 font-medium">{t("common.status")}</th>
              <th className="py-2 pr-3 font-medium">{t("invites.expires")}</th>
              <th className="py-2 font-medium text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => {
              const now = new Date();
              const expired = new Date(i.expiresAt) < now;
              const statusKey = i.consumedAt ? "consumed" : expired ? "expired" : "active";
              return (
                <tr key={i.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-mono text-xs">{i.email}</td>
                  <td className="py-2 pr-3">{i.roleName}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      statusKey === "active" ? "bg-green-500/10 text-green-600"
                        : statusKey === "consumed" ? "bg-blue-500/10 text-blue-600"
                        : "bg-orange-500/10 text-orange-600"
                    }`}>
                      {t(`invites.status.${statusKey}`)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground text-xs">
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {statusKey === "active" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => copyInviteUrl(i.token)}>
                            {t("invites.copy-link")}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={revoking === i.id} onClick={() => revoke(i.id)}>
                            {revoking === i.id ? t("invites.revoking") : t("invites.revoke")}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
