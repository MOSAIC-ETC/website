import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type MetadataProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.sign-up" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
