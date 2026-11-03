import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TextCodec} from './text-codec.mjs';
const bytes = text => new TextEncoder().encode(text);
test('Unverändert: BOM, gemischte EOL, YAML und unbekannte Felder bleiben exakt', () => {
  const original = bytes('\ufeff---\r\nunknown: "ä:ß"\n---\rText\r\n');
  const codec = new TextCodec(original);
  assert.equal(codec.text,'---\nunknown: "ä:ß"\n---\nText\n');
  assert.deepEqual(codec.bytes(),original);
});
test('Echte Textänderung erhält unberührte gemischte EOL und YAML', () => {
  const codec = new TextCodec(bytes('\ufeff---\r\nunknown: [ä, ß]\n---\r# Alt\r\n'));
  const from = codec.text.indexOf('Alt');
  codec.applyChanges([{from,to:from+3,insert:'Neu'}]);
  assert.deepEqual(codec.bytes(),bytes('\ufeff---\r\nunknown: [ä, ß]\n---\r# Neu\r\n'));
});
test('Mehrere CM-Änderungen verwenden alte UTF16-Positionen; neue EOL nach Originalstil', () => {
  const codec = new TextCodec(bytes('😀A\r\nB\nC'));
  codec.applyChanges([{from:2,to:3,insert:'Ä'},{from:6,to:7,insert:'ß\nD'}]);
  assert.deepEqual(codec.bytes(),bytes('😀Ä\r\nB\nß\r\nD'));
});
test('Rückgängig zur Ladefassung stellt auch gelöschte originale EOL wieder her', () => {
  const original = bytes('A\r\nB\nC\rD'); const codec = new TextCodec(original);
  codec.applyChanges([{from:0,to:codec.text.length,insert:'anders'}]);
  codec.applyChanges([{from:0,to:6,insert:'A\nB\nC\nD'}]);
  assert.deepEqual(codec.bytes(),original);
});
test('Ungültiges UTF8 und getrennte Surrogatpaare werden blockiert', () => {
  assert.throws(() => new TextCodec(new Uint8Array([0xff])));
  const codec = new TextCodec(bytes('😀'));
  assert.throws(() => codec.applyChanges([{from:0,to:1,insert:''}]),/Unicode/);
  assert.equal(codec.text,'😀');
});

test('Durch Bearbeitung benachbarte CR und LF bleiben zwei logische Zeilen', () => {
  for (const [source,change,expected] of [
    ['A\rX\nB',{from:2,to:3,insert:''},'A\n\nB'],
    ['A\rB',{from:2,to:2,insert:'\n'},'A\n\nB'],
    ['A\rX\nB',{from:2,to:3,insert:'\n'},'A\n\n\nB']
  ]) {
    const codec = new TextCodec(bytes(source));
    codec.applyChanges([change]);
    assert.equal(codec.text,expected);
    assert.equal(new TextDecoder().decode(codec.bytes()).replace(/\r\n|\r/g,'\n'),expected);
  }
});
