// script.js — full app with AES-GCM vault and modern fields (FR)
(() => {
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const uid = () => 'id_' + Math.random().toString(36).slice(2,9);

  const KEY_A = 'mm_anime_secure_v1';
  const KEY_G = 'mm_game_secure_v1';
  const KEY_V = 'mm_vault_secure_v1';

  // --- Tabs ---
  qsa('.tab').forEach(t=> t.addEventListener('click', ()=>{
    qsa('.tab').forEach(x=>x.classList.remove('active'));
    qsa('.panel').forEach(p=>p.classList.remove('active'));
    t.classList.add('active');
    qs('#' + t.dataset.tab).classList.add('active');
  }));

  // --- Modal ---
  const modal = qs('#modal'), modalBody = qs('#modalBody'), modalClose = qs('#modalClose');
  function openModal(html){ modalBody.innerHTML = html; modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); modalBody.innerHTML=''; }
  modalClose.addEventListener('click', closeModal); modal.addEventListener('click', e=> { if(e.target===modal) closeModal(); });

  // --- Storage helpers ---
  const load = k => JSON.parse(localStorage.getItem(k) || '[]');
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));

  // --- Helpers ---
  function escape(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function placeholder(n){ const t=(n||'ITEM').slice(0,12); return 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#0b1220'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#7b61ff' font-family='Poppins, Arial' font-size='28'>${t}</text></svg>`); }
  async function fileToDataUrl(file){ if(!file) return null; return await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); }); }
  function short(s,n){ if(!s) return ''; return s.length>n? s.slice(0,n-1)+'…': s; }

  // --- ANIMES ---
  const animeGrid = qs('#animeGrid');
  const animeAddBtn = qs('#animeAddBtn') || qs('#animeAddBtn'); // safe
  const animeName = qs('#animeName'), animeDesc = qs('#animeDesc'), animeImageUrl = qs('#animeImageUrl'), animeImageFile = qs('#animeImageFile');
  const animeEpisodes = qs('#animeEpisodes'), animeRating = qs('#animeRating'), animePreview = qs('#animePreview');

  // preview hook
  [animeImageUrl, animeImageFile].forEach(el=>{ if(!el) return; el.addEventListener('input', ()=> previewImage(animeImageFile, animeImageUrl, animePreview)); el.addEventListener('change', ()=> previewImage(animeImageFile, animeImageUrl, animePreview)); });

  async function previewImage(fileInput, urlInput, previewEl){ let src=null; if(urlInput && urlInput.value.trim()) src = urlInput.value.trim(); else if(fileInput && fileInput.files[0]) src = await fileToDataUrl(fileInput.files[0]); if(!src){ previewEl.style.display='none'; previewEl.innerHTML=''; previewEl.setAttribute('aria-hidden','true'); return; } previewEl.style.display='block'; previewEl.setAttribute('aria-hidden','false'); previewEl.innerHTML = `<img src="${src}" style="max-width:120px;border-radius:8px"><div style="margin-top:6px;font-size:12px;color:rgba(234,242,255,0.7)">${escape(short(src,80))}</div>`; }

  // rating widget (click to set)
  function ratingWidget(el, onChange){ el.addEventListener('click', (e)=>{ const rect = el.getBoundingClientRect(); const x = e.clientX - rect.left; const pct = x/rect.width; const stars = Math.ceil(pct*5); el.textContent = '★'.repeat(stars) + '☆'.repeat(5-stars); if(onChange) onChange(stars); }); }
  ratingWidget(animeRating, ()=>{});

  // number control plus/minus
  function wireNumber(ctrlId){ const ctrl = document.getElementById(ctrlId); if(!ctrl) return; const dec = ctrl.querySelector('.dec'), inc = ctrl.querySelector('.inc'), input = ctrl.querySelector('input'); dec.addEventListener('click', ()=> input.value = Math.max(0, Number(input.value||0)-1)); inc.addEventListener('click', ()=> input.value = Number(input.value||0)+1); }
  wireNumber('animeEpisodesCtrl'); wireNumber('gameHoursCtrl');

  // add anime
  qs('#animeAddBtn').addEventListener('click', async ()=>{
    const name = animeName.value.trim(); if(!name) return alert("Donne un nom à l'animé");
    const desc = animeDesc.value.trim(); let image = null;
    if(animeImageUrl.value.trim()) image = animeImageUrl.value.trim(); else if(animeImageFile.files[0]) image = await fileToDataUrl(animeImageFile.files[0]);
    const episodes = Math.max(0, parseInt(animeEpisodes.value||0)); const rating = (animeRating.textContent.match(/★/g) || []).length;
    const items = load(KEY_A); items.unshift({ id: uid(), name, desc, image, episodes, currentEpisode:0, rating, status:'à voir' }); save(KEY_A, items);
    animeName.value=''; animeDesc.value=''; animeImageUrl.value=''; animeImageFile.value=''; animePreview.style.display='none'; animeEpisodes.value=0; animeRating.textContent='☆☆☆☆☆';
    renderAnimes();
  });

  function renderAnimes(){ const items = load(KEY_A); animeGrid.innerHTML=''; items.forEach(it=>{ const card=document.createElement('div'); card.className='card'; const img = it.image || placeholder(it.name); card.innerHTML = `<img src="${img}" alt=""><div class="meta"><h3>${escape(it.name)}</h3><p>${escape(it.desc||'')}</p><div style="display:flex;gap:8px;margin-top:8px"><small>Ép: ${it.currentEpisode||0}/${it.episodes||'?'}</small><small>★ ${it.rating||0}</small></div></div>`; card.addEventListener('click', ()=> openAnimeModal(it.id)); animeGrid.appendChild(card); }); renderAnimeStats(); }

  function openAnimeModal(id){
    const items = load(KEY_A); const it = items.find(x=>x.id===id); if(!it) return;
    const html = `<div style="display:flex;gap:12px"><img src="${it.image||placeholder(it.name)}" style="width:140px;height:140px;object-fit:cover;border-radius:8px"><div style="flex:1"><h2>${escape(it.name)}</h2><p style="margin-top:6px">${escape(it.desc||'')}</p>
      <div style="margin-top:10px"><label>Épisodes totaux: <input id="modalEpisodes" type="number" min="0" value="${it.episodes||0}" style="width:110px;padding:6px;border-radius:8px;border:none;background:rgba(255,255,255,0.02)"></label></div>
      <div style="margin-top:8px"><label>Épisode actuel : <input id="modalCurrent" type="number" min="0" value="${it.currentEpisode||0}" style="width:110px;padding:6px;border-radius:8px;border:none;background:rgba(255,255,255,0.02)"></label></div>
      <div class="controls"><button class="status-btn status-fini" id="markDone">Fini</button><button class="status-btn status-commence" id="markStarted">Commencé</button><button class="status-btn status-a-voir" id="markTodo">À voir</button><div style="flex:1"></div><div id="modalStars" class="rating">${'★'.repeat(it.rating||0)}${'☆'.repeat(5-(it.rating||0))}</div></div>
      <div style="margin-top:10px"><button class="btn" id="saveAnimeBtn">Sauvegarder</button><button class="btn" id="deleteAnimeBtn">Supprimer</button></div>
      </div></div>`;
    openModal(html);

    qs('#markDone').addEventListener('click', ()=>{
      const items = load(KEY_A); const idx = items.findIndex(x=>x.id===id); if(idx<0) return;
      items[idx].status = 'fini';
      items[idx].currentEpisode = Number(qs('#modalEpisodes').value||0);
      save(KEY_A, items); renderAnimes(); closeModal();
    });
    qs('#markStarted').addEventListener('click', ()=>{
      const items = load(KEY_A); const idx = items.findIndex(x=>x.id===id); if(idx<0) return;
      items[idx].status = 'commencé'; save(KEY_A, items); renderAnimes(); closeModal();
    });
    qs('#markTodo').addEventListener('click', ()=>{
      const items = load(KEY_A); const idx = items.findIndex(x=>x.id===id); if(idx<0) return;
      items[idx].status = 'à voir'; save(KEY_A, items); renderAnimes(); closeModal();
    });

    qs('#saveAnimeBtn').addEventListener('click', ()=>{
      const items = load(KEY_A); const idx = items.findIndex(x=>x.id===id); if(idx<0) return;
      items[idx].episodes = Math.max(0, parseInt(qs('#modalEpisodes').value||0));
      items[idx].currentEpisode = Math.max(0, parseInt(qs('#modalCurrent').value||0));
      save(KEY_A, items); renderAnimes(); closeModal();
    });
    qs('#deleteAnimeBtn').addEventListener('click', ()=>{ if(!confirm('Supprimer cet animé ?')) return; let items = load(KEY_A); items = items.filter(x=>x.id!==id); save(KEY_A, items); renderAnimes(); closeModal(); });
  }

  function renderAnimeStats(){ const items = load(KEY_A); const done = items.filter(x=>x.status==='fini').length; const started = items.filter(x=>x.status==='commencé').length; const total = items.length; qs('#animeStats').innerHTML = `<div class="stat">Animés finis: <strong>${done}</strong></div><div class="stat">Animés commencés: <strong>${started}</strong></div><div class="stat">Total animés: <strong>${total}</strong></div>`; }

  // --- GAMES ---
  const gameGrid = qs('#gameGrid');
  const gameName = qs('#gameName'), gameDesc = qs('#gameDesc'), gameImageUrl = qs('#gameImageUrl'), gameImageFile = qs('#gameImageFile');
  const gameHours = qs('#gameHours'), gameRating = qs('#gameRating'), gamePreview = qs('#gamePreview');

  [gameImageUrl, gameImageFile].forEach(el=>{ if(!el) return; el.addEventListener('input', ()=> previewImage(gameImageFile, gameImageUrl, gamePreview)); el.addEventListener('change', ()=> previewImage(gameImageFile, gameImageUrl, gamePreview)); });

  qs('#gameAddBtn').addEventListener('click', async ()=>{
    const name = gameName.value.trim(); if(!name) return alert('Donne un nom au jeu');
    const desc = gameDesc.value.trim(); let image = null;
    if(gameImageUrl.value.trim()) image = gameImageUrl.value.trim(); else if(gameImageFile.files[0]) image = await fileToDataUrl(gameImageFile.files[0]);
    const hours = Math.max(0, parseInt(gameHours.value||0)); const rating = (gameRating.textContent.match(/★/g) || []).length;
    const items = load(KEY_G); items.unshift({ id: uid(), name, desc, image, hours, rating, status:'à faire' }); save(KEY_G, items);
    gameName.value=''; gameDesc.value=''; gameImageUrl.value=''; gameImageFile.value=''; gamePreview.style.display='none'; gameHours.value=0; gameRating.textContent='☆☆☆☆☆';
    renderGames();
  });

  function renderGames(){ const items = load(KEY_G); gameGrid.innerHTML=''; items.forEach(it=>{ const card=document.createElement('div'); card.className='card'; const img = it.image || placeholder(it.name); card.innerHTML = `<img src="${img}" alt=""><div class="meta"><h3>${escape(it.name)}</h3><p>${escape(it.desc||'')}</p><div style="display:flex;gap:8px;margin-top:8px"><small>Heures: ${it.hours||0}</small><small>★ ${it.rating||0}</small></div></div>`; card.addEventListener('click', ()=> openGameModal(it.id)); gameGrid.appendChild(card); }); renderGameStats(); }

  function openGameModal(id){ const items = load(KEY_G); const it = items.find(x=>x.id===id); if(!it) return; const html = `<div style="display:flex;gap:12px"><img src="${it.image||placeholder(it.name)}" style="width:140px;height:140px;object-fit:cover;border-radius:8px"><div style="flex:1"><h2>${escape(it.name)}</h2><p style="margin-top:6px">${escape(it.desc||'')}</p>
      <div style="margin-top:8px"><label>Heures jouées: <input id="modalHours" type="number" min="0" value="${it.hours||0}" style="width:110px;padding:6px;border-radius:8px;border:none;background:rgba(255,255,255,0.02)"></label></div>
      <div class="controls"><button class="status-btn status-fini" id="gDone">Fini</button><button class="status-btn status-commence" id="gStart">Commencé</button><button class="status-btn status-a-voir" id="gTodo">À faire</button><div style="flex:1"></div><div id="gStars" class="rating">${'★'.repeat(it.rating||0)}${'☆'.repeat(5-(it.rating||0))}</div></div>
      <div style="margin-top:10px"><button class="btn" id="saveGameBtn">Sauvegarder</button><button class="btn" id="deleteGameBtn">Supprimer</button></div>
      </div></div>`;
    openModal(html);
    qs('#gDone').addEventListener('click', ()=>{ const items = load(KEY_G); const idx = items.findIndex(x=>x.id===id); if(idx<0) return; items[idx].status='fini'; save(KEY_G, items); renderGames(); closeModal(); });
    qs('#gStart').addEventListener('click', ()=>{ const items = load(KEY_G); const idx = items.findIndex(x=>x.id===id); if(idx<0) return; items[idx].status='commencé'; save(KEY_G, items); renderGames(); closeModal(); });
    qs('#gTodo').addEventListener('click', ()=>{ const items = load(KEY_G); const idx = items.findIndex(x=>x.id===id); if(idx<0) return; items[idx].status='à faire'; save(KEY_G, items); renderGames(); closeModal(); });
    qs('#saveGameBtn').addEventListener('click', ()=>{ const items = load(KEY_G); const idx = items.findIndex(x=>x.id===id); if(idx<0) return; items[idx].hours = Math.max(0, parseInt(qs('#modalHours').value||0)); save(KEY_G, items); renderGames(); closeModal(); });
    qs('#deleteGameBtn').addEventListener('click', ()=>{ if(!confirm('Supprimer ce jeu ?')) return; let items = load(KEY_G); items = items.filter(x=>x.id!==id); save(KEY_G, items); renderGames(); closeModal(); });
  }

  function renderGameStats(){ const items = load(KEY_G); const done = items.filter(x=>x.status==='fini').length; const started = items.filter(x=>x.status==='commencé').length; const total = items.length; qs('#gameStats').innerHTML = `<div class="stat">Jeux finis: <strong>${done}</strong></div><div class="stat">Jeux commencés: <strong>${started}</strong></div><div class="stat">Total jeux: <strong>${total}</strong></div>`; }

  // --- VAULT (AES-GCM) ---
  const codeInputs = qsa('.code-inputs .code'), vaultInitBtn = qs('#vaultInitBtn'), vaultLogoutBtn = qs('#vaultLogoutBtn');
  const vaultArea = qs('#vaultArea'), vaultAddBtn = qs('#vaultAddBtn'), vaultTitle = qs('#vaultTitle'), vaultSecret = qs('#vaultSecret'), vaultList = qs('#vaultList');

  // focus/behavior for 6 digits
  codeInputs.forEach((inp, idx)=>{
    inp.addEventListener('input', ()=>{ inp.value = inp.value.replace(/\D/g,''); if(inp.value && idx < codeInputs.length-1) codeInputs[idx+1].focus(); });
    inp.addEventListener('keydown', e=>{ if(e.key==='Backspace' && !inp.value && idx>0) codeInputs[idx-1].focus(); });
  });

  async function deriveKey(code){
    const enc = new TextEncoder(); const salt = enc.encode('mm_secure_salt_v1');
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(code), {name:'PBKDF2'}, false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations: 150000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }

  function ab2b64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function b642ab(str){ const s = atob(str); const arr = new Uint8Array(s.length); for(let i=0;i<s.length;i++) arr[i]=s.charCodeAt(i); return arr.buffer; }

  async function encrypt(key, obj){ const iv = crypto.getRandomValues(new Uint8Array(12)); const enc = new TextEncoder(); const data = enc.encode(JSON.stringify(obj)); const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data); return { iv: ab2b64(iv), ct: ab2b64(ct) }; }
  async function decrypt(key, payload){ const iv = b642ab(payload.iv); const ct = b642ab(payload.ct); const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct); return JSON.parse(new TextDecoder().decode(pt)); }

  let vaultKey = null; let vaultCache = [];

  async function getCode(){ return codeInputs.map(i=>i.value||'').join(''); }

  vaultInitBtn.addEventListener('click', async ()=>{
    const code = await getCode(); if(!/^\d{6}$/.test(code)) return alert('Saisis un code à 6 chiffres.');
    try{
      vaultKey = await deriveKey(code);
      const raw = localStorage.getItem(KEY_V);
      if(!raw){ // create empty encrypted vault
        vaultCache = []; const payload = await encrypt(vaultKey, vaultCache); localStorage.setItem(KEY_V, JSON.stringify(payload));
      } else {
        const parsed = JSON.parse(raw);
        vaultCache = await decrypt(vaultKey, parsed);
      }
      vaultArea.style.display='block'; vaultLogoutBtn.style.display='inline-block'; vaultInitBtn.style.display='none'; codeInputs.forEach(i=>i.disabled=true);
      renderVault();
    }catch(e){ console.error(e); alert('Code incorrect ou données corrompues.'); }
  });

  vaultLogoutBtn.addEventListener('click', ()=>{
    vaultKey = null; vaultCache = []; vaultArea.style.display='none'; vaultLogoutBtn.style.display='none'; vaultInitBtn.style.display='inline-block'; codeInputs.forEach(i=>{i.disabled=false;i.value=''});
  });

  vaultAddBtn.addEventListener('click', async ()=>{
    if(!vaultKey) return alert("Déverrouille le coffre d'abord");
    const title = vaultTitle.value.trim(); if(!title) return alert('Titre requis'); const secret = vaultSecret.value;
    vaultCache.unshift({ id: uid(), title, secret, created: Date.now() });
    await persistVault(); vaultTitle.value=''; vaultSecret.value=''; renderVault();
  });

  async function persistVault(){ const payload = await encrypt(vaultKey, vaultCache); localStorage.setItem(KEY_V, JSON.stringify(payload)); }

  function renderVault(){
    vaultList.innerHTML='';
    vaultCache.forEach(it=>{
      const d = document.createElement('div'); d.className='vault-item';
      d.innerHTML = `<div style="flex:1"><strong>${escape(it.title)}</strong><div style="font-size:13px;color:rgba(234,242,255,0.7)">${escape(short(it.secret,40))}</div></div><div style="display:flex;gap:8px"><button class="btn" data-id="${it.id}" data-act="view">Voir</button><button class="btn" data-id="${it.id}" data-act="copy">Copier</button><button class="btn" data-id="${it.id}" data-act="del">Suppr</button></div>`;
      vaultList.appendChild(d);
    });
    qsa('.vault-item .btn').forEach(b=> b.addEventListener('click', async (e)=>{
      const id = b.dataset.id, act = b.dataset.act; const item = vaultCache.find(x=>x.id===id); if(!item) return;
      if(act==='view') openModal(`<h3>${escape(item.title)}</h3><pre style="white-space:pre-wrap">${escape(item.secret)}</pre>`);
      else if(act==='copy'){ await navigator.clipboard.writeText(item.secret); alert('Copié dans le presse-papier'); }
      else if(act==='del'){ if(!confirm('Supprimer cet élément ?')) return; vaultCache = vaultCache.filter(x=>x.id!==id); await persistVault(); renderVault(); }
    }));
  }

  // --- Init ---
  renderAnimes(); renderGames();

})();