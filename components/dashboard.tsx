"use client";

import { useEffect, useMemo, useState } from "react";

type Row = { id: string; [key: string]: unknown };
type ApiData = { connected?: boolean; inventory?: Row[]; master?: Row[]; error?: string; counts?: { stockRecords: number; masterProducts: number } };
const F = {
  stockId: "fld17DP5h7BElgROE", name: "fld5Mm2bNZk45XipO", packDisplay: "fldDEWhFpz5nDR4wg",
  lot: "fldfgbeBMKa6z7PqN", ref: "fldetKiWwep0MndRz", received: "fld9CsvRA0pYkcg7w",
  expiry: "flddUTZMACVvVjMCq", qty: "fldqpsYMpnh9k9FnD", location: "fldP9oBmVszaPgbAV",
  condition: "fldVAKdgcmilDLu6c", percent: "fld3G8cjEOZaGT6IP", level: "fldNu5609PE5vZ1Ue",
  alert: "fldBL1PtAftDruIzq", expiryStatus: "fldN0fj2F8sLuwfSG", remaining: "fldc0GZDDuLcwoTD0",
  manufacturer: "fldN6hToqFHDW39TV", analyzer: "fldXQEd201nEF52O6", reagent: "fldVyHgrAmft1i9eu",
  masterId: "fldmBiOftnIYQsZFG", department: "fldeO0ymHY3sUNfIL", category: "fldNQT5t2EIUc9nAu"
};
function val(row: Row, key: string): unknown { return row[key]; }
function txt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map(txt).join(", ");
    if ("name" in value) return String((value as {name: unknown}).name);
    if ("valuesByLinkedRecordId" in value) {
      const vals = Object.values((value as {valuesByLinkedRecordId: Record<string, unknown[]>}).valuesByLinkedRecordId).flat();
      return vals.map(txt).join(", ") || "—";
    }
  }
  return String(value);
}
function badgeClass(s: string) { return "status " + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function fmtDate(value: unknown) { if (!value) return "—"; const d = new Date(String(value) + (String(value).length === 10 ? "T12:00:00" : "")); return Number.isNaN(d.valueOf()) ? String(value) : d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }); }
export default function Dashboard() {
  const [data, setData] = useState<ApiData>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("Overview");
  useEffect(() => { fetch("/api/inventory").then(async r => { const j = await r.json(); setData(j); }).catch(() => setData({error:"Could not contact the application API."})).finally(() => setLoading(false)); }, []);
  const inventory = data.inventory ?? [];
  const master = data.master ?? [];
  const rows = useMemo(() => inventory.filter(r => {
    const hay = [txt(val(r,F.stockId)),txt(val(r,F.name)),txt(val(r,F.packDisplay)),txt(val(r,F.lot)),txt(val(r,F.ref)),txt(val(r,F.location)),txt(val(r,F.condition)),txt(val(r,F.manufacturer)),txt(val(r,F.analyzer))].join(" ").toLowerCase();
    if (section === "Low & Critical") return ["Getting Low","Nearly Exhausted","Exhausted"].includes(txt(val(r,F.level)));
    if (section === "Expired / Expiring") return ["Expired","Expiring Soon"].includes(txt(val(r,F.expiryStatus)));
    if (section === "Usable Stock") return ["Unopened","In Use"].includes(txt(val(r,F.condition))) && txt(val(r,F.expiryStatus)) !== "Expired" && txt(val(r,F.level)) !== "Exhausted";
    return true;
  }).filter(r => [txt(val(r,F.stockId)),txt(val(r,F.name)),txt(val(r,F.packDisplay)),txt(val(r,F.lot)),txt(val(r,F.ref)),txt(val(r,F.location)),txt(val(r,F.condition)),txt(val(r,F.manufacturer)),txt(val(r,F.analyzer))].join(" ").toLowerCase().includes(query.toLowerCase())), [inventory, query, section]);
  const low = inventory.filter(r => ["Getting Low","Nearly Exhausted"].includes(txt(val(r,F.level)))).length;
  const exhausted = inventory.filter(r => txt(val(r,F.level)) === "Exhausted" || txt(val(r,F.condition)) === "Exhausted").length;
  const expired = inventory.filter(r => txt(val(r,F.expiryStatus)) === "Expired").length;
  const expiring = inventory.filter(r => txt(val(r,F.expiryStatus)) === "Expiring Soon").length;
  const activeStock = inventory.filter(r => ["Unopened","In Use"].includes(txt(val(r,F.condition))) && txt(val(r,F.expiryStatus)) !== "Expired").length;
  const nav = ["Overview","All Inventory","Usable Stock","Low & Critical","Expired / Expiring","Master Product List","Receiving History","Usage & Stock Checks","Reports","Equipment","Sample Tracking"];
  const title = section === "Overview" ? "Live Reagent Command Center" : section;
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand">EDLS INVENTORY</div><div className="brand-sub">Laboratory stock operations</div><div className="nav-label">Workspace</div><nav className="nav">{nav.map(n => <a key={n} href="#" className={section===n?"active":""} onClick={e=>{e.preventDefault();setSection(n);}}>{n}</a>)}</nav><div className="nav-label">Database</div><div style={{padding:"0 12px",fontSize:11,color:"#9fb3c8",lineHeight:1.7}}>Airtable · read-only MVP<br/>Base: EDLS REAGENT DB</div></aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">EDLS · Laboratory Operations</div><h1>{title}</h1><div className="subtitle">Reagent stock, batch condition, expiry and inventory visibility.</div></div><div className={"badge "+(data.connected?"good":loading?"warn":"bad")}>{loading?"Connecting…":data.connected?"Airtable connected":"Connection needs setup"}</div></header>
      {data.error && <div className="error"><strong>Live data is not available.</strong><br/>{data.error} Configure the server-side Airtable token before using this dashboard with live data.</div>}
      {!data.error && data.connected && <div className="notice">Live Airtable records loaded. This first release is intentionally read-only; receiving and usage submissions are not enabled until their existing automations are verified.</div>}
      {section==="Overview" || section==="Reports" ? <>
        <div className="metrics">
          <div className="metric"><div className="metric-label">Tracked stock records</div><div className="metric-value">{loading?"—":inventory.length}</div><div className="metric-note">Current Reagent Inventory - New</div></div>
          <div className="metric"><div className="metric-label">Low / critical</div><div className="metric-value" style={{color:low?"#b45309":undefined}}>{loading?"—":low}</div><div className="metric-note">Based on Airtable's calculated level</div></div>
          <div className="metric"><div className="metric-label">Exhausted</div><div className="metric-value" style={{color:exhausted?"#b42318":undefined}}>{loading?"—":exhausted}</div><div className="metric-note">Requires stock replacement</div></div>
          <div className="metric"><div className="metric-label">Expired batches</div><div className="metric-value" style={{color:expired?"#b42318":undefined}}>{loading?"—":expired}</div><div className="metric-note">{expiring} expiring soon</div></div>
        </div>
        <div className="metrics">
          <div className="metric"><div className="metric-label">Master reagents</div><div className="metric-value">{loading?"—":master.length}</div><div className="metric-note">Product catalogue records returned</div></div>
          <div className="metric"><div className="metric-label">Unexpired stock packs</div><div className="metric-value">{loading?"—":activeStock}</div><div className="metric-note">Unopened or in-use; expiry checked</div></div>
          <div className="metric"><div className="metric-label">Getting low</div><div className="metric-value">{loading?"—":inventory.filter(r=>txt(val(r,F.level))==="Getting Low").length}</div><div className="metric-note">At or below 40% based on Airtable formula</div></div>
          <div className="metric"><div className="metric-label">Nearly exhausted</div><div className="metric-value">{loading?"—":inventory.filter(r=>txt(val(r,F.level))==="Nearly Exhausted").length}</div><div className="metric-note">At or below 20% based on Airtable formula</div></div>
        </div>
      </> : null}
      {section==="Master Product List" ? <div className="panel"><div className="panel-head"><h2>Master reagent catalogue</h2><input className="search" placeholder="Search reagents…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>Reagent ID</th><th>Reagent name</th><th>Manufacturer</th><th>Analyzer</th><th>Department</th><th>Category</th><th>Active</th></tr></thead><tbody>{master.filter(r=>[txt(val(r,F.masterId)),txt(val(r,F.reagent)),txt(val(r,"fld58iWhZUJEKWdNn")),txt(val(r,"fldeX9mjezw1hcbW1"))].join(" ").toLowerCase().includes(query.toLowerCase())).map(r=><tr key={r.id}><td>{txt(val(r,F.masterId))}</td><td><strong>{txt(val(r,F.reagent))}</strong></td><td>{txt(val(r,"fld58iWhZUJEKWdNn"))}</td><td>{txt(val(r,"fldeX9mjezw1hcbW1"))}</td><td>{txt(val(r,F.department))}</td><td>{txt(val(r,F.category))}</td><td>{val(r,"fld1nq4gLKc3lYwR4")?"Active":"Inactive"}</td></tr>)}</tbody></table></div>{!master.length&&!loading&&<div className="empty">No master records returned.</div>}</div> : null}
      {["All Inventory","Usable Stock","Low & Critical","Expired / Expiring","Overview","Reports"].includes(section) && <div className="panel"><div className="panel-head"><div><h2>{section==="Overview"||section==="Reports"?"Stock requiring attention":"Batch-level inventory"}</h2><div className="subtitle" style={{marginTop:5}}>{rows.length} record(s) · search by reagent, lot, REF or location</div></div><input className="search" placeholder="Search inventory…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>Stock ID</th><th>Reagent</th><th>Manufacturer / Analyzer</th><th>Lot / REF</th><th>Remaining</th><th>Level</th><th>Condition</th><th>Expiry</th><th>Location</th></tr></thead><tbody>{rows.slice(0,100).map(r=><tr key={r.id}><td><strong>{txt(val(r,F.stockId))}</strong></td><td>{txt(val(r,F.packDisplay))}</td><td>{txt(val(r,F.manufacturer))} / {txt(val(r,F.analyzer))}</td><td>{txt(val(r,F.lot))}<br/><span style={{color:"#667085"}}>{txt(val(r,F.ref))}</span></td><td>{txt(val(r,F.remaining))!=="—"?txt(val(r,F.remaining)):val(r,F.percent)!==undefined?Math.round(Number(val(r,F.percent))*100)+"%":"—"}</td><td><span className={badgeClass(txt(val(r,F.level)))}>{txt(val(r,F.level))}</span></td><td><span className={badgeClass(txt(val(r,F.condition)))}>{txt(val(r,F.condition))}</span></td><td><span className={badgeClass(txt(val(r,F.expiryStatus)))}>{txt(val(r,F.expiryStatus))}</span><br/>{fmtDate(val(r,F.expiry))}</td><td>{txt(val(r,F.location))}</td></tr>)}</tbody></table></div>{!rows.length&&!loading&&<div className="empty">No matching inventory records.</div>}</div>}
      {section === "Reagent Receiving" && <ReceivingForm />}
      {section === "Usage & Stock Checks" && <UsageCheckForm />}
      {["Receiving History"].includes(section) && <HistoryPanel kind={section} />}

      {["Equipment","Sample Tracking"].includes(section) && <div className="panel"><h2>{section}</h2><div className="notice" style={{marginTop:14}}>{section==="Equipment"?"Equipment details are currently embedded in the Master Reagent List analyzer field. A dedicated equipment-table schema was not confirmed during this first pass.":"Sample Tracking is preserved in the Softr source backup, but its underlying data source has not yet been mapped into this inventory app. It is intentionally not recreated against an assumed schema."}</div></div>}
      <div className="footer">EDLS Reagent Inventory · Airtable remains the system of record · Data shown is limited to the first 100 records per table in this MVP.</div>
    </main>
  </div>;
}
function ReceivingForm() {
 const [form,setForm]=useState({reagent:"",supplier:"",lot:"",ref:"",qty:"1",unit:"Pack",date:new Date().toISOString().slice(0,10),expiry:"",invoice:"",receivedBy:"",location:"Chem-Refrigerator",price:"",notes:""});
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 function change(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>){setForm({...form,[e.target.name]:e.target.value});}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/receipts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Receipt was not saved.");setMessage("Delivery recorded. Refresh the page to see the updated history.");}catch(err){setMessage(err instanceof Error?err.message:"Receipt was not saved.");}finally{setBusy(false);}}
 const field=(name:string,label:string,type="text",required=false)=><label className="form-field" key={name}><span>{label}{required?" *":""}</span><input name={name} type={type} value={(form as any)[name]} onChange={change} required={required}/></label>;
 return <div className="panel form-panel"><div className="form-title"><h2>Receive a delivery</h2><p>Pick the reagent and supplier, then record the lot, quantity and expiry. A stock record is created automatically by the existing workflow when configured.</p></div><form onSubmit={submit} className="form-grid">
 {field("reagent","Reagent record ID","text",true)}{field("supplier","Supplier record ID","text",true)}
 {field("lot","Lot / Batch Number","text",true)}{field("ref","REF Number")}
 {field("qty","Quantity Received","number",true)}<label className="form-field"><span>Purchase unit *</span><select name="unit" value={form.unit} onChange={change}><option>Pack</option><option>Kit</option><option>Bottle</option><option>Box</option><option>Other</option></select></label>
 {field("date","Date Received","date",true)}{field("expiry","Expiry Date","date")}
 {field("invoice","Invoice Number")}{field("receivedBy","Received By","text",true)}
 {field("location","Storage Location","text",true)}{field("price","Unit Price (₦)","number")}
 <label className="form-field form-wide"><span>Notes</span><textarea name="notes" value={form.notes} onChange={change} rows={3}/></label>
 <div className="form-wide notice">This form is now present in the Vercel interface. Saving remains protected until the existing Airtable field mappings and stock-creation automation are verified. Use record IDs for the linked reagent and supplier fields in this interim form.</div>
 <div className="form-wide"><button className="primary-button" disabled={busy} type="submit">{busy?"Submitting…":"Record delivery"}</button>{message&&<p className="form-message">{message}</p>}</div>
 </form></div>;
}
function UsageCheckForm() {
 const [stockId,setStockId]=useState(""); const [activity,setActivity]=useState("Usage Check"); const [remaining,setRemaining]=useState(""); const [removed,setRemoved]=useState("0"); const [recordedBy,setRecordedBy]=useState(""); const [department,setDepartment]=useState(""); const [notes,setNotes]=useState(""); const [query,setQuery]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 const [stocks,setStocks]=useState<Row[]>([]);
 useEffect(()=>{fetch("/api/inventory").then(r=>r.json()).then(j=>setStocks(j.inventory||[])).catch(()=>setStocks([]));},[]);
 const usable=stocks.filter(s=>{const condition=txt(s["fldVAKdgcmilDLu6c"]);const expiry=txt(s["fldN0fj2F8sLuwfSG"]);const level=txt(s["fldNu5609PE5vZ1Ue"]);const qty=Number(s["fldqpsYMpnh9k9FnD"]);const hay=[txt(s["fld17DP5h7BElgROE"]),txt(s["fld5Mm2bNZk45XipO"]),txt(s["fldDEWhFpz5nDR4wg"]),txt(s["fldfgbeBMKa6z7PqN"]),txt(s["fldetKiWwep0MndRz"]),txt(s["fldXQEd201nEF52O6"])].join(" ").toLowerCase();return ["Unopened","In Use"].includes(condition)&&expiry!=="Expired"&&level!=="Exhausted"&&(Number.isNaN(qty)||qty>0)&&hay.includes(query.toLowerCase());});
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stockId,activity,remaining,quantityRemoved:removed,recordedBy,department,notes})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Stock check was not saved.");setMessage("Stock check recorded.");}catch(err){setMessage(err instanceof Error?err.message:"Stock check was not saved.");}finally{setBusy(false);}}
 return <div className="panel form-panel"><div className="form-title"><h2>Usage &amp; stock checks</h2><p>Record a reagent check after inspecting the pack. Only usable packs are listed.</p></div><form onSubmit={submit} className="form-grid">
 <label className="form-field form-wide"><span>Search reagent pack</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reagent, lot, REF or analyzer"/></label>
 <label className="form-field form-wide"><span>Reagent pack *</span><select value={stockId} onChange={e=>setStockId(e.target.value)} required><option value="">Choose reagent and lot</option>{usable.map(s=><option key={s.id} value={s.id}>{txt(s["fldDEWhFpz5nDR4wg"])} · Lot {txt(s["fldfgbeBMKa6z7PqN"])} · {txt(s["fldVAKdgcmilDLu6c"])}</option>)}</select></label>
 <label className="form-field"><span>Activity *</span><select value={activity} onChange={e=>setActivity(e.target.value)}>{["Usage Check","Pack Opened","Pack Exhausted","Wastage","Expired","Stock Adjustment"].map(a=><option key={a}>{a}</option>)}</select></label>
 <label className="form-field"><span>Remaining (%)</span><input type="number" min="0" max="100" step="1" value={remaining} onChange={e=>setRemaining(e.target.value)} placeholder="e.g. 35"/></label>
 <label className="form-field"><span>Packs removed</span><input type="number" min="0" step="1" value={removed} onChange={e=>setRemoved(e.target.value)}/></label>
 <label className="form-field"><span>Your name *</span><input value={recordedBy} onChange={e=>setRecordedBy(e.target.value)} required placeholder="Scientist name"/></label>
 <label className="form-field"><span>Department / analyzer</span><input value={department} onChange={e=>setDepartment(e.target.value)}/></label>
 <label className="form-field form-wide"><span>Notes</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label>
 <div className="form-wide notice">The original 40% and 20% alert rules remain in Airtable. Stock submissions are protected until write mappings and automations have been verified.</div>
 <div className="form-wide"><button className="primary-button" disabled={busy||usable.length===0} type="submit">{busy?"Submitting…":"Submit stock check"}</button>{message&&<p className="form-message">{message}</p>}</div>
 </form></div>;
}
function HistoryPanel({kind}:{kind:string}) {
 const [items,setItems]=useState<Row[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
 useEffect(()=>{const endpoint=kind==="Receiving History"?"/api/receipts":"/api/usage";fetch(endpoint).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load history");setItems(kind==="Receiving History"?(j.receipts||[]):(j.usage||[]));}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[kind]);
 const fields=kind==="Receiving History"?["fldufd2XDhd2bq8b2","fld06hPLq75dMp4Vp","fld0uCF6RIC4aCmoH","fldcnt4lywNWlInsr","fldzmiDeHLF1sbeke","fldNfkoXnS5NZJKOq","fldKmDsF7i7hOF5vA"]:["fld30BNVHF4xQtuJT","fldHgrcRItpUXCFXN","fldgFgzWLfSCC4LP5","fldASKJA67YURXg1w","fldfvkVWnjnjLaUah","fldEw3iCyxEnevL0j","fld0rsXi9DATv29X3"];
 const labels=kind==="Receiving History"?["Receipt ID","Lot / Batch","Reagent","Qty received","Date received","Expiry","Unit cost (₦)"]:["Usage ID","Date","Activity","Reagent","Lot","Remaining %","Recorded by"];
 return <div className="panel"><div className="panel-head"><h2>{kind}</h2><span className="badge">{items.length} records</span></div>{error&&<div className="error">{error}</div>}{loading?<div className="empty">Loading records…</div>:<div className="table-wrap"><table><thead><tr>{labels.map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{items.map(r=><tr key={r.id}>{fields.map((f,i)=><td key={f}>{i===1&&kind==="Receiving History"?fmtDate(r[f]):i===1&&kind!=="Receiving History"?fmtDate(r[f]):i===5&&kind!=="Receiving History"&&r[f]!==undefined?Math.round(Number(r[f])*100)+"%":txt(r[f])}</td>)}</tr>)}</tbody></table></div>}</div>;
}
