import { useState } from "react";
import { q, useRecords } from "@/lib/datasource";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const select = q.select({
  stockId: "Stock ID",
  packName: "Pack Display Name",
  reagentName: "Reagent Name (from Reagent)",
  lot: "Lot/Batch Number",
  location: "Location",
  stockCondition: "Stock Condition",
  level: "Calculated Reagent Level",
  remaining: "Remaining Reagent Display",
  expiryStatus: "Automatic Expiry Status",
  expiryDate: "Expiry Date",
  manufacturer: "Manufacturer (from Reagent)",
  analyzer: "Analyzer (from Reagent)",
});

const filters = [
  { label: "All Packs", value: "all" },
  { label: "Unopened", value: "Unopened" },
  { label: "In Use", value: "In Use" },
  { label: "Exhausted", value: "Exhausted" },
  { label: "Expired", value: "Expired" },
  { label: "Quarantined", value: "Quarantined" },
  { label: "Getting Low", value: "Getting Low" },
  { label: "Nearly Exhausted", value: "Nearly Exhausted" },
];

export default function Block() {
  const [active, setActive] = useState("all");
  const { data, status, error, fetchNextPage, hasNextPage, isFetching } = useRecords({
    select,
    count: 100,
    orderBy: q.asc("Pack Display Name"),
  });
  const records = data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = records.filter((record) => {
    const f = record.fields ?? {};
    const condition = f["Stock Condition"]?.label ?? f["Stock Condition"] ?? "";
    const level = f["Calculated Reagent Level"] ?? "";
    if (active === "all") return true;
    if (active === "Getting Low" || active === "Nearly Exhausted") return level === active;
    return condition === active;
  });
  const counts = Object.fromEntries(filters.map((filter) => [
    filter.value,
    filter.value === "all" ? records.length : records.filter((record) => {
      const f = record.fields ?? {};
      const condition = f["Stock Condition"]?.label ?? f["Stock Condition"] ?? "";
      const level = f["Calculated Reagent Level"] ?? "";
      return filter.value === "Getting Low" || filter.value === "Nearly Exhausted"
        ? level === filter.value
        : condition === filter.value;
    }).length
  ]));

  return (
    <div className="container py-5">
      <div className="content">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">EDLS • Reagent Inventory</p>
                <h2 className="text-xl font-bold text-slate-900">Quick stock filters</h2>
                <p className="text-sm text-slate-500">Choose a condition to narrow the inventory below.</p>
              </div>
              <div className="text-sm font-medium text-slate-600">{filtered.length} matching packs</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={active === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActive(filter.value)}
                  className={active === filter.value ? "bg-slate-900 text-white hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}
                >
                  {filter.label}
                  <span className={active === filter.value ? "ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs" : "ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs"}>{counts[filter.value] ?? 0}</span>
                </Button>
              ))}
            </div>
            {status === "pending" && <p className="text-sm text-slate-500">Loading live inventory…</p>}
            {status === "error" && <p className="text-sm text-red-600">Could not load inventory: {String(error)}</p>}
            {status === "success" && filtered.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No packs match this filter.</p>}
            {status === "success" && filtered.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Reagent / Pack</th><th className="px-3 py-3">Lot / Batch</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Stock Condition</th><th className="px-3 py-3">Remaining</th><th className="px-3 py-3">Reagent Level</th><th className="px-3 py-3">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((record) => {
                      const f = record.fields ?? {};
                      const name = f["Pack Display Name"] || f["Reagent Name (from Reagent)"] || f["Stock ID"] || "Reagent pack";
                      const condition = f["Stock Condition"]?.label ?? f["Stock Condition"] ?? "Not set";
                      const level = f["Calculated Reagent Level"] || "Not calculated";
                      const remaining = f["Remaining Reagent Display"] || "—";
                      const expiry = f["Expiry Date"] ? new Date(f["Expiry Date"]).toLocaleDateString("en-GB") : "—";
                      const tone = condition === "Quarantined" || condition === "Expired" || level === "Nearly Exhausted" || level === "Exhausted" ? "bg-red-50 text-red-700" : level === "Getting Low" ? "bg-amber-50 text-amber-700" : condition === "In Use" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
                      return <tr key={record.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3"><div className="font-semibold text-slate-900">{name}</div><div className="text-xs text-slate-500">{f["Manufacturer (from Reagent)"]?.label ?? f["Manufacturer (from Reagent)"] ?? ""}{f["Analyzer (from Reagent)"] ? " • " + (f["Analyzer (from Reagent)"]?.label ?? f["Analyzer (from Reagent)"]) : ""}</div></td>
                        <td className="px-3 py-3 text-slate-700">{f["Lot/Batch Number"] || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{f["Location"] || "—"}</td>
                        <td className="px-3 py-3"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " + tone}>{condition}</span></td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{remaining}</td>
                        <td className="px-3 py-3 text-slate-700">{level}</td>
                        <td className="px-3 py-3 text-slate-700">{expiry}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {hasNextPage && <div className="pt-2"><Button variant="outline" size="sm" disabled={isFetching} onClick={() => fetchNextPage()}>{isFetching ? "Loading…" : "Load more packs"}</Button></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}