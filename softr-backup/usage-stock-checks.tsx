import { useState } from "react";
import { datasource, q, useRecords, useRecordCreate, useRecordUpdate } from "@/lib/datasource";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

const ds = datasource.define({ usage: "usage", stock: "stock" });
const stockSelect = q.select({
  stockId: "Stock ID",
  reagent: "Reagent Name (from Reagent)",
  packName: "Pack Display Name",
  manufacturer: "Manufacturer (from Reagent)",
  analyzer: "Analyzer (from Reagent)",
  lot: "Lot/Batch Number",
  ref: "REF Number",
  received: "Date Received",
  location: "Location",
  expiry: "Expiry Date",
  percent: "Remaining Reagent %",
  condition: "Stock Condition",
  quantity: "Quantity",
});
const usageSelect = q.select({
  usageId: "Usage Log ID",
  date: "Usage Date",
  stock: "Stock Record",
  activity: "Activity Type",
  percent: "Remaining Reagent % After Check",
  quantityRemoved: "Quantity Removed (Packs)",
  recordedBy: "Recorded By",
  notes: "Notes",
});

const activities = ["Usage Check", "Pack Opened", "Pack Exhausted", "Wastage", "Expired", "Stock Adjustment"];
function display(value: any): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => typeof v === "object" ? (v.name ?? v.label ?? v.title ?? "") : String(v)).filter(Boolean).join(", ") || "—";
  if (typeof value === "object") return value.name ?? value.label ?? value.title ?? "—";
  return String(value);
}
function dateText(value: any): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function isPastExpiry(value: any): boolean {
  if (!value) return false;
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;
  expiry.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
}

const input = "h-12 w-full rounded-lg border border-slate-300 !bg-white px-3 text-base !text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:h-11 sm:text-sm";
const labelCls = "text-sm font-medium text-slate-800";

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-slate-500">{label}</div><div className="mt-0.5 text-sm font-medium text-slate-900">{value}</div></div>;
}

