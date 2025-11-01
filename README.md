# Explorian Recruiter — Frontend (v2)

This build fixes:
- **Dynamic statuses** (auto-discovers from your sheet) + an **All** tab
- On **Send**, we also set **Event Type** on the backend so your new message type shows in the sheet
- WhatsApp Desktop links

Configured backend:
https://script.google.com/macros/s/AKfycbxfPDZd92-zgdcwGDmTfLtvedx_K0yIqTKNmOP6ioha6R7yYhpfayXahqGlibSpq0FZeg/exec

To add a **new message type**, edit `templates.js` and add a key/value. That key appears in the dropdown, and the body fills the composer.
