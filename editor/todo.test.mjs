import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {syntaxTreeAvailable,ensureSyntaxTree} from '@codemirror/language';
import {THEMES} from './themes.mjs';
import {readFile} from 'node:fs/promises';
import {createEmacsEditing,setEmacsMark} from './emacs-editing.mjs';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules,readTodoRules,reloadTodo,todoContext,planTodo,createTodoController,todoKeyboard,todoDefinitionLine,todoDecorations} from './todo.mjs';
const make=(doc,anchor=0,extra=[])=>EditorState.create({doc,selection:{anchor},extensions:[markdown(),history(),todoRules,extra]});
function fixture(doc,anchor=0){let options;const notices=[],context={hasDocument:true,busy:false};const view={state:make(doc,anchor),hasFocus:true};view.dispatch=spec=>{view.state=spec.startState?spec.state:view.state.update(spec).state;};const controller=createTodoController({view,panel:{openChoices(o){options=o;return true;}},getContext:()=>context,notify:s=>notices.push(s)});return {view,controller,context,notices,get options(){return options;}};}
test('TODO definitions load defaults, custom Unicode names and classify both sides',()=>{
  assert.deepEqual(make('# TODO A').field(todoRules).rules.map(r=>r.name),['TODO','DONE']);
  const s=make('#+SEQ_TODO: NÄCHST(n) WAITING(w) | DONE(d) CANCELLED(c)\n# NÄCHST A');
  assert.equal(s.field(todoRules).error,'');assert.deepEqual(s.field(todoRules).rules.map(r=>r.closed),[false,false,true,true]);
});
test('TODO rejects duplicates, malformed grammar, missing side and multiple declarations',()=>{
  for(const definition of ['A(a) A(b) | DONE(d)','A(a) B(a) | DONE(d)','A(a) |','| DONE(d)','A(a) | DONE(d) | X(x)','A(1) | DONE(d)','A | DONE(d)','###(a) | DONE(d)'])assert.ok(readTodoRules(make('#+SEQ_TODO: '+definition)).message,definition);
  assert.match(readTodoRules(make('#+SEQ_TODO: A(a) | B(b)\n#+SEQ_TODO: C(c) | D(d)')).message,/eine/);
});
test('TODO ignores frontmatter, fences, indented code, list/quote and HTML definitions',()=>{
  for(const doc of ['---\n#+SEQ_TODO: A(a) | B(b)\n---\n# TODO Title','```\n#+SEQ_TODO: A(a) | B(b)\n```','    #+SEQ_TODO: A(a) | B(b)','> #+SEQ_TODO: A(a) | B(b)','- note\n  #+SEQ_TODO: A(a) | B(b)','<div>\n#+SEQ_TODO: A(a) | B(b)\n</div>'])assert.deepEqual(make(doc).field(todoRules).rules.map(r=>r.name),['TODO','DONE'],doc);
});
test('H1 through H6 and nested task parents are independent; every heading column and body targets own heading',()=>{
  const doc='# TODO Parent\nBody\n## TODO Child\nChild body\n### DONE Grandchild\n#### TODO Four\n##### DONE Five\n###### TODO Six';
  for(let level=1;level<=6;level++){const line=make(doc).doc.line(level===1?1:level===2?3:level+2);for(let col=0;col<=line.length;col++){const s=make(doc,line.from+col),p=planTodo(s,'DONE');assert.ok(p.spec||p.noop,`${level}:${col}`);if(p.spec){const text=p.spec.changes.apply(s.doc).toString();assert.equal(text.split('\n').filter((x,i)=>x!==doc.split('\n')[i]).length,1);}}}
  const body=make(doc,doc.indexOf('Child body'));assert.equal(todoContext(body).status.name,'TODO');assert.equal(todoContext(body).heading.level,2);
});
test('Unknown status words remain title, TODOIST has no TODO match; no task inheritance',()=>{
  for(const word of ['TODOIST','WAITING','todo']){const s=make('# TODO Parent\n## '+word+' Child',25);const c=todoContext(s);assert.equal(c.status,null);const p=planTodo(s,'TODO');assert.match(p.spec.changes.apply(s.doc).toString(),new RegExp('## TODO '+word+' Child'));}
});

