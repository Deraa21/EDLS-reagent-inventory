import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// PREVIEW DATA ONLY. Nothing here is saved. Replace SEED with the Equipment / Service Log / Fault Log tables later.
const DAY = 86400000;
const NOW = Date.now();
const d = (n: number) => NOW + n * DAY;

type Entry = { date: number; activity: string; by: string };
type Item = { id: string; name: string; tag: string; section: string; interval: number; last: number; fault: string | null; history: Entry[] };

const SEED: Item[] = [
  { id: "1", name: "Centrifuge", tag: "EQ-001", section: "Haematology", interval: 180, last: d(-176), fault: null, history: [{ date: d(-176), activity: "Calibration", by: "Service engineer" }] },
  { id: "2", name: "Analyzer 1", tag: "EQ-002", section: "Chemistry", interval: 180, last: d(-70), fault: null, history: [{ date: d(-70), activity: "Calibration", by: "Service engineer" }, { date: d(-130), activity: "Maintenance", by: "Service engineer" }] },
  { id: "3", name: "Analyzer 2", tag: "EQ-003", section: "Chemistry", interval: 180, last: d(-110), fault: "Sample probe not aspirating", history: [{ date: d(-110), activity: "Calibration", by: "Service engineer" }] },
  { id: "4", name: "Refrigerator 1", tag: "EQ-004", section: "Store", interval: 180, last: d(-40), fault: null, history: [{ date: d(-40), activity: "Calibration", by: "Service engineer" }] },
  { id: "5", name: "Microscope", tag: "EQ-005", section: "Microbiology", interval: 180, last: d(-200), fault: null, history: [{ date: d(-200), activity: "Maintenance", by: "Service engineer" }] },
  { id: "6", name: "Water bath", tag: "EQ-006", section: "Serology", interval: 180, last: d(-120), fault: null, history: [{ date: d(-120), activity: "Calibration", by: "Service engineer" }] },
  { id: "7", name: "Pipette set A", tag: "EQ-007", section: "General Laboratory", interval: 180, last: d(-165), fault: null, history: [{ date: d(-165), activity: "Calibration", by: "Service engineer" }] },
  { id: "8", name: "Incubator", tag: "EQ-008", section: "Microbiology", interval: 90, last: d(-30), fault: null, history: [{ date: d(-30), activity: "Calibration", by: "Service engineer" }] },
];

const NAVY = "bg-[#0B1F4B] hover:bg-[#13306E] text-white";
const fmt = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const nextDue = (e: Item) => e.last + e.interval * DAY;
const daysTo = (e: Item) => Math.round((nextDue(e) - Date.now()) / DAY);
const status = (e: Item) => (e.fault ? "Fault open" : daysTo(e) < 0 ? "Overdue" : daysTo(e) <= 30 ? "Due soon" : "Compliant");

const DOT: Record<string, string> = {
  "Fault open": "bg-red-600",
  Overdue: "bg-red-600",
  "Due soon": "bg-amber-500",
  Compliant: "bg-emerald-600",
};

function Status({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-800">
      <span className={`h-2 w-2 rounded-full ${DOT[text]}`} />
      {text}
    </span>
  );
}

const FILTERS = ["All", "Due soon", "Overdue", "Faults"] as const;
type Filter = (typeof FILTERS)[number];

