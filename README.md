
# Recruit 101 — Frontend (v10, pagination + bulk + cache-bust)

**Wired URL:** https://script.google.com/macros/s/AKfycbynH2SST3HuLwmKuV0QZVwOV0nPSAxv2Lg6Vyqdq75S28VNbYPKGv231nzJJiprr-IO8Q/exec

- Fixed **15 rows per page** with Prev/Next; selection remembered across pages.
- Per-row **Message Type** and **Status** dropdowns; each write to backend and then reload.
- **Bulk Message Type**: tries backend `bulkUpdateMessageType`, falls back to per-row calls.
- Cache-busted fetch so WhatsApp link and message refresh immediately after any change.
