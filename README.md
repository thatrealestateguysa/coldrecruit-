
# Recruit 101 — Frontend (v9, bulk-capable)

**Wired URL:** https://script.google.com/macros/s/AKfycbzvl9L9Sg52CJYJ_m5NnuSCgFmQevxch5ym-7zT1MF43DPldvBJfTYuT9EpHnAcleTs0w/exec

## Features
- Column order: [Select] · Message Type · Status · WhatsApp · Name · Surname · Number · Agency
- Per-row **Message Type** dropdown (Recruit / Event 1 - Win Win) — calls `updateMessageType` then reloads to show the rebuilt WhatsApp link.
- **Bulk Message Type** — select multiple rows, choose a type, click **Apply to Selected** (sends one update per row).
- Per-row **Status** dropdown — calls `updateSingleStatus` immediately.
- **Send** button — opens backend `waLink` and sets the row to the top-right **After-send status** (default "Whatsapp").
- **Refresh** pulls the latest from the backend.