export default function Block() {
  const [items, setItems] = useState<Item[]>(SEED);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "service" | "fault">(null);
  const [activity, setActivity] = useState("Calibration");
  const [by, setBy] = useState("");
  const [faultText, setFaultText] = useState("");

  const counts: Record<Filter, number> = useMemo(
    () => ({
      All: items.length,
      "Due soon": items.filter((e) => status(e) === "Due soon").length,
      Overdue: items.filter((e) => status(e) === "Overdue").length,
      Faults: items.filter((e) => e.fault).length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((e) => {
      const s = status(e);
      if (filter === "Due soon" && s !== "Due soon") return false;
      if (filter === "Overdue" && s !== "Overdue") return false;
      if (filter === "Faults" && !e.fault) return false;
      if (q && !`${e.name} ${e.tag} ${e.section}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, query]);

  const sel = items.find((e) => e.id === openId) ?? null;

  const saveService = () => {
    if (!sel) return;
    const entry: Entry = { date: Date.now(), activity, by: by.trim() || "Not recorded" };
    setItems((all) => all.map((e) => (e.id === sel.id ? { ...e, last: activity === "Calibration" ? entry.date : e.last, history: [entry, ...e.history] } : e)));
    setBy("");
    setMode(null);
  };

  const saveFault = () => {
    if (!sel || !faultText.trim()) return;
    setItems((all) => all.map((e) => (e.id === sel.id ? { ...e, fault: faultText.trim() } : e)));
    setFaultText("");
    setMode(null);
  };

  const resolveFault = () => {
    if (!sel) return;
    setItems((all) => all.map((e) => (e.id === sel.id ? { ...e, fault: null, history: [{ date: Date.now(), activity: "Repair", by: "Not recorded" }, ...e.history] } : e)));
  };

  const kpis = [
    { l: "Total equipment", v: items.length },
    { l: "Compliant", v: items.filter((e) => status(e) === "Compliant").length },
    { l: "Due within 30 days", v: counts["Due soon"] },
    { l: "Open faults", v: counts.Faults },
  ];

  return (
    <div className="w-full bg-white text-slate-900">
      <div className="container">
        <div className="content flex flex-col gap-6 py-6 sm:py-8">
          <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#0B1F4B]">Equipment</h1>
              <p className="mt-1 text-sm text-slate-600">Calibration, maintenance and faults for every instrument in the laboratory.</p>
            </div>
            <span className="text-xs font-medium text-slate-500">Preview data · not saved</span>
          </header>

          <section aria-label="Summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.l} className="bg-white px-5 py-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{k.l}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-[#0B1F4B]">{k.v}</div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200">
              <div role="tablist" className="-mb-px flex w-full gap-6 overflow-x-auto whitespace-nowrap sm:w-auto">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                      filter === f ? "border-[#0B1F4B] text-[#0B1F4B]" : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {f} <span className="ml-1 text-slate-500">{counts[f]}</span>
                  </button>
                ))}
              </div>
              <div className="relative mb-3 w-full sm:mb-2 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input aria-label="Search equipment" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-9 rounded-md pl-9" />
              </div>
            </div>

            <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 md:hidden">
              {visible.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setOpenId(e.id)} className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left active:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[#0B1F4B]">{e.name}</span>
                      <Status text={status(e)} />
                    </div>
                    <div className="text-sm text-slate-800">{e.tag} · {e.section}</div>
                    <div className={`text-xs ${status(e) === "Overdue" ? "font-medium text-red-700" : "text-slate-600"}`}>Next due {fmt(nextDue(e))}</div>
                  </button>
                </li>
              ))}
              {visible.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-600">No equipment in this view.</li>}
            </ul>

            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Equipment</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Last calibration</th>
                    <th className="px-4 py-3 font-medium">Next due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((e) => (
                    <tr key={e.id} onClick={() => setOpenId(e.id)} className="cursor-pointer transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setOpenId(e.id)} className="text-left font-medium text-[#0B1F4B] underline-offset-2 hover:underline focus-visible:underline">{e.name}</button>
                        <div className="text-xs text-slate-500">{e.tag}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{e.section}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{fmt(e.last)}</td>
                      <td className={`px-4 py-3 tabular-nums ${status(e) === "Overdue" ? "font-medium text-red-700" : "text-slate-600"}`}>{fmt(nextDue(e))}</td>
                      <td className="px-4 py-3"><Status text={status(e)} /></td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-600">No equipment in this view.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold text-[#0B1F4B]">{sel.name}</SheetTitle>
                <SheetDescription>{sel.tag} · {sel.section}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-6">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-1"><Status text={status(sel)} /></dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Interval</dt><dd className="mt-1 text-slate-800">Every {sel.interval} days</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Last calibration</dt><dd className="mt-1 tabular-nums text-slate-800">{fmt(sel.last)}</dd></div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Next due</dt>
                    <dd className="mt-1 tabular-nums text-slate-800">{fmt(nextDue(sel))} <span className="text-slate-500">({daysTo(sel) < 0 ? `${Math.abs(daysTo(sel))} days late` : `in ${daysTo(sel)} days`})</span></dd>
                  </div>
                </dl>

                {sel.fault && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-red-700">Open fault</div>
                    <div className="mt-1 text-slate-900">{sel.fault}</div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Service history</h3>
                  <ul className="divide-y divide-slate-100 border-y border-slate-100">
                    {sel.history.map((h, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div>
                          <div className="font-medium text-slate-900">{h.activity}</div>
                          <div className="text-xs text-slate-600">{h.by}</div>
                        </div>
                        <div className="whitespace-nowrap text-xs tabular-nums text-slate-600">{fmt(h.date)}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                  <Button onClick={() => setMode("service")} className={`h-10 rounded-md font-medium ${NAVY}`}>
                    <Plus className="mr-1.5 h-4 w-4" /> Log service
                  </Button>
                  {sel.fault ? (
                    <Button variant="outline" onClick={resolveFault} className="h-10 rounded-md font-medium">Mark fault resolved</Button>
                  ) : (
                    <Button variant="outline" onClick={() => setMode("fault")} className="h-10 rounded-md font-medium">Report a fault</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={mode === "service"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#0B1F4B]">Log service for {sel?.name}</DialogTitle>
            <DialogDescription>A calibration resets the next due date.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Activity
              <select value={activity} onChange={(e) => setActivity(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                {["Calibration", "Maintenance", "Verification", "Repair"].map((a) => (<option key={a}>{a}</option>))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Performed by
              <Input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Engineer or company" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <Button onClick={saveService} className={`font-medium ${NAVY}`}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "fault"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#0B1F4B]">Report a fault on {sel?.name}</DialogTitle>
            <DialogDescription>Describe what is wrong so the engineer knows where to look.</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            What is the problem?
            <Input value={faultText} onChange={(e) => setFaultText(e.target.value)} placeholder="Short description" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <Button onClick={saveFault} disabled={!faultText.trim()} className={`font-medium ${NAVY}`}>Report fault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
