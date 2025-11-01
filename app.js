(function(){
  const BACKEND = window.BACKEND_URL;
  let rows = [];
  let activeStatus = "All";
  let selected = new Set();
  const DEFAULT_STATUSES = [
    "To Contact","Whatsapp","Reply","Keen to meet","Cultivate","Invite to events",
    "Not interested","No Whatsapp","Unsubscribe","Referred","Event Invite Sent","Event Invite Accepted"
  ];

  const el = (q)=>document.querySelector(q);
  const els = (q)=>Array.from(document.querySelectorAll(q));
  const title = (s)=> (s||"").toLowerCase().replace(/(^|\\s)([a-z])/g,(_,a,b)=>a+b.toUpperCase());
  const todayISO = ()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const digitsOnly = (n)=> String(n||"").replace(/\\D/g,"");

  // WhatsApp link (desktop first)
  function buildWALink(phone, message, preferDesktop){
    let digits = digitsOnly(phone);
    if(digits && !digits.startsWith("27")){ if(digits.startsWith("0")) digits = digits.slice(1); digits = "27"+digits; }
    if(preferDesktop) return `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`;
    return `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
  }

  // API
  async function apiGet(action){ const r=await fetch(`${BACKEND}?action=${encodeURIComponent(action)}`); return r.json(); }
  async function apiPost(action, body){ const r=await fetch(`${BACKEND}?action=${encodeURIComponent(action)}`,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body||{})}); return r.json(); }

  // Load
  async function load(){
    const data = await apiGet("rows");
    rows = data.rows || [];
    renderStatuses();
    renderRows();
    refreshTemplateDropdown();
  }

  // Dynamic statuses (union of defaults + what exists in sheet), plus an "All" tab
  function getStatuses(){
    const present = Array.from(new Set(rows.map(r => String(r["Status"]||"").trim()).filter(Boolean)));
    const merged = Array.from(new Set(["All", ...DEFAULT_STATUSES, ...present]));
    return merged;
  }

  function renderStatuses(){
    const statuses = getStatuses();
    const counts = Object.fromEntries(statuses.map(s=>[s,0]));
    rows.forEach(r=>{ const s = String(r["Status"]||"").trim() || "To Contact"; counts[s] = (counts[s]||0)+1; });
    const box = el("#status-list"); box.innerHTML = "";
    statuses.forEach(s=>{
      const div = document.createElement("button");
      div.className = "status" + (s===activeStatus? " active": "");
      div.innerHTML = `<span class="name">${s}</span><span class="count">${s==="All"? rows.length : (counts[s]||0)}</span>`;
      div.onclick = ()=>{ activeStatus = s; selected.clear(); renderStatuses(); renderRows(); };
      box.appendChild(div);
    });
  }

  function filteredRows(){
    if(activeStatus==="All") return rows;
    return rows.filter(r => String(r["Status"]||"").trim() === activeStatus);
  }

  function renderRows(){
    const body = el("#rows"); body.innerHTML="";
    const q = el("#search").value.toLowerCase().trim();
    const preferDesktop = el("#toggle-desktop").checked;
    const filtered = filteredRows().filter(r => !q || [r["Name"],r["Surname"],r["Phone"],r["Agency"],r["Email"],r["Notes"]].some(v => String(v||"").toLowerCase().includes(q)));
    el("#row-count").textContent = `${filtered.length} ${activeStatus==="All"?"total":`in "${activeStatus}"`}`;
    el("#empty").style.display = filtered.length? "none":"block";

    filtered.forEach((r, idx)=>{
      const tr = document.createElement("tr");
      const checked = selected.has(r["UID"]);
      tr.innerHTML = `
        <td><input type="checkbox" ${checked?"checked":""} data-uid="${r["UID"]||""}"></td>
        <td><div><strong>${title(r["Name"]||"")} ${title(r["Surname"]||"")}</strong></div><div class="muted" style="font-size:12px">${(r["Email"]||"").toLowerCase()}</div></td>
        <td>${r["Phone"]||""}</td>
        <td>${r["Agency"]||""}</td>
        <td>
          <select data-uid="${r["UID"]||""}">
            ${getStatuses().filter(s=>s!=="All").map(s=>`<option ${s===(r["Status"]||"")?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>
        <td>${r["Last Contact"]||""}</td>
        <td><textarea data-notes="${r["UID"]||""}" rows="2">${r["Notes"]||""}</textarea></td>
        <td class="actions">
          <button class="btn" data-send="${r["UID"]||""}">WhatsApp</button>
          <a target="_blank" class="btn outline" href="${buildWALink(r["Phone"]||"", el("#msg-body").value, preferDesktop)}">Link</a>
        </td>`;
      el("#rows").appendChild(tr);
    });

    // wires
    els('input[type="checkbox"][data-uid]').forEach(cb => cb.onchange = (e)=>{
      const uid = e.target.getAttribute("data-uid");
      if(e.target.checked) selected.add(uid); else selected.delete(uid);
      el("#sel-count").textContent = `${selected.size} selected`;
    });
    els('select[data-uid]').forEach(sel => sel.onchange = async (e)=>{
      const uid = e.target.getAttribute("data-uid");
      const val = e.target.value;
      await apiPost("patch", { uid, patch: { "Status": val } });
      const i = rows.findIndex(x=>String(x.UID)===String(uid));
      if(i>=0){ rows[i]["Status"] = val; rows[i]["Last Contact"] = todayISO(); }
      renderStatuses(); renderRows();
    });
    els('textarea[data-notes]').forEach(ta => ta.onchange = async (e)=>{
      const uid = e.target.getAttribute("data-notes"); const val = e.target.value;
      await apiPost("patch", { uid, patch: { "Notes": val } });
      const i = rows.findIndex(x=>String(x.UID)===String(uid)); if(i>=0) rows[i]["Notes"] = val;
    });
    els('button[data-send]').forEach(btn => btn.onclick = async (e)=>{
      const uid = e.target.getAttribute("data-send");
      const r = rows.find(x=>String(x.UID)===String(uid)); if(!r) return;
      const type = el("#msg-type").value;
      const body = el("#msg-body").value;
      const preferDesktop = el("#toggle-desktop").checked;
      // ensure Event Type is stored for this send
      await apiPost("patch", { uid, patch: { "Event Type": type } });
      await apiPost("send", { uid, messageType: type, message: body, preferDesktop });
      const url = buildWALink(r["Phone"]||"", body, preferDesktop);
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
      await load();
    });

    el("#sel-count").textContent = `${selected.size} selected`;
  }

  // Message type dropdown from templates.js
  function refreshTemplateDropdown(){
    const sel = el("#msg-type");
    const body = el("#msg-body");
    const keys = Object.keys(window.TEMPLATES||{});
    sel.innerHTML = keys.map(k=>`<option>${k}</option>`).join("") + `<option>Custom</option>`;
    const first = keys[0] || "Custom";
    sel.value = first;
    body.value = window.TEMPLATES[first] || "";
    sel.onchange = ()=>{
      const k = sel.value;
      if(k==="Custom") return;
      body.value = window.TEMPLATES[k] || "";
    };
  }

  // bulk
  el("#btn-send-selected").onclick = async ()=>{
    const ids = Array.from(selected);
    for(const uid of ids){
      const r = rows.find(x=>String(x.UID)===String(uid));
      if(!r) continue;
      const type = el("#msg-type").value;
      const body = el("#msg-body").value;
      await apiPost("patch", { uid, patch: { "Event Type": type } });
      await apiPost("send", { uid, messageType: type, message: body, preferDesktop: el("#toggle-desktop").checked });
      const url = buildWALink(r["Phone"]||"", body, el("#toggle-desktop").checked);
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
      await new Promise(r=>setTimeout(r, 500));
    }
    await load();
  };

  // sync
  el("#btn-sync").onclick = async ()=>{ await apiGet("sync"); await load(); };

  // export
  el("#btn-export").onclick = ()=>{
    const rowsCSV = rows;
    const headers = Object.keys(rowsCSV[0]||{});
    const esc = s => /[",\n]/.test(String(s||"")) ? `"${String(s).replace(/"/g,'""')}"` : String(s||"");
    const csv = [headers.map(esc).join(","), ...rowsCSV.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "explorian_export.csv"; link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href), 3000);
  };

  // search + select all
  el("#search").oninput = ()=> renderRows();
  el("#check-all").onchange = (e)=>{ selected.clear(); if(e.target.checked) filteredRows().forEach(r=>selected.add(r.UID)); renderRows(); };

  // init
  load();
})();