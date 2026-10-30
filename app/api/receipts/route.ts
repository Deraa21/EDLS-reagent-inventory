import { NextResponse } from "next/server";
import { airtableCreate, airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";
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
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reagent = String(body.reagent || "").trim();
    const supplier = String(body.supplier || "").trim();
    const lot = String(body.lot || "").trim();
    const ref = String(body.ref || "").trim();
    const qty = Number(body.qty);
    const unit = String(body.unit || "").trim();
    const date = String(body.date || "").trim();
    const expiry = String(body.expiry || "").trim();
    const invoice = String(body.invoice || "").trim();
    const receivedBy = String(body.receivedBy || "").trim();
    const location = String(body.location || "").trim();
    const price = body.price === "" || body.price == null ? null : Number(body.price);
    const notes = String(body.notes || "").trim();
    if (!reagent || !supplier || !lot || !unit || !date || !receivedBy || !location)
      return NextResponse.json({error:"Complete all required fields before recording the receipt."},{status:400});
    if (!Number.isInteger(qty) || qty < 1)
      return NextResponse.json({error:"Quantity received must be a whole number greater than zero."},{status:400});
    if (price !== null && (!Number.isFinite(price) || price < 0))
      return NextResponse.json({error:"Unit price must be a valid non-negative amount."},{status:400});
    if (expiry && expiry < date)
      return NextResponse.json({error:"Expiry date cannot be earlier than the receipt date."},{status:400});
    const [receipts, master, suppliers] = await Promise.all([
      airtableList(TABLES.receiving,{pageSize:100,fields:["Lot/Batch Number","Reagent"]}),
      airtableList(TABLES.master,{pageSize:100,fields:["Reagent Name","Active"]}),
      airtableList(TABLES.suppliers,{pageSize:100,fields:["Supplier Name","Active"]})
    ]);
    if (!master.records.some(r=>r.id===reagent && r.fields["Active"]!==false))
      return NextResponse.json({error:"The selected reagent was not found or is inactive. Refresh the page and select it again."},{status:400});
    if (!suppliers.records.some(r=>r.id===supplier && r.fields["Active"]!==false))
      return NextResponse.json({error:"The selected supplier was not found or is inactive. Refresh the page and select it again."},{status:400});
    const duplicate = receipts.records.some(r=>String(r.fields["Lot/Batch Number"]||"").trim().toLowerCase()===lot.toLowerCase() && Array.isArray(r.fields["Reagent"]) && (r.fields["Reagent"] as string[]).includes(reagent));
    if (duplicate) return NextResponse.json({error:"A receipt for this reagent and lot number already exists. Check Receiving History before trying again."},{status:409});
    const fields:Record<string,unknown> = {
      "Reagent":[{id:reagent}], "Supplier Table":[{id:supplier}],
      "Lot/Batch Number":lot, "REF Number":ref || undefined,
      "Quantity Received":qty, "Unit":unit, "Date Received":date,
      "Expiry Date":expiry || undefined, "Invoice Number":invoice || undefined,
      "Received By":receivedBy, "Storage Location":location,
      "Unit Price (₦)":price === null ? undefined : price, "Notes":notes || undefined
    };
    Object.keys(fields).forEach(k=>fields[k]===undefined && delete fields[k]);
    const created = await airtableCreate(TABLES.receiving,fields);
    return NextResponse.json({ok:true,id:created.id,message:"Receipt recorded successfully."},{status:201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({error:message},{status:error instanceof AirtableConfigError?503:500});
  }
}
