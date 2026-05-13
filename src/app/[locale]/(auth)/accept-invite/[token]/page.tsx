"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MosaicLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type InviteInfo = { email: string; role: string; expiresAt: string };

export default function AcceptInvitePage() {
  const t = useTranslations("accept-invite");
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? t("errors.unknown"));
        return;
      }
      setInvite((await res.json()) as InviteInfo);
    })();
  }, [token, t]);

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
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitError(body.error ?? t("errors.unknown"));
      return;
    }
    if (!invite) return;
    await signIn("credentials", { email: invite.email, password: values.password, redirect: false });
    window.location.href = "/";
  }

  if (loadError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <MosaicLogo className="mb-8 h-20" />
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }
  if (!invite) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <LoaderCircleIcon className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
      <MosaicLogo className="mb-8 h-20" />
      <div className="space-y-6 px-6 w-full max-w-md">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="font-semibold text-3xl">{t("welcome")}</h1>
          <p className="text-muted-foreground text-balance">
            {t("subtitle", { email: invite.email, role: invite.role })}
          </p>
        </div>
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name.label")}</FormLabel>
                  <FormControl><Input type="text" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password.label")}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("confirm-password.label")}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {submitError && <p className="text-destructive text-sm text-center" role="alert">{submitError}</p>}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
