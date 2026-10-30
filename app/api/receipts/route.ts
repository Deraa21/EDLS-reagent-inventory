import { NextResponse } from "next/server";
import { airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";
export const dynamic = "force-dynamic";
const map:Record<string,string> = {
  "Name":"fldufd2XDhd2bq8b2","Lot/Batch Number":"fld06hPLq75dMp4Vp","Reagent Name (from Reagent)":"fld0uCF6RIC4aCmoH",
  "Quantity Received":"fldcnt4lywNWlInsr","Date Received":"fldzmiDeHLF1sbeke","Expiry Date":"fldNfkoXnS5NZJKOq",
  "Effective Unit Price (₦)":"fldKmDsF7i7hOF5vA"
};
export async function GET() {
  try {
    const data = await airtableList(TABLES.receiving, { pageSize: 100, sortField: "Date Received", direction: "desc" });
    return NextResponse.json({ connected:true, receipts:data.records.map(r=>({id:r.id,...Object.fromEntries(Object.entries(r.fields).map(([k,v])=>[map[k]||k,v]))})) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ connected:false,error:message }, { status:error instanceof AirtableConfigError?503:502 });
  }
}