import { NextResponse } from "next/server";
import { airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";
export const dynamic = "force-dynamic";
const map:Record<string,string> = {
  "Usage Log ID":"fld30BNVHF4xQtuJT","Usage Date":"fldHgrcRItpUXCFXN","Activity Type":"fldgFgzWLfSCC4LP5",
  "Reagent Name (New)":"fldASKJA67YURXg1w","Lot/Batch Number (New)":"fldfvkVWnjnjLaUah",
  "Remaining Reagent % After Check":"fldEw3iCyxEnevL0j","Recorded By":"fld0rsXi9DATv29X3"
};
export async function GET() {
  try {
    const data = await airtableList(TABLES.usage, { pageSize:100, sortField:"Usage Date", direction:"desc" });
    return NextResponse.json({ connected:true, usage:data.records.map(r=>({id:r.id,...Object.fromEntries(Object.entries(r.fields).map(([k,v])=>[map[k]||k,v]))})) });
  } catch(error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({connected:false,error:message},{status:error instanceof AirtableConfigError?503:502});
  }
}