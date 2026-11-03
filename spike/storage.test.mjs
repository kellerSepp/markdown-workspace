import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {equal, appendMarker, replace} from './storage.mjs';
const bytes = s => new TextEncoder().encode(s);
function mock(initial) {
  let disk = initial.slice(), writes = 0;
  return {
    get disk() {return disk;}, get writes() {return writes;}, external(b) {disk = b.slice();},
    async getFile() {const snapshot = disk.slice(); return {arrayBuffer: async () => snapshot.buffer};},
    async createWritable() {
      writes++; let pending;
      return {async write(b) {pending = b.slice();}, async close() {disk = pending;}, async abort() {}};
    }
  };
}
test('Unverändert: UTF-8 BOM, unbekannte Metadaten, LF/CRLF/mixed bleiben bytegleich ohne Stream', async () => {
  for (const eol of ['\n','\r\n','\r']) {
    const base = bytes('\ufeff---' + eol + 'unknown: "ä:ß"' + eol + '---\r\n# Test\n');
    const h = mock(base);
    assert.deepEqual(await replace({handle:h, base, draft:base.slice(), backup:()=>assert.fail()}), {unchanged:true});
    assert.equal(h.writes, 0); assert.ok(equal(h.disk, base));
  }
});
test('Änderung bewahrt vollständiges Originalpräfix; Backup vor Schreiben und Readback', async () => {
  const base = bytes('---\r\nunknown: [ä, ß]\n---\r\nText'), draft = appendMarker(base), h = mock(base);
  let backed = false;
  await replace({handle:h, base, draft, backup:async b=>{assert.ok(equal(b,base));assert.equal(h.writes,0);backed=true;}});
  assert.ok(backed); assert.ok(equal(h.disk,draft)); assert.ok(equal(draft.slice(0,base.length),base));
});
test('Externe Änderung blockiert und erhält beide Fassungen', async () => {
  const base=bytes('alt'), h=mock(bytes('extern')), draft=appendMarker(base);
  await assert.rejects(replace({handle:h,base,draft,backup:()=>assert.fail()}), /Konflikt/);
  assert.equal(h.writes,0);assert.ok(equal(h.disk,bytes('extern')));assert.ok(equal(draft,appendMarker(base)));
});
test('Fehlgeschlagene Sicherung blockiert Zielstream', async () => {
  const base=bytes('alt'),h=mock(base);
  await assert.rejects(replace({handle:h,base,draft:appendMarker(base),backup:async()=>{throw Error('backup');}}),/backup/);
  assert.equal(h.writes,0);
});
test('Änderung während Sicherung wird erkannt', async () => {
  const base=bytes('alt'),h=mock(base);
  await assert.rejects(replace({handle:h,base,draft:appendMarker(base),backup:async()=>h.external(bytes('extern'))}),/Konflikt/);
  assert.equal(h.writes,0);
});
for (const fault of ['write','abort']) test(`Fehler ${fault}: kein Erfolg, Entwurf und Ausgangsdatei erhalten (Mock)`, async () => {
  const base=bytes('alt'),h=mock(base),draft=appendMarker(base);
  await assert.rejects(replace({handle:h,base,draft,backup:async()=>{},fault}), /Simulierter/);
  assert.ok(equal(h.disk,base));assert.ok(equal(draft,appendMarker(base)));
});
test('Restfenster nach letzter Prüfung reproduziert Verlust der externen Zwischenfassung', async () => {
  const base=bytes('alt'),h=mock(base),draft=appendMarker(base);let backup;
  await replace({handle:h,base,draft,backup:async b=>{backup=b.slice();},between:async()=>h.external(bytes('extern'))});
  assert.ok(equal(h.disk,draft));assert.ok(equal(backup,base));assert.ok(!equal(backup,bytes('extern')));
});
test('Sicherung über denselben geprüften Schreibpfad wiederherstellbar (Mock)', async () => {
  const original=bytes('Original\r\n'),h=mock(original),changed=appendMarker(original);let backup;
  await replace({handle:h,base:original,draft:changed,backup:async b=>{backup=b.slice();}});
  await replace({handle:h,base:changed,draft:backup,backup:async b=>assert.ok(equal(b,changed))});
  assert.ok(equal(h.disk,original));
});
test('Rechteverlust und Readback-Abweichung melden Fehler', async () => {
  const base=bytes('alt'),h=mock(base);
  h.createWritable=async()=>{throw Error('NotAllowedError');};
  await assert.rejects(replace({handle:h,base,draft:appendMarker(base),backup:async()=>{}}),/NotAllowed/);
  const wrong=mock(base);wrong.createWritable=async()=>({write:async()=>{},close:async()=>{},abort:async()=>{}});
  await assert.rejects(replace({handle:wrong,base,draft:appendMarker(base),backup:async()=>{}}),/Verifikation/);
});
test('Synthetische Fixtures besitzen erwartete Zeilenenden und BOM', async () => {
  const root=new URL('../test-vault/',import.meta.url);
  assert.ok((await readFile(new URL('vault-a/mixed.md',root))).includes(Buffer.from('\r\n')));
  assert.deepEqual([...((await readFile(new URL('vault-b/bom.md',root))).subarray(0,3))],[239,187,191]);
});
