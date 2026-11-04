import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,codeFolding,foldEffect,foldedRanges} from '@codemirror/language';
import {history,undoDepth} from '@codemirror/commands';
import {visualStructure,visualModel,normalizeVisualSettings} from './visual-structure.mjs';
import {THEMES} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';
const settings={headingIndent:true,listMarkers:true,hierarchicalNumbers:true,markers:['●','○','+','*','-']};
function state(doc,extra=[]) {const s=EditorState.create({doc,extensions:[markdown(),codeFolding(),history(),extra]});assert.ok(ensureSyntaxTree(s,s.doc.length,1000));return s;}
const model=(s,options=settings,ranges=[{from:0,to:s.doc.length}])=>visualModel(s,ranges,options);
test('Fünf Ebenen erhalten konfigurierte zusätzliche Marker und kompatiblen Rohtext',()=>{
  const doc=Array.from({length:5},(_,n)=>'  '.repeat(n)+'- Level'+(n+1)).join('\n'),s=state(doc);
  assert.deepEqual(model(s).markers.map(m=>m.label),settings.markers);
  assert.deepEqual(model(s).markers.map(m=>m.level),[1,2,3,4,5]);assert.equal(s.doc.toString(),doc);
  assert.deepEqual(normalizeVisualSettings({markers:['<script>']}).markers,['-','○','●','*','+']);
});
test('Hierarchische Ordinalanzeige ist rein visuell und berücksichtigt verschachtelte Geschwister',()=>{
  const doc='1. A\n   1. B\n      1. C\n         1. D\n            1. E\n   2. F\n2. G',s=state(doc);
  assert.deepEqual(model(s).markers.map(m=>m.label),['1.','1.1.','1.1.1.','1.1.1.1.','1.1.1.1.1.','1.2.','2.']);
  assert.equal(s.doc.toString(),doc);assert.equal(model(s,{hierarchicalNumbers:false}).markers.length,0);
});
test('Headingeinrückung und Codeflächen folgen echten AST-Blöcken, nicht Inlinecode oder Frontmatter',()=>{
  const doc='---\nunknown: keep\n---\n\n# One\nText `inline`\n## Two\n```md\n# Fake\n- Fake\n```',s=state(doc),m=model(s);
  assert.deepEqual(m.lines.filter(l=>l.headingLevel).map(l=>l.headingLevel),[1,2]);
  assert.equal(m.markers.length,0);assert.equal(m.lines.filter(l=>l.code).length,4);
  assert.equal(m.lines.some(l=>l.from===s.doc.lineAt(doc.indexOf('inline')).from),false);
});
test('Disjunkte sichtbare Bereiche desselben Codeblocks erhalten jeweils Dekorationen',()=>{
  const doc='```text\nOne\nTwo\nThree\n```',s=state(doc),one=s.doc.line(2),three=s.doc.line(4);
  assert.deepEqual(model(s,settings,[{from:one.from,to:one.to},{from:three.from,to:three.to}]).lines.map(l=>l.from),[one.from,three.from]);
});
test('Ansichtswechsel erhalten Text/Selection/Undo/Folding in allen Themes; Codefläche liegt unter Auswahl',()=>{
  for(const theme of THEMES) {
    const appearance=new Compartment();let s=state('# A\nBody\n## B\nText',[appearance.of(visualStructure()),editorTheme(theme)]);
    s=s.update({changes:{from:s.doc.length,insert:'!'},selection:{anchor:2}}).state;
    s=s.update({effects:foldEffect.of({from:3,to:s.doc.length})}).state;
    const doc=s.doc,selection=s.selection,depth=undoDepth(s),folds=foldedRanges(s);
    const tr=s.update({effects:appearance.reconfigure(visualStructure(settings))});
    assert.equal(tr.docChanged,false);assert.strictEqual(tr.state.doc,doc);assert.deepEqual(tr.state.selection,selection);assert.equal(undoDepth(tr.state),depth);assert.strictEqual(foldedRanges(tr.state),folds);
    const css=tr.state.facet(EditorView.styleModule).map(m=>m.getRules()).join('\n');
    assert.ok(css.includes('.cm-codeBlock::before'));assert.ok(css.includes('background-color: var(--code-background)'));assert.ok(css.includes('z-index: -2'));
    assert.ok(css.includes('border-left: 2px solid var(--border)'));
    assert.ok(!/\.cm-codeBlock\s*\{[^}]*background-color/.test(css));
  }
});
