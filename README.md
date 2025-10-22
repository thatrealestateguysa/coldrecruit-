
# Recruit 101 — Frontend (v11.3)

**Wired URL:** https://script.google.com/macros/s/AKfycbwtDKcJB9-70mSR0Zoxut5H7NDS5SvJLfFqdygrmj-bxhkOznFiaUXRN-wrokl7oRWyDw/exec

- Fixed **15 rows per page** with Prev/Next; selection remembered across pages.
- Per-row **Message Type** and **Status** dropdowns; each write to backend and then reload.
- **Bulk Message Type**: tries backend `bulkUpdateMessageType`, falls back to per-row calls.
- Cache-busted fetch so WhatsApp link and message refresh immediately after any change.
- **NEW**: If you open `index.html?gid=<TAB_GID>`, the frontend forwards that gid on every request so the right tab is always used.
