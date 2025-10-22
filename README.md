
# Recruit 101 — Frontend (v11)

**Wired URL:** https://script.google.com/macros/s/AKfycbwtawOnQILFvMUqf-vWbMjqgtmoVASYPuHoujqFqfsr25glvEOxBpldq2wYN3eVlwjIYw/exec

- Fixed **15 rows per page** with Prev/Next; selection remembered across pages.
- Per-row **Message Type** and **Status** dropdowns; each write to backend and then reload.
- **Bulk Message Type**: tries backend `bulkUpdateMessageType`, falls back to per-row calls.
- Cache-busted fetch so WhatsApp link and message refresh immediately after any change.
