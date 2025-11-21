"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon, MosaicLogo } from "@/components/icons";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoaderCircleIcon } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("login");

  const formSchema = z.object({
    email: z.string().min(1, t("errors.email-required")).email(t("errors.email-invalid")),
    password: z.string().min(8, t("errors.password-min")),
    remember: z.boolean().default(false).optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
    mode: "onSubmit",
  });

  async function onSubmit(values: FormValues) {
    // TODO: Replace with real authentication logic
    console.log("Login submit", values);
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

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              <LoaderCircleIcon
                className="w-4 h-4 animate-spin"
                style={{ display: form.formState.isSubmitting ? "inline-block" : "none" }}
              />
              {form.formState.isSubmitting ? t("submitting") : t("submit")}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-sm">{t("or-continue-with")}</span>
              <Separator className="flex-1" />
            </div>

            <Button type="button" variant="outline" className="w-full">
              <GoogleIcon />
              Google
            </Button>
          </form>
        </Form>

        <p className="text-muted-foreground text-sm text-center">
          {t("no-account")}{" "}
          <Button variant="link" size="sm" className="px-0" asChild>
            <Link href="/sign-up">{t("sign-up")}</Link>
          </Button>
        </p>

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
