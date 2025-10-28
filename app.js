(function(){
  'use strict';

  const STATUS_OPTIONS = [
    "To Contact","Whatsapp","Reply","Keen to meet","Cultivate",
    "Invite to events","Not interested","No Whatsapp",
    "Unsubscribe","Referred",
    "Event Invite Sent","Event Invite Accepted"
  ];

  // Elements
  const el = {
    statusFilter: document.getElementById('statusFilter'),
    bulkStatusSelect: document.getElementById('bulkStatusSelect'),
    searchInput: document.getElementById('searchInput'),
    pageSize: document.getElementById('pageSize'),
    tbody: document.getElementById('tbody'),
    pageInfo: document.getElementById('pageInfo'),
    prev: document.getElementById('prevPage'),
    next: document.getElementById('nextPage'),
    refresh: document.getElementById('btnRefresh'),
    stats: document.getElementById('btnStats'),
    statsDialog: document.getElementById('statsDialog'),
    statsPre: document.getElementById('statsPre'),
    closeStats: document.getElementById('closeStats'),
    bulkApply: document.getElementById('bulkApply'),
    bulkSelectAll: document.getElementById('bulkSelectAll'),
    checkAll: document.getElementById('checkAll')
  };

  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "";
  if (!API_BASE) {
    console.warn("API_BASE not set. Open config.js and paste your Web App URL.");
  }

  // State
  let allRows = [];
  let filtered = [];
  let page = 1;
  let perPage = parseInt(el.pageSize.value, 10) || 15;

  function buildStatusSelect(selectEl, includeBlank=true){
    selectEl.innerHTML = "";
    if (includeBlank){
      const opt = document.createElement('option');
      opt.value = "";
      opt.textContent = "All";
      selectEl.appendChild(opt);
    }
    STATUS_OPTIONS.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      selectEl.appendChild(o);
    });
  }

  buildStatusSelect(el.statusFilter, true);
  buildStatusSelect(el.bulkStatusSelect, false);

  // Fetch helpers
  async function apiGet(params={}){
    const qs = new URLSearchParams(params).toString();
    const url = API_BASE + (qs ? ("?" + qs) : "");
    const res = await fetch(url, { method: "GET" });
    return res.json();
  }

  async function apiPost(body){
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  // Data load
  async function loadRecipients(){
    el.tbody.innerHTML = `<tr><td colspan="9" class="muted">Loading…</td></tr>`;
    const status = el.statusFilter.value || "";
    const data = await apiGet({ action: "recipients", status });
    if (data.result !== "success"){
      el.tbody.innerHTML = `<tr><td colspan="9" class="muted">Error loading data</td></tr>`;
      console.error(data);
      return;
    }
    allRows = data.recipients || [];
    applyFilters();
  }

  // Filters & pagination
  function applyFilters(){
    const q = (el.searchInput.value || "").trim().toLowerCase();
    filtered = allRows.filter(r => {
      if (!q) return true;
      const parts = [r.name, r.surname, r.agency, r.cell].map(x => (x||"").toLowerCase());
      return parts.some(p => p.includes(q));
    });
    page = 1;
    renderPage();
  }

  function renderPage(){
    perPage = parseInt(el.pageSize.value, 10) || 15;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * perPage;
    const slice = filtered.slice(start, start + perPage);

    const rows = slice.map((r, idx) => {
      const checkedId = `chk-${r.rowNumber}`;
      const safeUrl = r.waLink || "";
      const statusSel = statusSelectHtml(r);
      return `<tr data-row="${r.rowNumber}">
        <td><input type="checkbox" class="row-check" id="${checkedId}" /></td>
        <td>${r.rowNumber}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.surname)}</td>
        <td>${escapeHtml(r.cell)}</td>
        <td>${escapeHtml(r.agency)}</td>
        <td>${statusSel}</td>
        <td>
          <div class="note-cell">
            <input class="note-input" type="text" value="${escapeAttr(r.notes||"")}" placeholder="Type note and press ⏎" />
          </div>
        </td>
        <td>${safeUrl ? `<a href="${safeUrl}" class="whats-btn" onclick="return openWhats('${encodeURIComponent(safeUrl)}')">WhatsApp</a>` : '<span class="muted">No link</span>'}</td>
      </tr>`;
    }).join("");

    el.tbody.innerHTML = rows || `<tr><td colspan="9" class="muted">No rows</td></tr>`;
    el.pageInfo.textContent = `Page ${page} / ${totalPages} • ${total} total`;
    el.prev.disabled = page <= 1;
    el.next.disabled = page >= totalPages;
    el.checkAll.checked = false;
  }

  // Helpers
  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[m]||m));
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function statusSelectHtml(r){
    const opts = STATUS_OPTIONS.map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join("");
    return `<select class="status-select">${opts}</select>`;
  }

  // Open WhatsApp in a new window (popup) — avoids navigating away
  window.openWhats = function(urlEncoded){
    try{
      const url = decodeURIComponent(urlEncoded);
      window.open(url, "_blank", "noopener,noreferrer");
      return false;
    }catch(_){ return true; }
  };

  // Events
  el.refresh.addEventListener('click', loadRecipients);
  el.stats.addEventListener('click', async () => {
    const data = await apiGet({ action: "stats" });
    el.statsPre.textContent = JSON.stringify(data, null, 2);
    el.statsDialog.showModal();
  });
  el.closeStats.addEventListener('click', () => el.statsDialog.close());

  el.statusFilter.addEventListener('change', loadRecipients);
  el.pageSize.addEventListener('change', renderPage);
  el.searchInput.addEventListener('input', () => { page=1; applyFilters(); });
  el.prev.addEventListener('click', () => { page=Math.max(1,page-1); renderPage(); });
  el.next.addEventListener('click', () => { page=page+1; renderPage(); });

  // Row interactions
  el.tbody.addEventListener('change', async (evt) => {
    const target = evt.target;
    const tr = target.closest('tr[data-row]');
    if (!tr) return;
    const rowNumber = Number(tr.getAttribute('data-row'));

    if (target.classList.contains('status-select')){
      target.disabled = true;
      const newStatus = target.value;
      await apiPost({ action: "updateSingleStatus", payload: { rowNumber, newStatus } });
      target.disabled = false;
    }
  });

  el.tbody.addEventListener('keydown', async (evt) => {
    if (evt.key !== 'Enter') return;
    const target = evt.target;
    if (!target.classList.contains('note-input')) return;
    const tr = target.closest('tr[data-row]'); if (!tr) return;
    const rowNumber = Number(tr.getAttribute('data-row'));
    target.disabled = true;
    await apiPost({ action: "updateNote", payload: { rowNumber, note: target.value } });
    target.disabled = false;
  });

  // Bulk actions
  el.bulkApply.addEventListener('click', async () => {
    const newStatus = el.bulkStatusSelect.value;
    if (!newStatus){ alert("Pick a bulk status first."); return; }
    const checks = Array.from(document.querySelectorAll('.row-check')).filter(x => x.checked);
    if (checks.length === 0){ alert("Select at least one row."); return; }

    for (const c of checks){
      const tr = c.closest('tr[data-row]');
      const rowNumber = Number(tr.getAttribute('data-row'));
      await apiPost({ action: "updateSingleStatus", payload: { rowNumber, newStatus } });
      const sel = tr.querySelector('.status-select');
      if (sel) sel.value = newStatus;
    }
  });

  el.bulkSelectAll.addEventListener('click', () => {
    document.querySelectorAll('.row-check').forEach(x => x.checked = true);
  });

  el.checkAll.addEventListener('change', (e) => {
    const val = e.target.checked;
    document.querySelectorAll('.row-check').forEach(x => x.checked = val);
  });

  // Initial load (defer a tick for config load)
  window.addEventListener('DOMContentLoaded', () => {
    // If API_BASE was pasted into config.js, pre-load
    if (API_BASE) loadRecipients();
  });
})();