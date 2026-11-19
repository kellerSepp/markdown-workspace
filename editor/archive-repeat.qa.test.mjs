import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState,Compartment} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {codeFolding,forceParsing} from '@codemirror/language';
import {todoRules} from './todo.mjs';
import {planArchiveBatch,runArchiveBatch} from './archive-batch.mjs';
import {planArchive} from './archive-model.mjs';
import {prepareArchiveFocus,revealArchivePosition} from './archive-focus.mjs';
import {createPrefixRouter} from './prefix-router.mjs';
import {createWorkPanel} from './work-panel.mjs';
import {createKillRing} from './kill-ring.mjs';
import {createCommandRegistry} from './command-registry.mjs';
import {commandDefinitions} from './commands.mjs';
import {applyStartupVisibility} from './startup-visibility.mjs';
const example='# Projekt A\n## DONE Angebot verschicken\nEin synthetischer Archivierungsversuch.\n:LOGBOOK:\n- Notiz zur Vorbereitung.\n:END:\n### TODO Rückmeldung prüfen\n- [ ] Offene Checkliste\n- [x] Erledigte Checkliste\n### DONE dasdasda\n### TODO Rückmeldung prüfen3\n- [ ] Offene Checkliste\n- [x] Erledigte Checkliste';
const make=(doc,anchor=0,extra=[])=>EditorState.create({doc,selection:{anchor},extensions:[markdown({base:markdownLanguage}),todoRules,codeFolding(),extra]});

test('QA clarified PO excerpt offers no recursive grandchild from Projekt but exact DONE child from Angebot',()=>{
 const project=planArchiveBatch(make(example,2),{sourcePath:'qa.md'});assert.equal(project.message,undefined);assert.equal(project.candidates.length,0);assert.equal(project.reviewScope.open,1);
 const offer=planArchiveBatch(make(example,example.indexOf('Angebot')),{sourcePath:'qa.md'});assert.equal(offer.message,undefined);assert.deepEqual(offer.candidates.map(c=>c.title),['DONE dasdasda']);assert.equal(offer.reviewScope.open,2);
});

