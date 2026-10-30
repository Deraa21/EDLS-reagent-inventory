import { useMemo, useState } from "react";
import { datasource, useRecords, useRecordCreate, q } from "@/lib/datasource";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Search, X, FlaskConical, Truck, Boxes, MapPin } from "lucide-react";

const ds = datasource.define({ receipts: "receipts", master: "master", suppliers: "suppliers" });

const masterSelect = q.select({
  rid: "Reagent ID",
  name: "Reagent Name",
  manufacturer: "Manufacturer",
  analyzer: "Analyzer",
  unit: "Purchase Unit",
  stdQty: "Standard Purchase Qty",
  stdPrice: "Standard Unit Price (₦)",
  active: "Active",
});
const supplierSelect = q.select({
  sid: "Supplier ID",
  name: "Supplier Name",
  contact: "Contact Person",
  category: "Category",
  active: "Active",
});
const receiptSelect = q.select({
  reagent: "Reagent",
  lot: "Lot/Batch Number",
  ref: "REF Number",
  qty: "Quantity Received",
  received: "Date Received",
  location: "Storage Location",
});

const UNITS = ["Pack", "Kit", "Bottle", "Box", "Other"];
const DEFAULT_LOCATION = "Chem-Refrigerator";

function plain(v: any): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(plain).filter(Boolean).join(", ");
  if (typeof v === "object") return String(v.label ?? v.name ?? v.value ?? "");
  return String(v);
}
function idOf(v: any): string {
  if (v == null) return "";
  if (Array.isArray(v)) return idOf(v[0]);
  if (typeof v === "object") return String(v.id ?? v.recordId ?? v.name ?? "");
  return String(v);
}
const todayIso = () => new Date().toISOString().slice(0, 10);

function Section({ icon: Icon, step, title, children }: any) {
  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1F4B] text-xs font-semibold text-white">{step}</span>
        <h3 className="text-base font-semibold text-[#0B1F4B]">{title}</h3>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function Field({ label, required, hint, error, wide, children }: any) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label className="text-sm font-medium text-slate-800">{label}{required && <span className="text-red-600"> *</span>}</label>
      {children}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
const inputCls = "min-h-12 w-full rounded-lg border border-slate-300 !bg-white px-3 py-2.5 text-base !text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:min-h-11 sm:text-sm";

