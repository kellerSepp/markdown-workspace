import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {THEMES,DEFAULT_THEME,THEME_STORAGE_KEY,getTheme,readThemeChoice,saveThemeChoice,applyTheme} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';

test('Lokale Auswahl überlebt Neustart; unbekannte Werte und Speicherfehler fallen zurück', () => {
  const values = new Map();
  const storage = {getItem:key => values.get(key),setItem:(key,value) => values.set(key,value)};
  assert.equal(readThemeChoice(storage),DEFAULT_THEME);
  assert.equal(saveThemeChoice(storage,'paper'),true);
  assert.equal(readThemeChoice(storage),'paper');
  values.set(THEME_STORAGE_KEY,'not-a-theme');
  assert.equal(readThemeChoice(storage),'midnight');
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(readThemeChoice(blocked),'midnight');
  assert.equal(saveThemeChoice(blocked,'nord'),false);
  assert.equal(saveThemeChoice(undefined,'terminal'),false);
  assert.equal(getTheme('__proto__').id,'midnight');
});

test('Palettenwechsel aktualisiert nur Darstellungswerte am gewählten Root', () => {
  const properties = new Map(),root = {dataset:{},style:{setProperty:(key,value) => properties.set(key,value)}};
  for (const theme of THEMES) {
    applyTheme(root,theme.id);
    assert.equal(root.dataset.theme,theme.id);
    assert.equal(root.style.colorScheme,theme.scheme);
    assert.equal(properties.get('--syntax-heading'),theme.tokens.syntaxHeading);
    assert.equal(properties.get('--background'),theme.tokens.background);
  }
  assert.equal(properties.size,Object.keys(THEMES[0].tokens).length);
});

test('Erzeugtes Theme-CSS überschreibt fokussierte CM-Auswahl und Fokusrahmen', () => {
  for (const theme of THEMES) {
    const state = EditorState.create({extensions:editorTheme(theme)});
    const rules = state.facet(EditorView.styleModule).flatMap(module => module.getRules().split('\n'));
    const selection = rules.find(rule => rule.includes('cm-focused') && rule.includes('cm-selectionBackground') && rule.includes('background-color: var(--selection)'));
    assert.ok(selection,'Eigene fokussierte Auswahlregel vorhanden');
    const focusedSelector = selection.split('{')[0].split(',').find(selector => selector.includes('cm-focused'));
    // Current CM baseTheme uses five classes for its focused drawSelection rule.
    assert.ok((focusedSelector.match(/\./g) ?? []).length >= 5,'Nicht weniger spezifisch als die CM-Basisregel');
    assert.ok(rules.some(rule => rule.includes('cm-focused') && rule.includes('outline: 2px solid var(--focus)')));
  }
});

test('Wiederholter Theme-Wechsel erhält Rohtext, Auswahl und Undo/Redo ohne Dokumentänderung', () => {
  const appearance = new Compartment();
  let state = EditorState.create({doc:'---\nunknown: ä\n---\n# Text',extensions:[history(),appearance.of(editorTheme(THEMES[0]))]});
  state = state.update({changes:{from:state.doc.length,insert:' ö'},selection:{anchor:4,head:11}}).state;
  const text = state.doc.toString(),selection = state.selection.toJSON(),depth = undoDepth(state);
  for (let n=0;n<20;n++) for (const theme of THEMES) {
    const transaction = state.update({effects:appearance.reconfigure(editorTheme(theme))});
    assert.equal(transaction.docChanged,false);
    state = transaction.state;
    assert.equal(state.doc.toString(),text);
    assert.deepEqual(state.selection.toJSON(),selection);
    assert.equal(undoDepth(state),depth);
    assert.equal(state.facet(EditorView.darkTheme),theme.scheme === 'dark');
  }
  const target = {get state(){return state;},dispatch:transaction => {state = transaction.state;}};
  assert.equal(undo(target),true);assert.equal(state.doc.toString(),'---\nunknown: ä\n---\n# Text');
  assert.equal(redo(target),true);assert.equal(state.doc.toString(),text);
  assert.strictEqual(editorTheme(THEMES[0]),editorTheme(THEMES[1]));
});

const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(part => parseInt(part,16)/255).map(c => c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
};
const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);
test('Vier Paletten: Text/Syntax rechnerisch ≥4,5; Fokus, Cursor und Rahmen ≥3', () => {
  assert.deepEqual(THEMES.map(theme => theme.id),['midnight','terminal','nord','paper']);
  for (const theme of THEMES) {
    const t = theme.tokens;
    const textPairs = [['text','background'],['text','surface'],['text','control'],['text','hover'],['muted','background'],['muted','control'],['warning','background'],['statusText','statusBackground'],['selectionText','selection']];
    for (const role of Object.keys(t).filter(key => key.startsWith('syntax'))) {
      textPairs.push([role,'surface'],[role,'codeBackground'],[role,'selection']);
    }
    for (const [fg,bg] of textPairs) assert.ok(contrast(t[fg],t[bg])>=4.5,`${theme.id}: ${fg}/${bg} ${contrast(t[fg],t[bg]).toFixed(2)}`);
    for (const [fg,bg] of [['focus','background'],['focus','control'],['cursor','surface'],['border','background'],['border','control']]) assert.ok(contrast(t[fg],t[bg])>=3,`${theme.id}: ${fg}/${bg} ${contrast(t[fg],t[bg]).toFixed(2)}`);
  }
});
