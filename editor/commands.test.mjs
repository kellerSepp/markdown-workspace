import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {history,undo,redo} from '@codemirror/commands';
import {createCommandRegistry,isPaletteShortcut} from './command-registry.mjs';
import {COMMAND_METADATA,commandDefinitions} from './commands.mjs';
import {createCommandSurfaces} from './command-surfaces.mjs';
import {runFormat} from './formatting.mjs';
const state=(doc,selection)=>EditorState.create({doc,selection,extensions:[markdown({base:markdownLanguage}),history()]});
const base=s=>({state:s,busy:false,hasDocument:true,synthetic:true,vault:{},file:'test.md',draft:'test',structure:{children:true,prefix:'-'}});

test('Registry prüft IDs, sucht alle Metadaten und prüft Kontext beim Ausführen erneut',()=>{
  let context={ready:true},calls=0,reason='';
  const command={id:'test.action',name:'Fett',description:'Auswahl formatieren',category:'Formatierung',unavailable:c=>c.ready?'':'Bitte markieren.',execute:()=>++calls};
  const registry=createCommandRegistry([command],()=>context,text=>reason=text);
  for(const query of ['fett','AUSWAHL','Formatierung','fett auswahl']) assert.equal(registry.list(query).length,1);
  assert.equal(registry.list('unbekannt').length,0);assert.equal(registry.execute(command.id),1);
  context={ready:false};assert.equal(registry.execute(command.id),false);assert.equal(calls,1);assert.equal(reason,'Bitte markieren.');
  assert.throws(()=>createCommandRegistry([command,command],()=>context));
  assert.throws(()=>createCommandRegistry([{...command,id:'../external'}],()=>context));
  assert.equal(registry.execute('external.code'),false);
});
test('Registrierte Befehle unterscheiden fehlende Datei, Busy, Auswahl, Code, H1/H6 und Undo',()=>{
  let context=base(state('# Titel\nText'));const handlers=Object.fromEntries(COMMAND_METADATA.map(c=>[c.id,()=>true]));
  const registry=createCommandRegistry(commandDefinitions(handlers),()=>context);
  assert.equal(registry.list().length,96);
  assert.equal(registry.availability('structure.heading-promote').enabled,false);
  assert.equal(registry.availability('structure.heading-demote').enabled,true);
  assert.equal(registry.availability('format.bold').enabled,false);
  assert.equal(registry.availability('edit.undo').enabled,false);
  context.state=state('###### Titel');assert.equal(registry.availability('structure.heading-demote').enabled,false);
  context.state=state('```\ncode\n```',{anchor:4,head:8});assert.match(registry.availability('format.bold').reason,/Code/);
  context.state=state('Text',{anchor:0,head:4});assert.equal(registry.availability('format.bold').enabled,true);
  context.busy=true;assert.match(registry.availability('format.bold').reason,/Vorgang/);
  context.busy=false;context.hasDocument=false;assert.match(registry.availability('format.bold').reason,/Datei öffnen/);
  context.synthetic=false;assert.match(registry.availability('workspace.choose').reason,/bestätigen/);
});
test('Alt+X erlaubt keine Texteingabe, AltGr, IME, Wiederholung oder Browser-Strg+K als Trigger',()=>{
  const event={key:'x',altKey:true};assert.equal(isPaletteShortcut(event),true);
  for(const patch of [{altKey:false},{ctrlKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{repeat:true},{key:'k',ctrlKey:true,altKey:false},{getModifierState:()=>true}]) assert.equal(isPaletteShortcut({...event,...patch}),false);
});

// Small deterministic DOM model: tests interaction logic; it is not a browser/layout proof.
class Element {
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.listeners={};this.style={};this.dataset={};this.classList={toggle:()=>{}};this.isConnected=true;}
  append(...children){for(const c of children){c.parent=this;this.children.push(c);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}
  addEventListener(type,listener){(this.listeners[type]??=[]).push(listener);}removeEventListener(type,listener){this.listeners[type]=this.listeners[type]?.filter(v=>v!==listener);}
  emit(type,values={}){const e={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...values};for(const listener of this.listeners[type]??[])listener(e);return e;}
  contains(target){return target===this||this.children.some(c=>c.contains(target));}
  focus(){this.ownerDocument.activeElement=this;this.emit('focus');}click(){this.emit('click');}
  showModal(){this.open=true;}close(){this.open=false;}scrollIntoView(){}remove(){this.isConnected=false;}
  getBoundingClientRect(){return {left:0,top:0,right:300,bottom:100,width:300,height:100};}
}
function fixture(){
  const doc={createElement(tag){return new Element(tag,this);}};doc.body=new Element('body',doc);const win=new Element('window',doc);win.innerWidth=1000;win.innerHeight=800;doc.defaultView=win;doc.listeners={};doc.addEventListener=Element.prototype.addEventListener;doc.removeEventListener=Element.prototype.removeEventListener;
  const dom=new Element('editor',doc),content=new Element('content',doc);dom.append(content);doc.body.append(dom);
  const view={dom,state:state('Text',{anchor:4,head:0}),dispatch:spec=>{view.state=spec.state??view.state.update(spec).state;},focus(){content.focus();},posAtCoords(){return 2;},coordsAtPos(){return {left:20,bottom:30};}};view.focus();
  const handlers=Object.fromEntries(COMMAND_METADATA.map(c=>[c.id,()=>true]));handlers['format.bold']=()=>runFormat(view,'bold');handlers['edit.undo']=()=>undo(view);handlers['edit.redo']=()=>redo(view);
  const registry=createCommandRegistry(commandDefinitions(handlers),()=>base(view.state));
  const surfaces=createCommandSurfaces({registry,view,document:doc});
  const dialog=doc.body.children.find(c=>c.tagName==='dialog'),menu=doc.body.children.find(c=>c.attributes.role==='menu'),search=dialog.children[0].children[0],results=dialog.children[2];
  return {doc,view,content,win,registry,surfaces,dialog,menu,search,results};
}
test('Palette: Suche/Maus/Enter/Escape bewahren rückwärts gerichtete Auswahl, Fokus und Undo/Redo',()=>{
  const f=fixture(),original=f.view.state.selection;
  f.surfaces.palette();assert.equal(f.doc.activeElement,f.search);
  f.search.value='fett';f.search.emit('input');assert.equal(f.results.children.length,1);
  f.dialog.emit('keydown',{key:'Enter',target:f.search});
  assert.equal(f.dialog.open,false);assert.equal(f.view.state.doc.toString(),'**Text**');assert.equal(f.doc.activeElement,f.content);
  assert.ok(f.view.state.selection.main.anchor>f.view.state.selection.main.head);
  f.registry.execute('edit.undo');assert.equal(f.view.state.doc.toString(),'Text');f.registry.execute('edit.redo');assert.equal(f.view.state.doc.toString(),'**Text**');
  const selected=f.view.state.selection;f.surfaces.palette();f.dialog.emit('keydown',{key:'Escape'});assert.ok(f.view.state.selection.eq(selected));
  f.surfaces.palette();f.search.value='nichts-passendes';f.search.emit('input');assert.equal(f.results.children[0].textContent,'Keine passenden Befehle.');f.surfaces.close();assert.equal(original.main.anchor,4);
});
test('Kontextmenü: Mausziel, Auswahlformatierung, Tastatur, Escape und Browserausnahme',()=>{
  const f=fixture();
  let event=f.view.dom.emit('contextmenu',{target:f.content,clientX:20,clientY:20,shiftKey:true});assert.equal(event.defaultPrevented,undefined);assert.equal(f.menu.hidden,true);
  event=f.view.dom.emit('contextmenu',{target:f.content,clientX:20,clientY:20});assert.equal(event.defaultPrevented,true);assert.equal(f.menu.hidden,false);
  f.menu.children.find(row=>row.dataset.command==='format.bold').click();assert.equal(f.view.state.doc.toString(),'**Text**');assert.equal(f.doc.activeElement,f.content);
  const original=f.view.state.selection;f.view.dispatch({selection:{anchor:0}});f.view.dom.emit('contextmenu',{target:f.content,clientX:20,clientY:20});assert.equal(f.view.state.selection.main.head,2);f.menu.emit('keydown',{key:'Escape'});assert.equal(f.view.state.selection.main.head,0);
  f.view.dispatch({selection:original});event=f.win.emit('keydown',{target:f.content,key:'F10',shiftKey:true});assert.equal(event.defaultPrevented,true);assert.equal(f.menu.hidden,false);
  f.menu.emit('keydown',{key:'ArrowDown'});assert.equal(f.doc.activeElement,f.menu.children[1]);f.menu.emit('keydown',{key:'Escape'});assert.ok(f.view.state.selection.eq(original));f.surfaces.destroy();
});
test('Gamebook führt Registry-IDs/Name/Kategorie vollständig, zusätzliche Wünsche brauchen Freigabe',async()=>{
  const book=await readFile(new URL('../docs/COMMAND_GAMEBOOK.md',import.meta.url),'utf8');
  const rows=book.split('\n').filter(line=>/^\| `/.test(line));
  const implemented=rows.filter(line=>line.includes('| Implementiert |'));
  assert.equal(implemented.length,COMMAND_METADATA.length);
  for(const command of COMMAND_METADATA) assert.ok(implemented.some(line=>line.startsWith('| `'+command.id+'` | '+command.name+' | '+command.category+' |')),command.id);
  for(const command of COMMAND_METADATA.filter(c=>c.orgShortcut)) assert.ok(rows.some(line=>line.startsWith('| `'+command.id+'` | '+command.orgShortcut+' | '+command.shortcut+' |')),command.id+' Org-/Workspace-Kürzel');
  assert.match(book,/keine Implementierungsfreigabe/);
});
test('Paletten-Kürzelübersicht zeigt Org und Workspace getrennt und bleibt per Maus/Tastatur erreichbar',()=>{
  const f=fixture();f.surfaces.palette();
  const toggle=f.dialog.children.find(c=>c.textContent==='Kürzelübersicht');assert.ok(toggle);
  toggle.click();assert.equal(toggle.attributes['aria-pressed'],'true');
  const line=f.results.children.find(c=>c.dataset.command==='edit.line-up');assert.ok(line);
  assert.match(line.children[1].textContent,/Org: M-S-UP/);assert.match(line.children[1].textContent,/Workspace: Alt\+Umschalt\+Oben/);
  assert.ok(!f.results.children.some(c=>c.dataset.command==='workspace.choose'));
  f.search.value='M-S-RIGHT';f.search.emit('input');assert.ok(f.results.children.some(c=>c.dataset.command==='structure.heading-demote-subtree'));
  f.dialog.emit('keydown',{key:'Escape'});assert.equal(f.doc.activeElement,f.content);
});
