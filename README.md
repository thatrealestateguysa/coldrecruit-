
# KW Explore — WhatsApp Sender (Simple v7b)

**Wired URL:**  
https://script.google.com/macros/s/AKfycbxIJc_p_lX9SdQGAcinR_HjLcbey1l9eum3vMM9_bmHz1rrFwa0R_53FlfXLvK2jqPBsQ/exec

## How it works
- Change **Message Type** (Recruit / Event 1 - Win Win) — the frontend calls `updateMessageType` and the backend rebuilds **WHATSAPP MESSAGE** and **WHATSAPP LINK**.
- Click **Send** — opens WhatsApp using the backend **WHATSAPP LINK** and sets the Status to your chosen **After-send status** (default "Whatsapp").
- Use **Refresh** any time to pull latest sheet values.

This matches the full backend I shared. If your current backend doesn't yet include `updateMessageType` and `waLink/waMessage` in `listRecipients_()`, let me know and I’ll reattach it.
