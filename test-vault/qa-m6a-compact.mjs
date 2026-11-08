import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {history,undoDepth} from '@codemirror/commands';
import {ensureSyntaxTree} from '@codemirror/language';
import {todoRules,todoKeyboard,todoCycleAbortCleanup} from '../editor/todo.mjs';
import {planningDecorations} from '../editor/planning-highlight.mjs';
import {createPlanningForm} from '../editor/planning-calendar.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createEmacsEditing} from '../editor/emacs-editing.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
import {THEMES} from '../editor/themes.mjs';
import {editorTheme} from '../editor/theme-editor.mjs';
import {readFile} from 'node:fs/promises';
let checks=0;const check=f=>{f();checks++;};
const make=(doc,extra=[])=>EditorState.create({doc,extensions:[markdown(),history(),todoRules,extra]});
const marks=(s,ranges=[{from:0,to:s.doc.length}])=>{const out=[];planningDecorations(s,ranges).between(0,s.doc.length,(from,to,d)=>out.push({from,to,text:s.doc.sliceString(from,to),spec:d.spec}));return out;};
for(const theme of THEMES)for(let level=1;level<=6;level++)for(const kind of ['SCHEDULED','DEADLINE'])for(const times of ['',' 10:00',' 10:00-12:00'])check(()=>{
 const text='#'.repeat(level)+' TODO Title\n'+kind+': <2026-11-07 Sa'+times+'>\nText';const s=make(text,editorTheme(theme)),m=marks(s);assert.deepEqual(m.map(x=>x.text),[kind+':','<2026-11-07 Sa'+times+'>']);assert.equal(s.doc.toString(),text);assert.equal(undoDepth(s),0);assert.ok(m.every(x=>!x.spec.attributes?.role&&!x.spec.attributes?.onclick));
 const css=s.facet(EditorView.styleModule).map(x=>x.getRules()).join('\n');for(const token of ['keyword','timestamp'])assert.ok(css.includes(`.cm-planning-${token} * {color: var(--planning-${token})`));assert.ok(css.includes('text-decoration: underline'));assert.equal(marks(s,[{from:0,to:2}]).length,0);
});
for(const text of ['---\nSCHEDULED: <2026-11-07 Sa>\n---','```\n# H\nSCHEDULED: <2026-11-07 Sa>\n```','> # H\n> SCHEDULED: <2026-11-07 Sa>','- # H\n  SCHEDULED: <2026-11-07 Sa>','# H\nSCHEDULED: <bad>','# H\n\nDEADLINE: <2026-11-07 Sa>','# H\nSCHEDULED: <2026-11-07 Sa> SCHEDULED: <2026-11-08 So>'])check(()=>assert.equal(marks(make(text)).length,0));
class El{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.value='';}
 append(...els){for(const e of els){e.parent=this;this.children.push(e);}}replaceChildren(...els){this.children=[];this.append(...els);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}removeEventListener(k,f){this.listeners[k]=this.listeners[k]?.filter(x=>x!==f);}
 emit(type,p={}){const e={key:'',target:this,preventDefault(){this.prevented=true;},stopPropagation(){},...p};for(const f of this.listeners[type]??[])f(e);return e;}click(){this.emit('click');}focus(){this.ownerDocument.activeElement=this;}remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
}
const doc={createElement(tag){return new El(tag,this);}},all=root=>[root,...root.children.flatMap(all)],find=(root,p)=>all(root).find(p);
for(const date of ['2026-01-15','2026-12-31','2024-02-29','0001-01-01','9999-12-31'])check(()=>{
 const form=createPlanningForm({document:doc,kind:'SCHEDULED',value:{date},commit(){},cancel(){}}),root=form.root;
 const days=()=>all(root).filter(e=>e.tagName==='button'&&/^\d{4}-\d{2}-\d{2}$/.test(e.attributes['aria-label']??''));assert.equal(days().filter(e=>e.tabIndex===0).length,1);
 const chosen=find(root,e=>e.attributes['aria-label']===date);assert.equal(chosen.attributes['aria-pressed'],'true');const input=find(root,e=>e.attributes['aria-label']==='Datum (YYYY-MM-DD)');
 for(const label of ['Voriger Monat','Nächster Monat']){find(root,e=>e.textContent===label).click();assert.equal(input.value,date);assert.equal(days().filter(e=>e.tabIndex===0).length,1);}
 const frozen=input.value;for(const patch of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}]){days()[0].emit('keydown',{key:'ArrowRight',...patch});assert.equal(input.value,frozen);}
 const before=all(root);root.parent=new El('host',doc);form.destroy();assert.equal(before.reduce((n,e)=>n+Object.values(e.listeners).reduce((a,b)=>a+b.length,0),0),0);
});
const facet=ViewPlugin.define(()=>({})).extension.at(-1).facet;
for(const follow of ['s','d'])for(const patch of [{},{ctrlKey:true},{repeat:true},{shiftKey:true},{altKey:true},{metaKey:true},{isComposing:true},{getModifierState:()=>true}])check(()=>{
 let state,calls=[];const view={hasFocus:true,get state(){return state;},dispatch(spec){state=state.update(spec).state;}};const registry=createCommandRegistry(commandDefinitions({'planning.scheduled':()=>calls.push('s'),'planning.deadline':()=>calls.push('d')}),()=>({state,hasDocument:true})),prefix=createPrefixRouter({registry}),emacs=createEmacsEditing();
 state=make('# H',[todoCycleAbortCleanup(),prefix.extension(),todoKeyboard(()=>{}),emacs.extension(()=>{})]);const send=(type,key,p={})=>{const e={key,preventDefault(){this.prevented=true;},...p};for(const x of state.facet(facet)){if(x.plugin.domEventHandlers?.[type]?.(e,view)){e.preventDefault();break;}}return e;};
 assert.equal(send('keydown',follow,{ctrlKey:true}).prevented,undefined,'native Ctrl combo outside prefix untouched');send('keydown','c',{ctrlKey:true});send('keyup','c');const event=send('keydown',follow,patch);if(!Object.keys(patch).length){assert.deepEqual(calls,[follow]);assert.equal(event.prevented,true);}else assert.deepEqual(calls,[]);
});
const large=Array.from({length:2000},(_,i)=>`## TODO H${i}\nSCHEDULED: <2026-11-07 Sa>`).join('\n');let s=make(large);ensureSyntaxTree(s,s.doc.length,2000);s=s.update({}).state;const range=[{from:0,to:s.doc.line(2).to}];let t=performance.now();assert.equal(marks(s,range).length,2);const cold=performance.now()-t;t=performance.now();for(let i=0;i<1000;i++){const next=s.update({selection:{anchor:i%s.doc.length}}).state;assert.equal(marks(next,range).length,2);}console.log({coldMs:cold,warm1000Ms:performance.now()-t,checks});
const css=await readFile(new URL('../editor/styles.css',import.meta.url),'utf8');check(()=>{assert.match(css,/planning-calendar-month\s*\{[^}]*font-family:var\(--font-editor\)/);assert.match(css,/planning-grid\s*\{[^}]*repeat\(7,3ch\)[^}]*font-family:var\(--font-editor\)/);assert.match(css,/planning-form\s*\{[^}]*overflow:auto/);});
for(const theme of THEMES)check(()=>{const state=make('# H\nSCHEDULED: <2026-11-07 Sa>',editorTheme(theme)),text=state.doc.toString();for(let i=0;i<20;i++){const next=state.update({selection:{anchor:i%text.length}}).state;assert.equal(marks(next).length,2);assert.equal(next.doc.toString(),text);assert.equal(undoDepth(next),0);}});
console.log({finalChecks:checks});
