import { NextResponse } from "next/server";
import { airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stock, master] = await Promise.all([
      airtableList(TABLES.currentInventory, { pageSize: 100 }),
      airtableList(TABLES.master, { pageSize: 100 })
    ]);
    return NextResponse.json({
      connected: true,
      inventory: stock.records.map(r => ({ id: r.id, ...r.fields })),
      master: master.records.map(r => ({ id: r.id, ...r.fields })),
      counts: { stockRecords: stock.records.length, masterProducts: master.records.length },
      note: "Up to 100 records per table are returned in this initial MVP."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = error instanceof AirtableConfigError ? 503 : 502;
    return NextResponse.json({ connected: false, error: message }, { status });
  }
}