test('Statusless child never inherits parent status; codebody addresses real section, fake/code/frontmatter/Setext/container headings stay protected',()=>{
 const text='# TODO Parent\n## Plain Child\n```\n# DONE Fake\n```';const s=make(text,text.indexOf('Fake'));assert.equal(todoContext(s).status,null);const p=planTodo(s,'TODO');assert.equal(p.spec.changes.apply(s.doc).toString(),'# TODO Parent\n## TODO Plain Child\n```\n# DONE Fake\n```');
 for(const doc of ['```\n# TODO Fake\n```','---\n# TODO Fake\n---','TODO Title\n==========','> # TODO Quote','- # TODO List'])assert.ok(todoContext(make(doc,Math.min(5,doc.length))).message,doc);
});
test('Task selection changes only prefix and preserves titles/children/closing markers, empty headings supported',()=>{
  for(const heading of ['#','## ','  ### ','###### Title ###']){const s=make(heading,heading.length),p=planTodo(s,'TODO');assert.ok(p.spec);const next=s.update(p.spec).state;assert.equal(todoContext(next).status.name,'TODO',heading);}
  const s=make('## TODO  Angebot 😀 ###\n### DONE Child\nBody',15),p=planTodo(s,'DONE');assert.equal(p.spec.changes.apply(s.doc).toString(),'## DONE  Angebot 😀 ###\n### DONE Child\nBody');
  assert.equal(planTodo(s,'TODO').noop,true);assert.equal(planTodo(s,null).spec.changes.apply(s.doc).toString(),'## Angebot 😀 ###\n### DONE Child\nBody');
});
test('Every accepted status change is separate Undo/Redo including repeated cycles and caret',()=>{
  const f=fixture('# TODO Parent\n## DONE Child',10),initial=f.view.state.doc.toString(),caret=f.view.state.selection.main.head;
  assert.equal(f.controller.cycle(1),true);assert.equal(undoDepth(f.view.state),1);const changed=f.view.state.doc.toString();
  for(let i=0;i<20;i++){assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),initial);assert.equal(f.view.state.selection.main.head,caret);assert.equal(redo(f.view),true);assert.equal(f.view.state.doc.toString(),changed);}
  f.controller.cycle(1);assert.equal(f.view.state.doc.toString(),'# Parent\n## DONE Child');assert.equal(undoDepth(f.view.state),2);
});
test('Definitions remain loaded until explicit reload, invalid reload retains last valid rules, new state resets',()=>{
  const f=fixture('#+SEQ_TODO: NEXT(n) | DONE(d)\n# NEXT Task',3);assert.equal(f.view.state.field(todoRules).rules[0].name,'NEXT');
  f.view.dispatch({changes:{from:12,to:16,insert:'LATER'}});assert.equal(f.view.state.field(todoRules).rules[0].name,'NEXT');assert.equal(f.controller.reload(),true);assert.equal(f.view.state.field(todoRules).rules[0].name,'LATER');
  f.view.dispatch({changes:{from:0,to:f.view.state.doc.line(1).to,insert:'#+SEQ_TODO: BROKEN'}});assert.equal(f.controller.reload(),false);assert.equal(f.view.state.field(todoRules).rules[0].name,'LATER');assert.ok(f.notices.at(-1));assert.equal(make('# TODO Other').field(todoRules).rules[0].name,'TODO');
});
test('TODO panel fast choices include current state, no status and guard stale targets/busy/selection/read-only',()=>{
  const f=fixture('# TODO Parent\n## DONE Child',5),state=f.view.state;assert.equal(f.controller.open(),true);assert.equal(f.view.state,state);assert.equal(f.options.fastKeys,true);assert.equal(f.options.entries[0].key,' ');assert.match(f.options.entries[1].text,/aktuell/);
  const saved={state};f.view.dispatch({selection:{anchor:6}});assert.equal(f.options.choose('DONE',saved),false);assert.equal(f.view.state.doc.toString(),state.doc.toString());
  f.context.busy=true;assert.equal(f.controller.open(),false);f.context.busy=false;f.view.dispatch({selection:{anchor:2,head:5}});assert.equal(f.controller.open(),false);assert.ok(todoContext(make('# TODO A',3,[EditorState.readOnly.of(true)])).message);
});
test('TODO Shift arrows apply on entire task heading, preserve nonempty selection and outside contexts and modifier guards',()=>{
  const f=fixture('# TODO Parent\nbody',12),calls=[];const ext=todoKeyboard(id=>calls.push(id),()=>f.context);const holder=EditorState.create({extensions:ext});const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;const handler=holder.facet(facet).find(p=>p.plugin.domEventHandlers)?.plugin.domEventHandlers.keydown;
  const event=patch=>({key:'ArrowRight',shiftKey:true,preventDefault(){this.prevented=true;},...patch});
  for(const patch of [{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])assert.equal(handler(event(patch),f.view),false);
  assert.equal(handler(event({}),f.view),true);assert.deepEqual(calls,['todo.next']);assert.equal(handler(event({repeat:true}),f.view),true);assert.equal(calls.length,1);
  f.view.dispatch({selection:{anchor:0,head:3}});assert.equal(handler(event({}),f.view),false);f.view.dispatch({selection:{anchor:16}});assert.equal(handler(event({}),f.view),false);
  f.view.state=make('# Plain',5);assert.equal(handler(event({}),f.view),true);
});
test('Definition reload only on actual declaration and one cursor; decorations distinguish open/closed without altering source',()=>{
  const doc='#+SEQ_TODO: TODO(t) | DONE(d)\n# TODO Parent\n## DONE Child\n```\n# TODO code\n```';const s=make(doc,3);assert.equal(todoDefinitionLine(s),true);const decorations=todoDecorations(s,[{from:0,to:s.doc.length}]),classes=[];decorations.between(0,s.doc.length,(_a,_b,d)=>classes.push(d.spec.class));assert.deepEqual(classes,['cm-todo-open','cm-todo-closed']);
  assert.equal(todoDefinitionLine(make('```\n#+SEQ_TODO: TODO(t) | DONE(d)\n```',8)),false);assert.ok(todoContext(make('# TODO A',3,[EditorState.allowMultipleSelections.of(true)]).update({selection:EditorSelection.create([EditorSelection.cursor(2),EditorSelection.cursor(5)])}).state).message);
});

test('Large synthetic file loads complete definitions and viewport-only marks; incomplete task context safely refuses',()=>{
 const doc=Array.from({length:2200},(_,i)=>`## TODO Task ${i}\nBody ${i}`).join('\n')+'\n#+SEQ_TODO: TODO(t) WAITING(w) | DONE(d)';
 let s=make(doc,doc.indexOf('Task 2199'));assert.deepEqual(s.field(todoRules).rules.map(r=>r.name),['TODO','WAITING','DONE']);
 if(!syntaxTreeAvailable(s,s.doc.length))assert.match(todoContext(s).message,/analysiert/);
 assert.ok(ensureSyntaxTree(s,s.doc.length,100));s=s.update({}).state;
 const from=s.doc.lineAt(doc.indexOf('Task 2199')).from,to=s.doc.lineAt(from).to;const marks=todoDecorations(s,[{from,to}]);let count=0;marks.between(0,s.doc.length,()=>count++);assert.equal(count,1);assert.equal(todoContext(s).heading.level,2);
});

test('Large-file reload availability never mistakes unpublished code/container/frontmatter syntax for a definition',()=>{
 const prefix=Array.from({length:1000},(_,i)=>`# Heading ${i}\nBody`).join('\n')+'\n';
 const declaration='#+SEQ_TODO: FAKE(f) | END(e)';
 for(const doc of [prefix+'```\n'+declaration+'\n```',prefix+'- item\n  '+declaration,prefix+'<div>\n'+declaration+'\n</div>','---\n'+('field: value\n').repeat(2000)+declaration+'\n---\n# Real']){
  let s=make(doc,doc.indexOf(declaration));
  assert.equal(todoDefinitionLine(s),false,'before complete tree publication');
  assert.ok(ensureSyntaxTree(s,s.doc.length,100));s=s.update({}).state;
  assert.equal(todoDefinitionLine(s),false,'after complete tree publication');
 }
 const doc=prefix+declaration;let s=make(doc,doc.indexOf(declaration));
 if(!syntaxTreeAvailable(s,s.doc.length))assert.equal(todoDefinitionLine(s),false);
 assert.ok(ensureSyntaxTree(s,s.doc.length,100));s=s.update({}).state;assert.equal(todoDefinitionLine(s),true);
});
test('Task transaction filters cannot claim success or close panel on rejected status mutation',()=>{
 const f=fixture('# TODO A',5);f.view.state=make('# TODO A',5,EditorState.transactionFilter.of(tr=>tr.docChanged?[]:tr));f.controller.open();assert.equal(f.options.choose('DONE',{state:f.view.state}),false);assert.equal(f.view.state.doc.toString(),'# TODO A');
});
test('Task colors contrast with all four editor surfaces and retain textual open/closed distinction',()=>{
 const lum=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 for(const theme of THEMES)for(const token of ['todoOpen','todoClosed']){const a=lum(theme.tokens[token]),b=lum(theme.tokens.surface);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,theme.id+token);}
 const f=fixture('# TODO A',5);f.controller.open();assert.match(f.options.entries[1].text,/offen/);assert.match(f.options.entries[2].text,/abgeschlossen/);
});

