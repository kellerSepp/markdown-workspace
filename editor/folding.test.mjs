import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState, Compartment} from '@codemirror/state';
import {runScopeHandlers} from '@codemirror/view';
import {history, undo, redo, undoDepth} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {foldable, foldedRanges, unfoldCode, foldEffect, unfoldEffect, syntaxTreeAvailable} from '@codemirror/language';
import {markdownFolding, guardedFold, prepareFold, foldingBindings} from './folding.mjs';
import {THEMES} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';

function harness(doc, extra = []) {
  let state = EditorState.create({doc, extensions:[markdown(), markdownFolding(), history(), extra]});
  const view = {
    get state() {return state;},
    dispatch(spec) {state = state.update(spec).state;},
    lineBlockAt(pos) {return state.doc.lineAt(pos);}
  };
  return view;
}
function ranges(state) {
  const result = [];
  foldedRanges(state).between(0, state.doc.length, (from,to) => result.push({from,to}));
  return result;
}
function complete(view) {
  for (let n=0; n<100 && !syntaxTreeAvailable(view.state); n++) prepareFold(view);
  assert.ok(syntaxTreeAvailable(view.state));
}
function rangeAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  return foldable(view.state,line.from,line.to);
}

test('H1–H6: Abschnitt endet vor gleicher/höherer Ebene, Kinder gehören zum Elternabschnitt', () => {
  for (let level=1;level<=6;level++) {
    const heading = '#'.repeat(level);
    const child = level<6 ? '\n'+'#'.repeat(level+1)+' Kind\nKindtext' : '';
    const body = `${heading} A\nInhalt${child}`;
    const doc = `${body}\n${heading} B\nNachfolger`;
    const view = harness(doc); complete(view);
    assert.deepEqual(rangeAt(view,0),{from:heading.length+2,to:body.length});
    if (level>1) {
      const higher = harness(`${body}\n# Haupt\nEnde`); complete(higher);
      assert.equal(rangeAt(higher,0).to,body.length);
    }
  }
});

test('EOF, leere Abschnitte und Setext-Überschriften verwenden native Markdown-Regeln', () => {
  const eof = harness('###### Sechs\nLetzter Inhalt'); complete(eof);
  assert.equal(rangeAt(eof,0).to,eof.state.doc.length);
  const empty = harness('## Leer\n## Danach\nText'); complete(empty);
  assert.equal(rangeAt(empty,0),null);
  const prefix = 'Titel\n=====\n\nInhalt';
  const setext = harness(prefix+'\n\nZweiter\n=====\nText'); complete(setext);
  assert.deepEqual(rangeAt(setext,0),{from:5,to:prefix.length});
});

test('Heading-ähnlicher Text in Code und escaped Markdown beendet den Abschnitt nicht', () => {
  const content = '# Echt\nText\n```md\n# Falsch\n```\n\\# Kein Titel\nEnde';
  const view = harness(content+'\n# Nächster\nText'); complete(view);
  assert.equal(rangeAt(view,0).to,content.length);
  // A code block may itself have a native block fold, but its # line is no heading.
  assert.equal(rangeAt(view,view.state.doc.toString().indexOf('# Falsch')),null);
});

test('Verschachteltes Ein-/Ausklappen erhält Text, unberührte Kindfalten und Undo/Redo', () => {
  const original = '# A\n## Kind\nText\n# B\nEnde';
  const view = harness(original); complete(view);
  view.dispatch({changes:{from:view.state.doc.length,insert:'!'}}); complete(view);
  const text = view.state.doc.toString(), depth = undoDepth(view.state);
  const outer = rangeAt(view,0), child = rangeAt(view,text.indexOf('## Kind'));
  for (const range of [child,outer]) {
    const tr = view.state.update({effects:foldEffect.of(range)});
    assert.equal(tr.docChanged,false); view.dispatch(tr);
  }
  assert.equal(ranges(view.state).length,2);
  view.dispatch({effects:unfoldEffect.of(outer)});
  assert.deepEqual(ranges(view.state),[child]);
  view.dispatch({effects:unfoldEffect.of(child)});
  assert.equal(view.state.doc.toString(),text);
  assert.equal(undoDepth(view.state),depth);
  assert.ok(undo(view)); assert.equal(view.state.doc.toString(),original);
  assert.ok(redo(view)); assert.equal(view.state.doc.toString(),text);
});

