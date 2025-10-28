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
    statusTabs: document.getElementById('statusTabs'),
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
    checkAll: document.getElementById('checkAll'),
    syncInfo: document.getElementById('syncInfo')
  };

  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "";

  // State
  let allRows = [];
  let filtered = [];
  let page = 1;
  let perPage = parseInt(el.pageSize?.value || "15", 10) || 15;
  let currentStatus = ""; // "" means All
  let lastQuery = { status: "" };

  const normalize = s => String(s ?? '').trim();
  const eqStatus = (a,b) => normalize(a).toLowerCase() === normalize(b).toLowerCase();

  function formatTime(d){
    const pad = n => String(n).padStart(2, "0");
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }

  function setSynced(){
    if (el.syncInfo) el.syncInfo.textContent = "Last sync: " + formatTime(new Date());
  }

  function buildStatusSelect(selectEl, includeBlank=true){
    if (!selectEl) return;
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

  if (el.statusFilter) buildStatusSelect(el.statusFilter, true);
  if (el.bulkStatusSelect) buildStatusSelect(el.bulkStatusSelect, false);

  // Tabs
  function renderTabs(byStatus){
    if (!el.statusTabs) return;
    let total = 0;
    Object.keys(byStatus||{}).forEach(k => total += byStatus[k]);
    const frag = document.createDocumentFragment();
    function tab(label, value, count){
      const b = document.createElement('button');
      b.className = "tab"+(eqStatus(currentStatus, value) ? " active": "");
      b.dataset.value = value;
      b.innerHTML = `<span>${label}</span><span class="count">${count}</span>`;
      b.addEventListener('click', () => {
        currentStatus = value;
        if (el.statusFilter) el.statusFilter.value = value;
        loadRecipients(); // server-side refetch
      });
      return b;
    }
    frag.appendChild(tab("All", "", total));
    STATUS_OPTIONS.forEach(s => {
      const c = (byStatus && byStatus[s]) || 0;
      frag.appendChild(tab(s, s, c));
    });
    el.statusTabs.innerHTML = "";
    el.statusTabs.appendChild(frag);
  }

  // Fetch helpers (no-cache + cache-buster)
  async function apiGet(params={}){
    params.ts = Date.now();
    const qs = new URLSearchParams(params).toString();
    const url = API_BASE + (qs ? ("?" + qs) : "");
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    return res.json();
  }

  async function apiPost(body){
    body.ts = Date.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  // Data load (preserve page & search on resync)
  async function loadRecipients(){
    if (el.tbody) el.tbody.innerHTML = `<tr><td colspan="9" class="muted">Loading…</td></tr>`;
    const status = normalize(currentStatus || el.statusFilter?.value || "");
    lastQuery = { status };
    const data = await apiGet({ action: "recipients", status });
    if (data.result !== "success"){
      if (el.tbody) el.tbody.innerHTML = `<tr><td colspan="9" class="muted">Error loading data</td></tr>`;
      console.error(data);
      return;
    }
    // Normalize statuses as they come in
    allRows = (data.recipients || []).map(r => ({ ...r, status: normalize(r.status) }));
    applyFilters(false); // don't reset page
    setSynced();

    // Update tabs with fresh counts
    const stat = await apiGet({ action: "stats" });
    if (stat && stat.result === "success"){
      renderTabs(stat.byStatus || {});
    }
  }

  // Filters & pagination
  function applyFilters(resetPage){
    const q = normalize(el.searchInput?.value || "").toLowerCase();
    filtered = allRows.filter(r => {
      if (!q) return true;
      const parts = [r.name, r.surname, r.agency, r.cell].map(x => normalize(x).toLowerCase());
      return parts.some(p => p.includes(q));
    });
    if (resetPage !== false) page = 1;
    renderPage();
  }

  function renderPage(){
    perPage = parseInt(el.pageSize?.value || "15", 10) || 15;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * perPage;
    const slice = filtered.slice(start, start + perPage);

    const rows = slice.map((r) => {
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

    if (el.tbody) el.tbody.innerHTML = rows || `<tr><td colspan="9" class="muted">No rows</td></tr>`;
    if (el.pageInfo) el.pageInfo.textContent = `Page ${page} / ${totalPages} • ${total} total`;
    if (el.prev) el.prev.disabled = page <= 1;
    if (el.next) el.next.disabled = page >= totalPages;
    if (el.checkAll) el.checkAll.checked = false;

    // Mark active tab
    if (el.statusTabs){
      Array.from(el.statusTabs.querySelectorAll(".tab")).forEach(t => {
        t.classList.toggle("active", eqStatus(t.dataset.value, (currentStatus || "")));
      });
    }
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
    const opts = STATUS_OPTIONS.map(s => `<option value="${s}" ${eqStatus(r.status, s)?'selected':''}>${s}</option>`).join("");
    return `<select class="status-select">${opts}</select>`;
  }

  // Open WhatsApp in a new window (popup)
  window.openWhats = function(urlEncoded){
    try{
      const url = decodeURIComponent(urlEncoded);
      window.open(url, "_blank", "noopener,noreferrer");
      return false;
    }catch(_){ return true; }
  };

  // Events
  if (el.refresh) el.refresh.addEventListener('click', () => loadRecipients());
  if (el.stats) el.stats.addEventListener('click', async () => {
    const data = await apiGet({ action: "stats" });
    if (el.statsPre) el.statsPre.textContent = JSON.stringify(data, null, 2);
    if (el.statsDialog) el.statsDialog.showModal();
  });
  if (el.closeStats) el.closeStats.addEventListener('click', () => el.statsDialog?.close());

  if (el.statusFilter) el.statusFilter.addEventListener('change', () => {
    currentStatus = el.statusFilter.value || "";
    loadRecipients();
  });
  if (el.pageSize) el.pageSize.addEventListener('change', renderPage);
  if (el.searchInput) el.searchInput.addEventListener('input', () => { page=1; applyFilters(); });
  if (el.prev) el.prev.addEventListener('click', () => { page=Math.max(1,page-1); renderPage(); });
  if (el.next) el.next.addEventListener('click', () => { page=page+1; renderPage(); });

  // Row interactions
  if (el.tbody) el.tbody.addEventListener('change', async (evt) => {
    const target = evt.target;
    const tr = target.closest('tr[data-row]');
    if (!tr) return;
    const rowNumber = Number(tr.getAttribute('data-row'));

    if (target.classList.contains('status-select')){
      target.disabled = true;
      const newStatus = target.value;
      await apiPost({ action: "updateSingleStatus", payload: { rowNumber, newStatus } });
      target.disabled = false;
      await loadRecipients(); // resync from backend
    }
  });

  if (el.tbody) el.tbody.addEventListener('keydown', async (evt) => {
    if (evt.key !== 'Enter') return;
    const target = evt.target;
    if (!target.classList.contains('note-input')) return;
    const tr = target.closest('tr[data-row]'); if (!tr) return;
    const rowNumber = Number(tr.getAttribute('data-row'));
    target.disabled = true;
    await apiPost({ action: "updateNote", payload: { rowNumber, note: target.value } });
    target.disabled = false;
    await loadRecipients();
  });

  // Bulk actions
  if (el.bulkApply) el.bulkApply.addEventListener('click', async () => {
    const newStatus = el.bulkStatusSelect?.value;
    if (!newStatus){ alert("Pick a bulk status first."); return; }
    const checks = Array.from(document.querySelectorAll('.row-check')).filter(x => x.checked);
    if (checks.length === 0){ alert("Select at least one row."); return; }

    for (const c of checks){
      const tr = c.closest('tr[data-row]');
      const rowNumber = Number(tr.getAttribute('data-row'));
      await apiPost({ action: "updateSingleStatus", payload: { rowNumber, newStatus } });
    }
    await loadRecipients();
  });

  if (el.bulkSelectAll) el.bulkSelectAll.addEventListener('click', () => {
    document.querySelectorAll('.row-check').forEach(x => x.checked = true);
  });

  if (el.checkAll) el.checkAll.addEventListener('change', (e) => {
    const val = e.target.checked;
    document.querySelectorAll('.row-check').forEach(x => x.checked = val);
  });

  // Initial load
  window.addEventListener('DOMContentLoaded', async () => {
    if (API_BASE) {
      await loadRecipients();
    } else {
      console.warn("API_BASE not set. Open config.js.");
    }
  });
})();