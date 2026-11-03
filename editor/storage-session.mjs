import {read, equal, replace} from '../spike/storage.mjs';
import {TextCodec} from './text-codec.mjs';

export async function createBrowserStore() {
  const db = await new Promise((resolve,reject) => {
    const request = indexedDB.open('markdown-editor-m1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transact = (mode, action) => new Promise((resolve,reject) => {
    const tx = db.transaction('drafts', mode), request = action(tx.objectStore('drafts'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Entwurf konnte nicht gesichert werden.'));
  });
  return {
    put: (key,value) => transact('readwrite', store => store.put(value,key)),
    get: key => transact('readonly', store => store.get(key)),
    keys: () => transact('readonly', store => store.getAllKeys())
  };
}

export function createSession({store, locks = globalThis.navigator?.locks, id = () => crypto.randomUUID(), now = () => Date.now()} = {}) {
  let document, pending = Promise.resolve(), saving = false;
  const requireDocument = () => { if (!document) throw new Error('Zuerst eine Markdown-Datei laden.'); return document; };
  const assertIdle = () => { if (saving) throw new Error('Speichervorgang läuft.'); };
  async function permission(vault, request = false) {
    let value = await vault.queryPermission({mode:'readwrite'});
    if (value !== 'granted' && request) value = await vault.requestPermission({mode:'readwrite'});
    if (value !== 'granted') throw new Error('Ordnerrechte fehlen. Entwurf bleibt erhalten; Rechte erneut anfordern.');
  }
  function persist() {
    if (!document) return pending;
    const d = document;
    const value = {vault:d.vault, handle:d.handle, path:d.path, base:d.base.slice(), draft:d.codec.bytes(), updated:now()};
    // A failed previous persistence must not poison a later explicit retry.
    pending = pending.catch(() => {}).then(() => store.put(d.key,value));
    return pending;
  }
  async function writeVerified(handle, bytes) {
    const stream = await handle.createWritable();
    try { await stream.write(bytes); await stream.close(); }
    catch (error) { try { await stream.abort(); } catch {} throw error; }
    if (!equal(await read(handle),bytes)) throw new Error('Sicherung nicht bytegleich.');
  }
  async function backup(d, bytes) {
    const folder = await d.vault.getDirectoryHandle('.storage-spike-backups',{create:true});
    const name = `${now()}-${id()}`;
    await writeVerified(await folder.getFileHandle(name + '.bak',{create:true}),bytes);
    const metadata = new TextEncoder().encode(JSON.stringify({version:1,path:d.path,vaultName:d.vault.name,backup:name + '.bak',created:now(),bytes:bytes.length},null,2));
    await writeVerified(await folder.getFileHandle(name + '.json',{create:true}),metadata);
    return name + '.bak';
  }
  return {
    get text() { return document?.codec.text ?? ''; },
    get dirty() { return !!document && !equal(document.base,document.codec.bytes()); },
    get path() { return document?.path ?? ''; },
    get vault() { return document?.vault; },
    get hasDocument() { return !!document; },
    async open({vault,handle,path}) {
      assertIdle(); await persist(); await permission(vault);
      if (!path || path.split('/').some(part => !part || part === '.' || part === '..') || !/\.md$/i.test(path)) throw new Error('Ungültiger Markdown-Pfad.');
      const base = await read(handle), codec = new TextCodec(base);
      const previous = document;
      document = {vault,handle,path,base,codec,key:'draft:' + id()};
      try { await persist(); } catch (error) { document = previous; throw error; }
      return {path,text:codec.text};
    },
    applyChanges(changes) { assertIdle(); requireDocument().codec.applyChanges(changes); },
    persist,
    async grant() { await permission(requireDocument().vault,true); },
    async check() {
      const d = requireDocument(); await permission(d.vault);
      return {conflict:!equal(await read(d.handle),d.base)};
    },
    async save() {
      assertIdle(); const d = requireDocument(); saving = true;
      try {
        await persist(); await permission(d.vault);
        if (!locks) throw new Error('Web Locks fehlt; Speichern blockiert.');
        return await locks.request('storage-spike-write',async () => {
          const draft = d.codec.bytes(); let backupName;
          const result = await replace({handle:d.handle,base:d.base,draft,backup:async bytes => { backupName = await backup(d,bytes); }});
          d.base = draft.slice(); d.codec = new TextCodec(draft);
          await persist();
          return {...result,backupName};
        });
      } finally { saving = false; }
    },
    async listDrafts() {
      await pending.catch(() => {});
      const result = [];
      for (const key of await store.keys()) {
        const d = await store.get(key);
        result.push({key,path:d.path,vaultName:d.vault.name,updated:d.updated});
      }
      return result.sort((a,b) => b.updated-a.updated);
    },
    async recover(key) {
      assertIdle(); await persist(); const d = await store.get(key);
      if (!d) throw new Error('Entwurf nicht gefunden.');
      const codec = new TextCodec(d.draft), previous = document;
      document = {...d,codec,key:'draft:' + id()};
      try { await persist(); } catch (error) { document = previous; throw error; }
      return {path:d.path,text:codec.text};
    }
  };
}
