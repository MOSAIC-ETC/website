"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MosaicLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [formError, setFormError] = useState<string | null>(null);

  const formSchema = z.object({
    email: z.string().min(1, t("errors.email-required")).email(t("errors.email-invalid")),
    password: z.string().min(8, t("errors.password-min")),
    remember: z.boolean().default(false).optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", remember: false },
    mode: "onSubmit",
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (!result) {
      setFormError(t("errors.unexpected"));
      return;
    }
    if (result.error) {
      setFormError(t("errors.invalid-credentials"));
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
      <MosaicLogo className="mb-8 h-20" />

      <div className="space-y-6 px-6 w-full max-w-md">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="font-semibold text-3xl">{t("welcome")}</h1>
          <p className="text-muted-foreground text-center text-balance">{t("subtitle")}</p>
        </div>

        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="gap-0.5">
                      {t("email.label")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t("email.placeholder")} {...field} />
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
                      <Input type="password" placeholder={t("password.placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between items-center">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex items-center">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal text-muted-foreground text-sm cursor-pointer select-none">
                      {t("remember-me")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button variant="link" size="sm" className="px-0" asChild>
                <Link href="/forgot-password">{t("forgot-password")}</Link>
              </Button>
            </div>

            {formError && (
              <p className="text-destructive text-sm text-center" role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              <LoaderCircleIcon
                className="w-4 h-4 animate-spin"
                style={{ display: form.formState.isSubmitting ? "inline-block" : "none" }}
              />
              {form.formState.isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>

        <div className="mt-12 text-muted-foreground text-xs text-center">
          {t("footer.agree-prefix")}{" "}
          <Link href="/terms-of-service" className="hover:text-primary underline">
            {t("footer.terms-of-service")}
          </Link>{" "}
          {t("footer.and")}{" "}
          <Link href="/privacy-policy" className="hover:text-primary underline">
            {t("footer.privacy-policy")}
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
