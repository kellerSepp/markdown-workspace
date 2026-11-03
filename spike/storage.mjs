export const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export function appendMarker(bytes) {
  // No decoding, newline normalization or metadata parsing.
  const suffix = new TextEncoder().encode('\n<!-- Storage-Spike: ÄÖÜ -->');
  const result = new Uint8Array(bytes.length + suffix.length);
  result.set(bytes); result.set(suffix, bytes.length);
  return result;
}
export async function read(handle) {
  return new Uint8Array(await (await handle.getFile()).arrayBuffer());
}
export async function replace({handle, base, draft, backup, fault = '', between = async () => {}}) {
  const current = await read(handle);
  if (!equal(current, base)) throw new Error('Konflikt: aktuelle Datei weicht von der Ladefassung ab.');
  if (equal(base, draft)) return {unchanged: true};
  await backup(current); // Must be durable and verified before opening the target stream.
  if (!equal(await read(handle), base)) throw new Error('Konflikt nach Sicherung.');
  await between(); // Deliberate race injection, also illustrates the unavoidable OS race.
  let stream;
  try {
    stream = await handle.createWritable();
    await stream.write(draft);
    if (fault === 'write') throw new Error('Simulierter Schreibfehler vor close.');
    if (fault === 'abort') { await stream.abort(); stream = null; throw new Error('Simulierter Abbruch.'); }
    await stream.close(); stream = null;
  } catch (error) {
    if (stream) { try { await stream.abort(); } catch {} }
    throw error;
  }
  if (!equal(await read(handle), draft)) throw new Error('Verifikation fehlgeschlagen; Sicherung prüfen.');
  return {unchanged: false};
}
