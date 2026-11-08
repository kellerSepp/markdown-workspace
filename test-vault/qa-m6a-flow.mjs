import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules} from '../editor/todo.mjs';
import {planningNormalization} from '../editor/planning-normalization.mjs';
import {createPlanningController} from '../editor/planning.mjs';
import {createWorkPanel} from '../editor/work-panel.mjs';
import {createKillRing} from '../editor/kill-ring.mjs';
import {TextCodec} from '../editor/text-codec.mjs';
let checks=0;const check=f=>{f();checks++;};
const make=(doc,extra=[])=>EditorState.create({doc,extensions:[markdown(),history(),todoRules,planningNormalization,extra]});
for(let level=1;level<=6;level++)for(const kind of ['SCHEDULED','DEADLINE'])for(const spaces of [' ','\t','  '])check(()=>{
 const text='#'.repeat(level)+' TODO H\n'+kind+': <2026-11-07'+spaces+'Sa 15:00-17:00>\nNote';let state=make(text),p=text.indexOf('07');const view={get state(){return state;},dispatch(spec){state=spec.startState?spec.state:state.update(spec).state;}};
 view.dispatch({changes:{from:p,to:p+2,insert:'09'},selection:{anchor:p+2},userEvent:'input.type'});const changed=text.replace('07'+spaces+'Sa','09'+spaces+'Mo');assert.equal(state.doc.toString(),changed);assert.equal(state.selection.main.head,p+2);assert.equal(undoDepth(state),1);
 for(let n=0;n<10;n++){assert.ok(undo(view));assert.equal(state.doc.toString(),text);assert.ok(redo(view));assert.equal(state.doc.toString(),changed);}
});
for(const stamp of ['<2026-11-07>','<2026-11-07 Mo 08:00>','<2026-11-07 Mo 08:00-10:00>'])check(()=>{
 const source='# H\nSCHEDULED: <2026-11-07 Sa>\nDEADLINE: <2026-11-30 Di>';const s=make(source),p=source.indexOf('<'),to=source.indexOf('>')+1;const tr=s.update({changes:{from:p,to,insert:stamp},selection:{anchor:p+stamp.length},userEvent:'input.paste'});assert.equal(tr.state.doc.toString(),source.replace('<2026-11-07 Sa>',stamp.includes('Mo')?stamp.replace('Mo','Sa'):stamp.replace('>',' Sa>')));assert.equal(tr.state.selection.main.head,p+(stamp.includes('Mo')?stamp.length:stamp.length+3));
});
for(const wrap of [x=>'```\n# H\n'+x+'\n```',x=>'---\n'+x+'\n---',x=>'# H\n\n'+x,x=>'# H\n'+x+' SCHEDULED: <2026-11-08 So>',x=>'# H\n'+x.replace('>',' +1w>'),x=>'> # H\n> '+x])check(()=>{
 const text=wrap('SCHEDULED: <2026-11-07 Sa>'),p=text.indexOf('07'),s=make(text);assert.equal(s.update({changes:{from:p,to:p+2,insert:'09'},userEvent:'input.type'}).state.doc.toString(),text.replace('07','09'));
});
for(const userEvent of ['undo','redo','input.planning',undefined])check(()=>{
 const text='# H\nSCHEDULED: <2026-11-07 Sa>',p=text.indexOf('07');assert.equal(make(text).update({changes:{from:p,to:p+2,insert:'09'},userEvent}).state.doc.toString(),text.replace('07','09'));
});
check(()=>{const text='# H\nSCHEDULED: <2026-11-07 Sa>',p=text.indexOf('07');let state=make(text);state=state.update({changes:{from:p,to:p+2,insert:'39'},userEvent:'input.type'}).state;assert.match(state.doc.toString(),/39 Sa/);state=state.update({changes:{from:p,to:p+2,insert:'09'},userEvent:'input.type'}).state;assert.match(state.doc.toString(),/09 Mo/);});
check(()=>{const text='# H\nSCHEDULED: <2026-11-07 Sa>\nDEADLINE: <2026-11-07 Sa>',positions=[text.indexOf('07'),text.lastIndexOf('07')],s=make(text,EditorState.allowMultipleSelections.of(true));const tr=s.update({changes:positions.map(p=>({from:p,to:p+2,insert:'09'})),selection:EditorSelection.create(positions.map(p=>EditorSelection.cursor(p+2))),userEvent:'input.type'});assert.equal(tr.state.doc.toString(),text.replaceAll('07 Sa','09 Mo'));assert.equal(tr.state.selection.ranges.length,2);});
check(()=>{const raw='\ufeff# H\r\nSCHEDULED: <2026-11-07 Mo 15:00>\r\nOther\nTail';const codec=new TextCodec(new TextEncoder().encode(raw)),s=make(codec.text),p=codec.text.indexOf('15:00'),tr=s.update({changes:{from:p,to:p+5,insert:'16:30'},userEvent:'input.type'}),edits=[];tr.changes.iterChanges((from,to,_a,_b,insert)=>edits.push({from,to,insert:insert.toString()}));codec.applyChanges(edits);assert.equal(new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes()),raw.replace('Mo 15:00','Sa 16:30'));});
class El{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.value='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=90;this.offsetHeight=30;this.classList={toggle(){}};}
 append(...els){for(const e of els){e.parent=this;this.children.push(e);}}replaceChildren(...els){this.children=[];this.append(...els);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}removeEventListener(k,f){this.listeners[k]=this.listeners[k]?.filter(x=>x!==f);}
 emit(type,p={}){const e={key:'',target:this,preventDefault(){this.prevented=true;},stopPropagation(){},...p};for(const f of [...this.listeners[type]??[]])f(e);return e;}click(p){this.emit('click',p);}focus(){this.ownerDocument.activeElement=this;}remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}get offsetTop(){return 0;}get scrollHeight(){return this.children.length*30;}
}
const all=root=>[root,...root.children.flatMap(all)],find=(root,p)=>all(root).find(p);
function fixture(text){const doc={createElement(tag){return new El(tag,this);},defaultView:new El('window')},host=new El('host',doc),context={hasDocument:true},ring=createKillRing();let state=make(text),panel;
 const view={hasFocus:true,get state(){return state;},scrollDOM:{scrollTop:0,scrollLeft:0,scrollHeight:1000,clientHeight:500,scrollWidth:1000,clientWidth:500},focus(){this.hasFocus=true;doc.activeElement='editor';},dispatch(spec){const tr=spec.startState?spec:state.update(spec);state=tr.state;panel.invalidateStale();}};
 panel=createWorkPanel({host,view,ring,insert:()=>false,getContext:()=>context,document:doc});return {doc,host,context,view,panel,controller:createPlanningController({view,panel,getContext:()=>context})};}
