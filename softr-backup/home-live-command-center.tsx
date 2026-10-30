import { useEffect, useMemo } from "react";
import { datasource, useRecords, q } from "@/lib/datasource";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FlaskConical, RefreshCw, ShieldAlert, PackageCheck } from "lucide-react";

const ds = datasource.define({ inventory: "liveInventory" });
const inventorySelect = q.select({
  stockId: "Stock ID", reagentName: "Reagent Name (from Reagent)", packName: "Pack Display Name",
  lot: "Lot/Batch Number", analyzer: "Analyzer (from Reagent)", manufacturer: "Manufacturer (from Reagent)",
  condition: "Stock Condition", remaining: "Remaining Reagent %", remainingDisplay: "Remaining Reagent Display",
  level: "Calculated Reagent Level", reorderAlert: "Reorder Alert", expiryStatus: "Automatic Expiry Status",
  expiryDate: "Expiry Date", location: "Location", quantity: "Quantity", lastChecked: "Last Checked",
});
function plain(v: any): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(plain).filter(Boolean).join(", ");
  if (typeof v === "object") return String(v.label ?? v.name ?? v.value ?? "");
  return String(v);
}
function pct(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? n * 100 : n;
}
function asDate(v: any): Date | null {
  const raw = plain(v); if (!raw) return null;
  const d = new Date(raw); return Number.isNaN(d.getTime()) ? null : d;
}
function condition(r: any) { return plain(r.fields?.condition).trim().toLowerCase(); }
function reagent(r: any) { return plain(r.fields?.reagentName) || plain(r.fields?.packName) || "Unnamed reagent"; }
function percentOf(r: any) { return pct(r.fields?.remaining); }
function pastExpiry(r: any) {
  const d = asDate(r.fields?.expiryDate); if (!d) return false;
  d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t;
}
function inactive(r: any) {
  return ["exhausted","expired","quarantined"].includes(condition(r)) || pastExpiry(r) ||
    percentOf(r) === 0 || Number(r.fields?.quantity) === 0;
}
function remainingText(r: any) {
  const p = percentOf(r); return p == null ? (plain(r.fields?.remainingDisplay) || "Not checked") : Math.round(p) + "%";
}
function level(r: any): string {
  const p = percentOf(r); if (p == null) return "Unrecorded";
  if (p <= 20) return "Critical"; if (p <= 40) return "Getting low"; return "Normal";
}
function Badge({ label }: {label:string}) {
  const l = label.toLowerCase();
  const cls = l.includes("critical") || l.includes("expired") || l.includes("exhausted")
    ? "bg-red-50 text-red-700 ring-red-200"
    : l.includes("low") || l.includes("expiring") || l.includes("quarantined")
    ? "bg-amber-50 text-amber-800 ring-amber-200"
    : l.includes("normal") || l.includes("unopened") || l.includes("in use") || l.includes("available")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-slate-100 text-slate-600 ring-slate-200";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{label}</span>;
}
function Metric({label,value,caption,icon:Icon,tone}:{label:string;value:number|string;caption:string;icon:any;tone:string}) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="text-sm font-medium text-slate-500">{label}</div><div className={`rounded-xl p-2 ${tone}`}><Icon className="h-4 w-4"/></div></div>
    <div className="mt-3 text-3xl font-semibold tracking-tight text-[#10284F] tabular-nums">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{caption}</div>
  </div>;
}
export default function Block() {
  const {data,status,error,refetch,isFetching} = useRecords({from:ds.inventory,select:inventorySelect,count:100,orderBy:q.asc("reagentName")});
  useEffect(()=>{const timer=setInterval(()=>{refetch();},60000);return()=>clearInterval(timer);},[refetch]);
  const records = useMemo(()=>data?.pages.flatMap((p:any)=>p.items) ?? [],[data]);
  const active = records.filter((r:any)=>!inactive(r));
  const key = (r:any)=>(plain(r.fields?.reagentName)||plain(r.fields?.packName))+"|"+plain(r.fields?.analyzer);
  const usable = (r:any)=>["unopened","in use"].includes(condition(r))&&!pastExpiry(r)&&!(percentOf(r)!=null&&(percentOf(r) as number)<=20);
  const replacements:Record<string,number>={};
  records.forEach((r:any)=>{if(usable(r))replacements[key(r)]=(replacements[key(r)]||0)+1;});
  const hasReplacement=(r:any)=>(replacements[key(r)]||0)-(usable(r)?1:0)>0;
  const criticalAll=active.filter((r:any)=>level(r)==="Critical");
  const critical=criticalAll.filter((r:any)=>!hasReplacement(r));
  const covered=criticalAll.filter((r:any)=>hasReplacement(r));
  const low=active.filter((r:any)=>level(r)==="Getting low");
  const expiring=active.filter((r:any)=>{const d=asDate(r.fields?.expiryDate);if(!d)return false;const days=(d.getTime()-new Date().setHours(0,0,0,0))/86400000;return days>=0&&days<=30;});
  const excluded=records.filter((r:any)=>inactive(r));
  const checked=active.filter((r:any)=>percentOf(r)!=null).length;
  const stamp=new Date().toLocaleString("en-NG",{timeZone:"Africa/Lagos",dateStyle:"medium",timeStyle:"short"});
  const attention=[...critical,...low].slice(0,8);
  const shown=active.slice(0,20);
  return <section className="container !bg-slate-50 !text-slate-900">
    <div className="content space-y-6 !bg-slate-50 pb-10 pt-3 !text-slate-900 sm:space-y-8">
      <header className="overflow-hidden rounded-2xl bg-[#10284F] text-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-white/10 p-3"><FlaskConical className="h-6 w-6"/></div><div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">EDLS · Laboratory operations</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Reagent command centre</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">A live overview of analyser reagent levels, critical stock and upcoming expiry dates.</p>
          </div></div>
          <button onClick={()=>refetch()} disabled={isFetching} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${isFetching?"animate-spin":""}`}/>{isFetching?"Refreshing…":"Refresh data"}
          </button>
        </div>
        <div className="flex flex-col gap-1 border-t border-white/10 bg-white/5 px-5 py-3 text-xs text-blue-100 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Connected inventory view · automatic refresh every 60 seconds</span>
          <span>Last refreshed view: {stamp} (Lagos time)</span>
        </div>
      </header>
      {status==="pending"&&<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading live reagent records…</div>}
      {status==="error"&&<div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Could not load inventory records. {String((error as any)?.message??"Check the Airtable connection and permissions.")}</div>}
      {status!=="pending"&&status!=="error"&&<>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active packs" value={active.length} caption="Usable stock records" icon={PackageCheck} tone="bg-blue-50 text-blue-700"/>
          <Metric label="Critical · ≤20%" value={critical.length} caption={covered.length?covered.length+" additional packs have a replacement":"Requires urgent review"} icon={ShieldAlert} tone="bg-red-50 text-red-700"/>
          <Metric label="Getting low" value={low.length} caption="21–40% remaining" icon={AlertTriangle} tone="bg-amber-50 text-amber-700"/>
          <Metric label="Expiring soon" value={expiring.length} caption="Expiry within the next 30 days" icon={Clock3} tone="bg-violet-50 text-violet-700"/>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <section style={{backgroundColor:"#ffffff",color:"#0f172a"}} className="min-w-0 rounded-2xl border border-slate-200 !bg-white p-4 text-slate-900 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><h3 className="font-semibold text-[#10284F]">Needs attention</h3><p className="mt-1 text-xs text-slate-500">Prioritised by remaining reagent level</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{critical.length+low.length} packs</span></div>
            {attention.length===0?<div className="flex items-center gap-3 py-8 text-sm text-slate-600"><CheckCircle2 className="h-5 w-5 text-emerald-600"/>No active packs are below the 40% threshold.</div>:
              <div className="divide-y divide-slate-100">{attention.map((r:any)=><div key={r.id} className="flex items-center gap-3 py-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${level(r)==="Critical"?"bg-red-50 text-red-700":"bg-amber-50 text-amber-700"}`}><AlertTriangle className="h-4 w-4"/></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{reagent(r)}</div><div className="mt-1 truncate text-xs text-slate-500">{plain(r.fields?.analyzer)||"Analyzer not set"} · Lot {plain(r.fields?.lot)||"—"}</div></div>
                <div className="flex shrink-0 flex-col items-end gap-1.5"><span className="text-sm font-bold tabular-nums text-slate-900">{remainingText(r)}</span><Badge label={level(r)}/></div>
              </div>)}</div>}
          </section>
          <section style={{backgroundColor:"#ffffff",color:"#0f172a"}} className="rounded-2xl border border-slate-200 !bg-white p-4 text-slate-900 shadow-sm sm:p-6">
            <div className="border-b border-slate-100 pb-4"><h3 className="font-semibold text-[#10284F]">Inventory health</h3><p className="mt-1 text-xs text-slate-500">Coverage and excluded records</p></div>
            <div className="mt-5"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Packs with a recorded level</span><span className="font-semibold tabular-nums text-slate-900">{checked} / {active.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#10284F] transition-all" style={{width:`${active.length?(checked/active.length)*100:0}%`}}/></div><div className="mt-2 text-xs text-slate-500">{active.length?Math.round(checked/active.length*100):0}% of active packs have a percentage recorded</div></div>
            <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Inactive / excluded</div><div className="mt-2 text-2xl font-semibold text-slate-800">{excluded.length}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Expiring soon</div><div className="mt-2 text-2xl font-semibold text-slate-800">{expiring.length}</div></div></div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#10284F]"><Activity className="h-4 w-4"/> Threshold guide</div><div className="mt-3 flex flex-wrap gap-2"><Badge label="Normal · >40%"/><Badge label="Getting low · 21–40%"/><Badge label="Critical · ≤20%"/></div></div>
          </section>
        </div>
        <section style={{backgroundColor:"#ffffff",color:"#0f172a"}} className="min-w-0 rounded-2xl border border-slate-200 !bg-white text-slate-900 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h3 className="font-semibold text-[#10284F]">Active reagent stock</h3><p className="mt-1 text-xs text-slate-500">Showing up to 20 active packs from the connected Airtable table</p></div><span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{active.length} active packs</span></div>
          <div className="divide-y divide-slate-100 px-4 md:hidden">{shown.map((r:any)=><article key={r.id} className="py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-semibold text-slate-800">{reagent(r)}</div><div className="mt-1 text-xs text-slate-500">{plain(r.fields?.analyzer)||"Analyzer not set"} · Lot {plain(r.fields?.lot)||"—"}</div></div><div className="shrink-0 text-right"><div className="font-bold text-[#10284F]">{remainingText(r)}</div><div className="mt-1"><Badge label={level(r)}/></div></div></div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span className="truncate">Condition: {plain(r.fields?.condition)||"Not set"}</span><span className="shrink-0">Exp: {asDate(r.fields?.expiryDate)?.toLocaleDateString("en-GB")||"—"}</span></div></article>)}</div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{["Reagent","Analyzer","Lot / batch","Remaining","Level","Condition","Expiry date"].map(h=><th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{shown.map((r:any)=><tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80"><td className="px-4 py-3"><div className="font-semibold text-slate-800">{reagent(r)}</div><div className="mt-0.5 text-xs text-slate-400">{plain(r.fields?.stockId)}</div></td><td className="px-4 py-3 text-slate-600">{plain(r.fields?.analyzer)||"—"}</td><td className="px-4 py-3 text-slate-600">{plain(r.fields?.lot)||"—"}</td><td className="px-4 py-3 font-bold tabular-nums text-slate-800">{remainingText(r)}</td><td className="px-4 py-3"><Badge label={level(r)}/></td><td className="px-4 py-3"><Badge label={plain(r.fields?.condition)||"Not set"}/></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{asDate(r.fields?.expiryDate)?.toLocaleDateString("en-GB")||"—"}</td></tr>)}</tbody></table></div>
          {active.length===0&&<div className="p-10 text-center text-sm text-slate-500">No active reagent stock records found.</div>}
          {active.length>20&&<div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing the first 20 active packs. Summary counts are based on loaded records.</div>}
        </section>
      </>}
    </div>
  </section>;
}