class El{
 constructor(doc){this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.classList={toggle(){}};this.scrollTop=0;this.clientHeight=30;this.offsetHeight=30;}
 append(...els){for(const el of els){el.parent=this;this.children.push(el);}}
 replaceChildren(...els){this.children=[];this.append(...els);}
 setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(k,fn){this.listeners[k]=this.listeners[k]?.filter(f=>f!==fn);}
 click(){for(const fn of this.listeners.click??[])fn({});}remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
 get offsetTop(){return Math.max(0,this.parent?.children.indexOf(this)??0)*30;}get scrollHeight(){return this.children.length*30;}
}
test('QA actual Router/Panel/App repeat n then y returns to same Angebot scope and third run explains open children',async()=>{
 const app=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 const functions=app.slice(app.indexOf('async function archiveBatch(){'),app.indexOf('\nasync function archiveRecovery(')),runner=app.slice(app.indexOf('async function run(action) {'),app.indexOf('\nconst actionIds='));
 const doc=new EventTarget(),win=new EventTarget();Object.assign(doc,{createElement:()=>new El(doc),defaultView:win,body:{},documentElement:{},hasFocus:()=>true});doc.activeElement=doc.body;
 const editor={},editable=new Compartment(),vault={},session={vault,path:'qa.md',hasDocument:true},view={hasFocus:true,dom:{contains:e=>e===editor},scrollDOM:{scrollTop:700,scrollLeft:20,scrollHeight:3000,scrollWidth:1000,clientHeight:400,clientWidth:600},state:make(example,example.indexOf('Angebot'),editable.of(EditorState.readOnly.of(false))),dispatch(spec){this.state=this.state.update(spec).state;},focus(){assert.equal(this.state.readOnly,false);this.hasFocus=true;doc.activeElement=editor;}};
 let busy=false,saved=example,targets=0,writes=0,prompts=0,answer='n',pending;const handlers={},notices=[];
 const panel=createWorkPanel({host:new El(doc),view,ring:createKillRing(),document:doc,getContext:()=>({busy,hasDocument:true}),insert:()=>assert.fail('no ring insert')});
 const context={handlers,view,vault,session,document:doc,save(){},requireSynthetic(){},forceParsing,planArchiveBatch,runArchiveBatch,planArchive,revealArchivePosition,
  prepareArchiveFocus:(view,options)=>prepareArchiveFocus(view,{...options,document:doc}),
  archiveDialog:async()=>{targets++;view.hasFocus=false;doc.activeElement=doc.body;return {path:'archive.md',standard:true,quickConfirm:true};},archiveCandidateDialog:async candidate=>{prompts++;assert.equal(candidate.title,'DONE dasdasda');doc.activeElement=doc.body;view.hasFocus=false;return answer;},
  permission:async()=>{},normalizeVaultFilePath:p=>p,inspectVaultPath:async()=>({kind:'file',handle:{}}),
  archiveStorage:{saveSettings:async()=>{},list:async()=>[],execute:async({sourceChanges})=>{writes++;for(const c of sourceChanges)saved=saved.slice(0,c.from)+saved.slice(c.to);return {id:'qa'};}},
  agendaIndex:{rebuild:async()=>{}},read:async()=>new TextEncoder().encode(saved),TextCodec:class{constructor(bytes){this.text=new TextDecoder().decode(bytes);}},
  syncEditor:async()=>{view.state=make(saved,0,editable.of(EditorState.readOnly.of(busy)));applyStartupVisibility(view);},scan:async()=>{},syncAgendaFileSelection(){},clearTimeout(){},setTimeout(){throw Error('unexpected timer');},render(){},status:m=>notices.push(m),lock:value=>{busy=value;view.dispatch({effects:editable.reconfigure(EditorState.readOnly.of(value))});if(value){view.hasFocus=false;doc.activeElement=doc.body;}}
 };
 session.save=async()=>{};session.open=async()=>{};
 const execute=new Function(...Object.keys(context),`let busy=false,timer,persistPending=false,archiveSettings={paths:[]};const setBusy=value=>{busy=value;lock(value);};${runner}\n${functions};return handlers['archive.subtree'];`)(...Object.values(context));
 const registry=createCommandRegistry(commandDefinitions({'archive.subtree':args=>{pending=execute(args);return pending;}}),()=>({state:view.state,busy,hasDocument:true,synthetic:true,vault}));
 const hostPanelRoot=panel;let root;
 // The renderer's host is retained through the panel's shell by a fresh host.
 // Prefix row access is captured from actual choices while panel handles moves.
 let choices,selected=0,choose;
 const router=createPrefixRouter({registry,getContext:()=>({busy,hasDocument:true}),showHelp:(rows,activate,cancel,meta)=>{choices=rows;selected=rows.findIndex(r=>r.enabled);choose=activate;hostPanelRoot.showPrefix(rows,activate,cancel,meta);},hideHelp:()=>panel.close({restore:false}),moveHelp:delta=>{let next=selected;do{next=(next+delta+choices.length)%choices.length;}while(!choices[next].enabled&&next!==selected);selected=next;panel.moveSelection(delta);},activateHelp:()=>panel.activateSelection()});
 const down=(key,patch={})=>{const event={key,preventDefault(){this.prevented=true;},stopPropagation(){},...patch};router.keyDown(event,view);return event;};
 function selectKey(key){const target=choices.findIndex(c=>c.key===key);assert.ok(target>=0);for(let n=0;selected!==target&&n<50;n++)assert.equal(down('ArrowDown').prevented,true);assert.equal(selected,target);down('Enter');}
 for(const choice of ['n','y']){
  answer=choice;view.focus();const before=view.state,selection=before.selection,scroll=view.scrollDOM.scrollTop;
  down('c',{ctrlKey:true});router.keyUp({key:'c'});selectKey('u');assert.equal(view.state,before);assert.ok(view.state.selection.eq(selection));assert.equal(view.scrollDOM.scrollTop,scroll);selectKey('x');selectKey('s');
  assert.equal(await pending,true);assert.equal(view.state.doc.lineAt(view.state.selection.main.head).text,'## DONE Angebot verschicken');assert.equal(view.hasFocus,true);assert.equal(router.active,false);assert.equal(panel.isOpen,false);
 }
 assert.equal(targets,2);assert.equal(prompts,2);assert.equal(writes,1);assert.ok(view.state.doc.toString().includes('TODO Rückmeldung prüfen3'));
 down('c',{ctrlKey:true});router.keyUp({key:'c'});down('u');down('x');down('s');assert.equal(await pending,false);assert.equal(targets,2);assert.match(notices.at(-1),/Alle 2 direkten Kinder enthalten offene TODO/);panel.destroy();
});

test('QA file-scope return maps to existing body after removal and never adds scope marker text',async()=>{
 const source='# DONE Remove\nBody\n# TODO Keep\nExisting body';let state=make(source,source.indexOf('Body')+1),position;
 const plan=planArchiveBatch(state,{sourcePath:'qa.md'});assert.equal(plan.reviewScope.file,true);
 const result=await runArchiveBatch({plan,getState:()=>state,current:()=>true,confirm:async()=> 'y',archive:async c=>{state=make(state.doc.sliceString(0,c.from)+state.doc.sliceString(c.to));return true;},returnTo:p=>position=p});
 assert.equal(result.archived,1);assert.equal(state.doc.toString(),'# TODO Keep\nExisting body');assert.equal(position.scopeAvailable,true);assert.equal(state.doc.lineAt(position.anchor).text,'Existing body');
 assert.equal(planArchiveBatch(state.update({selection:{anchor:position.anchor}}).state,{sourcePath:'qa.md'}).reviewScope.file,true);
});
