import {read, equal, appendMarker, replace} from './storage.mjs';
const $ = id => document.getElementById(id);
let vault, handle, base, draft, path, vaultId, draftKey, busy = false;
const db = await new Promise((resolve, reject) => {
  const r = indexedDB.open('storage-spike-v1', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('state');
  r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
});
function tx(mode, action) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('state', mode), request = action(t.objectStore('state'));
    t.oncomplete = () => resolve(request?.result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  });
}
const put = (key, value) => tx('readwrite', s => s.put(value, key));
const get = key => tx('readonly', s => s.get(key));
function log(message) { $('status').textContent = message; $('log').textContent += `${new Date().toISOString()} ${message}\n`; }
function preview(current) {
  const show = b => b ? `${b.length} Bytes\n${new TextDecoder().decode(b)}` : '—';
  $('preview').textContent = `Ladefassung:\n${show(base)}\n\nEntwurf:\n${show(draft)}\n\nAktuelle Datei:\n${show(current)}`;
}
async function persist() {
  if (handle && draft) await put(draftKey, {vault, vaultId, handle, path, base, draft, updated: Date.now()});
}
async function permission(request = false) {
  if (!vault) throw new Error('Zuerst Test-Vault wählen.');
  let p = await vault.queryPermission({mode:'readwrite'});
  if (p !== 'granted' && request) p = await vault.requestPermission({mode:'readwrite'});
  if (p !== 'granted') throw new Error(`Rechte: ${p}. Entwurf bleibt erhalten; Rechte per Knopf anfordern.`);
}
async function scan() {
  await permission(); $('files').replaceChildren();
  async function walk(dir, prefix = '') {
    for await (const [name, h] of dir.entries()) {
      if (name === '.storage-spike-backups') continue;
      if (h.kind === 'directory') await walk(h, prefix + name + '/');
      else if (/\.md$/i.test(name)) $('files').add(new Option(prefix + name, prefix + name));
    }
  }
  await walk(vault); log('Dateiliste gelesen.');
}
async function resolvePath(p) {
  const parts = p.split('/'); let dir = vault;
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
  return dir.getFileHandle(parts.at(-1));
}
async function backup(bytes) {
  const dir = await vault.getDirectoryHandle('.storage-spike-backups', {create:true});
  const name = `${Date.now()}-${crypto.randomUUID()}.bak`;
  const h = await dir.getFileHandle(name, {create:true});
  const w = await h.createWritable();
  try { await w.write(bytes); await w.close(); } catch (e) { try {await w.abort();} catch {} throw e; }
  if (!equal(await read(h), bytes)) throw new Error('Sicherung nicht bytegleich.');
  log(`Verifizierte Sicherung für ${path}: ${name}`);
}
function bind(id, fn) {
  $(id).onclick = async () => {
    if (busy) return;
    busy = true;
    try { await fn(); } catch (e) { log(`${e.name}: ${e.message}`); if (handle) {try {preview(await read(handle));} catch {preview();}} }
    finally { busy = false; }
  };
}
bind('choose', async () => {
  await persist();
  const selected = await showDirectoryPicker({mode:'readwrite'});
  vault = selected; vaultId = crypto.randomUUID(); handle = base = draft = path = null;
  await put('lastVault', {vault, vaultId}); preview(); await scan();
});
bind('grant', async () => {await permission(true); log('Rechte erteilt.');});
bind('scan', scan);
bind('open', async () => {
  await persist(); await permission();
  const p = $('files').value; if (!p) throw new Error('Markdown-Datei auswählen.');
  const h = await resolvePath(p), bytes = await read(h);
  handle = h; path = p; base = bytes; draft = bytes.slice(); draftKey = 'draft:' + crypto.randomUUID();
  await persist(); preview(bytes); log(`${path} geladen; ${bytes.length} Bytes.`);
});
bind('change', async () => {if (!draft) throw new Error('Datei laden.'); draft = appendMarker(draft); await persist(); preview(); log('Marker im Browser-Entwurf gesichert.');});
bind('check', async () => {await permission(); if (!handle) return; const c = await read(handle); preview(c); log(equal(c, base) ? 'Datei unverändert; Rechte gültig.' : 'Konflikt erkannt; Entwurf bleibt erhalten.');});
bind('save', async () => {
  await permission(); if (!handle) throw new Error('Datei laden.');
  await persist();
  if (!navigator.locks) throw new Error('Web Locks fehlt; Speichern blockiert.');
  const start = performance.now();
  await navigator.locks.request('storage-spike-write', async () => {
    const result = await replace({handle, base, draft, backup, fault: $('fault').value,
      between: async () => {
        if ($('fault').value !== 'race') return;
        log('Rennfenster offen: Datei jetzt extern ändern, dann fortsetzen. Überschreibung möglich!');
        await new Promise(resolve => { $('continue').disabled = false; $('continue').onclick = () => { $('continue').disabled = true; resolve(); }; });
      }});
    base = draft.slice(); await persist(); preview(await read(handle));
    log(`${result.unchanged ? 'Bytegleich; kein Schreibzugriff' : 'close abgeschlossen und Bytes verifiziert'}; ${(performance.now()-start).toFixed(1)} ms.`);
  });
});
bind('recover', async () => {
  const keys = await tx('readonly', s => s.getAllKeys()); $('drafts').replaceChildren();
  for (const key of keys.filter(k => String(k).startsWith('draft:'))) {
    const d = await get(key); $('drafts').add(new Option(`${d.vault.name}/${d.path} – ${new Date(d.updated).toLocaleString()}`, key));
  }
  log('Entwürfe aufgelistet; jeder Ladevorgang besitzt eine eigene ID, auch in anderen Tabs.');
});
bind('loadDraft', async () => {
  const key = $('drafts').value, d = await get(key); if (!d) throw new Error('Entwurf wählen.');
  await persist(); ({vault, vaultId, handle, path, base, draft} = d);
  // Fork recovered drafts: another tab may still own the original record.
  draftKey = 'draft:' + crypto.randomUUID(); await persist();
  preview(); log('Entwurf geladen. Rechte prüfen/anfordern; aktuelle Datei wird vor Speichern verglichen.');
});
bind('listBackups', async () => {
  await permission(); $('backups').replaceChildren();
  const dir = await vault.getDirectoryHandle('.storage-spike-backups');
  for await (const [name] of dir.entries()) if (name.endsWith('.bak')) $('backups').add(new Option(name, name));
  log('Sicherungen sind Rohbytes; Zuordnung im Protokoll prüfen.');
});
bind('restore', async () => {
  await permission(); if (!handle) throw new Error('Zieldatei zuerst laden.');
  const dir = await vault.getDirectoryHandle('.storage-spike-backups');
  const bytes = await read(await dir.getFileHandle($('backups').value));
  await persist(); base = await read(handle); draft = bytes; draftKey = 'draft:' + crypto.randomUUID();
  await persist(); preview(base); log('Sicherung als Entwurf geladen. Explizites Speichern sichert auch den jetzigen Dateistand.');
});
window.addEventListener('focus', () => {if (!busy && handle) $('check').click();});
window.addEventListener('beforeunload', e => {if (busy) {e.preventDefault(); e.returnValue = '';}});
const last = await get('lastVault'); if (last) {({vault, vaultId} = last); log('Vault-Handle wiedergefunden. Rechte prüfen; Entwürfe auflisten.');}
log(`Origin ${location.origin}; ${navigator.userAgent}; File System Access ${!!window.showDirectoryPicker}`);
