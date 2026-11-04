import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Compartment} from '@codemirror/state';
import {history,undoDepth} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {foldedRanges,syntaxTreeAvailable,foldEffect} from '@codemirror/language';
import {markdownFolding,guardedFold,stagedUnfold,prepareFold} from './folding.mjs';
import {headingSections,foldingContext,visibilityPlans,cycleContext} from './section-folding.mjs';
import {THEMES} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';

const sample='# Root\nIntro\n\n## Child\nChild text\n\n### Grandchild\nDeep text\n\n## Sibling\nSibling text\n\n# Outside\nOutside text';
function harness(doc=sample,extra=[]) {
  let state=EditorState.create({doc,extensions:[markdown(),markdownFolding(),history(),extra]});
  const changes=[];
  const view={get state(){return state;},dispatch(spec){const tr=state.update(spec);changes.push(tr.docChanged);state=tr.state;},lineBlockAt(pos){return state.doc.lineAt(pos);}};
  for(let n=0;n<100 && !syntaxTreeAvailable(state);n++) prepareFold(view);
  assert.ok(syntaxTreeAvailable(state));
  return {view,changes};
}
function ranges(state) {
  const result=[];foldedRanges(state).between(0,state.doc.length,(from,to)=>result.push({from,to}));return result;
}
const hidden=(state,pos)=>ranges(state).some(r=>pos>r.from && pos<r.to);

test('Absatz, Liste, Codeblock und Leerzeilen finden den zugehörigen Heading-Kontext',()=>{
  const doc='# Root\nParagraph\n\n- Item\n  - Child\n\n```md\n# Fake\n```\n\n\n# Next\nText';
  for(const word of ['Paragraph','Item','Child','# Fake']) {
    const {view}=harness(doc);view.dispatch({selection:{anchor:doc.indexOf(word)+2}});
    assert.equal(foldingContext(view.state).from,0);
    guardedFold(view);assert.equal(ranges(view.state).length,1);
    assert.equal(view.state.selection.main.head,0);
    assert.equal(view.state.doc.toString(),doc);
  }
  const {view}=harness(doc);
  assert.equal(foldingContext(view.state,doc.indexOf('# Next')-1).from,0);
  assert.equal(foldingContext(view.state,doc.indexOf('# Next')).from,doc.indexOf('# Next'));
});

test('Kontext wählt die nächste Überschrift und setzt Cursor bei Verbergen sichtbar',()=>{
  const {view}=harness();view.dispatch({selection:{anchor:sample.indexOf('Deep text')+3}});
  assert.equal(foldingContext(view.state).level,3);
  guardedFold(view);assert.equal(view.state.selection.main.head,sample.indexOf('### Grandchild'));
  assert.equal(hidden(view.state,sample.indexOf('Child text')+2),false);
  assert.equal(hidden(view.state,sample.indexOf('Deep text')+2),true);
});

test('Stufen zeigen monoton mehr Inhalt: geschlossen, Gliederung, direkte Kinder, vollständig',()=>{
  const {view,changes}=harness();
  const root=foldingContext(view.state,0), plans=visibilityPlans(view.state,root);
  assert.deepEqual(plans.map(p=>p.name),['Gliederung','Text der direkten Kinder','vollständig offen']);
  guardedFold(view);
  const statuses=[];
  stagedUnfold(view,m=>statuses.push(m));
  for(const h of headingSections(view.state)) assert.equal(hidden(view.state,h.from),false);
  for(const text of ['Intro','Child text','Deep text','Sibling text']) assert.ok(hidden(view.state,sample.indexOf(text)+2));
  const before=ranges(view.state);
  stagedUnfold(view,m=>statuses.push(m));
  for(const text of ['Intro','Child text','Sibling text']) assert.equal(hidden(view.state,sample.indexOf(text)+2),false);
  assert.ok(hidden(view.state,sample.indexOf('Deep text')+2));
  assert.ok(ranges(view.state).every(r=>before.some(b=>r.from>=b.from&&r.to<=b.to)));
  stagedUnfold(view,m=>statuses.push(m));assert.equal(ranges(view.state).length,0);
  assert.match(statuses.at(-1),/vollständig offen/);
  assert.ok(changes.every(changed=>!changed));assert.equal(view.state.doc.toString(),sample);
});

test('Explizites vollständiges Öffnen entfernt nur Falten im Zielabschnitt',()=>{
  const {view}=harness();const outside=foldingContext(view.state,sample.indexOf('# Outside'));
  view.dispatch({effects:foldEffect.of(outside.range)});guardedFold(view);
  stagedUnfold(view,undefined,true);
  assert.deepEqual(ranges(view.state),[outside.range]);
});

test('Gemischte Kindfalten werden beim Öffnen des Elternabschnitts nie zu mehr Verbergung',()=>{
  const {view}=harness();const child=foldingContext(view.state,sample.indexOf('## Child'));
  view.dispatch({effects:foldEffect.of(child.range)});
  assert.equal(hidden(view.state,sample.indexOf('Intro')+2),false);
  stagedUnfold(view);
  assert.equal(ranges(view.state).length,0);
  assert.equal(hidden(view.state,sample.indexOf('Intro')+2),false);
  assert.equal(view.state.doc.toString(),sample);
});

