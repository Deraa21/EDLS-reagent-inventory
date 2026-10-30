const BASE_ID = process.env.AIRTABLE_BASE_ID || "appewPIE1AOyOtNuN";

export const TABLES = {
  master: "tblpwv1ii6i3wpzlo",
  legacyInventory: "tbl6r0PaY1F6KkWlm",
  receiving: "tblc02BJphmiO4aTN",
  suppliers: "tblHS7OJtxvSSzdKL",
  usage: "tblWpN4JypsvGg76Y",
  currentInventory: "tbl0szzgJJJr08UjS"
} as const;

export type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

export class AirtableConfigError extends Error {}

export async function airtableList(tableId: string, options: { pageSize?: number; fields?: string[]; sortField?: string; direction?: "asc" | "desc" } = {}) {
  const token = process.env.AIRTABLE_PAT;
  if (!token) throw new AirtableConfigError("Airtable connection is not configured. Add AIRTABLE_PAT in the server environment.");
  const params = new URLSearchParams();
  params.set("pageSize", String(Math.min(options.pageSize ?? 100, 100)));
  for (const field of options.fields ?? []) params.append("fields[]", field);
  if (options.sortField) {
    params.set("sort[0][field]", options.sortField);
    params.set("sort[0][direction]", options.direction ?? "desc");
  }
  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    const safeStatus = response.status;
    if (safeStatus === 401 || safeStatus === 403) throw new Error("Airtable rejected the server credentials or permissions. Verify the token and base access.");
    throw new Error(`Airtable request failed (HTTP ${safeStatus}).`);
  }
  return response.json() as Promise<{ records: AirtableRecord[]; offset?: string }>;
}

export async function airtableCreate(tableId: string, fields: Record<string, unknown>) {
  if (process.env.ENABLE_INVENTORY_WRITES !== "true") {
    throw new Error("Write operations are disabled until the existing stock-creation automations and form mappings have been verified.");
  }
  const token = process.env.AIRTABLE_PAT;
  if (!token) throw new AirtableConfigError("Airtable connection is not configured.");
  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields, typecast: false }),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Airtable could not save the record (HTTP ${response.status}). Check field mappings and required fields.`);
  }
  return response.json() as Promise<AirtableRecord>;
}