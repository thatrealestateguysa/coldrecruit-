# Explorian Recruiter — Frontend (Vanilla)

A lightweight web app to send WhatsApp messages and manage statuses, talking directly to your **Apps Script backend**.

**Backend URL** (already configured in `config.js`):  
https://script.google.com/macros/s/AKfycbxfPDZd92-zgdcwGDmTfLtvedx_K0yIqTKNmOP6ioha6R7yYhpfayXahqGlibSpq0FZeg/exec

## Features
- Status filtering with counts
- Search
- Edit **Status** and **Notes** (auto-updates Last Contact on status change)
- Send via **WhatsApp Desktop** (fall back to web if you uncheck the toggle)
- Bulk send to selected
- Export CSV of the current grid
- Grey & Red theme (brand-safe), different layout than the previous build

## Deploy
- Drag this folder into Netlify/Vercel or any static host.
- Or run locally with any static server, e.g. `npx serve`.

