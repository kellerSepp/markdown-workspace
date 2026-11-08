import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo} from '@codemirror/commands';
import {todoRules} from '../editor/todo.mjs';
import {parseDate,timestamp,parseTimestamp,planningContext,planPlanning,planningRecords} from '../editor/planning.mjs';
import {createPlanningForm,monthCells} from '../editor/planning-calendar.mjs';
import {createWorkPanel} from '../editor/work-panel.mjs';
import {createKillRing} from '../editor/kill-ring.mjs';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {ensureSyntaxTree} from '@codemirror/language';
import {todoKeyboard,todoCycleAbortCleanup} from '../editor/todo.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createEmacsEditing} from '../editor/emacs-editing.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
let checks=0;const check=fn=>{fn();checks++;};
const make=(doc,pos=0)=>EditorState.create({doc,selection:{anchor:pos},extensions:[markdown(),history(),todoRules]});
const val={date:'2028-02-29',startTime:'09:01',endTime:'10:31'};
for(let level=1;level<=6;level++)for(const prefix of ['','TODO ','NEXT '])for(const kind of ['SCHEDULED','DEADLINE'])check(()=>{
 const head='#'.repeat(level)+' '+prefix+'Titel 😀',source=head+'\nNotizen\n###### Kind';let s=make(source,head.length);const p=planPlanning(s,kind,val);assert.ok(p.spec);s=s.update(p.spec).state;assert.equal(s.doc.toString(),head+'\n'+kind+': <2028-02-29 Di 09:01-10:31>\nNotizen\n###### Kind');
 const view={get state(){return s;},dispatch(t){s=t.startState?t.state:s.update(t).state;}};const changed=s.doc.toString();for(let n=0;n<10;n++){assert.ok(undo(view));assert.equal(s.doc.toString(),source);assert.ok(redo(view));assert.equal(s.doc.toString(),changed);}
 s=s.update(planPlanning(s,kind,null).spec).state;assert.equal(s.doc.toString(),source);
});
for(const sep of [' ','  ','\t','\n'])for(const order of [['SCHEDULED','DEADLINE'],['DEADLINE','SCHEDULED']])for(const remove of order)check(()=>{
 const field=k=>k+': <2026-11-07 Sa>';const source='# H\n'+field(order[0])+sep+field(order[1])+'\nNote';const s=make(source),p=planPlanning(s,remove,null);assert.ok(p.spec);assert.equal(s.update(p.spec).state.doc.toString(),'# H\n'+field(order.find(x=>x!==remove))+'\nNote');
});
for(const date of ['0001-01-01','2000-02-29','2024-02-29','9999-12-31'])check(()=>assert.ok(parseDate(date)));
for(const date of ['0000-01-01','1900-02-29','2100-02-29','2026-02-29','2026-06-31','2026-00-01','2026-01-00','26-01-01'])check(()=>assert.equal(parseDate(date),null));
for(const times of [{startTime:'24:00'},{startTime:'23:59',endTime:'00:01'},{endTime:'12:00'},{startTime:'9:00'},{startTime:'12:60'}])check(()=>assert.ok(timestamp({date:'2026-11-07',...times}).message));
for(const text of ['<2026-11-07 Mon>','<2026-11-07>','<2026-11-07 Mo.>'])check(()=>assert.equal(parseTimestamp(text).text,'<2026-11-07 Sa>'));
for(const text of ['<2026-11-07 Sa +1w>','<2026-11-07 Sa -1d>','[2026-11-07 Sa]','<2026-11-07 Sa>--<2026-11-08 So>'])check(()=>assert.ok(parseTimestamp(text).message));
for(const body of ['SCHEDULED: <bad>','SCHEDULED: <2026-11-07 Sa> SCHEDULED: <2026-11-08 So>','\nSCHEDULED: <2026-11-07 Sa>','SCHEDULED: <2026-11-07 Sa>\n\nDEADLINE: <2026-11-08 So>','SCHEDULED: <2026-11-07 Sa> OTHER: x'])check(()=>assert.ok(planPlanning(make('# H\n'+body),'DEADLINE',val).message));
for(const code of ['```\nSCHEDULED: <bad>\n# fake\n```','~~~\nDEADLINE: <bad>\n~~~','    SCHEDULED: <bad>','> SCHEDULED: <bad>'])check(()=>assert.ok(planPlanning(make('# H\n'+code),'SCHEDULED',val).spec));
check(()=>{const doc='# Parent\nSCHEDULED: <2026-11-07 Sa>\n## Child\nDEADLINE: <2026-11-08 So>\nBody';const s=make(doc,doc.indexOf('Body')),p=planPlanning(s,'SCHEDULED',val);assert.equal(s.update(p.spec).state.doc.toString(),doc.replace('## Child\n','## Child\nSCHEDULED: <2028-02-29 Di 09:01-10:31>\n'));});
check(()=>{const s=make('#+SEQ_TODO: NEXT(n) | FIN(f)\n# NEXT Parent\nSCHEDULED: <2026-11-07 Sa>\n## FIN Child\nDEADLINE: <2026-11-08 So>');const r=planningRecords(s,'sample.md').records;assert.equal(r[0].status,'NEXT');assert.equal(r[1].closed,true);assert.equal(r[1].parentFrom,r[0].from);assert.equal(r[0].file,'sample.md');});
class El{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=90;this.offsetHeight=30;this.classList={toggle(){}};}
 append(...els){for(const e of els){e.parent=this;this.children.push(e);}}replaceChildren(...els){this.children=[];this.append(...els);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f);}removeEventListener(k,f){this.listeners[k]=this.listeners[k]?.filter(x=>x!==f);}
 emit(type,props={}){const e={key:'',target:this,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...props};for(const f of this.listeners[type]??[])f(e);return e;}
 focus(){this.ownerDocument.activeElement=this;}click(){this.emit('click');}remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}get offsetTop(){return 0;}get scrollHeight(){return this.children.length*30;}
}
const doc={createElement(tag){return new El(tag,this);},defaultView:new El('window')};
const find=(el,pred)=>pred(el)?el:el.children.map(c=>find(c,pred)).find(Boolean);
for(let n=0;n<100;n++)check(()=>{
 const commits=[],form=createPlanningForm({document:doc,kind:'DEADLINE',value:{date:'2026-11-07'},commit:v=>commits.push(v),cancel(){}});const root=form.root,input=root.children[0].children[0];
 find(root,e=>e.textContent==='Nächster Monat').click();assert.equal(input.value,'2026-11-07');find(root,e=>e.attributes['aria-label']==='2026-12-01').click();assert.equal(input.value,'2026-12-01');find(root,e=>e.textContent==='Übernehmen').click();assert.equal(commits[0].date,'2026-12-01');
 const all=[];(function walk(e){all.push(e);e.children.forEach(walk);})(root);root.parent=new El('host',doc);form.destroy();assert.equal(all.reduce((n,e)=>n+Object.values(e.listeners).reduce((a,b)=>a+b.length,0),0),0);
});
for(const key of ['Escape','g']){
 const host=new El('host',doc),state=make('# H'),view={state,hasFocus:true,focus(){},scrollDOM:{scrollTop:0,scrollLeft:0,scrollHeight:1000,clientHeight:500,scrollWidth:1000,clientWidth:500}};
 const panel=createWorkPanel({host,view,ring:createKillRing(),insert:()=>false,getContext:()=>({hasDocument:true}),document:doc});panel.openPlanning({kind:'SCHEDULED',value:null,choose:()=>true});const root=host.children[0],close=root.children[0].children[1];
 check(()=>{root.emit('keydown',{target:close,key,ctrlKey:key==='g'});assert.equal(panel.isOpen,false);});panel.destroy();
}
const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
for(const follow of ['s','d'])for(const patch of [{},{repeat:true},{shiftKey:true},{altKey:true},{metaKey:true},{isComposing:true},{getModifierState:()=>true}])check(()=>{
 let state,calls=[];const view={hasFocus:true,get state(){return state;},dispatch(spec){state=state.update(spec).state;}};
 const registry=createCommandRegistry(commandDefinitions({'planning.scheduled':()=>calls.push('s'),'planning.deadline':()=>calls.push('d')}),()=>({state,hasDocument:true}));const prefix=createPrefixRouter({registry}),emacs=createEmacsEditing();
 state=EditorState.create({doc:'# H',selection:{anchor:2},extensions:[todoCycleAbortCleanup(),prefix.extension(),todoKeyboard(()=>{}),emacs.extension(()=>{}),markdown(),history(),todoRules]});
 const send=(type,key,p={})=>{const e={type,key,preventDefault(){this.prevented=true;},...p};for(const x of state.facet(facet)){if(x.plugin.domEventHandlers?.[type]?.(e,view)){e.preventDefault();break;}}return e;};
 send('keydown','c',{ctrlKey:true});send('keyup','c');const event=send('keydown',follow,{ctrlKey:true,...patch});if(!Object.keys(patch).length){assert.deepEqual(calls,[follow]);assert.equal(event.prevented,true);}else assert.deepEqual(calls,[]);
});
check(()=>{let s=make('# TODO\tTitel\nSCHEDULED: <2026-11-07 Sa>');const r=planningRecords(s).records[0];assert.equal(r.status,'TODO');assert.equal(r.title,'Titel');});
const large=Array.from({length:2000},(_,i)=>`## TODO Item ${i}\nSCHEDULED: <2026-11-07 Sa>\nBody`).join('\n');let largeState=make(large);ensureSyntaxTree(largeState,largeState.doc.length,2000);largeState=largeState.update({}).state;
const started=performance.now();const records=planningRecords(largeState,'large.md');check(()=>assert.equal(records.records?.length,2000));console.log('records2000_ms',performance.now()-started);
console.log(JSON.stringify({checks}));