export default function Block() {
  const [stockId, setStockId] = useState("");
  const [activity, setActivity] = useState("Usage Check");
  const [remaining, setRemaining] = useState("");
  const [quantityRemoved, setQuantityRemoved] = useState("0");
  const [recordedBy, setRecordedBy] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [reagentSearch, setReagentSearch] = useState("");
  const { data: stockData, status: stockStatus, refetch: refreshStock } = useRecords({ from: ds.stock, select: stockSelect, count: 100, orderBy: q.desc("stockId") });
  const { data: usageData, status: usageStatus, refetch: refreshUsage, isFetching } = useRecords({ from: ds.usage, select: usageSelect, count: 50, orderBy: q.desc("date") });
  const createLog = useRecordCreate({
    from: ds.usage,
    fields: q.select({ stock: "Stock Record", activity: "Activity Type", date: "Usage Date", percent: "Remaining Reagent % After Check", quantityRemoved: "Quantity Removed (Packs)", recordedBy: "Recorded By", department: "Department / Analyzer", notes: "Notes" }),
    onSuccess: async () => { toast.success("Usage check recorded"); setActivity("Usage Check"); setRemaining(""); setQuantityRemoved("0"); setNotes(""); await refreshUsage(); await refreshStock(); },
    onError: (error) => toast.error(error.message),
  });
  const updateStock = useRecordUpdate({
    from: ds.stock,
    fields: q.select({ percent: "Remaining Reagent %", checked: "Last Checked", notes: "Scientist Notes", condition: "Stock Condition" }),
    onError: (error) => toast.error("Log saved, but current stock update needs review: " + error.message),
  });
  const stocks = stockData?.pages.flatMap(p => p.items) ?? [];
  const logs = usageData?.pages.flatMap(p => p.items) ?? [];
  // Only packs explicitly marked Unopened or In Use are selectable by scientists.
  // Exhausted, expired, quarantined, unknown-status, past-expiry and zero-stock records stay hidden.
  const activeStocks = stocks.filter(s => {
    const f = s.fields as any;
    const rawCondition = f.condition ?? f["Stock Condition"] ?? f["stock condition"];
    const condition = String(display(rawCondition)).trim().toLowerCase();
    const allowedConditions = ["unused", "unopened", "in use", "in-use"];
    const pct = f.percent == null ? null : Number(f.percent) * 100;
    const qty = f.quantity == null ? null : Number(f.quantity);
    if (!allowedConditions.includes(condition)) return false;
    if (["exhausted", "expired", "quarantined"].includes(condition)) return false;
    if (isPastExpiry(f.expiry)) return false;
    if (pct !== null && Number.isFinite(pct) && pct <= 0) return false;
    if (qty !== null && Number.isFinite(qty) && qty <= 0) return false;
    return true;
  });
  const filteredStocks = activeStocks.filter(s => {
    const f = s.fields as any;
    const searchText = [display(f.reagent), display(f.packName), display(f.stockId), display(f.lot), display(f.ref), display(f.analyzer), display(f.manufacturer), display(f.location)].join(" ").toLowerCase();
    return searchText.includes(reagentSearch.trim().toLowerCase());
  });
  const chosen = activeStocks.find(s => s.id === stockId);
  const filteredLogs = logs.filter(row => {
    const f = row.fields as any;
    const searchText = [display(f.stock), display(f.activity), display(f.recordedBy), display(f.notes)].join(" ").toLowerCase();
    return searchText.includes(search.toLowerCase());
  });
  async function submit(e: any) {
    e.preventDefault();
    if (!createLog.enabled || !updateStock.enabled) { toast.error("Your account does not have permission to submit this stock check."); return; }
    if (!stockId || !activity || !recordedBy.trim()) { toast.error("Select a reagent pack and enter the scientist's name."); return; }
    if (!activeStocks.some(s => s.id === stockId)) { toast.error("That reagent pack is no longer available for usage checks. Refresh the stock list and select an active pack."); setStockId(""); return; }
    const pct = remaining === "" ? undefined : Number(remaining);
    if (pct !== undefined && (!Number.isFinite(pct) || pct < 0 || pct > 100)) { toast.error("Remaining percentage must be between 0 and 100."); return; }
    const removed = Number(quantityRemoved || 0);
    if (!Number.isFinite(removed) || removed < 0) { toast.error("Quantity removed must be zero or greater."); return; }
    const today = new Date().toISOString().slice(0, 10);
    try {
      await createLog.mutateAsync({
        stock: [stockId],
        activity,
        date: today,
        ...(pct === undefined ? {} : { percent: pct / 100 }),
        quantityRemoved: removed,
        recordedBy: recordedBy.trim(),
        ...(department.trim() ? { department: department.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (pct !== undefined) {
        await updateStock.mutateAsync({
          recordId: stockId,
          fields: {
            percent: pct / 100,
            checked: today,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            ...(activity === "Pack Exhausted" || pct === 0 ? { condition: "Exhausted" } : activity === "Expired" ? { condition: "Expired" } : activity === "Pack Opened" ? { condition: "In Use" } : {}),
          },
        });
      } else if (activity === "Pack Exhausted" || activity === "Expired" || activity === "Pack Opened") {
        await updateStock.mutateAsync({
          recordId: stockId,
          fields: { checked: today, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(activity === "Pack Exhausted" ? { condition: "Exhausted" } : activity === "Expired" ? { condition: "Expired" } : { condition: "In Use" }) },
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the stock check.");
    }
  }

  const saving = createLog.status === "pending" || updateStock.status === "pending";
  const cf: any = chosen?.fields;

  return (
    <section style={{backgroundColor:"#f8fafc",color:"#0f172a"}} className="container min-h-screen !bg-slate-50 !text-slate-900">
      <div style={{backgroundColor:"#f8fafc",color:"#0f172a"}} className="content flex flex-col gap-6 !bg-slate-50 py-6 !text-slate-900 sm:gap-8 sm:py-8">
        <header className="border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0B1F4B] sm:text-3xl">Usage &amp; stock checks</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Record a reagent check after looking at the pack. Only usable packs are listed: unopened or in use.</p>
        </header>

        <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
          <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl bg-white">
            <h2 className="text-base font-semibold text-[#0B1F4B]">New check</h2>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Search reagent</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={reagentSearch} onChange={e => setReagentSearch(e.target.value)} placeholder="Search by reagent name, lot, REF, analyzer or Stock ID" className={`${input} pl-9`} />
              </div>
              <label className={labelCls}>Reagent pack <span className="text-red-600">*</span></label>
              <select value={stockId} onChange={e => setStockId(e.target.value)} required className={input}>
                <option value="">Choose reagent and lot</option>
                {filteredStocks.map(s => { const f = s.fields as any; const name = display(f.reagent) || display(f.packName); return <option key={s.id} value={s.id}>{name} · {display(f.analyzer)} · Lot {display(f.lot)} · {display(f.condition)}</option>; })}
              </select>
              {reagentSearch.trim() && filteredStocks.length === 0 && stockStatus === "success" && <p className="text-xs text-amber-800">No usable packs match that search. Expired, exhausted, quarantined, or zero-stock packs remain hidden.</p>}
              {stockStatus === "pending" && <p className="text-xs text-slate-500">Loading current stock…</p>}
              {stockStatus === "error" && <p className="text-xs text-red-700">Unable to load current stock. Refresh or contact the administrator.</p>}
              {stockStatus === "success" && activeStocks.length === 0 && <p className="text-xs text-amber-800">No usable reagent packs found. Check stock conditions, quantities and expiry dates.</p>}
            </div>

            {cf && (
              <div style={{backgroundColor:"#ffffff",color:"#0f172a"}} className="rounded-xl border border-slate-200 !bg-white p-4 text-slate-900 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="font-semibold text-slate-900">{display(cf.reagent) || display(cf.packName)}</div>
                  <div className="text-right"><div className="text-xs text-slate-500">Now</div><div className="text-lg font-semibold tabular-nums text-[#0B1F4B]">{cf.percent == null ? "Not recorded" : Math.round(Number(cf.percent) * 100) + "%"}</div></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail label="Analyzer" value={display(cf.analyzer)} />
                  <Detail label="Manufacturer" value={display(cf.manufacturer)} />
                  <Detail label="Lot / batch" value={display(cf.lot)} />
                  <Detail label="REF number" value={display(cf.ref)} />
                  <Detail label="Received" value={dateText(cf.received)} />
                  <Detail label="Expiry" value={dateText(cf.expiry)} />
                  <Detail label="Location" value={display(cf.location)} />
                  <Detail label="Condition" value={display(cf.condition)} />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Activity <span className="text-red-600">*</span></label>
              <select value={activity} onChange={e => setActivity(e.target.value)} className={input}>{activities.map(a => <option key={a}>{a}</option>)}</select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Remaining (%)</label>
                <input type="number" inputMode="numeric" min="0" max="100" step="1" value={remaining} onChange={e => setRemaining(e.target.value)} placeholder="e.g. 35" className={input} />
                <p className="text-xs text-slate-500">Enter 35 for 35%. Leave blank if not checked.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Packs removed</label>
                <input type="number" inputMode="numeric" min="0" step="1" value={quantityRemoved} onChange={e => setQuantityRemoved(e.target.value)} className={input} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Your name <span className="text-red-600">*</span></label>
                <input value={recordedBy} onChange={e => setRecordedBy(e.target.value)} required placeholder="Scientist name" className={input} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Department / analyzer</label>
                <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Chemistry / BS-240" className={input} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional observations or reason for adjustment" className={`${input} h-auto py-3`} />
            </div>

            {!createLog.enabled && <p className="text-xs text-amber-800">Your account may not have permission to submit usage logs.</p>}
            {createLog.status === "error" && <p className="text-sm text-red-700">{createLog.error?.message}</p>}
            <button type="submit" disabled={saving || stockStatus !== "success" || !createLog.enabled || !updateStock.enabled}
              className="h-12 w-full rounded-md bg-[#0B1F4B] px-4 text-base font-medium text-white hover:bg-[#13306E] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-auto sm:self-start sm:px-8 sm:text-sm">
              {saving ? "Saving…" : "Submit stock check"}
            </button>
          </form>

          <div className="min-w-0">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-[#0B1F4B]">Recent activity</h2>
              <button type="button" onClick={() => refreshUsage()} disabled={isFetching} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-[#0B1F4B] hover:bg-slate-50">
                <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />Refresh
              </button>
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activity, reagent, scientist" className={`${input} pl-9`} />
            </div>
            <div className="mt-2">
              {usageStatus === "pending" && <p className="py-6 text-sm text-slate-600">Loading recent activity…</p>}
              {usageStatus === "error" && <p className="py-6 text-sm text-red-700">Could not load the usage log.</p>}
              {usageStatus === "success" && filteredLogs.length === 0 && <p className="py-10 text-center text-sm text-slate-600">No matching records. Submitted checks appear here.</p>}
              {filteredLogs.map(row => {
                const f = row.fields as any;
                return (
                  <div key={row.id} className="border-b border-slate-100 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{display(f.stock) !== "—" ? display(f.stock) : "Reagent stock check"}</div>
                        <div className="text-xs text-slate-600">{dateText(f.date)} · {display(f.recordedBy) !== "—" ? display(f.recordedBy) : "Scientist not recorded"}</div>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-[#0B1F4B]">{display(f.activity)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-slate-700">
                      {f.percent != null && <span>Remaining <strong className="tabular-nums">{Math.round(Number(f.percent) * 100)}%</strong></span>}
                      {f.quantityRemoved != null && Number(f.quantityRemoved) > 0 && <span>Packs removed <strong>{display(f.quantityRemoved)}</strong></span>}
                    </div>
                    {f.notes && <p className="mt-1.5 text-sm text-slate-600">{display(f.notes)}</p>}
                  </div>
                );
              })}
            </div>
            <p className="pt-3 text-xs text-slate-500">Showing up to the latest 50 entries.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
