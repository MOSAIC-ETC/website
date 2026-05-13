import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const session = await auth();
  const [filterCount, objectCount, userCount, paramsVersion, recentAudits] = await Promise.all([
    prisma.file.count({ where: { category: "FILTER", isActive: true } }),
    prisma.file.count({ where: { category: "OBJECT", assetRole: "CUBE", isActive: true } }),
    prisma.user.count(),
    prisma.instrumentParameter.findFirst({ where: { isCurrent: true }, select: { version: true } }),
    prisma.auditLog.findMany({
      orderBy: { performedAt: "desc" },
      take: 5,
      include: { performer: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Welcome, {session?.user.name}</h1>
        <p className="text-muted-foreground">Role: {session?.user.roleName}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Filters" value={filterCount} />
        <Stat label="Objects" value={objectCount} />
        <Stat label="Users" value={userCount} />
        <Stat label="Instrument params version" value={paramsVersion?.version ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAudits.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentAudits.map((a) => (
                <li key={a.id} className="text-sm flex justify-between gap-4 border-b last:border-b-0 pb-2">
                  <div>
                    <div className="font-medium">{a.description}</div>
                    <div className="text-muted-foreground text-xs">
                      {a.performer?.email ?? "system"} · {a.action}
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(a.performedAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-muted-foreground text-xs uppercase tracking-wider">{label}</div>
      <div className="font-bold text-2xl mt-1">{value}</div>
    </div>
  );
}