test('Actual App handler order: TASK Shift arrows outrank empty mark; all headings cycle; region/body retain Emacs selection',async()=>{
 const source=await readFile(new URL('./app.mjs',import.meta.url),'utf8'),extensions=source.slice(source.indexOf('const extensions ='),source.indexOf('const view ='));
 assert.ok(extensions.indexOf('todoKeyboard(')<extensions.indexOf('emacs.extension('));
 const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
 for(const mode of ['task','selected','body','plain']){
  const emacs=createEmacsEditing();let state;const calls=[],view={hasFocus:true,textDirectionAt:()=>0,moveByChar(range,forward){return EditorSelection.cursor(range.head+(forward?1:-1));},get state(){return state;},dispatch:spec=>{state=spec.startState?spec.state:state.update(spec).state;}};
  const controller=createTodoController({view,panel:{}}),text=mode==='plain'?'# Plain Title':'# TODO Title\nBody';
  state=make(text,mode==='body'?16:10,[todoKeyboard(id=>{calls.push(id);return controller.cycle(1);}),emacs.extension(()=>{})]);
  state=state.update({effects:setEmacsMark.of(true)}).state;
  if(mode==='selected')state=state.update({selection:{anchor:8,head:10}}).state;
  const initial=state.doc.toString(),event={key:'ArrowRight',shiftKey:true,preventDefault(){this.prevented=true;}};
  for(const {plugin} of state.facet(facet))if(plugin.domEventHandlers?.keydown?.(event,view))break;
  assert.equal(event.prevented,true,mode);
  if(mode==='task'||mode==='plain'){assert.deepEqual(calls,['todo.next']);assert.equal(state.doc.toString(),mode==='plain'?'# TODO Plain Title':'# DONE Title\nBody');assert.equal(state.selection.main.empty,true);}
  else {assert.deepEqual(calls,[]);assert.equal(state.doc.toString(),initial);assert.equal(state.selection.main.empty,false,mode);}
 }
});
