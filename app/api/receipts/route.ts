import { NextResponse } from "next/server";
import { airtableList, TABLES, AirtableConfigError } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await airtableList(TABLES.receiving, { pageSize: 100, sortField: "Date Received", direction: "desc" });
    return NextResponse.json({ connected: true, receipts: data.records.map(r => ({ id: r.id, ...r.fields })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ connected: false, error: message }, { status: error instanceof AirtableConfigError ? 503 : 502 });
  }
}