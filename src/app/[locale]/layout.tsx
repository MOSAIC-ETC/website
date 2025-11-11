import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider, hasLocale } from "next-intl";

import { normalizeRequestedLocale, routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type MetadataProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeRequestedLocale(rawLocale);

  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <SidebarProvider>
              <Sidebar className="lg:hidden" />
              <main className="w-full min-h-screen">
                <Navbar />
                {children}
              </main>
            </SidebarProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
