import { NextResponse } from "next/server";
import { airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";
export const dynamic = "force-dynamic";

const stockMap: Record<string,string> = {
  "Stock ID":"fld17DP5h7BElgROE", "Reagent Name (from Reagent)":"fld5Mm2bNZk45XipO",
  "Pack Display Name":"fldDEWhFpz5nDR4wg", "Lot/Batch Number":"fldfgbeBMKa6z7PqN",
  "REF Number":"fldetKiWwep0MndRz", "Date Received":"fld9CsvRA0pYkcg7w",
  "Expiry Date":"flddUTZMACVvVjMCq", "Quantity":"fldqpsYMpnh9k9FnD",
  "Location":"fldP9oBmVszaPgbAV", "Stock Condition":"fldVAKdgcmilDLu6c",
  "Remaining Reagent %":"fld3G8cjEOZaGT6IP", "Calculated Reagent Level":"fldNu5609PE5vZ1Ue",
  "Reorder Alert":"fldBL1PtAftDruIzq", "Automatic Expiry Status":"fldN0fj2F8sLuwfSG",
  "Remaining Reagent Display":"fldc0GZDDuLcwoTD0", "Manufacturer (from Reagent)":"fldN6hToqFHDW39TV",
  "Analyzer (from Reagent)":"fldXQEd201nEF52O6"
};
const masterMap: Record<string,string> = {
  "Reagent ID":"fldmBiOftnIYQsZFG","Reagent Name":"fldVyHgrAmft1i9eu","Manufacturer":"fld58iWhZUJEKWdNn",
  "Department":"fldeO0ymHY3sUNfIL","Category":"fldNQT5t2EIUc9nAu","Analyzer":"fldeX9mjezw1hcbW1","Active":"fld1nq4gLKc3lYwR4"
};
function normalize(records: Array<{id:string;createdTime?:string;fields:Record<string,unknown>}>, map:Record<string,string>) {
  return records.map(r => ({id:r.id, ...(r.createdTime?{createdTime:r.createdTime}:{}), ...Object.fromEntries(Object.entries(r.fields).map(([name,value])=>[map[name]||name,value]))}));
}
export async function GET() {
  try {
    const [stock, master] = await Promise.all([
      airtableList(TABLES.currentInventory, { pageSize: 100 }),
      airtableList(TABLES.master, { pageSize: 100 })
    ]);
    return NextResponse.json({
      connected: true,
      inventory: normalize(stock.records as never, stockMap),
      master: normalize(master.records as never, masterMap),
      counts: { stockRecords: stock.records.length, masterProducts: master.records.length },
      note: "Up to 100 records per table are returned in this initial MVP."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = error instanceof AirtableConfigError ? 503 : 502;
    return NextResponse.json({ connected: false, error: message }, { status });
  }
}