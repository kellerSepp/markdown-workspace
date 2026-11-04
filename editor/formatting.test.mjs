import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,syntaxTree,codeFolding} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {planFormat,runFormat} from './formatting.mjs';
import {TextCodec} from './text-codec.mjs';

function harness(doc,from,to,{backward=false,readOnly=false,codec}={}) {
  let state=EditorState.create({doc,selection:backward?{anchor:to,head:from}:{anchor:from,head:to},extensions:[markdown({base:markdownLanguage}),history(),codeFolding(),EditorState.readOnly.of(readOnly)]});
  assert.ok(ensureSyntaxTree(state,doc.length,1000));
  return {get state(){return state;},dispatch(spec){const tr=state.update(spec);if(codec){const edits=[];tr.changes.iterChanges((from,to,a,b,insert)=>edits.push({from,to,insert:insert.toString()}));codec.applyChanges(edits);}state=tr.state;}};
}
function roundtrip(kind,source,expected,options={}) {
  const prefix='Außen ',suffix=' Ende',view=harness(prefix+source+suffix,prefix.length,prefix.length+source.length,options),original=view.state.doc.toString();
  assert.ok(runFormat(view,kind));assert.equal(view.state.doc.toString(),prefix+expected+suffix);assert.equal(undoDepth(view.state),1);
  assert.equal(view.state.selection.main.anchor>view.state.selection.main.head,!!options.backward);
  assert.ok(undo(view));assert.equal(view.state.doc.toString(),original);
  assert.ok(redo(view));assert.equal(view.state.doc.toString(),prefix+expected+suffix);
  assert.ok(runFormat(view,kind));assert.equal(view.state.doc.toString(),original);
  return view;
}
test('Fünf Formatierungen togglen Unicode-Auswahl, erhalten Außenbereiche und isolieren Undo/Redo',()=>{
  for(const [kind,expected] of [['bold','**Ä😀ß**'],['italic','*Ä😀ß*'],['underline','<u>Ä😀ß</u>'],['strike','~~Ä😀ß~~'],['code','`Ä😀ß`']]) {
    roundtrip(kind,'Ä😀ß',expected);roundtrip(kind,'Ä😀ß',expected,{backward:true});
  }
});
test('Volle Wrapper- und Inhaltsauswahl entfernen erkannte Formatierung',()=>{
  for(const [kind,doc,from,to] of [['bold','**Text**',2,6],['italic','*Text*',1,5],['italic','_Text_',1,5],['underline','<u>Text</u>',3,7],['strike','~~Text~~',2,6],['code','`Text`',1,5]]) {
    for(const [a,b] of [[from,to],[0,doc.length]]) {const view=harness(doc,a,b);assert.ok(runFormat(view,kind));assert.equal(view.state.doc.toString(),'Text');}
  }
});
test('Underline bewahrt Unterstrich-Kursiv; gegensätzliche Emphasis kann gezielt geschachtelt werden',()=>{
  roundtrip('underline','_Text_','<u>_Text_</u>');
  roundtrip('italic','**Text**','***Text***');
  roundtrip('bold','*Text*','***Text***');
});
test('Rand-Leerzeichen bleiben außerhalb von Emphasis-Markern unverändert',()=>{
  const view=harness('Vor  Text  Nach',4,10);assert.ok(runFormat(view,'bold'));
  assert.equal(view.state.doc.toString(),'Vor  **Text**  Nach');assert.equal(view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to),'Text');
});
test('Inline-Code verwendet sichere Delimiter und erhält Backticks und Randspaces im Roundtrip',()=>{
  for(const payload of ['a`b',' Text ','   ','``','` a` ']) {
    const view=harness('Vor '+payload+' Nach',4,4+payload.length);assert.ok(runFormat(view,'code'));
    const code=syntaxTree(view.state).resolveInner(view.state.selection.main.from,1);
    assert.ok(code.name==='InlineCode'||code.parent?.name==='InlineCode');
    assert.ok(runFormat(view,'code'));assert.equal(view.state.doc.toString(),'Vor '+payload+' Nach');
  }
});
test('Underline trennt benachbarte Wrapper korrekt und entfernt nur ein passendes äußeres Paar',()=>{
  const separate='<u>a</u> b <u>c</u>',view=harness(separate,0,separate.length);
  assert.ok(runFormat(view,'underline'));assert.equal(view.state.doc.toString(),'<u>'+separate+'</u>');
  assert.ok(runFormat(view,'underline'));assert.equal(view.state.doc.toString(),separate);
  const nested='<u>a<u>b</u>c</u>',inner=harness(nested,0,nested.length);
  assert.ok(runFormat(inner,'underline'));assert.equal(inner.state.doc.toString(),'a<u>b</u>c');
});
test('Teilmarker, partielle Formatierung, Code, Frontmatter und ungültige Auswahl werden unverändert verweigert',()=>{
  const cases=[['**Text**',2,5,'bold'],['**Text**',0,1,'italic'],['`**Text**`',3,7,'bold'],['```md\nText\n```',6,10,'bold'],['Vor\n\n```\nCode\n```\nNach',0,19,'italic'],['---\nx: text\n---\nBody',7,11,'bold'],['Line1\nLine2',0,11,'code'],['Text',0,0,'bold'],['   ',0,3,'italic'],['Text',0,4,'__proto__']];
  for(const [doc,from,to,kind] of cases) {const view=harness(doc,from,to);assert.ok(planFormat(view.state,kind).message,JSON.stringify([doc,from,to,kind]));assert.equal(view.state.doc.toString(),doc);assert.equal(undoDepth(view.state),0);}
  assert.ok(planFormat(harness('Text',0,4,{readOnly:true}).state,'bold').message);
});
test('Jeder Formatierungsbefehl ist eine getrennte Undo-Einheit',()=>{
  const view=harness('Text',0,4);assert.ok(runFormat(view,'bold'));assert.ok(runFormat(view,'italic'));assert.equal(undoDepth(view.state),2);
  assert.ok(undo(view));assert.equal(view.state.doc.toString(),'**Text**');assert.ok(undo(view));assert.equal(view.state.doc.toString(),'Text');
});
test('Partielle Struktur-/Link-/Escape-/Entity-Syntax und Tabellenzellengrenzen bleiben geschützt',()=>{
  for(const [doc,from,to] of [['# Heading',0,1],['# Heading',0,9],['- Item',0,1],['> Quote',0,1],['[a](b)',0,1],['[a](b)',3,4],['[a](url)',4,7],['\\*x*',0,1],['&amp;',0,1],['&copy;',1,5],['| a | b |\n| --- | --- |\n| c | d |',2,7]]) {
    for(const kind of ['bold','italic','underline','strike','code']) {
      const view=harness(doc,from,to);assert.ok(planFormat(view.state,kind).message,JSON.stringify([doc,from,to,kind]));assert.equal(view.state.doc.toString(),doc);
    }
  }
  const link=harness('[Label](url)',1,6);assert.ok(runFormat(link,'bold'));assert.equal(link.state.doc.toString(),'[**Label**](url)');
  const table='| a | b |\n| --- | --- |\n| c | d |',cell=harness(table,2,3);assert.ok(runFormat(cell,'italic'));assert.equal(cell.state.doc.toString(),table.replace(' a ',' *a* '));
});
test('Redo stellt auch bei Randspaces und geschachtelter Emphasis die genaue Contentauswahl her',()=>{
  for(const [doc,from,to,kind] of [['vor  a  nach',4,7,'bold'],['vor  a  nach',4,7,'underline'],['**Text**',2,6,'italic'],['*Text*',0,6,'bold']]) {
    const view=harness(doc,from,to);assert.ok(runFormat(view,kind));const selection=view.state.selection.toJSON();
    assert.ok(undo(view));assert.ok(redo(view));assert.deepEqual(view.state.selection.toJSON(),selection);
    assert.ok(runFormat(view,kind));assert.equal(view.state.doc.toString(),doc);
  }
});
test('Unveränderter Codec erhält gemischte EOL/BOM außen und Originalbytes nach Undo',()=>{
  const raw='\ufeff---\r\nunknown: "ä"\n---\r\nText\nEnde\r';
  const bytes=new TextEncoder().encode(raw),codec=new TextCodec(bytes),from=codec.text.indexOf('Text');
  const view=harness(codec.text,from,from+4,{codec});assert.ok(runFormat(view,'bold'));
  assert.deepEqual(codec.bytes(),new TextEncoder().encode(raw.replace('Text','**Text**')));
  assert.ok(undo(view));assert.deepEqual(codec.bytes(),bytes);
});
