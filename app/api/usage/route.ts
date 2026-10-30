import { NextResponse } from "next/server";
import { airtableCreate, airtableList, airtableUpdate, TABLES, AirtableConfigError } from "@/lib/airtable";
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
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const stockId = String(body.stockId || "").trim();
    const activity = String(body.activity || "").trim();
    const recordedBy = String(body.recordedBy || "").trim();
    const department = String(body.department || "").trim();
    const notes = String(body.notes || "").trim();
    const removed = body.quantityRemoved === "" || body.quantityRemoved == null ? 0 : Number(body.quantityRemoved);
    const remainingText = body.remaining === "" || body.remaining == null ? "" : String(body.remaining).trim();
    const remaining = remainingText === "" ? null : Number(remainingText);
    const allowed = ["Usage Check","Pack Opened","Pack Exhausted","Wastage","Expired","Stock Adjustment"];
    if (!stockId || !recordedBy || !allowed.includes(activity))
      return NextResponse.json({error:"Select a stock pack, choose an activity, and enter the scientist's name."},{status:400});
    if (!Number.isInteger(removed) || removed < 0)
      return NextResponse.json({error:"Packs removed must be a whole number zero or greater."},{status:400});
    if (remaining !== null && (!Number.isFinite(remaining) || remaining < 0 || remaining > 100))
      return NextResponse.json({error:"Remaining reagent must be between 0 and 100 percent."},{status:400});
    if (["Usage Check","Pack Opened"].includes(activity) && remaining === null)
      return NextResponse.json({error:"Enter the observed remaining percentage for this activity."},{status:400});
    const stockResult = await airtableList(TABLES.currentInventory,{pageSize:100});
    const stock = stockResult.records.find(r=>r.id===stockId);
    if (!stock) return NextResponse.json({error:"That stock pack could not be found. Refresh the inventory and try again."},{status:404});
    const condition = String(stock.fields["Stock Condition"] || "");
    const expiryStatus = String(stock.fields["Automatic Expiry Status"] || "");
    const currentQty = Number(stock.fields["Quantity"] ?? 0);
    if (["Expired","Exhausted","Quarantined"].includes(condition) || expiryStatus==="Expired" || currentQty<=0)
      return NextResponse.json({error:"This pack is expired, exhausted, quarantined, or has no quantity remaining. Choose an eligible pack."},{status:409});
    const logFields:Record<string,unknown> = {
      "Stock Record":[{id:stockId}],"Usage Date":new Date().toISOString().slice(0,10),
      "Activity Type":activity,"Recorded By":recordedBy,
      "Department / Analyzer":department || undefined,"Notes":notes || undefined,
      "Quantity Removed (Packs)":removed
    };
    if (remaining!==null) logFields["Remaining Reagent % After Check"] = remaining/100;
    Object.keys(logFields).forEach(k=>logFields[k]===undefined && delete logFields[k]);
    if (activity==="Wastage" && removed > currentQty) {
      return NextResponse.json({error:"Packs removed cannot exceed the pack quantity currently recorded."},{status:400});
    }
    // Existing Airtable automations own remaining-percentage, pack-opened,
    // pack-exhausted and expired status updates. Avoid duplicating those writes here.
    const log = await airtableCreate(TABLES.usage,logFields);
    // Wastage quantity is not covered by those automations, so update it here.
    if (activity==="Wastage" && removed>0) {
      const qtyAfter = currentQty - removed;
      const stockFields:Record<string,unknown> = {"Quantity":qtyAfter};
      if (qtyAfter===0) {
        stockFields["Stock Condition"] = "Exhausted";
        stockFields["Remaining Reagent %"] = 0;
      }
      await airtableUpdate(TABLES.currentInventory,stockId,stockFields);
    }
    return NextResponse.json({ok:true,id:log.id,message:"Stock check saved."},{status:201});
  } catch(error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({error:message},{status:error instanceof AirtableConfigError?503:500});
  }
}
