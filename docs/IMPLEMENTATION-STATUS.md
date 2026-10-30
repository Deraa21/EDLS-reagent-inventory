# Implementation status — 2026-10-30

## Confirmed
- Softr page list inspected. Pages include Home, Current Inventory, Reagent Receiving, Usage & Stock Checks, Sample Tracking, Reports, Master Reagent List, Equipment, Inventory, and Live Inventory Dashboard, plus authentication/system pages.
- Current Reagent Inventory - New schema inspected; its Remaining Reagent % is an Airtable percent field. Existing records are returned as decimal fractions (e.g. 0.85 means 85%), so the UI converts to whole-number percent for display only.
- New inventory table describes itself as a fresh build for individual physical reagent pack tracking; original inventory table is retained as a backup. Do not assume the two are interchangeable.
- Reagent Received and Reagent Usage Log schemas inspected.
- Airtable records were read only; no production records were created, updated, or deleted.

## Implemented in GitHub
- Initial Next.js/TypeScript application skeleton.
- Server-only Airtable REST client.
- Read-only endpoints for current inventory/master catalogue, receipt history, and usage history.
- Dashboard and inventory views using actual Airtable field IDs.
- Responsive styling and setup/security documentation.
- Inventory writes default to disabled.

## Not yet complete / needs attention
- The repository is being built file-by-file through the GitHub integration; run a local/Vercel build check before calling it production ready.
- Pagination beyond the first 100 records per table.
- Staff authentication/authorization.
- Receiving form and stock creation flow must be matched against existing Airtable automations before enabling writes.
- Usage form percentage submission must be tested end to end in a safe test environment. Existing Airtable Percent fields store values as fractions; do not apply a second conversion to records already stored.
- Equipment and sample-tracking data sources need verification.
- Standard Softr block settings, filters, permissions, and chart configuration need additional documentation.
- Vercel tools currently show no accessible teams or projects, so deployment is blocked pending account/permission setup.

## Safety decisions
- No production record changes.
- No Airtable schema or automation changes.
- No live writes enabled.
- No claim that the app is deployed or production-ready.
