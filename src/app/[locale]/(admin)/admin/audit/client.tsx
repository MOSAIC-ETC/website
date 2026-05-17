"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ANY = "__any__";

type AuditItem = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string | null;
  metadata: unknown;
  performedAt: string;
  performer: { id: string; name: string; email: string } | null;
};

type Filters = { action: string; resourceType: string; performedBy: string };

export function AuditAdminClient({
  actions,
  resourceTypes,
  performers,
}: {
  actions: string[];
  resourceTypes: string[];
  performers: Array<{ id: string; email: string }>;
}) {
  const t = useTranslations("admin");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ action: "", resourceType: "", performedBy: "" });
  const seqRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor });
      if (filters.action) params.set("action", filters.action);
      if (filters.resourceType) params.set("resourceType", filters.resourceType);
      if (filters.performedBy) params.set("performedBy", filters.performedBy);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { items: AuditItem[]; nextCursor: string | null };
      if (seq !== seqRef.current) return;
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [cursor, filters]);

  // Reset and refetch whenever filters change.
  useEffect(() => {
    setCursor(null);
    setItems([]);
    setHasMore(false);
    const seq = ++seqRef.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.resourceType) params.set("resourceType", filters.resourceType);
    if (filters.performedBy) params.set("performedBy", filters.performedBy);
    fetch(`/api/admin/audit?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { items: AuditItem[]; nextCursor: string | null }) => {
        if (seq !== seqRef.current) return;
        setItems(data.items);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label={t("audit.filters.action")}
          value={filters.action}
          onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          options={actions}
          allLabel={t("audit.any")}
        />
        <FilterSelect
          label={t("audit.filters.resource")}
          value={filters.resourceType}
          onChange={(v) => setFilters((f) => ({ ...f, resourceType: v }))}
          options={resourceTypes}
          allLabel={t("audit.any")}
        />
        <FilterSelect
          label={t("audit.filters.performer")}
          value={filters.performedBy}
          onChange={(v) => setFilters((f) => ({ ...f, performedBy: v }))}
          options={performers.map((p) => p.id)}
          renderOption={(id) => performers.find((p) => p.id === id)?.email ?? id}
          allLabel={t("audit.any")}
        />
        {(filters.action || filters.resourceType || filters.performedBy) && (
          <div className="flex items-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFilters({ action: "", resourceType: "", performedBy: "" })}
            >
              {t("audit.clear-filters")}
            </Button>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("audit.headers.when")}</TableHead>
            <TableHead>{t("audit.headers.performer")}</TableHead>
            <TableHead>{t("audit.headers.action")}</TableHead>
            <TableHead>{t("audit.headers.resource")}</TableHead>
            <TableHead>{t("audit.headers.description")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                {t("audit.empty")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(item.performedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs">
                  {item.performer ? item.performer.email : <span className="text-muted-foreground">{t("common.system")}</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {item.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {item.resourceType}
                  {item.resourceId ? ` · ${item.resourceId}` : ""}
                </TableCell>
                <TableCell className="text-xs">{item.description}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex justify-center pt-2">
        {hasMore && (
          <Button size="sm" variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? t("common.loading") : t("audit.load-more")}
          </Button>
        )}
        {loading && !hasMore && <span className="text-muted-foreground text-xs">{t("common.loading")}</span>}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  renderOption,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (v: string) => string;
  allLabel: string;
}) {
  return (
    <div className="space-y-1.5 min-w-44">
      <label className="text-muted-foreground text-xs">{label}</label>
      <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? "" : v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{allLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {renderOption ? renderOption(opt) : opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