for(const times of ['', ' 15:00',' 15:00-17:00'])for(const mode of ['click','Enter',' '])check(()=>{
 const text='# H\nSCHEDULED: <2026-11-07 Sa'+times+'>',f=fixture(text);assert.ok(f.controller.open('SCHEDULED'));const root=f.host.children[0],day=find(root,e=>e.attributes['aria-label']==='2026-11-09');assert.ok(day);if(mode==='click')day.click();else day.emit('keydown',{key:mode});assert.equal(f.view.state.doc.toString(),text.replace('07 Sa','09 Mo'));assert.equal(f.panel.isOpen,false);assert.equal(f.doc.activeElement,'editor');assert.equal(undoDepth(f.view.state),1);assert.ok(undo(f.view));assert.equal(f.view.state.doc.toString(),text);f.panel.destroy();
});
for(const mode of ['click','Enter',' '])check(()=>{const f=fixture('# H');f.controller.open('DEADLINE');const root=f.host.children[0],form=find(root,e=>e.className==='planning-form'),input=find(root,e=>e.attributes['aria-label']==='Datum (YYYY-MM-DD)');input.value='2026-11-09';input.emit('input');assert.equal(f.view.state.doc.toString(),'# H');assert.equal(all(form).filter(e=>e.tagName==='input').length,1);assert.ok(!find(root,e=>e.textContent==='Übernehmen'));const day=find(root,e=>e.attributes['aria-label']==='2026-11-09');if(mode==='click')day.click();else day.emit('keydown',{key:mode});assert.equal(f.view.state.doc.toString(),'# H\nDEADLINE: <2026-11-09 Mo>');assert.equal(f.panel.isOpen,false);f.panel.destroy();});
for(const patch of [{repeat:true},{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])check(()=>{const f=fixture('# H');f.controller.open('SCHEDULED');const root=f.host.children[0],day=find(root,e=>/^\d{4}-/.test(e.attributes['aria-label']??''));day.emit('keydown',{key:'Enter',...patch});assert.equal(f.view.state.doc.toString(),'# H');assert.equal(f.panel.isOpen,true);f.panel.destroy();});
for(const key of ['Escape','g'])check(()=>{const f=fixture('# H');f.controller.open('SCHEDULED');const root=f.host.children[0],close=root.children[0].children[1];root.emit('keydown',{target:close,key,ctrlKey:key==='g'});assert.equal(f.panel.isOpen,false);assert.equal(f.view.state.doc.toString(),'# H');f.panel.destroy();});
check(()=>{const f=fixture('# H');f.controller.open('SCHEDULED');const root=f.host.children[0],input=find(root,e=>e.attributes['aria-label']==='Datum (YYYY-MM-DD)'),form=find(root,e=>e.className==='planning-form');input.value='2026-11-09';input.emit('input');form.emit('keydown',{target:input,key:'Enter'});assert.equal(f.panel.isOpen,false);assert.equal(f.view.state.doc.toString(),'# H\nSCHEDULED: <2026-11-09 Mo>');f.panel.destroy();});
for(const mode of ['cursor','busy'])check(()=>{const f=fixture('# H');f.controller.open('SCHEDULED');const root=f.host.children[0],day=find(root,e=>/^\d{4}-/.test(e.attributes['aria-label']??''));if(mode==='cursor')f.view.dispatch({selection:{anchor:1}});else f.context.busy=true;day.click();assert.equal(f.view.state.doc.toString(),'# H');f.panel.destroy();});
check(()=>{const text='# H\nSCHEDULED: <2026-11-07 Sa>',p=text.indexOf('07'),s=make(text,EditorState.readOnly.of(true));assert.equal(s.update({changes:{from:p,to:p+2,insert:'09'},userEvent:'input.type'}).state.doc.toString(),text.replace('07','09'));});
check(()=>{const f=fixture('# H\nSCHEDULED: <2026-11-07 Sa>');f.controller.open('SCHEDULED');const root=f.host.children[0],actions=find(root,e=>e.className==='planning-actions'),grid=find(root,e=>e.className==='planning-months');assert.ok(root.children.at(-1).children.indexOf(actions)<root.children.at(-1).children.indexOf(grid));find(root,e=>e.textContent==='Entfernen').click();assert.equal(f.view.state.doc.toString(),'# H\n');assert.equal(f.panel.isOpen,false);f.panel.destroy();});
console.log({checks});
