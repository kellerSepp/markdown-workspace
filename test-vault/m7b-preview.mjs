// Synthetic rendering/keyboard harness. No File System Access or real vaults.
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {createAgendaIndex} from '../editor/agenda-index.mjs';
import {createAgendaView} from '../editor/agenda-view.mjs';
import {createPrefixRouter} from '../editor/prefix-router.mjs';
import {createCommandRegistry} from '../editor/command-registry.mjs';
import {commandDefinitions} from '../editor/commands.mjs';
import {THEMES,applyTheme} from '../editor/themes.mjs';
import main from './m7b-agenda/project.md';
import team from './m7b-agenda/team/project.md';
import year from './m7b-agenda/team/jahreswechsel.md';

const $=id=>document.getElementById(id),entries={'project.md':main,'team/project.md':team,'team/jahreswechsel.md':year},encoder=new TextEncoder();
const directory=prefix=>({name:'synthetic-m7b',async *entries(){const names=new Set();for(const path of Object.keys(entries)){if(!path.startsWith(prefix))continue;const rest=path.slice(prefix.length),name=rest.split('/')[0];if(names.has(name))continue;names.add(name);yield [name,{kind:rest.includes('/')?'directory':'file'}];}},async getDirectoryHandle(name){return directory(prefix+name+'/');},async getFileHandle(name){return {async getFile(){return {async arrayBuffer(){return encoder.encode(entries[prefix+name]).buffer;}};}};}});
let agenda;const index=createAgendaIndex({onChange:s=>agenda?.update(s)});
const registry=createCommandRegistry(commandDefinitions({
  'agenda.dispatch':()=>agenda.openDispatcher(),'agenda.week':()=>agenda.openWeek(),'agenda.todo':()=>agenda.openTodos(),'agenda.refresh':()=>index.rebuild()
}),()=>({busy:false,synthetic:true,vault:{},hasDocument:true,agendaActive:!!agenda?.active,state:view.state}));
const prefix=createPrefixRouter({registry,getContext:()=>({busy:false,hasDocument:true}),showHelp:choices=>{$('previewStatus').textContent='C-c · '+choices.filter(c=>c.enabled).map(c=>c.key+' '+c.name).join(' · ');},hideHelp:()=>{$('previewStatus').textContent='Synthetische Vorschau: echte Agendaansicht und Präfixrouter, keine Speicher-/Dateisystemabnahme.';}});
const view=new EditorView({parent:$('editor'),state:EditorState.create({doc:main,extensions:[markdown(),prefix.extension()]})});
agenda=createAgendaView({index,host:$('workPanel'),workspace:$('editorWorkspace'),view,execute:id=>registry.execute(id),onClose:()=>view.focus(),now:()=>new Date(2026,10,8,12),navigate:async id=>{
  const source=index.source(id);if(!source)return false;
  view.setState(EditorState.create({doc:entries[source.path],extensions:[markdown(),prefix.extension()]}));
  view.dispatch({selection:{anchor:source.from},effects:EditorView.scrollIntoView(source.from,{y:'center'})});
  $('previewStatus').textContent=`Vorschauquelle ${source.path}:${source.line}; Produktion nutzt zusätzlichen Quell-/Dirtyschutz.`;return true;
}});
$('openAgenda').addEventListener('click',()=>registry.execute('agenda.dispatch'));
$('theme').replaceChildren(...THEMES.map(t=>new Option(t.name,t.id)));$('theme').addEventListener('change',()=>applyTheme(document.documentElement,$('theme').value));applyTheme(document.documentElement,'midnight');
await index.selectVault(directory(''));view.focus();
