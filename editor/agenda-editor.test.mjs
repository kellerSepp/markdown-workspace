import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undoDepth,undo} from '@codemirror/commands';
import {todoRules,createTodoController} from './todo.mjs';
import {createAgendaIndex} from './agenda-index.mjs';
import {createAgendaSource} from './agenda-source.mjs';
const make=text=>EditorState.create({doc:text,extensions:[markdown({base:markdownLanguage}),todoRules,history()]});
async function fixture(){
 const disk={'a.md':'# TODO Original\n# TODO Duplicate\n# TODO Duplicate','b.md':'# TODO Other'};
 let reads=0,permissions=0,opens=0;
 const root={name:'synthetic',async *entries(){for(const path of Object.keys(disk))yield [path,{kind:'file'}];},async getFileHandle(path){reads++;return {async getFile(){return {async arrayBuffer(){return new TextEncoder().encode(disk[path]).buffer;}};}};}};
 const index=createAgendaIndex({yieldTask:async()=>{}});await index.selectVault(root);
 const view={state:make(disk['a.md'])};view.dispatch=spec=>{view.state=spec.startState?spec.state:view.state.update(spec).state;};
 const session={hasDocument:true,vault:root,path:'a.md',text:disk['a.md'],dirty:true},jumps=[],notices=[];
 const source=createAgendaSource({index,getVault:()=>root,getSession:()=>session,getState:()=>view.state,
  permission:async()=>{permissions++;},notify:m=>notices.push(m),
  jump:(from,options)=>{jumps.push({from,...options});view.dispatch({selection:{anchor:from}});},
  open:async target=>{opens++;Object.assign(session,{path:target.path,text:disk[target.path],dirty:false});view.state=make(session.text);await index.setEditor(view.state,session.path,root);}});
 return {disk,root,index,view,session,source,jumps,notices,get reads(){return reads;},get permissions(){return permissions;},get opens(){return opens;}};
}
test('RAM editor overlay updates offsets, dates and duplicates; dirty same-file follow never reads, opens or saves',async()=>{
 const f=await fixture(),old=f.index.query().find(r=>r.path==='a.md').id;
 f.view.dispatch({changes:{from:0,insert:'Intro\n\n'}});
 await f.index.setEditor(f.view.state,'a.md',f.root);
 const records=f.index.query().filter(r=>r.path==='a.md'),target=records.at(-1),reads=f.reads;
 assert.equal(records.length,3);assert.ok(records.every(r=>r.editor));assert.equal(f.index.query().find(r=>r.path==='b.md').editor,false);
 assert.equal(f.index.source(old),null);assert.equal(target.from,f.view.state.doc.toString().lastIndexOf('# TODO Duplicate'));
 assert.equal(await f.source.navigate(target.id,{follow:true}),true);
 assert.deepEqual(f.jumps,[{from:target.from,follow:true}]);assert.equal(f.reads,reads);assert.equal(f.permissions,0);assert.equal(f.opens,0);assert.equal(f.session.dirty,true);assert.equal(undoDepth(f.view.state),1);
 assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),f.disk['a.md']);
});
test('Stale editor hits cannot jump after edits; refresh never replaces RAM with saved content',async()=>{
 const f=await fixture();await f.index.setEditor(f.view.state,'a.md',f.root);const old=f.index.query()[0];
 f.view.dispatch({changes:{from:0,insert:'# TODO Newly added\n'}});
 assert.equal(await f.source.navigate(old.id,{follow:true}),false);assert.equal(f.jumps.length,0);
 await f.index.setEditor(f.view.state,'a.md',f.root);await f.index.rebuild();
 assert.equal(f.index.query().filter(r=>r.path==='a.md').length,4);
 assert.equal(await f.source.navigate(f.index.query().find(r=>r.title==='Newly added').id),true);
 assert.equal(f.opens,0);assert.equal(f.session.dirty,true);
});
test('Dirty cross-file follow stays blocked; clean cross-file open accepts its own new editor overlay',async()=>{
 const f=await fixture();await f.index.setEditor(f.view.state,'a.md',f.root);
 const target=f.index.query().find(r=>r.path==='b.md');
 assert.equal(await f.source.navigate(target.id,{follow:true}),false);assert.equal(f.opens,0);assert.equal(f.permissions,0);assert.match(f.notices.at(-1),/zuerst speichern/);
 f.session.dirty=false;assert.equal(await f.source.navigate(target.id,{follow:true}),true);
 assert.equal(f.opens,1);assert.equal(f.session.path,'b.md');assert.equal(f.index.snapshot().editorPath,'b.md');assert.equal(f.index.query().find(r=>r.path==='a.md').editor,false);assert.equal(f.jumps.at(-1).from,0);
});
test('Overlay uses loaded custom TODO rules and unsaved scheduling; vault reset drops editor state',async()=>{
 const f=await fixture();f.view.state=make('#+SEQ_TODO: NEXT(n) | FIN(f)\n## NEXT Unsaved\nSCHEDULED: <2026-11-10 Di>');
 await f.index.setEditor(f.view.state,'a.md',f.root);
 assert.deepEqual(f.index.query({type:'scheduled'}).map(r=>[r.title,r.status,r.scheduled.date]),[['Unsaved','NEXT','2026-11-10']]);
 await f.index.selectVault(null);assert.equal(f.index.snapshot().editorPath,null);assert.equal(f.index.query().length,0);
 await f.index.setEditor(f.view.state,'a.md',f.root);assert.equal(f.index.query().length,0);
});
test('Transient no-status title disambiguation matches the current editor decorations',async()=>{
 const f=await fixture();f.view.state=make('# TODO DONE Title');f.view.dispatch({selection:{anchor:3}});
 const controller=createTodoController({view:f.view,panel:{}});assert.equal(controller.cycle(-1),true);
 await f.index.setEditor(f.view.state,'a.md',f.root);assert.equal(f.index.query().some(r=>r.path==='a.md'),false);
});
test('Slow editor parsing cannot publish a previous vault after reset',async()=>{
 let release,blocked=false,yields=0;
 const gate=new Promise(resolve=>{release=resolve;});
 const index=createAgendaIndex({yieldTask:async()=>{if(blocked){yields++;await gate;}}});
 const root={name:'synthetic',async *entries(){}};await index.selectVault(root);
 const state=make(Array.from({length:12000},(_,i)=>`# TODO Task ${i}\nBody ${'text '.repeat(20)}\n`).join(''));
 blocked=true;const pending=index.setEditor(state,'large.md',root);
 assert.ok(yields>0);assert.equal(index.snapshot().editorPending,true);
 const joined=index.setEditor(state,'large.md',root);assert.equal(joined,pending,'Repeated callers must await the actual outstanding parse');
 let finished=false;joined.then(()=>{finished=true;});await Promise.resolve();assert.equal(finished,false);
 await index.selectVault(null);release();await pending;
 assert.equal(index.snapshot().editorPath,null);assert.equal(index.query().length,0);
});

test('Opening a long editor file retains all tasks beyond the initial parser viewport',async()=>{
 const f=await fixture();
 const text='Introduction '.repeat(400)+'\n\n# TODO Inbox task\nSCHEDULED: <2026-11-12 Do>\n';
 f.view.state=make(text);
 await f.index.setEditor(f.view.state,'b.md',f.root);
 assert.deepEqual(f.index.query().filter(r=>r.path==='b.md').map(r=>r.title),['Inbox task']);
 assert.equal(f.index.snapshot().editorPending,false);
 assert.equal(f.index.query().filter(r=>r.path==='a.md').length,3);
});
