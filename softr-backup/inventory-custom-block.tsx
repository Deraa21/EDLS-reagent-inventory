import { useMemo, useState } from "react";
import { datasource, q, useRecords } from "@/lib/datasource";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Search, RefreshCw } from "lucide-react";

const ds = datasource.define({ stock: "stock" });
const select = q.select({
  id: "Stock ID", reagent: "Reagent Name (from Reagent)", pack: "Pack Display Name",
  manufacturer: "Manufacturer (from Reagent)", analyzer: "Analyzer (from Reagent)",
  lot: "Lot/Batch Number", ref: "REF Number", received: "Date Received", expiry: "Expiry Date",
  opened: "Opened Date", checked: "Last Checked", location: "Location", condition: "Stock Condition",
  percent: "Remaining Reagent %", quantity: "Quantity", unit: "Unit", notes: "Scientist Notes",
});

function val(v: any): string { if (v == null || v === "") return ""; if (Array.isArray(v)) return v.map((x) => typeof x === "object" ? (x.name ?? x.label ?? "") : String(x)).join(", "); return typeof v === "object" ? (v.name ?? v.label ?? "") : String(v); }
function percent(v: any): number | null { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? Math.round(n <= 1 ? n * 100 : n) : null; }
function days(v: any): number | null { if (!v) return null; const d = new Date(v); if (Number.isNaN(d.getTime())) return null; d.setHours(0, 0, 0, 0); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.ceil((d.getTime() - t.getTime()) / 86400000); }
function date(v: any): string { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

const isInactive = (f: any) => ["exhausted", "expired", "quarantined"].includes(val(f.condition).toLowerCase()) || (days(f.expiry) !== null && days(f.expiry)! < 0) || Number(f.quantity) <= 0 || percent(f.percent) === 0;
const levelOf = (f: any): "Inactive" | "Critical" | "Low" | "Normal" | "Not checked" => {
  if (isInactive(f)) return "Inactive";
  const p = percent(f.percent);
  if (p === null) return "Not checked";
  if (p <= 20) return "Critical";
  if (p <= 40) return "Low";
  return "Normal";
};
const TONE: Record<string, [string, string]> = {
  Critical: ["bg-red-600", "text-red-700"], Low: ["bg-amber-500", "text-amber-800"],
  Normal: ["bg-emerald-600", "text-slate-800"], Inactive: ["bg-slate-400", "text-slate-600"], "Not checked": ["bg-slate-300", "text-slate-600"],
};
function Level({ level }: { level: string }) {
  const t = TONE[level] ?? TONE.Inactive;
  return <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium"><span className={`h-2 w-2 rounded-full ${t[0]}`} /><span className={t[1]}>{level}</span></span>;
}
function Bar({ p, level }: { p: number | null; level: string }) {
  const t = TONE[level] ?? TONE.Inactive;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${t[0]}`} style={{ width: `${p ?? 0}%` }} /></div>
      <span className="w-9 text-sm font-semibold tabular-nums text-slate-900">{p === null ? "—" : p + "%"}</span>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-900">{value || "—"}</span></div>;
}

type Tab = "all" | "attention" | "expiring" | "inactive";

export default function Block() {
  const { data, status, error, refetch, isFetching } = useRecords({ from: ds.stock, select, count: 100, orderBy: q.asc("id") });
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [analyzer, setAnalyzer] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("lowest");
  const [limit, setLimit] = useState(25);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => data?.pages.flatMap((p: any) => p.items) ?? [], [data]);
  const analyzers = useMemo(() => Array.from(new Set(rows.map((r: any) => val(r.fields.analyzer)).filter(Boolean))).sort(), [rows]);

  const counts = useMemo(() => ({
    all: rows.length,
    attention: rows.filter((r: any) => ["Critical", "Low"].includes(levelOf(r.fields))).length,
    expiring: rows.filter((r: any) => { const d = days(r.fields.expiry); return !isInactive(r.fields) && d !== null && d >= 0 && d <= 30; }).length,
    inactive: rows.filter((r: any) => isInactive(r.fields)).length,
  }), [rows]);

  const visible = useMemo(() => {
    const qs = query.trim().toLowerCase();
    const list = rows.filter((r: any) => {
      const f = r.fields;
      if (tab === "attention" && !["Critical", "Low"].includes(levelOf(f))) return false;
      const condition = val(f.condition).toLowerCase();
      if (stockFilter === "Unopened" && condition !== "unopened") return false;
      if (stockFilter === "In Use" && condition !== "in use") return false;
      if (stockFilter === "Exhausted" && condition !== "exhausted" && percent(f.percent) !== 0) return false;
      if (stockFilter === "Expired" && condition !== "expired" && !(days(f.expiry) !== null && days(f.expiry)! < 0)) return false;
      if (stockFilter === "Quarantined" && condition !== "quarantined") return false;
      if (stockFilter === "Getting Low" && levelOf(f) !== "Low") return false;
      if (stockFilter === "Nearly Exhausted" && levelOf(f) !== "Critical") return false;
      if (tab === "expiring") { const d = days(f.expiry); if (isInactive(f) || d === null || d < 0 || d > 30) return false; }
      if (tab === "inactive" && !isInactive(f)) return false;
      if (analyzer && val(f.analyzer) !== analyzer) return false;
      if (qs && !(`${val(f.reagent)} ${val(f.pack)} ${val(f.lot)} ${val(f.analyzer)} ${val(f.location)}`.toLowerCase().includes(qs))) return false;
      return true;
    });
    list.sort((a: any, b: any) => {
      if (sort === "name") return (val(a.fields.reagent) || val(a.fields.pack)).localeCompare(val(b.fields.reagent) || val(b.fields.pack));
      if (sort === "expiry") return (days(a.fields.expiry) ?? 99999) - (days(b.fields.expiry) ?? 99999);
      return (percent(a.fields.percent) ?? 101) - (percent(b.fields.percent) ?? 101);
    });
    return list;
  }, [rows, tab, query, analyzer, sort, stockFilter]);

  const shown = visible.slice(0, limit);
  const open: any = rows.find((r: any) => r.id === openId);
  const f: any = open?.fields;
  const name = (x: any) => val(x.reagent) || val(x.pack) || "Unnamed reagent";

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All packs" }, { key: "attention", label: "Needs reorder" },
    { key: "expiring", label: "Expiring" }, { key: "inactive", label: "Inactive" },
  ];
  const sel = "h-11 w-full rounded-lg border border-slate-300 !bg-white px-3 text-sm !text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:h-10";

  return (
    <section style={{backgroundColor:"#f8fafc",color:"#0f172a"}} className="container min-h-screen !bg-slate-50 !text-slate-900">
      <div style={{backgroundColor:"#f8fafc",color:"#0f172a"}} className="content flex flex-col gap-5 !bg-slate-50 py-6 !text-slate-900 sm:gap-6 sm:py-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0B1F4B] sm:text-3xl">Inventory</h1>
            <p className="mt-1 text-sm text-slate-600">Every reagent pack on hand, with level, lot and expiry.</p>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-[#0B1F4B] hover:bg-slate-50 disabled:opacity-60 sm:h-10">
            <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />{isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {status === "pending" && <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-600">Loading inventory…</div>}
        {status === "error" && <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Could not load inventory: {String((error as any)?.message ?? "Please check the connection.")}</div>}

        {status === "success" && <>
          <div role="tablist" className="-mb-px flex gap-6 overflow-x-auto whitespace-nowrap border-b border-slate-200">
            {tabs.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setLimit(25); }}
                className={`-mb-px border-b-2 pb-3 text-sm font-medium ${tab === t.key ? "border-[#0B1F4B] text-[#0B1F4B]" : "border-transparent text-slate-600 hover:text-[#0B1F4B]"}`}>
                {t.label} <span className="ml-1 tabular-nums text-slate-500">{counts[t.key]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(25); }} placeholder="Search reagent, lot, location" className={`${sel} w-full pl-9`} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setLimit(25); }} className={sel} aria-label="Filter inventory by stock condition or reagent level">
                <option value="all">All Packs</option>
                <option value="Unopened">Unopened</option>
                <option value="In Use">In Use</option>
                <option value="Exhausted">Exhausted</option>
                <option value="Expired">Expired</option>
                <option value="Quarantined">Quarantined</option>
                <option value="Getting Low">Getting Low</option>
                <option value="Nearly Exhausted">Nearly Exhausted</option>
              </select>
              <select value={analyzer} onChange={(e) => setAnalyzer(e.target.value)} className={sel} aria-label="Analyzer">
                <option value="">All analyzers</option>
                {analyzers.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel} aria-label="Sort">
                <option value="lowest">Lowest level first</option>
                <option value="expiry">Expiring soonest</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            <span className="text-xs text-slate-500 sm:ml-auto">{visible.length} {visible.length === 1 ? "pack" : "packs"}</span>
          </div>

          <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 md:hidden">
            {shown.map((r: any) => {
              const x = r.fields, lv = levelOf(x), p = percent(x.percent), d = days(x.expiry);
              return (
                <li key={r.id}>
                  <button onClick={() => setOpenId(r.id)} className="flex w-full flex-col gap-2 px-4 py-3.5 text-left active:bg-slate-50">
                    <div className="flex items-start justify-between gap-3"><span className="font-medium text-slate-900">{name(x)}</span><Level level={lv} /></div>
                    <div className="text-xs text-slate-600">{val(x.analyzer) || "—"} · Lot {val(x.lot) || "—"}</div>
                    <div className="flex items-center justify-between gap-3"><Bar p={p} level={lv} /><span className={`text-xs ${d !== null && d >= 0 && d <= 30 ? "font-medium text-amber-800" : "text-slate-600"}`}>Exp {date(x.expiry)}</span></div>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-600">No packs match this view.</li>}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                {["Reagent", "Analyzer", "Lot / batch", "Remaining", "Status", "Expiry", "Location"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {shown.map((r: any) => {
                  const x = r.fields, lv = levelOf(x), p = percent(x.percent), d = days(x.expiry);
                  return (
                    <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3"><div className="font-medium text-[#0B1F4B]">{name(x)}</div><div className="text-xs text-slate-500">{val(x.id)}</div></td>
                      <td className="px-4 py-3 text-slate-700">{val(x.analyzer) || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{val(x.lot) || "—"}</td>
                      <td className="px-4 py-3"><Bar p={p} level={lv} /></td>
                      <td className="px-4 py-3"><Level level={lv} /></td>
                      <td className={`px-4 py-3 ${d !== null && d >= 0 && d <= 30 ? "font-medium text-amber-800" : d !== null && d < 0 ? "font-medium text-red-700" : "text-slate-700"}`}>{date(x.expiry)}</td>
                      <td className="px-4 py-3 text-slate-700">{val(x.location) || "—"}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-600">No packs match this view.</td></tr>}
              </tbody>
            </table>
          </div>

          {visible.length > limit && (
            <button onClick={() => setLimit(limit + 25)} className="h-11 self-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-[#0B1F4B] hover:bg-slate-50">Show more ({visible.length - limit} left)</button>
          )}
        </>}

        <Sheet open={!!open} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            {f && <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-semibold text-[#0B1F4B]">{name(f)}</SheetTitle>
                <SheetDescription className="text-slate-600">{val(f.id)}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 flex items-center justify-between border-y border-slate-200 py-4">
                <Level level={levelOf(f)} />
                <span className="text-2xl font-semibold tabular-nums text-[#0B1F4B]">{percent(f.percent) === null ? "—" : percent(f.percent) + "%"}</span>
              </div>
              <div className="mt-2">
                <Field label="Analyzer" value={val(f.analyzer)} />
                <Field label="Manufacturer" value={val(f.manufacturer)} />
                <Field label="Lot / batch" value={val(f.lot)} />
                <Field label="REF number" value={val(f.ref)} />
                <Field label="Condition" value={val(f.condition)} />
                <Field label="Quantity" value={[val(f.quantity), val(f.unit)].filter(Boolean).join(" ")} />
                <Field label="Location" value={val(f.location)} />
                <Field label="Received" value={date(f.received)} />
                <Field label="Opened" value={date(f.opened)} />
                <Field label="Expiry" value={date(f.expiry)} />
                <Field label="Last checked" value={date(f.checked)} />
              </div>
              {val(f.notes) && <div className="mt-5"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Scientist notes</div><p className="mt-2 text-sm leading-6 text-slate-800">{val(f.notes)}</p></div>}
              <p className="mt-6 text-xs text-slate-500">To record a check or usage, use Usage &amp; Stock Checks.</p>
            </>}
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
