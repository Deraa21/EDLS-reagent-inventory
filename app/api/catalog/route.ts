import { NextResponse } from "next/server";
import { airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [master, suppliers, receipts] = await Promise.all([
      airtableList(TABLES.master, { pageSize: 100 }),
      airtableList(TABLES.suppliers, { pageSize: 100 }),
      airtableList(TABLES.receiving, { pageSize: 100, sortField: "Date Received", direction: "desc" })
    ]);
    return NextResponse.json({
      connected: true,
      reagents: master.records.map(r => ({
        id: r.id, reagentId: r.fields["Reagent ID"] ?? "", name: r.fields["Reagent Name"] ?? "",
        manufacturer: r.fields["Manufacturer"] ?? "", analyzer: r.fields["Analyzer"] ?? "",
        unit: r.fields["Purchase Unit"] ?? "", active: r.fields["Active"] ?? true
      })).filter(r => r.name && r.active !== false),
      suppliers: suppliers.records.map(r => ({
        id: r.id, supplierId: r.fields["Supplier ID"] ?? "", name: r.fields["Supplier Name"] ?? "",
        contact: r.fields["Contact Person"] ?? "", active: r.fields["Active"] ?? true
      })).filter(s => s.name && s.active !== false),
      receipts: receipts.records.map(r => ({
        id: r.id, lot: r.fields["Lot/Batch Number"] ?? "",
        reagent: r.fields["Reagent Name (from Reagent)"] ?? "", received: r.fields["Date Received"] ?? ""
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ connected: false, error: message }, { status: error instanceof AirtableConfigError ? 503 : 502 });
  }
}


const masterChoices = {
  manufacturer: ["SNIBE","Mindray","Erba","Axiom","Lorine","Labman"],
  department: ["Immunology","Chemistry","Hematology"],
  unit: ["Pack","Bottle","Pieces"],
  analyzer: ["MAGLUMI 800","BS-240","XL-200","BC-5000"],
  category: ["Thyroid","Fertility","Hormone","Iron/Anemia","Vitamin/Bone","Tumor Marker","Infectious Disease","Liver Enzyme","Liver Function","Diabetes","Renal","Lipid","Cardiac/Enzyme","Pancreatic","Electrolyte/Mineral"]
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const manufacturer = String(body.manufacturer || "").trim();
    const department = String(body.department || "").trim();
    const analyzer = String(body.analyzer || "").trim();
    const category = String(body.category || "").trim();
    const unit = String(body.unit || "").trim();
    const storage = String(body.storage || "").trim();
    const standardQty = body.standardQty === "" || body.standardQty == null ? null : Number(body.standardQty);
    const minStock = body.minStock === "" || body.minStock == null ? null : Number(body.minStock);
    const reorderPoint = body.reorderPoint === "" || body.reorderPoint == null ? null : Number(body.reorderPoint);
    const price = body.price === "" || body.price == null ? null : Number(body.price);
    if (!name || !manufacturer || !department || !analyzer || !category || !unit)
      return NextResponse.json({error:"Enter the reagent name and select manufacturer, department, analyzer, category and purchase unit."},{status:400});
    if (!(masterChoices.manufacturer as readonly string[]).includes(manufacturer) ||
        !(masterChoices.department as readonly string[]).includes(department) ||
        !(masterChoices.analyzer as readonly string[]).includes(analyzer) ||
        !(masterChoices.category as readonly string[]).includes(category) ||
        !(masterChoices.unit as readonly string[]).includes(unit))
      return NextResponse.json({error:"One of the selected options is not valid. Refresh the page and try again."},{status:400});
    for (const [label,value] of [["Standard purchase quantity",standardQty],["Minimum stock level",minStock],["Reorder point",reorderPoint],["Standard unit price",price]] as const) {
      if (value !== null && (!Number.isFinite(value) || value < 0 || (label !== "Standard unit price" && !Number.isInteger(value))))
        return NextResponse.json({error:label+" must be a valid non-negative "+(label==="Standard unit price"?"amount.":"whole number.")},{status:400});
    }
    const master = await airtableList(TABLES.master,{pageSize:100,fields:["Reagent Name","Manufacturer","Analyzer"]});
    if (master.records.some(r=>String(r.fields["Reagent Name"]||"").trim().toLowerCase()===name.toLowerCase() &&
      String(r.fields["Manufacturer"]||"").trim().toLowerCase()===manufacturer.toLowerCase() &&
      String(r.fields["Analyzer"]||"").trim().toLowerCase()===analyzer.toLowerCase()))
      return NextResponse.json({error:"This reagent already exists for that manufacturer and analyzer."},{status:409});
    const fields:Record<string,unknown> = {"Reagent Name":name,"Manufacturer":manufacturer,"Department":department,"Analyzer":analyzer,"Category":category,"Purchase Unit":unit,"Active":true};
    if (storage) fields["Storage Condition"] = storage;
    if (standardQty !== null) fields["Standard Purchase Qty"] = standardQty;
    if (minStock !== null) fields["Minimum Stock Level"] = minStock;
    if (reorderPoint !== null) fields["Reorder Point"] = reorderPoint;
    if (price !== null) fields["Standard Unit Price (₦)"] = price;
    const created = await airtableCreate(TABLES.master,fields);
    return NextResponse.json({ok:true,id:created.id,message:"Reagent added to the master catalogue."},{status:201});
  } catch(error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({error:message},{status:error instanceof AirtableConfigError?503:500});
  }
}
