import { useMemo, useState } from "react";
import { datasource, useRecords, q } from "@/lib/datasource";
import { Download, Printer } from "lucide-react";

const ds = datasource.define({ received: "received", suppliers: "suppliers", inventory: "inventory", master: "master" });

const receivedSelect = q.select({
  reagent: "Reagent Name (from Reagent)",
  reagentId: "Reagent",
  supplier: "Supplier Table",
  qty: "Quantity Received",
  date: "Date Received",
  unitPrice: "Unit Price (₦)",
  stdPrice: "Standard Price (from Reagent)",
  total: "Total Cost (₦)",
  invoice: "Invoice Number",
});
const supplierSelect = q.select({
  id: "Supplier ID",
  name: "Supplier Name",
  lead: "Lead Time Days",
});
const masterSelect = q.select({
  id: "Reagent ID",
  name: "Reagent Name",
  analyzer: "Analyzer",
});
const inventorySelect = q.select({
  reagentId: "Reagent",
  analyzer: "Analyzer (from Reagent)",
  reagent: "Reagent Name (from Reagent)",
  pack: "Pack Display Name",
  lot: "Lot/Batch Number",
  condition: "Stock Condition",
  remaining: "Remaining Reagent %",
  level: "Calculated Reagent Level",
  expiryDate: "Expiry Date",
  expiryStatus: "Automatic Expiry Status",
  location: "Location",
  replacement: "Replacement Available",
});

