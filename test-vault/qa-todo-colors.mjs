import assert from 'node:assert/strict';
import {EditorState,Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,syntaxTree,highlightingFor} from '@codemirror/language';
import {highlightTree} from '@lezer/highlight';
import {history,undoDepth,undo,redo} from '@codemirror/commands';
import {todoRules,todoDecorations,planTodo} from '../editor/todo.mjs';
import {THEMES,applyTheme} from '../editor/themes.mjs';
import {editorTheme} from '../editor/theme-editor.mjs';
let checks=0;
const node=(classes,parent=null)=>({classes:new Set(classes.split(/\s+/).filter(Boolean)),parent});
function matches(n,selector){const bits=selector.trim().split(/\s+/);function part(p,b){return b==='*'||b.split('.').filter(Boolean).every(c=>p.classes.has(c));}if(!part(n,bits.at(-1)))return false;let p=n.parent;for(let i=bits.length-2;i>=0;i--){while(p&&!part(p,bits[i]))p=p.parent;if(!p)return false;p=p.parent;}return true;}
function colored(n,rules){let best=null;for(let order=0;order<rules.length;order++){const m=/^([^{}]+)\{([^}]+)\}/.exec(rules[order]);if(!m)continue;const color=/(?:^|;)\s*color:\s*([^;]+)/.exec(m[2])?.[1];if(!color)continue;for(const selector of m[1].split(',')){if(!matches(n,selector))continue;const spec=(selector.match(/\./g)||[]).length;if(!best||spec>best.spec||spec===best.spec&&order>best.order)best={color,spec,order};}}return best?.color??(n.parent?colored(n.parent,rules):null);}
for(const theme of THEMES)for(let level=1;level<=6;level++)for(const closed of [false,true]){
 const word=closed?'DONE':'TODO',text='#'.repeat(level)+' '+word+' SameTitle';let s=EditorState.create({doc:text,extensions:[markdown(),todoRules,editorTheme(theme)]});ensureSyntaxTree(s,s.doc.length,100);s=s.update({}).state;
 const css=s.facet(EditorView.styleModule).flatMap(m=>m.getRules().split('\n'));const spans=[];highlightTree(syntaxTree(s),{style:tags=>highlightingFor(s,tags)},(a,b,c)=>spans.push({a,b,c}));const statusAt=level+1,titleAt=text.indexOf('SameTitle'),statusSyntax=spans.find(x=>x.a<=statusAt&&x.b>statusAt),titleSyntax=spans.find(x=>x.a<=titleAt&&x.b>titleAt);assert.ok(statusSyntax&&titleSyntax);
 let mark;todoDecorations(s,[{from:0,to:s.doc.length}]).between(0,s.doc.length,(a,b,d)=>{mark={a,b,cls:d.spec.class};});assert.equal(mark.a,statusAt);assert.equal(mark.b,statusAt+word.length);
 const scope=/^(\.[^ ]+) \.cm-content \.cm-todo-open \*/.exec(css.find(x=>x.includes('.cm-todo-open *')))[1].slice(1);const root=node(scope),content=node('cm-content',root);
 const token=closed?'var(--todo-closed)':'var(--todo-open)';
 for(const shape of [0,1,2]){
  let target;if(shape===0)target=node(statusSyntax.c+' '+mark.cls,content);if(shape===1)target=node(statusSyntax.c,node(mark.cls,content));if(shape===2)target=node(statusSyntax.c,node('nested-inline',node(mark.cls,node(statusSyntax.c,content))));
  assert.equal(colored(target,css),token);assert.equal(colored(node(titleSyntax.c,content),css),'var(--syntax-heading'+level+')');assert.equal(colored(node(statusSyntax.c,content),css),'var(--syntax-heading'+level+')');checks++;
 }
}
const slot=new Compartment();let state=EditorState.create({doc:'## TODO Titel\n### DONE Kind',selection:{anchor:9},extensions:[markdown(),history(),todoRules,slot.of(editorTheme(THEMES[0]))]});state=state.update(planTodo(state,'DONE').spec).state;const before={text:state.doc.toString(),selection:state.selection.toJSON(),undo:undoDepth(state)};const vars=new Map(),root={style:{setProperty:(k,v)=>vars.set(k,v)},dataset:{}};
for(let cycle=0;cycle<20;cycle++)for(const theme of THEMES){state=state.update({effects:slot.reconfigure(editorTheme(theme))}).state;applyTheme(root,theme.id);assert.equal(vars.get('--todo-open'),theme.tokens.todoOpen);assert.equal(vars.get('--todo-closed'),theme.tokens.todoClosed);assert.equal(state.doc.toString(),before.text);assert.deepEqual(state.selection.toJSON(),before.selection);assert.equal(undoDepth(state),before.undo);checks++;}
const view={get state(){return state;},dispatch(t){state=t.state??state.update(t).state;}};assert.equal(undo(view),true);assert.equal(state.doc.toString(),'## TODO Titel\n### DONE Kind');assert.equal(redo(view),true);assert.equal(state.doc.toString(),before.text);checks++;
console.log(JSON.stringify({independentColorChecks:checks,scope:'real parser/highlight classes, task ranges, emitted CSS cascade model, theme reconfiguration; no native computed styles'}));
