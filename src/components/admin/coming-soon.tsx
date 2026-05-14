import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ComingSoonKey = "objects" | "tables" | "roles" | "audit";

export async function ComingSoon({ k }: { k: ComingSoonKey }) {
  const t = await getTranslations("admin.coming-soon");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{t(`${k}.title`)}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{t("label")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t(`${k}.description`)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
