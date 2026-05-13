import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { DEFAULT_INSTRUMENT_PARAMS, instrumentParamsSchema, type InstrumentParams } from "@/lib/schemas/instrument-params";

import { ParamsAdminClient } from "./client";

export default async function ParamsAdminPage() {
  const snapshots = await prisma.instrumentParameter.findMany({
    orderBy: { version: "desc" },
    include: { creator: { select: { name: true, email: true } } },
  });

  const current = snapshots.find((s) => s.isCurrent);
  const parsed = current ? instrumentParamsSchema.safeParse(current.params) : null;
  const params: InstrumentParams = parsed?.success ? parsed.data : DEFAULT_INSTRUMENT_PARAMS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Instrument parameters</h1>
        <p className="text-muted-foreground">Edit the editable subset of MOSAIC instrument constants. Each save creates a new snapshot.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Current values (v{current?.version ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <ParamsAdminClient
            current={params}
            snapshots={snapshots.map((s) => ({
              id: s.id,
              version: s.version,
              isCurrent: s.isCurrent,
              notes: s.notes,
              createdAt: s.createdAt.toISOString(),
              creator: s.creator,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
