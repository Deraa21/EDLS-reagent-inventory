# EDLS Softr Source Backup

Captured from Softr application `07d04d3d-aabc-413a-a309-bfc47603ee11` on 2026-10-30.

These files are **backups of individual Softr custom-code blocks**, not yet a standalone replacement application. They reference Softr-specific hooks and components and must be adapted before running outside Softr.

| Backup file | Softr page | Page ID | Block ID |
|---|---|---|---|
| `home-live-command-center.tsx` | Home | `36eea2f2-48a7-4a92-b404-dd2d4bdba8ce` | `bd3a86a3-67cf-41a3-b632-0382fd06142b` |
| `home-welcome-greeting.tsx` | Home | `36eea2f2-48a7-4a92-b404-dd2d4bdba8ce` | `91abc5da-929f-4b09-8d4c-7098bb2b55f5` |
| `live-inventory-dashboard.tsx` | Live Inventory Dashboard | `e5583949-99d2-43cd-8555-d2b801eb71e8` | `712fc8c5-c086-454b-abae-fc6fd1e367df` |
| `current-inventory-quick-filters.tsx` | Current Inventory | `0d72b107-d9be-4a8a-85c9-8c1a1c41276c` | `ec737759-33c5-4fd3-a8ac-4c90e53bf6f9` |
| `reagent-receiving-form.tsx` | Reagent Receiving | `1e11bc7d-b821-494d-b98b-ac77120e9f92` | `0132248d-4c8d-42a4-802d-b24329dce173` |
| `reagent-receipts-placeholder.tsx` | Reagent Receiving | `1e11bc7d-b821-494d-b98b-ac77120e9f92` | `3e252b58-3a8f-4f37-af94-b3fc3ac0c5da` |
| `reports-custom-block.tsx` | Reports | `4713ff47-d002-4ad3-9ec4-e5587f33ade7` | `c8760f8e-4d05-4ecd-ae9d-4bec17bdaf7a` |
| `equipment-management.tsx` | Equipment | `aabced21-5a17-4646-9ecd-8164a5712b46` | `5b1f5379-e580-492b-851a-207e0fc782ee` |
| `inventory-custom-block.tsx` | Inventory | `bc5e4a1d-9829-4a00-aee0-ccedb0d69af9` | `6b3f9223-adc3-406e-befb-b3b09b93e925` |
| `usage-stock-checks.tsx` | Usage & Stock Checks | `02a56b1d-5c7a-47a6-b31e-e2230d4a919b` | `11526fc4-654b-4f01-9a81-be3d65f8d04b` |
| `sample-outsourcing-tracking.tsx` | Sample Tracking | `275d2a36-56a5-4865-ae58-ac65b5531957` | `0ea00083-9932-47d0-a8c9-f20c5461dcf8` |

## Migration notes

- Keep the existing Airtable base as the source of truth: `EDLS REAGENT DB`.
- Never commit Airtable API keys, tokens, or other secrets.
- Some Softr pages use standard Softr table/form blocks rather than custom-code blocks. Those configurations still need to be documented and recreated.
- Before switching users to a new site, build and test the standalone app against Airtable, including permissions, record creation, percent conversions, lot/expiry filtering, and stock updates.
- Keep Softr unchanged until the Vercel replacement is verified.
