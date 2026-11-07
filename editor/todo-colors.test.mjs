import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,highlightingFor,syntaxTree} from '@codemirror/language';
import {highlightTree} from '@lezer/highlight';
import {THEMES,applyTheme} from './themes.mjs';
import {editorTheme} from './theme-editor.mjs';
import {todoRules,todoDecorations} from './todo.mjs';

// Uses the real Markdown parser, generated highlighter classes and generated CM
// theme CSS. This is a nested-span/CSS regression, not browser computed-style proof.
function rendered(doc,theme){
 let state=EditorState.create({doc,extensions:[markdown(),todoRules,editorTheme(theme)]});
 assert.ok(ensureSyntaxTree(state,state.doc.length,100));state=state.update({}).state;
 const syntax=[],marks=[],css=state.facet(EditorView.styleModule).flatMap(m=>m.getRules().split('\n'));
 highlightTree(syntaxTree(state),{style:tags=>highlightingFor(state,tags)},(from,to,classes)=>syntax.push({from,to,classes}));
 todoDecorations(state,[{from:0,to:state.doc.length}]).between(0,state.doc.length,(from,to,d)=>marks.push({from,to,class:d.spec.class}));
 return {state,syntax,marks,css};
}

test('Real heading syntax creates explicitly colored status spans; task CSS covers both outer mark and nested descendants',()=>{
 const doc=Array.from({length:6},(_,i)=>`${'#'.repeat(i+1)} ${i%2?'DONE':'TODO'} Title${i+1}`).join('\n');
 for(const theme of THEMES){
  const {syntax,marks,css}=rendered(doc,theme);assert.equal(marks.length,6);
  for(let level=1;level<=6;level++){
   const task=marks[level-1],token=level%2?'todo-open':'todo-closed',syntaxSpan=syntax.find(s=>s.from<=task.from&&s.to>task.from);
   assert.ok(syntaxSpan,'real syntax span overlaps status');
   const syntaxRules=syntaxSpan.classes.split(' ').flatMap(c=>css.filter(r=>r.includes('.'+c+' {')));
   assert.ok(syntaxRules.some(r=>r.includes(`color: var(--syntax-heading${level})`)),'inner syntax explicitly colors status as heading');
   const outer=css.find(r=>r.includes(`.cm-content .cm-${token} {`)),inner=css.find(r=>r.includes(`.cm-content .cm-${token} * {`));
   assert.ok(outer?.includes(`color: var(--${token})`),'task directly colors outer mark');
   assert.ok(inner?.includes(`color: var(--${token})`),'task explicitly recolors nested syntax children');
   // Real generated selector has scope + content + task classes, whereas the
   // generated syntax color uses one class. It wins on a descendant element.
   assert.ok((inner.split('{')[0].match(/\./g)??[]).length>(syntaxRules.find(r=>r.includes('color:')).split('{')[0].match(/\./g)??[]).length);
   assert.ok(outer.includes(level%2?'text-decoration: underline':'text-decoration: line-through'));
   const titlePos=doc.indexOf('Title'+level);assert.ok(!marks.some(m=>m.from<=titlePos&&m.to>titlePos),'title is outside every task selector scope');
   const titleSpan=syntax.find(s=>s.from<=titlePos&&s.to>titlePos);
   assert.ok(titleSpan.classes.split(' ').some(c=>css.some(r=>r.includes('.'+c+' {')&&r.includes(`color: var(--syntax-heading${level})`))));
  }
 }
});

test('Custom formatted state names retain task scope over inner emphasis/strong syntax without coloring the title',()=>{
 const doc='#+SEQ_TODO: **NEXT**(n) | _DONE_(d)\n## **NEXT** Open title\n### _DONE_ Closed title';
 for(const theme of THEMES){const {marks,syntax,css}=rendered(doc,theme);assert.equal(marks.length,2);
  for(const mark of marks){const nested=syntax.filter(s=>s.from<mark.to&&s.to>mark.from);assert.ok(nested.length>1,'Markdown creates nested formatted status segments');assert.ok(css.some(r=>r.includes(`.cm-content .${mark.class} * {`)&&r.includes('color: var(--todo-')));}
 }
});

test('All themes publish exact task CSS variables through actual applyTheme adapter',()=>{
 for(const theme of THEMES){const vars=new Map(),root={style:{setProperty:(k,v)=>vars.set(k,v)},dataset:{}};applyTheme(root,theme.id);
  assert.equal(vars.get('--todo-open'),theme.tokens.todoOpen);assert.equal(vars.get('--todo-closed'),theme.tokens.todoClosed);
  assert.notEqual(vars.get('--todo-open'),vars.get('--todo-closed'));
 }
});
