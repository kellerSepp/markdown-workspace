const encoder = new TextEncoder();
const normalize = text => text.replace(/\r\n|\r/g, '\n');
// Separately existing CR and LF must not merge when an edit removes their separator.
const join = (left, right) => left + (left.endsWith('\r') && right.startsWith('\n') ? '\n' : '') + right;

// The editor sees LF and UTF-16 offsets; untouched source ranges retain their EOLs.
export class TextCodec {
  constructor(bytes) {
    this.original = bytes.slice();
    this.bom = bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
    this.raw = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes.subarray(this.bom ? 3 : 0));
    this.originalRaw = this.raw;
    this.originalText = normalize(this.raw);
    this.eol = this.raw.match(/\r\n|\r|\n/)?.[0] ?? '\n';
  }
  get text() { return normalize(this.raw); }
  bytes() {
    if (this.text === this.originalText) return this.original.slice();
    return encoder.encode((this.bom ? '\ufeff' : '') + this.raw);
  }
  applyChanges(changes) {
    const offsets = [0];
    for (let i = 0; i < this.raw.length;) {
      i += this.raw[i] === '\r' && this.raw[i + 1] === '\n' ? 2 : 1;
      offsets.push(i);
    }
    const sorted = [...changes].sort((a,b) => a.from - b.from);
    let end = 0;
    for (const change of sorted) {
      if (!Number.isInteger(change.from) || !Number.isInteger(change.to) || change.from < end || change.to < change.from || change.to >= offsets.length || typeof change.insert !== 'string') throw new Error('Ungültige Editoränderung.');
      end = change.to;
      // Reject lone surrogates rather than silently replacing data during UTF-8 encoding.
      if (!change.insert.isWellFormed()) throw new Error('Ungültige Unicode-Eingabe.');
    }
    let next = this.raw;
    for (const {from,to,insert} of sorted.reverse()) next = join(join(next.slice(0, offsets[from]), normalize(insert).replace(/\n/g, this.eol)), next.slice(offsets[to]));
    if (!next.isWellFormed()) throw new Error('Änderung trennt ein Unicode-Zeichen.');
    this.raw = normalize(next) === this.originalText ? this.originalRaw : next;
  }
}