test('Leaf/direkte Kinder überspringen doppelte Stufen; Cycle funktioniert ohne Textänderung',()=>{
  for(const doc of ['# Leaf\nText','# Root\nIntro\n## Child\nText']) {
    const {view}=harness(doc);
    assert.equal(visibilityPlans(view.state,foldingContext(view.state)).at(-1).name,'vollständig offen');
    cycleContext(view,undefined,0);assert.ok(ranges(view.state).length);
    cycleContext(view,undefined,0);
    if(doc.includes('Child')) {assert.ok(ranges(view.state).length);cycleContext(view,undefined,0);}
    assert.equal(ranges(view.state).length,0);assert.equal(view.state.doc.toString(),doc);
  }
});

test('Setext-Gliederung erhält Unterstreichungszeilen, übersprungene Ebenen gelten als Kinder',()=>{
  const doc='Root\n====\n\nIntro\n\nChild\n-----\n\nText\n\n#### Deep\nBody';
  const {view}=harness(doc);guardedFold(view);stagedUnfold(view);
  for(const word of ['====','-----','#### Deep']) assert.equal(hidden(view.state,doc.indexOf(word)+1),false);
  assert.deepEqual(headingSections(view.state).map(h=>h.parent?.level??null),[null,1,2]);
});

test('Ohne Überschrift bleibt lokale Listen-/Codeblock-Faltung verfügbar',()=>{
  for(const doc of ['- Item\n  - Child\n    Body','```js\nconst a=1;\n```']) {
    const {view}=harness(doc);view.dispatch({selection:{anchor:doc.indexOf('\n')+2}});
    assert.ok(foldingContext(view.state).block);guardedFold(view);assert.ok(ranges(view.state).length);
    stagedUnfold(view);assert.equal(ranges(view.state).length,0);assert.equal(view.state.doc.toString(),doc);
  }
  const doc='- Parent\n  Prosa\n  - Child\n    Body\n- Sibling';
  const {view}=harness(doc);view.dispatch({selection:{anchor:3}});guardedFold(view);
  assert.ok(hidden(view.state,doc.indexOf('Child')+2));
  assert.equal(hidden(view.state,doc.indexOf('Sibling')+2),false);
});

test('Vorhandene Falten lassen sich auch ohne vollständigen Syntaxbaum wieder öffnen',()=>{
  let state=EditorState.create({doc:'# A\nText\n# B\nElse',extensions:[markdownFolding()]});
  const view={get state(){return state;},dispatch(spec){state=state.update(spec).state;}};
  view.dispatch({effects:[foldEffect.of({from:3,to:8}),foldEffect.of({from:12,to:17})]});
  stagedUnfold(view,undefined,true);
  assert.deepEqual(ranges(state),[{from:12,to:17}]);
  assert.equal(state.doc.toString(),'# A\nText\n# B\nElse');
});

test('Heading-Kontext aus Blockquote endet am Container, nicht im folgenden Absatz',()=>{
  const doc='# Root\n\n> ## Quote\n> Body\n\nNormaler Absatz\n\n# Next\nText';
  const {view}=harness(doc);
  assert.equal(foldingContext(view.state,doc.indexOf('Body')+1).level,2);
  assert.equal(foldingContext(view.state,doc.indexOf('Normaler')+1).level,1);
});

test('Lange Gliederung mit 1000 Kindern öffnet alle Headingzeilen ohne Textänderung',()=>{
  const doc='# Root\nIntro\n\n'+Array.from({length:1000},(_,n)=>`## Child ${n}\nSynthetischer Text\n`).join('\n')+'\n# Outside\nEnde';
  const {view,changes}=harness(doc);guardedFold(view);stagedUnfold(view);
  assert.equal(headingSections(view.state).length,1002);
  for(const h of headingSections(view.state)) assert.equal(hidden(view.state,h.from),false);
  stagedUnfold(view,undefined,true);assert.equal(ranges(view.state).length,0);
  assert.equal(view.state.doc.toString(),doc);assert.ok(changes.every(changed=>!changed));
});

test('Themewechsel, Textänderung und wiederholte Aktionen erhalten Inhalt/Undo und frischen Index',()=>{
  const appearance=new Compartment(),{view}=harness(sample,appearance.of(editorTheme(THEMES[0])));
  view.dispatch({changes:{from:sample.length,insert:'!'}});
  prepareFold(view);const before=headingSections(view.state),depth=undoDepth(view.state);
  guardedFold(view);stagedUnfold(view);const folded=ranges(view.state);
  for(const theme of THEMES) {view.dispatch({effects:appearance.reconfigure(editorTheme(theme))});assert.deepEqual(ranges(view.state),folded);}
  stagedUnfold(view,undefined,true);assert.equal(undoDepth(view.state),depth);
  view.dispatch({changes:{from:0,insert:'# New\nText\n\n'}});prepareFold(view);
  assert.notStrictEqual(headingSections(view.state),before);assert.equal(headingSections(view.state)[0].from,0);
  assert.equal(view.state.doc.toString(),'# New\nText\n\n'+sample+'!');
});