test('Keyboardbefehle falten/entfalten ohne Text- oder Auswahländerung; keine Text-/AltGr-Bindings', () => {
  const view = harness('# A\nText\n# B\nEnde'); complete(view);
  const doc = view.state.doc, selection = view.state.selection;
  assert.ok(guardedFold(view)); assert.equal(ranges(view.state).length,1);
  assert.strictEqual(view.state.doc,doc); assert.deepEqual(view.state.selection,selection);
  assert.ok(unfoldCode(view)); assert.equal(ranges(view.state).length,0);
  assert.deepEqual(foldingBindings().map(binding => binding.key),['Ctrl-Shift-,','Ctrl-Shift-.']);
});

test('Vier Themewechsel erhalten Faltbereiche, Text und Undo-Verlauf', () => {
  const appearance = new Compartment();
  const view = harness('# A\n## Kind\nText\n# B\nEnde',appearance.of(editorTheme(THEMES[0]))); complete(view);
  guardedFold(view);
  const before = ranges(view.state), text = view.state.doc.toString(), depth = undoDepth(view.state);
  for (const theme of THEMES) {
    view.dispatch({effects:appearance.reconfigure(editorTheme(theme))});
    assert.deepEqual(ranges(view.state),before);
    assert.equal(view.state.doc.toString(),text); assert.equal(undoDepth(view.state),depth);
  }
});

test('CodeMirror verarbeitet simulierte QWERTZ-Umschaltzeichen, ignoriert Text und AltGr', () => {
  const view = harness('# A\nText\n# B\nEnde'); complete(view);
  const key = (value,keyCode,modifiers={}) => ({key:value,keyCode,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false,...modifiers});
  for (const event of [key('g',71),key('j',74),key('ä',222),key(';',188,{shiftKey:true}),key('@',81,{ctrlKey:true,altKey:true}),key(';',188,{ctrlKey:true,altKey:true,shiftKey:true})]) {
    assert.equal(runScopeHandlers(view,event,'editor'),false);
    assert.equal(ranges(view.state).length,0);
  }
  assert.ok(runScopeHandlers(view,key(';',188,{ctrlKey:true,shiftKey:true}),'editor'));
  assert.equal(ranges(view.state).length,1);
  assert.ok(runScopeHandlers(view,key(':',190,{ctrlKey:true,shiftKey:true}),'editor'));
  assert.equal(ranges(view.state).length,0);
  assert.equal(view.state.doc.toString(),'# A\nText\n# B\nEnde');
});

test('Langes Dokument: begrenzte Analyse vor Fold schließt alle Inhalte bis nächster H1 ein', () => {
  const content = '# Lang\n'+'Synthetischer Absatz mit äöü.\n\n'.repeat(5000)+'## Spätes Kind\nKindtext';
  const view = harness(content+'\n# Ende\nAußerhalb');
  for (let n=0;n<100;n++) {
    guardedFold(view);
    if (ranges(view.state).length) break;
  }
  assert.ok(syntaxTreeAvailable(view.state));
  assert.equal(ranges(view.state)[0].to,content.length);
  assert.equal(view.state.doc.toString(),content+'\n# Ende\nAußerhalb');
});

test('Unvollständige/fehlende Analyse blockiert Fold statt einen Teilbereich zu verstecken', () => {
  let state = EditorState.create({doc:'# A\nText',extensions:[markdownFolding()]});
  const messages = [];
  const view = {get state(){return state;},dispatch(spec){state=state.update(spec).state;}};
  assert.equal(guardedFold(view,message=>messages.push(message)),true);
  assert.equal(ranges(state).length,0); assert.equal(messages.length,1);
  assert.equal(state.doc.toString(),'# A\nText');
});
