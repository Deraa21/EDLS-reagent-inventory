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
