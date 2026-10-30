# EDLS Reagent Inventory — standalone frontend MVP

A Next.js + TypeScript application being built to replace the Softr frontend while retaining Airtable as the system of record.

## Current implementation status
- Standalone Next.js structure with a responsive dashboard.
- Server-side Airtable REST client; credentials are never used in browser code.
- Read-only API endpoints for current stock, master reagent catalogue, receiving history, and usage history.
- Dashboard metrics and batch-level inventory search/filter views.
- Read-only by default. No production write operations are enabled.
- Sample Tracking is documented as a dependency until its Airtable source is confirmed.

## Setup
1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `AIRTABLE_PAT` to a server-side Airtable personal access token with the minimum required read access to the EDLS REAGENT DB base.
5. Keep `ENABLE_INVENTORY_WRITES=false` while reviewing the live receiving/stock creation automations.
6. Run `npm run dev` or `npm run build`.

## Security
- Never commit `.env.local` or a real Airtable token.
- Airtable requests run only on the server.
- Inventory writes are blocked unless deliberately enabled in the server environment.
- Staff authentication still needs to be configured before the app is exposed to staff. Do not make this application publicly writable.

## Airtable mappings
- Master Reagent List: `tblpwv1ii6i3wpzlo`
- Current Reagent Inventory - New: `tbl0szzgJJJr08UjS`
- Reagent Received: `tblc02BJphmiO4aTN`
- Reagent Usage Log: `tblWpN4JypsvGg76Y`
- Supplier Table: `tblHS7OJtxvSSzdKL`
- Base ID: `appewPIE1AOyOtNuN`

The legacy Current Reagent Inventory table is not treated as interchangeable with the newer physical-pack table. Existing backups remain in `softr-backup/`.

## Known MVP limitations
- API returns at most 100 records per table per request; pagination is not yet implemented.
- Receiving and usage are read-only history views; forms are not enabled until existing automation mappings and a safe test process are verified.
- No staff authentication is implemented yet. Configure authentication before staff deployment.
- Standard Softr table/chart/form settings still need full documentation and parity work.
- Vercel deployment depends on an accessible connected Vercel account/project and environment configuration.