function plain(v: any): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(plain).filter(Boolean).join(", ");
  if (typeof v === "object") return String(v.label ?? v.name ?? v.value ?? "");
  return String(v);
}
function num(v: any): number | null {
  if (v == null || v === "") return null;
  if (Array.isArray(v)) return num(v[0]);
  if (typeof v === "object") return num(v.value ?? v.label ?? v.name);
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function dateOf(v: any): Date | null {
  const raw = plain(v);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
function pct(v: any): number | null {
  const n = num(v);
  if (n == null) return null;
  return n <= 1 ? n * 100 : n;
}
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, sub }: any) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums text-[#0B1F4B] sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-xs text-slate-600">{sub}</div>
    </div>
  );
}
function Bar({ label, value, max, text, color }: any) {
  const fill = color === "bg-red-500" ? "bg-red-600" : "bg-[#0B1F4B]";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-sm"><span className="text-slate-800">{label}</span><span className="whitespace-nowrap font-medium tabular-nums text-slate-900">{text}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${fill}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
    </div>
  );
}
function Table({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <div className="py-8 text-center text-sm text-slate-600">{empty}</div>;
  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-col gap-1 py-3.5">
            <div className="font-medium text-slate-900">{r[0]}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {r.slice(1).map((c, j) => <div key={j} className="text-xs"><span className="text-slate-500">{head[j + 1]}</span><div className="text-sm text-slate-800">{c}</div></div>)}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">{r.map((c, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? "font-medium text-slate-900" : "text-slate-700"}`}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
function Panel({ title, sub, action, children }: any) {
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div><h3 className="text-base font-semibold text-[#0B1F4B]">{title}</h3>{sub && <p className="mt-0.5 text-sm text-slate-600">{sub}</p>}</div>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}

const TABS = ["Spend", "Suppliers", "Losses", "Expiry", "Reorder", "Stock"] as const;

export default function Block() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Spend");
  const [year, setYear] = useState<string>("All");

  const rec = useRecords({ from: ds.received, select: receivedSelect, count: 100 });
  const sup = useRecords({ from: ds.suppliers, select: supplierSelect, count: 100 });
  const inv = useRecords({ from: ds.inventory, select: inventorySelect, count: 100 });
  const mas = useRecords({ from: ds.master, select: masterSelect, count: 100 });
  const received = useMemo(() => rec.data?.pages.flatMap((p: any) => p.items) ?? [], [rec.data]);
  const suppliers = useMemo(() => sup.data?.pages.flatMap((p: any) => p.items) ?? [], [sup.data]);
  const packsRaw = useMemo(() => inv.data?.pages.flatMap((p: any) => p.items) ?? [], [inv.data]);
  const masters = useMemo(() => mas.data?.pages.flatMap((p: any) => p.items) ?? [], [mas.data]);
  // Same reagent on different analyzers/manufacturers is a different product: label and group by the reagent record, not the name.
  const labels: Record<string, string> = {};
  masters.forEach((m: any) => {
    const nm = plain(m.fields?.name);
    if (!nm) return;
    const an = plain(m.fields?.analyzer);
    const label = an ? `${nm} · ${an}` : nm;
    labels[m.id] = label;
    const rid = plain(m.fields?.id);
    if (rid) labels[rid] = label;
  });
  const labelOf = (key: string) => labels[key] || "";
  const packs = packsRaw.map((p: any) => ({ ...p, fields: { ...p.fields, reagent: labelOf(plain(p.fields?.reagentId)) || plain(p.fields?.reagent) } }));
  const loading = rec.status === "pending" || sup.status === "pending" || inv.status === "pending" || mas.status === "pending";
  const failed = rec.status === "error" || sup.status === "error" || inv.status === "error" || mas.status === "error";

  const supplierName: Record<string, string> = {};
  suppliers.forEach((s: any) => { supplierName[plain(s.fields?.id)] = plain(s.fields?.name) || plain(s.fields?.id); });
  const leadTime: Record<string, number | null> = {};
  suppliers.forEach((s: any) => { leadTime[plain(s.fields?.id)] = num(s.fields?.lead); });

  const lines = received.map((r: any) => {
    const qty = num(r.fields?.qty) ?? 0;
    const total = num(r.fields?.total);
    const d = dateOf(r.fields?.date);
    const supId = plain(r.fields?.supplier);
    return {
      reagent: labelOf(plain(r.fields?.reagentId)) || plain(r.fields?.reagent) || "Unknown reagent",
      supId,
      supplier: supId ? (supplierName[supId] || supId) : "No supplier recorded",
      qty, total, date: d,
      unit: total != null && qty ? total / qty : null,
      invoice: plain(r.fields?.invoice),
    };
  });
  const years = Array.from(new Set(lines.map((l) => l.date?.getFullYear()).filter(Boolean) as number[])).sort((a, b) => b - a);
  const inYear = lines.filter((l) => year === "All" || (l.date && String(l.date.getFullYear()) === year));
  const priced = inYear.filter((l) => l.total != null);
  const totalSpend = priced.reduce((s, l) => s + (l.total as number), 0);

  const byReagent: Record<string, { spend: number; qty: number }> = {};
  priced.forEach((l) => { const o = (byReagent[l.reagent] ||= { spend: 0, qty: 0 }); o.spend += l.total as number; o.qty += l.qty; });
  const reagentRows = Object.entries(byReagent).sort((a, b) => b[1].spend - a[1].spend);
  const maxReagent = reagentRows[0]?.[1].spend ?? 0;

  const bySupplier: Record<string, { id: string; spend: number; orders: number; indexSum: number; indexN: number }> = {};
  const reagentAvg: Record<string, number> = {};
  Object.entries(byReagent).forEach(([k, v]) => { if (v.qty) reagentAvg[k] = v.spend / v.qty; });
  priced.forEach((l) => {
    const o = (bySupplier[l.supplier] ||= { id: l.supId, spend: 0, orders: 0, indexSum: 0, indexN: 0 });
    o.spend += l.total as number; o.orders += 1;
    if (l.unit != null && reagentAvg[l.reagent]) { o.indexSum += l.unit / reagentAvg[l.reagent]; o.indexN += 1; }
  });
  const supplierRows = Object.entries(bySupplier).map(([name, v]) => ({
    name, ...v, index: v.indexN ? v.indexSum / v.indexN : null, lead: v.id ? leadTime[v.id] ?? null : null,
  })).sort((a, b) => b.spend - a.spend);
  const ranked = supplierRows.filter((s) => s.id && s.index != null).sort((a, b) => (a.index as number) - (b.index as number) || (a.lead ?? 99) - (b.lead ?? 99));
  const maxSupplier = supplierRows[0]?.spend ?? 0;

  const byMonth: Record<string, number> = {};
  priced.forEach((l) => { if (l.date) { const k = `${l.date.getFullYear()}-${String(l.date.getMonth() + 1).padStart(2, "0")}`; byMonth[k] = (byMonth[k] || 0) + (l.total as number); } });
  const monthRows = Object.entries(byMonth).sort();
  const maxMonth = Math.max(0, ...monthRows.map((m) => m[1]));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cond = (p: any) => plain(p.fields?.condition).toLowerCase();
  const expOf = (p: any) => dateOf(p.fields?.expiryDate);
  const isGone = (p: any) => ["exhausted", "expired"].includes(cond(p));
  const costOf = (p: any) => reagentAvg[plain(p.fields?.reagent)] ?? null;

  const lossPacks = packs.filter((p: any) => {
    const e = expOf(p); const r = pct(p.fields?.remaining);
    const unusedExpired = (cond(p) === "expired" || (e && e < today && cond(p) !== "exhausted")) && (r == null || r > 0);
    return unusedExpired || (cond(p) === "quarantined" && (r == null || r > 0));
  }).map((p: any) => {
    const r = pct(p.fields?.remaining); const c = costOf(p);
    const e = expOf(p);
    const reason = cond(p) === "quarantined" ? "Quarantined" : "Expired unused";
    return { p, reason, value: c != null ? c * ((r ?? 100) / 100) : null, e };
  });
  const lossTotal = lossPacks.reduce((s, x) => s + (x.value ?? 0), 0);
  const lossByReagent: Record<string, number> = {};
  lossPacks.forEach((x) => { const k = plain(x.p.fields?.reagent) || "Unknown"; lossByReagent[k] = (lossByReagent[k] || 0) + (x.value ?? 0); });
  const lossRows = Object.entries(lossByReagent).sort((a, b) => b[1] - a[1]);

  const expiryPacks = packs.filter((p: any) => !isGone(p) && expOf(p) && (expOf(p) as Date).getTime() - today.getTime() <= 90 * 86400000)
    .sort((a: any, b: any) => (expOf(a) as Date).getTime() - (expOf(b) as Date).getTime());
  const daysLeft = (p: any) => Math.round(((expOf(p) as Date).getTime() - today.getTime()) / 86400000);

  const reorderPacks = packs.filter((p: any) => ["Exhausted", "Nearly Exhausted"].includes(plain(p.fields?.level)) && plain(p.fields?.replacement) === "No" && cond(p) !== "expired");

  const byCondition: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  packs.forEach((p: any) => { const c = plain(p.fields?.condition) || "Not set"; byCondition[c] = (byCondition[c] || 0) + 1; const l = plain(p.fields?.location) || "No location"; byLocation[l] = (byLocation[l] || 0) + 1; });

  const spendCsv = () => downloadCsv(`spend-by-reagent-${year}.csv`, [["Reagent", "Quantity", "Total spend (NGN)"], ...reagentRows.map(([k, v]) => [k, v.qty, Math.round(v.spend)])]);
  const supplierCsv = () => downloadCsv(`spend-by-supplier-${year}.csv`, [["Supplier", "Orders", "Total spend (NGN)", "Price index", "Lead time (days)"], ...supplierRows.map((s) => [s.name, s.orders, Math.round(s.spend), s.index != null ? s.index.toFixed(2) : "", s.lead ?? ""])]);
  const lossCsv = () => downloadCsv("losses.csv", [["Reagent", "Lot", "Reason", "Value (NGN)"], ...lossPacks.map((x) => [plain(x.p.fields?.reagent), plain(x.p.fields?.lot), x.reason, Math.round(x.value ?? 0)])]);
  const expiryCsv = () => downloadCsv("expiry-report.csv", [["Reagent", "Lot", "Expiry", "Days left", "Condition"], ...expiryPacks.map((p: any) => [plain(p.fields?.reagent), plain(p.fields?.lot), (expOf(p) as Date).toLocaleDateString("en-GB"), daysLeft(p), plain(p.fields?.condition)])]);
  const reorderCsv = () => downloadCsv("reorder-list.csv", [["Reagent", "Lot", "Level", "Remaining %"], ...reorderPacks.map((p: any) => [plain(p.fields?.reagent), plain(p.fields?.lot), plain(p.fields?.level), Math.round(pct(p.fields?.remaining) ?? 0)])]);
  const dl = (fn: () => void) => <button onClick={fn} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-[#0B1F4B] hover:bg-slate-50 print:hidden"><Download className="h-3.5 w-3.5" /> CSV</button>;

  const missingPrice = inYear.length - priced.length;

  return (
    <section style={{backgroundColor:"#f5f8fc",color:"#172b4d",minHeight:"100vh"}} className="container reports-page !bg-slate-50 !text-slate-900"><style>{`.reports-page .content{max-width:1440px;width:100%;padding-left:24px;padding-right:24px}.reports-page h1,.reports-page h2,.reports-page h3{color:#172b4d!important;letter-spacing:-.025em}.reports-page p{line-height:1.55}.reports-page select,.reports-page input{background:#fff!important;color:#172b4d!important;border-color:#cbd5e1!important;border-radius:9px!important;box-shadow:0 1px 2px rgba(15,23,42,.04)}.reports-page select:focus,.reports-page input:focus{outline:none!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.12)!important}.reports-page button{transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease}.reports-page [role=tablist]{gap:24px;border-color:#dbe4ef!important}.reports-page [role=tab]{padding-top:10px;font-weight:600}.reports-page .rounded-lg,.reports-page .rounded-xl{border-radius:14px}.reports-page .shadow-sm{box-shadow:0 4px 14px rgba(15,23,42,.04)}.reports-page table{width:100%;border-collapse:separate;border-spacing:0}.reports-page th{background:#f8fafc;color:#526581;font-size:11px;letter-spacing:.06em;text-transform:uppercase}.reports-page th,.reports-page td{padding:12px 14px;border-bottom:1px solid #e8eef5;text-align:left}.reports-page tr:hover td{background:#f8fbff}.reports-page header{border-color:#dbe4ef!important;padding-bottom:22px}`}</style>
      <div className="content mx-auto flex w-full flex-col gap-6 py-6 sm:gap-8 sm:py-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0B1F4B] sm:text-3xl">Reports</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Reagent spend, suppliers, losses from expiry and what needs reordering.</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="h-11 flex-1 rounded-lg border border-slate-300 !bg-white px-3 text-sm !text-slate-900 shadow-sm sm:h-10 sm:flex-none">
              <option value="All">All years</option>
              {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <button onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0B1F4B] shadow-sm hover:bg-slate-50 sm:h-10"><Printer className="h-4 w-4" /> Print</button>
          </div>
        </header>

        {loading && <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-600">Loading reports…</div>}
        {failed && <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Could not load the report data. Check the Airtable connection.</div>}

        {!loading && !failed && <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm lg:grid-cols-4">
            <Stat label="Total spend" value={naira(totalSpend)} sub={`${priced.length} priced receipts${year === "All" ? "" : " in " + year}`} />
            <Stat label="Average per receipt" value={priced.length ? naira(totalSpend / priced.length) : "—"} sub="Across priced receipts" />
            <Stat label="Suppliers used" value={supplierRows.filter((s) => s.id).length} sub={missingPrice > 0 ? `${missingPrice} receipts have no price yet` : "All receipts priced"} />
            <Stat label="Estimated losses" value={naira(lossTotal)} sub={`${lossPacks.length} expired or quarantined packs`} />
          </div>

          <div role="tablist" className="-mb-2 flex gap-6 overflow-x-auto whitespace-nowrap border-b border-slate-200 print:hidden">
            {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-3 text-sm font-medium ${tab === t ? "border-[#0B1F4B] text-[#0B1F4B]" : "border-transparent text-slate-600 hover:text-[#0B1F4B]"}`}>{t}</button>)}
          </div>

          {tab === "Spend" && <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Spend by reagent" sub="Highest spend first" action={dl(spendCsv)}>
              <div className="space-y-4">{reagentRows.slice(0, 12).map(([k, v]) => <Bar key={k} label={k} value={v.spend} max={maxReagent} text={naira(v.spend)} />)}</div>
              {reagentRows.length === 0 && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No priced receipts yet.</div>}
            </Panel>
            <Panel title="Spend by month" sub="Based on the date received">
              <div className="space-y-4">{monthRows.map(([k, v]) => <Bar key={k} label={`${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`} value={v} max={maxMonth} text={naira(v)} color="bg-sky-500" />)}</div>
              {monthRows.length === 0 && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No dated, priced receipts yet.</div>}
            </Panel>
          </div>}

          {tab === "Suppliers" && <div className="grid gap-6">
            <Panel title="Spend by supplier" sub="Total spent, orders and average price against other suppliers" action={dl(supplierCsv)}>
              <Table head={["Supplier", "Orders", "Total spend", "Price index", "Lead time"]}
                rows={supplierRows.map((s) => [s.name, s.orders, naira(s.spend), s.index != null ? s.index.toFixed(2) : "—", s.lead != null ? `${s.lead} days` : "—"])}
                empty="No supplier spend yet." />
              <p className="mt-3 text-xs text-slate-500">Price index compares what a supplier charged with the average price of the same reagents across all receipts. Below 1.00 is cheaper than average.</p>
            </Panel>
            <Panel title="Best suppliers" sub="Ranked by price index, then lead time">
              <div>{ranked.map((s, i) => <div key={s.name} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3.5">
                <div className="flex items-center gap-3"><span className="w-5 text-sm font-semibold tabular-nums text-slate-500">{i + 1}</span><div><div className="font-medium text-slate-900">{s.name}</div><div className="text-xs text-slate-600">{naira(s.spend)} across {s.orders} orders</div></div></div>
                <div className="flex flex-col items-end gap-0.5 text-right">{i === 0 && <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800"><span className="h-2 w-2 rounded-full bg-emerald-600" />Best value</span>}<span className="text-sm tabular-nums text-slate-700">Index {(s.index as number).toFixed(2)}</span></div>
              </div>)}</div>
              {ranked.length === 0 && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Rankings appear once receipts with a supplier and a price exist.</div>}
              <div className="mt-4"><Bar label="Largest supplier by spend" value={maxSupplier} max={maxSupplier} text={naira(maxSupplier)} color="bg-violet-500" /></div>
            </Panel>
          </div>}

          {tab === "Losses" && <Panel title="Losses from expiry and quarantine" sub="Value of the reagent left unused, using the average price paid" action={dl(lossCsv)}>
            <div className="mb-5 space-y-4">{lossRows.slice(0, 8).map(([k, v]) => <Bar key={k} label={k} value={v} max={lossRows[0][1]} text={naira(v)} color="bg-red-500" />)}</div>
            <Table head={["Reagent", "Lot", "Reason", "Estimated value"]}
              rows={lossPacks.map((x) => [plain(x.p.fields?.reagent), plain(x.p.fields?.lot) || "—", x.reason, x.value != null ? naira(x.value) : "No price"])}
              empty="No expired or quarantined packs with reagent left." />
          </Panel>}

          {tab === "Expiry" && <Panel title="Expiry report" sub="Packs expired or expiring within 90 days" action={dl(expiryCsv)}>
            <Table head={["Reagent", "Lot", "Expiry", "Days left", "Condition"]}
              rows={expiryPacks.map((p: any) => [plain(p.fields?.reagent), plain(p.fields?.lot) || "—", (expOf(p) as Date).toLocaleDateString("en-GB"), daysLeft(p) < 0 ? `Expired ${-daysLeft(p)}d ago` : `${daysLeft(p)} days`, plain(p.fields?.condition) || "—"])}
              empty="Nothing is expiring in the next 90 days." />
          </Panel>}

          {tab === "Reorder" && <Panel title="Reorder list" sub="Exhausted or nearly exhausted with no usable replacement in stock" action={dl(reorderCsv)}>
            <Table head={["Reagent", "Lot", "Level", "Remaining"]}
              rows={reorderPacks.map((p: any) => [plain(p.fields?.reagent), plain(p.fields?.lot) || "—", plain(p.fields?.level), `${Math.round(pct(p.fields?.remaining) ?? 0)}%`])}
              empty="Nothing needs reordering right now." />
          </Panel>}

          {tab === "Stock" && <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Packs by condition" sub={`${packs.length} packs in total`}>
              <div className="space-y-4">{Object.entries(byCondition).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Bar key={k} label={k} value={v} max={packs.length} text={String(v)} color="bg-teal-500" />)}</div>
            </Panel>
            <Panel title="Packs by location">
              <div className="space-y-4">{Object.entries(byLocation).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Bar key={k} label={k} value={v} max={packs.length} text={String(v)} color="bg-sky-500" />)}</div>
            </Panel>
          </div>}
        </>}
        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">Prices shown in Naira (₦)</div>
      </div>
    </section>
  );
}
