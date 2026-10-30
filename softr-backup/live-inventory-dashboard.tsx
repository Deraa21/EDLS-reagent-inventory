import { datasource, q, useRecords } from "@/lib/datasource";
import { RefreshCw } from "lucide-react";

const ds = datasource.define({ stock: "stock" });
const select = q.select({ id: "Stock ID", reagent: "Reagent Name (from Reagent)", pack: "Pack Display Name", manufacturer: "Manufacturer (from Reagent)", analyzer: "Analyzer (from Reagent)", lot: "Lot/Batch Number", received: "Date Received", expiry: "Expiry Date", location: "Location", condition: "Stock Condition", percent: "Remaining Reagent %", quantity: "Quantity", level: "Calculated Reagent Level", reorder: "Reorder Alert", expiryStatus: "Automatic Expiry Status" });

function val(v: any): string { if (v == null || v === "") return ""; if (Array.isArray(v)) return v.map((x) => typeof x === "object" ? (x.name ?? x.label ?? "") : String(x)).join(", "); return typeof v === "object" ? (v.name ?? v.label ?? "") : String(v); }
function percent(v: any): number | null { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? Math.round(n <= 1 ? n * 100 : n) : null; }
function days(v: any): number | null { if (!v) return null; const d = new Date(v); if (Number.isNaN(d.getTime())) return null; d.setHours(0, 0, 0, 0); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.ceil((d.getTime() - t.getTime()) / 86400000); }
function date(v: any): string { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB"); }

function Dot({ tone, text }: { tone: "red" | "amber" | "green" | "grey"; text: string }) {
  const bg = { red: "bg-red-600", amber: "bg-amber-500", green: "bg-emerald-600", grey: "bg-slate-400" }[tone];
  const fg = { red: "text-red-700", amber: "text-amber-800", green: "text-slate-800", grey: "text-slate-600" }[tone];
  return <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium"><span className={`h-2 w-2 rounded-full ${bg}`} /><span className={fg}>{text}</span></span>;
}
function Kpi({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-[#0B1F4B] sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs text-slate-600">{sub}</div>
    </div>
  );
}

export default function Block() {
  const { data, status, error, refetch, isFetching } = useRecords({ from: ds.stock, select, count: 100, orderBy: q.asc("id") });
  const rows = data?.pages.flatMap((p) => p.items) ?? [];
  const inactive = (r: any) => ["exhausted", "expired", "quarantined"].includes(val(r.fields.condition).toLowerCase()) || (days(r.fields.expiry) !== null && days(r.fields.expiry)! < 0) || Number(r.fields.quantity) <= 0 || percent(r.fields.percent) === 0;
  const active = rows.filter((r) => !inactive(r));
  const low = active.filter((r) => { const p = percent(r.fields.percent); return p !== null && p <= 40 && p > 20; });
  const critical = active.filter((r) => { const p = percent(r.fields.percent); return p !== null && p <= 20 && p > 0; });
  const expiring = active.filter((r) => { const d = days(r.fields.expiry); return d !== null && d >= 0 && d <= 30; });
  const exhausted = rows.filter((r) => val(r.fields.condition).toLowerCase() === "exhausted");
  const expired = rows.filter((r) => val(r.fields.condition).toLowerCase() === "expired" || (days(r.fields.expiry) !== null && days(r.fields.expiry)! < 0));
  const quarantined = rows.filter((r) => val(r.fields.condition).toLowerCase() === "quarantined");
  const alerts = rows.filter((r) => inactive(r) || low.includes(r) || critical.includes(r) || expiring.includes(r)).sort((a, b) => (percent(a.fields.percent) ?? 101) - (percent(b.fields.percent) ?? 101)).slice(0, 10);
  const snapshot = rows.slice(0, 25);

  return (
    <section className="container min-h-screen bg-slate-50 text-slate-900">
      <div className="content flex flex-col gap-6 bg-slate-50 py-6 text-slate-900 sm:gap-8 sm:py-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0B1F4B] sm:text-3xl">Live dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Reagent availability, low levels, expiry risk and stock needing attention.</p>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-[#0B1F4B] hover:bg-slate-50 disabled:opacity-60 sm:h-10">
            <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />{isFetching ? "Refreshing…" : "Refresh data"}
          </button>
        </header>

        {status === "pending" && <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-600">Loading current inventory…</div>}
        {status === "error" && <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Could not load inventory: {String((error as any)?.message ?? "Please check the connection.")}</div>}

        {status === "success" && <>
          <p className="-mb-2 text-xs text-slate-500">{rows.length} records loaded · use Refresh data to fetch the latest changes</p>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-4">
            <Kpi label="Active packs" value={active.length} sub="Usable stock" />
            <Kpi label="Getting low" value={low.length} sub="21–40% remaining" />
            <Kpi label="Critical" value={critical.length} sub="1–20% remaining" />
            <Kpi label="Expiring ≤ 30 days" value={expiring.length} sub="Active packs" />
            <Kpi label="Exhausted" value={exhausted.length} sub="Kept for audit" />
            <Kpi label="Expired" value={expired.length} sub="Past expiry" />
            <Kpi label="Quarantined" value={quarantined.length} sub="Not usable" />
            <Kpi label="All records" value={rows.length} sub="In inventory table" />
          </div>

          <div className="grid gap-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
            <div className="min-w-0">
              <div className="border-b border-slate-200 pb-3"><h2 className="text-base font-semibold text-[#0B1F4B]">Needs attention</h2></div>
              {alerts.length === 0 ? <p className="py-6 text-sm text-slate-600">No current alerts.</p> : alerts.map((r) => {
                const f = r.fields as any, p = percent(f.percent), d = days(f.expiry), term = inactive(r);
                const label = term ? val(f.condition) || "Inactive" : p !== null && p <= 20 ? "Critical" : p !== null && p <= 40 ? "Getting low" : d !== null && d <= 30 ? "Expiring soon" : "Review";
                const tone = term || (p !== null && p <= 20) ? "red" : "amber";
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3 border-b border-slate-100 py-3.5">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{val(f.reagent) || val(f.pack) || "Unnamed reagent"}</div>
                      <div className="text-xs text-slate-600">{val(f.analyzer)} · Lot {val(f.lot) || "—"}</div>
                      <div className="text-xs text-slate-500">Expiry {date(f.expiry)}{val(f.location) ? " · " + val(f.location) : ""}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Dot tone={tone as any} text={label} />
                      <span className="text-xs tabular-nums text-slate-700">{p === null ? "Not recorded" : p + "% remaining"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="min-w-0">
              <div className="border-b border-slate-200 pb-3"><h2 className="text-base font-semibold text-[#0B1F4B]">Threshold guide</h2></div>
              <div className="flex flex-col gap-4 pt-4">
                {[{ name: "Normal", desc: "Above 40%", c: "bg-emerald-600", w: "100%" }, { name: "Getting low", desc: "21–40%", c: "bg-amber-500", w: "40%" }, { name: "Critical", desc: "1–20%", c: "bg-red-600", w: "20%" }, { name: "Exhausted", desc: "0% or marked Exhausted", c: "bg-slate-400", w: "4%" }].map((x) => (
                  <div key={x.name}>
                    <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-800">{x.name}</span><span className="text-slate-600">{x.desc}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100"><div className={"h-1.5 rounded-full " + x.c} style={{ width: x.w }} /></div>
                  </div>
                ))}
                <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-600">Data loads when the page opens. Use Refresh data to see the latest changes.</p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-[#0B1F4B]">Inventory snapshot</h2>
              <span className="text-sm text-slate-600">First {snapshot.length} of {rows.length}</span>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {snapshot.map((r) => {
                const f = r.fields as any, p = percent(f.percent);
                return (
                  <li key={r.id} className="flex flex-col gap-1 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-slate-900">{val(f.reagent) || val(f.pack) || "—"}</span>
                      <span className="text-sm font-semibold tabular-nums">{p === null ? "—" : p + "%"}</span>
                    </div>
                    <div className="text-xs text-slate-600">{val(f.analyzer) || "—"} · Lot {val(f.lot) || "—"}</div>
                    <div className="flex items-center justify-between text-xs text-slate-600"><span>{val(f.condition) || "—"}</span><span>Exp {date(f.expiry)}</span></div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{["Reagent", "Analyzer", "Manufacturer", "Lot / batch", "Received", "Expiry", "Remaining", "Condition"].map((x) => <th key={x} className="px-3 py-2.5 font-medium">{x}</th>)}</tr></thead>
                <tbody>
                  {snapshot.map((r) => {
                    const f = r.fields as any, p = percent(f.percent);
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3 font-medium text-slate-900">{val(f.reagent) || val(f.pack) || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{val(f.analyzer) || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{val(f.manufacturer) || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{val(f.lot) || "—"}</td>
                        <td className="px-3 py-3 text-slate-600">{date(f.received)}</td>
                        <td className="px-3 py-3 text-slate-600">{date(f.expiry)}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{p === null ? "—" : p + "%"}</td>
                        <td className="px-3 py-3 text-slate-700">{val(f.condition) || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>}
      </div>
    </section>
  );
}