function Picker({ placeholder, options, value, onChange, empty }: { placeholder: string; options: { id: string; label: string; sub?: string }[]; value: string; onChange: (id: string) => void; empty: string }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.id === value);
  const shown = options.filter((o) => (o.label + " " + (o.sub ?? "")).toLowerCase().includes(text.toLowerCase())).slice(0, 40);
  if (chosen && !open) {
    return (
      <div style={{backgroundColor:"#eff6ff",color:"#0f172a"}} className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 !bg-blue-50 px-3 py-3 text-slate-900">
        <div className="min-w-0"><p className="text-sm font-medium text-slate-900">{chosen.label}</p>{chosen.sub && <p className="mt-0.5 truncate text-xs text-slate-600">{chosen.sub}</p>}</div>
        <button type="button" onClick={() => { onChange(""); setText(""); setOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-900" aria-label="Change"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-[#0B1F4B] focus-within:ring-1 focus-within:ring-[#0B1F4B]">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={text} onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className="min-h-12 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 sm:min-h-11 sm:text-sm" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {shown.length === 0 && <p className="p-3 text-sm text-slate-600">{empty}</p>}
          {shown.map((o) => (
            <button type="button" key={o.id} onClick={() => { onChange(o.id); setOpen(false); setText(""); }} className="block w-full border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-slate-50">
              <span className="block text-sm text-slate-900">{o.label}</span>{o.sub && <span className="block text-xs text-slate-600">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Block() {
  const master = useRecords({ from: ds.master, select: masterSelect, count: 100 });
  const sup = useRecords({ from: ds.suppliers, select: supplierSelect, count: 100 });
  const rec = useRecords({ from: ds.receipts, select: receiptSelect, count: 100, orderBy: q.desc("received") });

  const [reagentId, setReagentId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [dateReceived, setDateReceived] = useState(todayIso());
  const [receivedBy, setReceivedBy] = useState("");
  const [lot, setLot] = useState("");
  const [ref, setRef] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Pack");
  const [expiry, setExpiry] = useState("");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dupConfirm, setDupConfirm] = useState(false);
  const [justSaved, setJustSaved] = useState<string>("");

  const masters = useMemo(() => master.data?.pages.flatMap((p: any) => p.items) ?? [], [master.data]);
  const suppliers = useMemo(() => sup.data?.pages.flatMap((p: any) => p.items) ?? [], [sup.data]);
  const receipts = useMemo(() => rec.data?.pages.flatMap((p: any) => p.items) ?? [], [rec.data]);

  const reagentOptions = masters
    .filter((m: any) => plain(m.fields?.name) && m.fields?.active !== false)
    .map((m: any) => {
      const parts = [plain(m.fields?.name), plain(m.fields?.manufacturer), plain(m.fields?.analyzer)].filter(Boolean);
      return { id: m.id, label: parts.join(" — "), sub: plain(m.fields?.rid) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const supplierOptions = suppliers
    .filter((s: any) => plain(s.fields?.name) && s.fields?.active !== false)
    .map((s: any) => ({ id: s.id, label: plain(s.fields?.name), sub: [plain(s.fields?.sid), plain(s.fields?.contact), plain(s.fields?.category)].filter(Boolean).join(" · ") }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const chosenReagent: any = masters.find((m: any) => m.id === reagentId);
  const chosenSupplier: any = suppliers.find((s: any) => s.id === supplierId);

  // Most recent REF number previously received for the selected reagent (REF is stored per delivery, not on the master list).
  const lastRef = useMemo(() => {
    if (!reagentId) return "";
    const hit = receipts.find((r: any) => idOf(r.fields?.reagent) === reagentId && plain(r.fields?.ref));
    return hit ? plain(hit.fields?.ref) : "";
  }, [receipts, reagentId]);

  const locationSuggestions = useMemo(() => {
    const set = new Set<string>([DEFAULT_LOCATION]);
    receipts.forEach((r: any) => { const l = plain(r.fields?.location).trim(); if (l && !/test/i.test(l)) set.add(l); });
    return Array.from(set);
  }, [receipts]);

  function pickReagent(id: string) {
    setReagentId(id);
    const m: any = masters.find((x: any) => x.id === id);
    if (m) {
      const u = plain(m.fields?.unit);
      if (u && UNITS.includes(u)) setUnit(u);
      const sq = Number(m.fields?.stdQty);
      if (Number.isFinite(sq) && sq > 0 && (qty === "" || qty === "1")) setQty(String(sq));
    }
    setErrors((e) => ({ ...e, reagent: "" }));
  }

  const create = useRecordCreate({
    from: ds.receipts,
    fields: q.select({
      reagent: "Reagent", supplier: "Supplier Table", lot: "Lot/Batch Number", ref: "REF Number", qty: "Quantity Received",
      unit: "Unit", received: "Date Received", expiry: "Expiry Date", invoice: "Invoice Number", receivedBy: "Received By",
      notes: "Notes", location: "Storage Location", price: "Unit Price (₦)",
    }),
    onSuccess: async () => { await rec.refetch(); },
    onError: (error) => toast.error("Could not save the receipt: " + error.message),
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!reagentId) e.reagent = "Select the reagent being received.";
    if (!supplierId) e.supplier = "Select the supplier from the registered list.";
    if (!dateReceived) e.date = "Enter the date received.";
    else if (dateReceived > todayIso()) e.date = "Date received cannot be in the future.";
    if (!receivedBy.trim()) e.receivedBy = "Enter the name of the person receiving the delivery.";
    if (!lot.trim()) e.lot = "Enter the lot/batch number printed on the pack.";
    const n = Number(qty);
    if (!qty || !Number.isFinite(n) || n <= 0) e.qty = "Quantity must be greater than zero.";
    else if (!Number.isInteger(n)) e.qty = "Enter a whole number of packs.";
    if (expiry && Number.isNaN(new Date(expiry).getTime())) e.expiry = "Enter a valid expiry date.";
    else if (expiry && dateReceived && expiry < dateReceived) e.expiry = "Expiry date is before the date received. Check the pack label.";
    if (price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)) e.price = "Price must be a number of zero or more.";
    return e;
  }
  const duplicate = useMemo(() => receipts.find((r: any) =>
    idOf(r.fields?.reagent) === reagentId && plain(r.fields?.lot).trim().toLowerCase() === lot.trim().toLowerCase() && lot.trim() !== ""), [receipts, reagentId, lot]);

  async function submit(ev: any) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast.error("Please fix the highlighted fields."); return; }
    if (!create.enabled) { toast.error("Your account does not have permission to record receipts."); return; }
    if (duplicate && !dupConfirm) { setDupConfirm(true); toast.warning("This reagent and lot has been received before. Confirm below if this is a new delivery."); return; }
    try {
      await create.mutateAsync({
        reagent: [reagentId],
        supplier: [supplierId],
        lot: lot.trim(),
        ...(ref.trim() ? { ref: ref.trim() } : {}),
        qty: Number(qty),
        unit,
        received: dateReceived,
        ...(expiry ? { expiry } : {}),
        ...(invoice.trim() ? { invoice: invoice.trim() } : {}),
        receivedBy: receivedBy.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(price !== "" ? { price: Number(price) } : {}),
      });
      const label = chosenReagent ? plain(chosenReagent.fields?.name) : "Reagent";
      setJustSaved(`${label} · Lot ${lot.trim()} · ${qty} ${unit}`);
      toast.success("Delivery recorded. A new stock record is being created.");
      setReagentId(""); setSupplierId(""); setInvoice(""); setLot(""); setRef(""); setQty("1"); setUnit("Pack"); setExpiry(""); setPrice(""); setNotes(""); setErrors({}); setDupConfirm(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save the receipt.");
    }
  }

  const loading = master.status === "pending" || sup.status === "pending";
  const failed = master.status === "error" || sup.status === "error";
  const estTotal = price !== "" && Number.isFinite(Number(price)) && Number(qty) > 0 ? Number(price) * Number(qty) : chosenReagent && Number(chosenReagent.fields?.stdPrice) > 0 && Number(qty) > 0 ? Number(chosenReagent.fields?.stdPrice) * Number(qty) : null;

  return (
    <section style={{backgroundColor:"#f5f8fc",color:"#172b4d",minHeight:"100vh"}} className="container receive-reagent-page !bg-slate-50 !text-slate-900"><style>{`.receive-reagent-page h1,.receive-reagent-page h2,.receive-reagent-page h3,.receive-reagent-page label{color:#172b4d!important}.receive-reagent-page p{color:#526581}.receive-reagent-page input,.receive-reagent-page select,.receive-reagent-page textarea{background:#fff!important;color:#172b4d!important;border-color:#cbd5e1!important;border-radius:9px!important;box-shadow:0 1px 2px rgba(15,23,42,.04)}.receive-reagent-page input:focus,.receive-reagent-page select:focus,.receive-reagent-page textarea:focus{outline:none!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.13)!important}.receive-reagent-page button[type=submit]{background:#10264d!important;border-radius:9px!important;box-shadow:0 4px 10px rgba(15,23,42,.12)}.receive-reagent-page button[type=submit]:hover{background:#1d4ed8!important}.receive-reagent-page .content{max-width:1240px!important;width:100%;padding-left:24px;padding-right:24px}.receive-reagent-page form{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.receive-reagent-page header{border-color:#dbe4ef!important;padding-bottom:20px}.receive-reagent-page header h1{font-size:clamp(28px,3vw,36px);font-weight:750;letter-spacing:-.03em}.receive-reagent-page form>div{border-color:#e2e8f0!important}.receive-reagent-page form h3{font-weight:700}.receive-reagent-page form button:not([type=submit]){transition:all .15s ease}`}</style>
      <div className="content mx-auto flex w-full max-w-[1600px] flex-col gap-6 py-6 sm:py-8">
        <header className="border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight !text-slate-900 sm:text-3xl">Receive a delivery</h1>
          <p className="mt-1 max-w-3xl text-sm !text-slate-600 sm:text-base">Pick the reagent and supplier, then record the lot, quantity and expiry. A stock record is created automatically and appears in Inventory.</p>
        </header>

        {justSaved && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="flex-1"><p className="font-semibold">Delivery recorded</p><p className="text-sm">{justSaved}. The stock record appears in Inventory within a few seconds.</p></div>
            <button type="button" onClick={() => setJustSaved("")} className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-800 hover:bg-emerald-100" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        )}
        {loading && <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">Loading reagent and supplier lists…</p>}
        {failed && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load the reagent or supplier list. Refresh the page or contact the administrator.</p>}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]"><div className="min-w-0"><form onSubmit={submit} className="flex flex-col gap-6" noValidate>
          <Section icon={FlaskConical} step={1} title="Reagent identification">
            <Field label="Reagent" required wide error={errors.reagent} hint="Type to search by name, manufacturer or analyzer. The same test on a different analyzer is a separate item.">
              <Picker placeholder="Search reagents…" options={reagentOptions} value={reagentId} onChange={pickReagent} empty="No matching reagent. Ask the administrator to register it in the Master Reagent List." />
            </Field>
            {chosenReagent && (
              <div style={{backgroundColor:"#f8fafc",color:"#0f172a"}} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 !bg-slate-50 p-4 text-sm text-slate-900 sm:col-span-2 sm:grid-cols-4">
                <div><p className="text-xs text-slate-500">Reagent</p><p className="mt-0.5 font-medium text-slate-900">{plain(chosenReagent.fields?.name)}</p></div>
                <div><p className="text-xs text-slate-500">Manufacturer</p><p className="mt-0.5 font-medium text-slate-900">{plain(chosenReagent.fields?.manufacturer) || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Analyzer</p><p className="mt-0.5 font-medium text-slate-900">{plain(chosenReagent.fields?.analyzer) || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Last REF received</p><p className="mt-0.5 font-medium text-slate-900">{lastRef || "None recorded"}</p></div>
              </div>
            )}
            <Field label="REF number" error={errors.ref} hint={lastRef ? `Last received: ${lastRef}. Check it matches the pack label.` : "Catalogue number on the pack label (optional)."}>
              <div className="flex gap-2">
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 130203001M" className={inputCls} />
                {lastRef && ref !== lastRef && <button type="button" onClick={() => setRef(lastRef)} className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-[#0B1F4B] hover:bg-slate-50">Use last</button>}
              </div>
            </Field>
          </Section>

          <Section icon={Truck} step={2} title="Delivery information">
            <Field label="Supplier" required wide error={errors.supplier} hint="Only registered suppliers can be selected.">
              <Picker placeholder="Search suppliers…" options={supplierOptions} value={supplierId} onChange={(id) => { setSupplierId(id); setErrors((e) => ({ ...e, supplier: "" })); }} empty="No matching supplier. Ask the administrator to register it in the Supplier Table." />
            </Field>
            <Field label="Invoice / delivery note number" hint="Optional.">
              <input value={invoice} onChange={(e) => setInvoice(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Date received" required error={errors.date}>
              <input type="date" value={dateReceived} max={todayIso()} onChange={(e) => setDateReceived(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Received by" required wide error={errors.receivedBy}>
              <input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Name of the inventory officer" className={inputCls} />
            </Field>
          </Section>

          <Section icon={Boxes} step={3} title="Batch and quantity">
            <Field label="Lot / batch number" required error={errors.lot}>
              <input value={lot} onChange={(e) => { setLot(e.target.value); setDupConfirm(false); }} placeholder="As printed on the pack" className={inputCls} />
            </Field>
            <Field label="Expiry date" error={errors.expiry} hint="Check the pack label.">
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Quantity received" required error={errors.qty} hint="Number of packs. One stock record is created for the delivery.">
              <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            </Field>
            <Field label="Unit price (₦)" error={errors.price} hint={chosenReagent && Number(chosenReagent.fields?.stdPrice) > 0 ? `Leave blank to use the standard price of ₦${Math.round(Number(chosenReagent.fields?.stdPrice)).toLocaleString("en-NG")}.` : "Optional. Used for spend reports."}>
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price per pack" className={inputCls} />
            </Field>
            <Field label="Estimated total">
              <div className={`${inputCls} flex items-center bg-slate-50 font-medium tabular-nums text-slate-800`}>{estTotal != null ? "₦" + Math.round(estTotal).toLocaleString("en-NG") : "—"}</div>
            </Field>
          </Section>

          <Section icon={MapPin} step={4} title="Storage and notes">
            <Field label="Storage location" hint="Choose a suggestion or type a new location. Copied to the new stock record." wide>
              <input list="receive-locations" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
              <datalist id="receive-locations">{locationSuggestions.map((l) => <option key={l} value={l} />)}</datalist>
            </Field>
            <Field label="Notes" wide hint="Optional. Packaging condition, temperature on arrival, discrepancies.">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
            </Field>
          </Section>

          {duplicate && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p className="text-sm">A delivery of this reagent with lot <strong>{lot.trim()}</strong> was already recorded{plain(duplicate.fields?.received) ? ` on ${new Date(plain(duplicate.fields?.received)).toLocaleDateString("en-GB")}` : ""}. Submit again only if this is a separate delivery.{dupConfirm && <strong className="ml-1">Press submit again to confirm.</strong>}</p>
            </div>
          )}
          {!create.enabled && <p className="text-xs text-amber-800">Your account may not have permission to record receipts. Please log in.</p>}

          <button type="submit" disabled={create.status === "pending" || loading || failed} className="h-12 w-full rounded-md bg-[#0B1F4B] px-4 text-base font-medium text-white hover:bg-[#13306E] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-auto sm:self-start sm:px-8 sm:text-sm">
            {create.status === "pending" ? "Saving delivery…" : "Record delivery"}
          </button>
        </form></div><aside className="min-w-0 xl:sticky xl:top-5"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Audit trail</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Recent receipts</h2><p className="mt-1 text-sm text-slate-600">Latest deliveries recorded in the system.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{receipts.length}</span></div><div className="max-h-[820px] divide-y divide-slate-100 overflow-y-auto">{rec.status === "pending" && <p className="p-5 text-sm text-slate-500">Loading receipt history…</p>}{rec.status === "error" && <p className="p-5 text-sm text-rose-700">Could not load receipt history. Check the connected Airtable source.</p>}{rec.status === "success" && receipts.length === 0 && <div className="p-8 text-center"><Boxes className="mx-auto h-8 w-8 text-slate-400"/><p className="mt-3 font-semibold text-slate-800">No receipts yet</p><p className="mt-1 text-sm text-slate-500">Submitted deliveries will appear here.</p></div>}{receipts.slice(0,50).map((row:any)=><div key={row.id} className="px-5 py-4 transition hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{plain(row.fields?.reagent)||"Reagent"}</p><p className="mt-1 text-xs text-slate-600">Lot: {plain(row.fields?.lot)||"—"}</p>{plain(row.fields?.ref)&&<p className="text-xs text-slate-500">REF {plain(row.fields?.ref)}</p>}</div><span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{plain(row.fields?.qty)||"—"} pack(s)</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-500">Date received</p><p className="mt-1 font-medium text-slate-800">{plain(row.fields?.received)?new Date(plain(row.fields?.received)).toLocaleDateString("en-GB"):"—"}</p></div><div><p className="text-slate-500">Storage</p><p className="mt-1 break-words font-medium text-slate-800">{plain(row.fields?.location)||"—"}</p></div></div></div>)}</div><div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">Showing the latest 50 receipt records. This is a history view and does not itself change stock.</div></div></aside></div>
      </div>
    </section>
  );
}
