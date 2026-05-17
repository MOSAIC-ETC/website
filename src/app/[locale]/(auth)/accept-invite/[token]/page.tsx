"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClockIcon, EyeIcon, EyeOffIcon, LoaderCircleIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MosaicLogo } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type InviteInfo = { email: string; role: string; expiresAt: string };

type LoadErrorKind = "not-found" | "consumed" | "expired" | "unknown";

const STATUS_TO_KIND: Record<number, LoadErrorKind> = {
  404: "not-found",
  409: "consumed",
  410: "expired",
};

export default function AcceptInvitePage() {
  const t = useTranslations("accept-invite");
  const locale = useLocale();
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<LoadErrorKind | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(STATUS_TO_KIND[res.status] ?? "unknown");
          return;
        }
        setInvite((await res.json()) as InviteInfo);
      } catch {
        if (!cancelled) setLoadError("unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const formSchema = z
    .object({
      name: z.string().min(1, t("errors.name-required")),
      password: z.string().min(8, t("errors.password-min")),
      confirmPassword: z.string().min(8, t("errors.password-min")),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t("errors.passwords-dont-match"),
      path: ["confirmPassword"],
    });

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const res = await fetch(`/api/invites/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, password: values.password }),
    });
    if (!res.ok) {
      // Map post-submit failures to the same error states as load-time, so the
      // user gets the same clear treatment if e.g. the invite expired while
      // they were filling out the form.
      const kind = STATUS_TO_KIND[res.status];
      if (kind) {
        setLoadError(kind);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitError(t("errors.submit-failed", { message: body.error ?? "" }));
      return;
    }
    if (!invite) return;
    toast.success(t("success"));
    await signIn("credentials", { email: invite.email, password: values.password, redirect: false });
    router.replace("/");
  }

  if (loadError) {
    return <ErrorState kind={loadError} />;
  }
  if (!invite) {
    return <LoadingState />;
  }

  return (
    <PageShell>
      <div className="flex flex-col space-y-3 text-center">
        <h1 className="font-semibold text-3xl">{t("welcome")}</h1>
        <p className="text-muted-foreground text-balance">{t("subtitle")}</p>
        <InviteSummary invite={invite} locale={locale} />
      </div>

      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gap-0.5">
                  {t("name.label")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="name" placeholder={t("name.placeholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gap-0.5">
                  {t("password.label")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    autoComplete="new-password"
                    placeholder={t("password.placeholder")}
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    toggleLabel={showPassword ? t("hide-password") : t("show-password")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gap-0.5">
                  {t("confirm-password.label")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    autoComplete="new-password"
                    placeholder={t("confirm-password.placeholder")}
                    visible={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                    toggleLabel={showConfirm ? t("hide-password") : t("show-password")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {submitError && (
            <p className="text-destructive text-sm text-center" role="alert">
              {submitError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            <LoaderCircleIcon
              className="w-4 h-4 animate-spin"
              style={{ display: form.formState.isSubmitting ? "inline-block" : "none" }}
            />
            {form.formState.isSubmitting ? t("submitting") : t("submit")}
          </Button>

          <p className="text-muted-foreground text-xs text-center">
            {t("have-account")}{" "}
            <Link href="/login" className="hover:text-primary underline">
              {t("sign-in")}
            </Link>
          </p>
        </form>
      </Form>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
      <MosaicLogo className="mb-8 h-20" />
      <div className="space-y-6 px-6 w-full max-w-md">{children}</div>
    </div>
  );
}

function LoadingState() {
  const t = useTranslations("accept-invite");
  return (
    <PageShell>
      <div className="flex flex-col justify-center items-center gap-3 py-12 text-muted-foreground">
        <LoaderCircleIcon className="w-8 h-8 animate-spin" aria-hidden />
        <p className="text-sm">{t("loading")}</p>
      </div>
    </PageShell>
  );
}

function InviteSummary({ invite, locale }: { invite: InviteInfo; locale: string }) {
  const t = useTranslations("accept-invite");
  // Capture "now" once at mount so the "expires soon" hint is a deterministic
  // snapshot (avoids calling Date.now() during render).
  const [mountedAt] = useState(() => Date.now());
  const expiresAt = useMemo(() => new Date(invite.expiresAt), [invite.expiresAt]);
  const expiresSoon = expiresAt.getTime() - mountedAt < 24 * 60 * 60 * 1000;
  const formatted = expiresAt.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <div className="font-mono text-sm">{invite.email}</div>
      <div className="flex flex-wrap justify-center items-center gap-2 text-xs">
        <Badge variant="secondary">{t("invitee-line", { role: invite.role })}</Badge>
        <span
          className={cn("inline-flex items-center gap-1", expiresSoon ? "text-orange-600" : "text-muted-foreground")}
        >
          <ClockIcon className="w-3 h-3" aria-hidden />
          {expiresSoon ? t("expires-soon") : t("expires-on", { date: formatted })}
        </span>
      </div>
    </div>
  );
}

function ErrorState({ kind }: { kind: LoadErrorKind }) {
  const t = useTranslations("accept-invite");
  const actionHref = ERROR_VARIANTS[kind];
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl">{t(`errors.${kind}.title`)}</h1>
          <p className="text-muted-foreground text-balance">{t(`errors.${kind}.description`)}</p>
        </div>
        <Button asChild className="w-full">
          <Link href={actionHref}>{t(`errors.${kind}.action`)}</Link>
        </Button>
      </div>
    </PageShell>
  );
}

const ERROR_VARIANTS: Record<LoadErrorKind, "/" | "/login"> = {
  "not-found": "/",
  consumed: "/login",
  expired: "/",
  unknown: "/",
};

type PasswordInputProps = React.ComponentProps<"input"> & {
  visible: boolean;
  onToggle: () => void;
  toggleLabel: string;
};

function PasswordInput({ visible, onToggle, toggleLabel, className, ...props }: PasswordInputProps) {
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={onToggle}
        aria-label={toggleLabel}
        className="right-0 absolute inset-y-0 flex justify-center items-center px-3 text-muted-foreground hover:text-foreground cursor-pointer"
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}
