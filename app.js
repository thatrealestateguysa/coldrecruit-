(function(){
  const BACKEND = window.BACKEND_URL;
  const STATUS_OPTIONS = [
    "To Contact","Whatsapp","Reply","Keen to meet","Cultivate","Invite to events",
    "Not interested","No Whatsapp","Unsubscribe","Referred","Event Invite Sent","Event Invite Accepted"
  ];
  let rows = [];
  let activeStatus = "To Contact";
  let selected = new Set();

  const el = (q) => document.querySelector(q);
  const els = (q) => Array.from(document.querySelectorAll(q));

  function title(s){ return (s||"").toLowerCase().replace(/(^|\\s)([a-z])/g,(_,a,b)=>a+b.toUpperCase()); }
  function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function sanitizePhone(n){
    if(!n) return "";
    return String(n).replace(/\\D/g,"");
  }
  function buildWALink(phone, message, preferDesktop){
    const cc = "27"; // default for format help; backend stores links, we open locally too
    let digits = sanitizePhone(phone);
    if(digits && !digits.startsWith(cc)){ if(digits.startsWith("0")) digits = digits.slice(1); digits = cc + digits; }
    if(preferDesktop) return `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`;
    return `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
  }
  function composeMessage(type, body, r){
    const first = title((r["Name"]||"").split(" ")[0] || r["Surname"] || "");
    let t = (type==="Custom" ? body : (window.TEMPLATES[type]||""));
    if(type!=="Custom"){ el("#msg-body").value = t; }
    return (type==="Custom" ? body : t).replaceAll("[Name]", first);
  }

  async function apiGet(action){
    const res = await fetch(`${BACKEND}?action=${encodeURIComponent(action)}`);
    return await res.json();
  }
  async function apiPost(action, payload){
    // text/plain to avoid preflight on Apps Script
    const res = await fetch(`${BACKEND}?action=${encodeURIComponent(action)}`, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload||{})
    });
    return await res.json();
  }

  async function load(){
    const data = await apiGet("rows");
    rows = data.rows || [];
    // ensure Last Contact field presence
    renderStatuses();
    renderRows();
  }

  function renderStatuses(){
    const counts = Object.fromEntries(STATUS_OPTIONS.map(s=>[s,0]));
    rows.forEach(r=>{ counts[r["Status"]] = (counts[r["Status"]]||0)+1; });
    const box = el("#status-list");
    box.innerHTML = "";
    STATUS_OPTIONS.forEach(s=>{
      const div = document.createElement("button");
      div.className = "status" + (s===activeStatus? " active": "");
      div.innerHTML = `<span class="name">${s}</span><span class="count">${counts[s]||0}</span>`;
      div.onclick = ()=>{ activeStatus = s; selected.clear(); renderStatuses(); renderRows(); };
      box.appendChild(div);
    });
  }

  function renderRows(){
    const body = el("#rows");
    body.innerHTML = "";
    const q = el("#search").value.toLowerCase().trim();
    const preferDesktop = el("#toggle-desktop").checked;
    const filtered = rows.filter(r => (r["Status"]||"")===activeStatus)
      .filter(r => !q || [r["Name"],r["Surname"],r["Phone"],r["Agency"],r["Email"],r["Notes"]].some(v => String(v||"").toLowerCase().includes(q)));
    el("#row-count").textContent = `${filtered.length} in "${activeStatus}"`;
    el("#empty").style.display = filtered.length? "none":"block";

    filtered.forEach((r, idx) => {
      const tr = document.createElement("tr");
      const checked = selected.has(r["UID"]);
      tr.innerHTML = `
        <td><input type="checkbox" ${checked?"checked":""} data-uid="${r["UID"]||""}"></td>
        <td><div><strong>${title(r["Name"]||"")} ${title(r["Surname"]||"")}</strong></div>
            <div class="muted" style="font-family:var(--mono);font-size:12px">${(r["Email"]||"").toLowerCase()}</div></td>
        <td>${r["Phone"]||""}</td>
        <td>${r["Agency"]||""}</td>
        <td>
          <select data-uid="${r["UID"]||""}">
            ${STATUS_OPTIONS.map(s=>`<option ${s===(r["Status"]||"")?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>
        <td>${r["Last Contact"]||""}</td>
        <td><textarea data-notes="${r["UID"]||""}" rows="2">${r["Notes"]||""}</textarea></td>
        <td class="actions">
          <button class="btn" data-send="${r["UID"]||""}">WhatsApp</button>
          <a target="_blank" class="btn outline" href="${buildWALink(r["Phone"]||"", composeMessage(el("#msg-type").value, el("#msg-body").value, r), preferDesktop)}">Link</a>
        </td>`;
      body.appendChild(tr);
    });

    // wire checkboxes
    els('input[type="checkbox"][data-uid]').forEach(cb => {
      cb.onchange = (e)=>{
        const uid = e.target.getAttribute("data-uid");
        if(e.target.checked) selected.add(uid); else selected.delete(uid);
        el("#sel-count").textContent = `${selected.size} selected`;
      };
    });
    // wire selects
    els('select[data-uid]').forEach(sel => {
      sel.onchange = async (e)=>{
        const uid = e.target.getAttribute("data-uid");
        const newStatus = e.target.value;
        await apiPost("patch", { uid, patch: { "Status": newStatus } });
        // update local copy and rerender
        const idx = rows.findIndex(x=>String(x["UID"])===String(uid));
        if(idx>=0){ rows[idx]["Status"] = newStatus; rows[idx]["Last Contact"] = todayISO(); }
        renderStatuses(); renderRows();
      };
    });
    // wire notes
    els('textarea[data-notes]').forEach(ta => {
      ta.onchange = async (e)=>{
        const uid = e.target.getAttribute("data-notes");
        const val = e.target.value;
        await apiPost("patch", { uid, patch: { "Notes": val } });
        const idx = rows.findIndex(x=>String(x["UID"])===String(uid));
        if(idx>=0) rows[idx]["Notes"] = val;
      };
    });
    // wire send buttons
    els('button[data-send]').forEach(btn => {
      btn.onclick = async (e)=>{
        const uid = e.target.getAttribute("data-send");
        const r = rows.find(x=>String(x["UID"])===String(uid));
        if(!r) return;
        const type = el("#msg-type").value;
        const body = el("#msg-body").value;
        const msg = composeMessage(type, body, r);
        const preferDesktop = el("#toggle-desktop").checked;
        // call backend so it logs history + updates status/last contact/whatsapp link
        await apiPost("send", { uid, messageType: type, message: msg, preferDesktop: preferDesktop });
        // open the desktop link locally for immediate sending
        const url = buildWALink(r["Phone"]||"", msg, preferDesktop);
        const a = document.createElement("a"); a.href = url; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
        // refresh rows
        await load();
      };
    });

    // update toolbar
    el("#sel-count").textContent = `${selected.size} selected`;
  }

  // bulk send
  el("#btn-send-selected").onclick = async ()=>{
    const ids = Array.from(selected);
    for(const uid of ids){
      const r = rows.find(x=>String(x["UID"])===String(uid));
      if(!r) continue;
      const type = el("#msg-type").value;
      const body = el("#msg-body").value;
      const msg = composeMessage(type, body, r);
      const preferDesktop = el("#toggle-desktop").checked;
      await apiPost("send", { uid, messageType: type, message: msg, preferDesktop });
      const url = buildWALink(r["Phone"]||"", msg, preferDesktop);
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
      await new Promise(r=>setTimeout(r, 500));
    }
    await load();
  };

  // sync
  el("#btn-sync").onclick = async ()=>{
    el("#btn-sync").disabled = true;
    await apiGet("sync");
    await load();
    el("#btn-sync").disabled = false;
  };

  // search
  el("#search").oninput = ()=> renderRows();
  // select all
  el("#check-all").onchange = (e)=>{
    selected.clear();
    if(e.target.checked) rows.filter(r=>(r["Status"]||"")===activeStatus).forEach(r => selected.add(r["UID"]));
    renderRows();
  };

  // template handling
  function refreshTemplate(){
    const sel = document.getElementById("msg-type");
    const area = document.getElementById("msg-body");
    const t = sel.value;
    if(t==="Custom") return; // keep user text
    area.value = window.TEMPLATES[t] || "";
  }
  document.getElementById("msg-type").onchange = refreshTemplate;
  refreshTemplate();

  // initial load
  load();
})();