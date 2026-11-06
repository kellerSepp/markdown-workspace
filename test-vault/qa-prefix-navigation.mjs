import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {history,undoDepth} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {createWorkPanel,completeRingSearch} from '../editor/work-panel.mjs';
import {createKillRing} from '../editor/kill-ring.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {structureKeyboard} from '../editor/structure-keymap.mjs';
class E {
 constructor(doc){Object.assign(this,{ownerDocument:doc,children:[],listeners:{},attributes:{},value:'',scrollTop:0,clientHeight:24,offsetHeight:24,classList:{toggle(){}}});}
 append(...xs){for(const x of xs){x.parent=this;this.children.push(x);}}
 replaceChildren(...xs){this.children=[];this.append(...xs);} get offsetTop(){return this.parent.children.indexOf(this)*24;} get scrollHeight(){return this.children.length*24;}
 setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f);} removeEventListener(k,f){this.listeners[k]=this.listeners[k].filter(x=>x!==f);}
 emit(k,e={}){for(const f of this.listeners[k]??[])f({target:this,preventDefault(){},...e});} click(){if(!this.disabled)this.emit('click');}
 focus(){} remove(){this.parent.children=this.parent.children.filter(x=>x!==this);} scrollIntoView(){assert.fail('ancestor scroll');}
}
const t0=performance.now(),heap0=process.memoryUsage().heapUsed;
let cases=0;
function run(mode='normal'){
 const win={scrollX:19,scrollY:700,scrollTo(){assert.fail('unexpected page scroll');}},doc={defaultView:win,createElement(){return new E(doc);}},host=new E(doc),ring=createKillRing(),ctx={busy:false},calls=[],org=[];
 const view={hasFocus:true,scrollDOM:{scrollTop:900,scrollLeft:70,scrollHeight:4000,clientHeight:400,scrollWidth:1800,clientWidth:600},focus(){this.hasFocus=true;},setTabFocusMode(){}};
 let panel,router;
 router=createPrefixRouter({registry:{get:id=>({name:id}),availability:id=>({enabled:mode!=='disabled'&&id!=='fold.reveal',reason:'synthetic'}),execute:id=>{if(!ctx.blocked)calls.push(id);return !ctx.blocked;}},getContext:()=>ctx,showHelp:(...a)=>panel.showPrefix(...a),hideHelp:()=>panel.close({restore:false}),moveHelp:d=>panel.moveSelection(d),activateHelp:()=>panel.activateSelection()});
 view.state=EditorState.create({doc:'# Synthetic\nBody\n## Child\nMore',selection:{anchor:10,head:2},extensions:[history(),markdown(),router.extension(),structureKeyboard(()=>true,()=>{},id=>org.push(id))]});
 const original=view.state,facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
 const dispatch=(type,key,p={})=>{const e={type,key,preventDefault(){this.defaultPrevented=true;},...p};for(const {plugin} of original.facet(facet)){if(plugin.domEventHandlers?.[type]?.(e,view)){e.preventDefault();break;}}return e;};
 panel=createWorkPanel({host,view,ring,document:doc,getContext:()=>ctx,insert:()=>assert.fail('unexpected insertion')});
 const root=host.children[0],results=root.children[3];
 dispatch('keydown','c',{ctrlKey:true});
 if(mode==='gate'){dispatch('keydown','Enter');assert.equal(calls.length,0);assert.equal(router.active,false);}
 else {
 dispatch('keyup','c');dispatch('keydown','Alt',{altKey:true,code:'AltLeft',location:1});
 assert.equal(router.active,true);dispatch('keydown','ArrowDown',{altKey:true});dispatch('keydown','ArrowDown',{altKey:true,repeat:true});dispatch('keydown','ArrowUp',{altKey:true,repeat:true});
 assert.equal(dispatch('keyup','Alt',{code:'AltLeft',location:1}).defaultPrevented,true);
 panel.refresh();ring.add('synthetic completion');assert.equal(results.children.length,3);
 if(mode==='normal'){assert.equal(results.children[2].attributes['aria-selected'],'true');assert.equal(results.scrollTop,48);}
 const guards={ime:{isComposing:true},ime229:{keyCode:229},altgr:{getModifierState:()=>true},rightAlt:{code:'AltRight',location:2},ctrl:{ctrlKey:true,altKey:true},shift:{shiftKey:true,altKey:true},meta:{metaKey:true,altKey:true}}; if(guards[mode]){dispatch('keydown',mode==='rightAlt'?'Alt':'ArrowDown',guards[mode]);assert.equal(router.active,false,mode);} if(mode==='busy')ctx.busy=true;
 if(mode==='focus')view.hasFocus=false;
 if(mode==='state')view.state=original.update({selection:{anchor:0}}).state;
 if(mode==='availability')ctx.blocked=true;
 if(mode==='escape')dispatch('keydown','Escape');
 else if(mode==='cg')dispatch('keydown','g',{ctrlKey:true});
 else if(['1','2','3'].includes(mode))dispatch('keydown',mode);
 else {dispatch('keydown','Enter',{repeat:true});assert.equal(calls.length,0);dispatch('keydown','Enter');dispatch('keydown','Enter',{repeat:true});}
 assert.equal(calls.length,['normal','1','2','3'].includes(mode)?1:0,mode);
 }
 router.cancel();assert.equal(results.children.length,0);assert.equal(root.hidden,true);
 assert.equal(view.state.doc.toString(),original.doc.toString());assert.equal(undoDepth(view.state),0);
 assert.deepEqual([view.scrollDOM.scrollTop,view.scrollDOM.scrollLeft,win.scrollX,win.scrollY],[900,70,19,700]);
 view.hasFocus=true;view.state=original.update({selection:{anchor:2}}).state;dispatch('keydown','ArrowDown',{altKey:true});assert.equal(org.length,1);
 ctx.busy=false;ring.add('synthetic completion');panel.openRing();const search=root.children[1];search.value='synt';search.emit('input');root.emit('keydown',{key:'Tab',target:search});assert.equal(search.value,'synthetic completion');
 const old=[...results.children];panel.close();for(const row of old){assert.equal(row.textContent,'');assert.equal(row.listeners.click.length,0);assert.equal(row.listeners.mouseenter.length,0);}
 panel.destroy();assert.equal(host.children.length,0);assert.equal(root.listeners.keydown.length,0);cases++;
}
for(const mode of ['normal','disabled','gate','busy','focus','state','availability','escape','cg','1','2','3','ime','ime229','altgr','rightAlt','ctrl','shift','meta'])run(mode);
for(let i=0;i<100;i++)run();
assert.equal(completeRingSearch('😀',[{text:'😀alpha'},{text:'😀alpine'}]).value,'😀alp');
console.log(JSON.stringify({cases,lifecycleCycles:100,durationMs:performance.now()-t0,heapStart:heap0,heapEnd:process.memoryUsage().heapUsed,native:false}));



