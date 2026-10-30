import { useMemo, useState } from "react";
import { Search, Plus, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// PREVIEW DATA ONLY. Nothing here is saved. Replace SEED with an Airtable data source later.
const DAY = 86400000;
const NOW = Date.now();
const d = (n: number) => NOW + n * DAY;

const STAGES = ["Collected", "Dispatched", "Received by lab", "Result ready", "Result received"];
const LABS = ["Referral Lab A", "Referral Lab B", "Referral Lab C"];

type Sample = { id: string; test: string; lab: string; collected: number; expected: number; stage: number };

const SEED: Sample[] = [
  { id: "S-0142", test: "Example test A", lab: "Referral Lab A", collected: d(-14), expected: d(-5), stage: 1 },
  { id: "S-0145", test: "Example test B", lab: "Referral Lab B", collected: d(-11), expected: d(-2), stage: 1 },
  { id: "S-0151", test: "Example test C", lab: "Referral Lab A", collected: d(-6), expected: d(3), stage: 1 },
  { id: "S-0153", test: "Example test A", lab: "Referral Lab C", collected: d(-5), expected: d(4), stage: 2 },
  { id: "S-0156", test: "Example test D", lab: "Referral Lab B", collected: d(-4), expected: d(5), stage: 2 },
  { id: "S-0139", test: "Example test B", lab: "Referral Lab A", collected: d(-18), expected: d(-8), stage: 3 },
  { id: "S-0131", test: "Example test C", lab: "Referral Lab C", collected: d(-22), expected: d(-12), stage: 4 },
  { id: "S-0160", test: "Example test D", lab: "Referral Lab B", collected: d(0), expected: d(7), stage: 0 },
];

const NAVY = "bg-[#0B1F4B] hover:bg-[#13306E] text-white";
const fmt = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const isOverdue = (s: Sample) => s.stage < 4 && s.expected < NOW;
const label = (s: Sample) => (isOverdue(s) ? "Overdue" : STAGES[s.stage]);

const DOT: Record<string, string> = {
  Overdue: "bg-red-600",
  Collected: "bg-slate-400",
  Dispatched: "bg-blue-700",
  "Received by lab": "bg-blue-700",
  "Result ready": "bg-amber-500",
  "Result received": "bg-emerald-600",
};

function Status({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-800">
      <span className={`h-2 w-2 rounded-full ${DOT[text]}`} />
      {text}
    </span>
  );
}

const FILTERS = ["All", "Awaiting result", "Overdue", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

export default function Block() {
  const [rows, setRows] = useState<Sample[]>(SEED);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ test: "", lab: LABS[0], expected: "" });

  const counts: Record<Filter, number> = useMemo(
    () => ({
      All: rows.length,
      "Awaiting result": rows.filter((s) => s.stage < 4).length,
      Overdue: rows.filter(isOverdue).length,
      Completed: rows.filter((s) => s.stage === 4).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((s) => {
      if (filter === "Awaiting result" && s.stage >= 4) return false;
      if (filter === "Overdue" && !isOverdue(s)) return false;
      if (filter === "Completed" && s.stage !== 4) return false;
      if (q && !`${s.id} ${s.test} ${s.lab}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  const selected = rows.find((s) => s.id === openId) ?? null;

  const advance = () => {
    if (!selected || selected.stage >= 4) return;
    setRows((r) => r.map((s) => (s.id === selected.id ? { ...s, stage: s.stage + 1 } : s)));
  };

  const addSample = () => {
    if (!form.test.trim()) return;
    const next = Math.max(...rows.map((s) => parseInt(s.id.slice(2), 10))) + 1;
    const id = `S-${String(next).padStart(4, "0")}`;
    const expected = form.expected ? new Date(form.expected).getTime() : d(7);
    setRows((r) => [{ id, test: form.test.trim(), lab: form.lab, collected: Date.now(), expected, stage: 0 }, ...r]);
    setForm({ test: "", lab: LABS[0], expected: "" });
    setDialog(false);
    setOpenId(id);
  };

  const kpis = [
    { l: "Samples out", v: counts["Awaiting result"] },
    { l: "Overdue", v: counts.Overdue },
    { l: "Result ready", v: rows.filter((s) => s.stage === 3).length },
    { l: "Completed", v: counts.Completed },
  ];

  return (
    <div className="w-full bg-white text-slate-900">
      <div className="container">
        <div className="content flex flex-col gap-6 py-6 sm:py-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#0B1F4B]">Sample Tracking</h1>
              <p className="mt-1 text-sm text-slate-600">Samples sent to referral laboratories, from collection to result.</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs font-medium text-slate-500">Preview data · not saved</span>
              <Button onClick={() => setDialog(true)} className={`h-11 rounded-md px-4 font-medium sm:h-10 ${NAVY}`}>
                <Plus className="mr-1.5 h-4 w-4" /> New sample
              </Button>
            </div>
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
                <Input aria-label="Search samples" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-9 rounded-md pl-9" />
              </div>
            </div>

            <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 md:hidden">
              {visible.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setOpenId(s.id)} className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left active:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[#0B1F4B]">{s.id}</span>
                      <Status text={label(s)} />
                    </div>
                    <div className="text-sm text-slate-800">{s.test} · {s.lab}</div>
                    <div className={`text-xs ${isOverdue(s) ? "font-medium text-red-700" : "text-slate-600"}`}>Expected {fmt(s.expected)}</div>
                  </button>
                </li>
              ))}
              {visible.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-600">No samples in this view.</li>}
            </ul>

            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sample</th>
                    <th className="px-4 py-3 font-medium">Test</th>
                    <th className="px-4 py-3 font-medium">Referral lab</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Expected</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((s) => (
                    <tr key={s.id} onClick={() => setOpenId(s.id)} className="cursor-pointer transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setOpenId(s.id)} className="font-medium text-[#0B1F4B] underline-offset-2 hover:underline focus-visible:underline">{s.id}</button>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{s.test}</td>
                      <td className="px-4 py-3 text-slate-800">{s.lab}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{fmt(s.collected)}</td>
                      <td className={`px-4 py-3 tabular-nums ${isOverdue(s) ? "font-medium text-red-700" : "text-slate-600"}`}>{fmt(s.expected)}</td>
                      <td className="px-4 py-3"><Status text={label(s)} /></td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-600">No samples in this view.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold text-[#0B1F4B]">{selected.id}</SheetTitle>
                <SheetDescription>{selected.test}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-6">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-1"><Status text={label(selected)} /></dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Referral lab</dt><dd className="mt-1 text-slate-800">{selected.lab}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Sent</dt><dd className="mt-1 tabular-nums text-slate-800">{fmt(selected.collected)}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Expected</dt><dd className={`mt-1 tabular-nums ${isOverdue(selected) ? "font-medium text-red-700" : "text-slate-800"}`}>{fmt(selected.expected)}</dd></div>
                </dl>

                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Progress</h3>
                  <ol className="flex flex-col">
                    {STAGES.map((st, i) => {
                      const done = i < selected.stage;
                      const current = i === selected.stage;
                      return (
                        <li key={st} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${done ? "border-[#0B1F4B] bg-[#0B1F4B] text-white" : current ? "border-[#0B1F4B] bg-white" : "border-slate-300 bg-white"}`}>
                              {done && <Check className="h-3 w-3" />}
                              {current && <span className="h-1.5 w-1.5 rounded-full bg-[#0B1F4B]" />}
                            </div>
                            {i < STAGES.length - 1 && <div className={`my-1 w-px flex-1 ${done ? "bg-[#0B1F4B]" : "bg-slate-200"}`} style={{ minHeight: 18 }} />}
                          </div>
                          <div className="-mt-0.5 pb-4 text-sm">
                            <div className={i > selected.stage ? "text-slate-500" : "font-medium text-slate-900"}>{st}</div>
                            {current && <div className="text-xs text-slate-600">Current step</div>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                  <Button onClick={advance} disabled={selected.stage >= 4} className={`h-10 rounded-md font-medium ${NAVY}`}>
                    {selected.stage >= 4 ? "Completed" : `Mark as ${STAGES[selected.stage + 1].toLowerCase()}`}
                  </Button>
                  <Button variant="outline" className="h-10 rounded-md font-medium">
                    <Mail className="mr-1.5 h-4 w-4" /> Email lab
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#0B1F4B]">New sample</DialogTitle>
            <DialogDescription>Use a sample ID, not a patient name. The ID is assigned automatically.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Test requested
              <Input value={form.test} onChange={(e) => setForm({ ...form, test: e.target.value })} placeholder="Test name" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Referral lab
              <select value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                {LABS.map((l) => (<option key={l}>{l}</option>))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Result expected by
              <Input type="date" value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={addSample} disabled={!form.test.trim()} className={`font-medium ${NAVY}`}>Save sample</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
