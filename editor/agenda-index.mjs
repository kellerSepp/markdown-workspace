import {EditorState,StateEffect} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {ensureSyntaxTree,syntaxTree} from '@codemirror/language';
import {TextCodec} from './text-codec.mjs';
import {todoRules,reloadTodo,readTodoRules,DEFAULT_TODO} from './todo.mjs';
import {planningRecords,parseDate} from './planning.mjs';

const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const message=error=>`${error?.name??'Error'}: ${error?.message??error}`;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const pathValid=path=>typeof path==='string'&&path.split('/').every(part=>part&&part!=='.'&&part!=='..')&&/\.md$/i.test(path);

// Positions use the same BOM-free, LF-normalized UTF-16 document as the editor.
// No EditorView or retained source document is needed for the derived snapshot.
export async function parseAgendaFile(bytes,path,previousRules,{yieldTask=pause,current=()=>true}={}){
  const text=new TextCodec(bytes).text;
  let state=EditorState.create({doc:text,extensions:markdown({base:markdownLanguage})});
  while(!ensureSyntaxTree(state,state.doc.length,15)){if(!current())return null;await yieldTask();}
  if(!current())return null;
  const loaded=readTodoRules(state),rules=loaded.rules??previousRules??DEFAULT_TODO;
  state=state.update({effects:StateEffect.appendConfig.of(todoRules)}).state;
  if(!loaded.rules)state=state.update({effects:reloadTodo.of({rules})}).state;
  const result=planningRecords(state,path);if(result.message)throw Error(result.message);
  const diagnostics=loaded.message?[{path,kind:'todo',message:loaded.message+' Letzte gültige Regeln dieser Sitzung, sonst Standardregeln verwendet.'}]:[];
  const headings=result.records.filter(record=>{
    let node=syntaxTree(state).resolveInner(record.from,1);while(node&&!/^ATXHeading[1-6]$/.test(node.name))node=node.parent;
    return node?.parent?.name==='Document';
  }).map(record=>{
    if(record.error)diagnostics.push({path,line:state.doc.lineAt(record.from).number,kind:'planning',message:record.error});
    const stamp=value=>value?{date:value.date,startTime:value.startTime,endTime:value.endTime,...(value.repeat?{repeat:value.repeat}:{}),from:value.from,to:value.to}:null;
    return {...record,line:state.doc.lineAt(record.from).number,scheduled:stamp(record.scheduled),deadline:stamp(record.deadline)};
  });
  const byFrom=new Map(headings.map(h=>[h.from,h]));
  const records=headings.filter(h=>h.status!==null||h.scheduled||h.deadline).map(h=>{
    const ancestors=[];let parent=byFrom.get(h.parentFrom);
    while(parent){ancestors.unshift({from:parent.from,line:parent.line,level:parent.level,title:parent.title});parent=byFrom.get(parent.parentFrom);}
    return {...h,ancestors};
  });
  return {records,diagnostics,rules};
}

export function createAgendaIndex({onChange=()=>{},yieldTask=pause}={}){
  let vault=null,epoch=0,revision=0,operation=0,files=new Map(),running=false,scanDiagnostics=[];
  let snapshot=freeze({vaultName:null,epoch,revision,running:false,files:0,records:[],diagnostics:[]});
  function publish(){
    revision++;
    const records=[...files].sort(([a],[b])=>a.localeCompare(b)).flatMap(([path,file])=>file.records.map(record=>{
      const id=JSON.stringify([epoch,revision,path,record.from]);
      return {...record,id,path,file:path.split('/').at(-1),source:{epoch,revision,path,from:record.from,line:record.line,level:record.level,title:record.title}};
    }));
    snapshot=freeze({vaultName:vault?.name??null,epoch,revision,running,files:files.size,records,diagnostics:[...scanDiagnostics,...[...files.values()].flatMap(f=>f.diagnostics)]});
    onChange(snapshot);return snapshot;
  }
  async function readFile(root,path,previous,current){
    try{
      let dir=root;const parts=path.split('/');for(const part of parts.slice(0,-1)){dir=await dir.getDirectoryHandle(part);if(!current())return null;}
      const handle=await dir.getFileHandle(parts.at(-1)),file=await handle.getFile();if(!current())return null;
      const bytes=new Uint8Array(await file.arrayBuffer());if(!current())return null;
      return await parseAgendaFile(bytes,path,previous?.rules,{yieldTask,current});
    }catch(error){return {records:[],rules:previous?.rules,diagnostics:[{path,kind:'read',message:message(error)}]};}
  }
  async function rebuild(){
    if(!vault)return snapshot;
    const root=vault,token=++operation,generation=epoch,previous=files;
    const current=()=>token===operation&&generation===epoch;
    running=true;publish();const next=new Map(),diagnostics=[],directories=[{dir:root,path:''}];
    while(directories.length&&current()){
      const {dir,path}=directories.pop();
      try{
        for await(const [name,handle] of dir.entries()){
          if(!current())return snapshot;
          const entryPath=path+name;
          // Only the app-owned backup directory is excluded. Hidden user notes
          // and hidden folders otherwise remain ordinary Markdown sources.
          if(handle.kind==='directory'){
            if(name!=='.storage-spike-backups')directories.push({dir:handle,path:entryPath+'/'});
          }else if(/\.md$/i.test(name)){
            const parsed=await readFile(root,entryPath,previous.get(entryPath),current);
            if(!current())return snapshot;if(parsed)next.set(entryPath,parsed);
          }
          await yieldTask();
        }
      }catch(error){diagnostics.push({path:path||'/',kind:'directory',message:message(error)});}
      await yieldTask();
    }
    if(current()){files=next;scanDiagnostics=diagnostics;running=false;return publish();}return snapshot;
  }
  return {
    selectVault(next){vault=next;epoch++;operation++;files=new Map();scanDiagnostics=[];running=false;publish();return next?rebuild():Promise.resolve(snapshot);},
    rebuild,
    async updateFile(path,sourceVault=vault){
      // Identity is intentional: selected/recovered handles establish a new epoch.
      if(!vault||sourceVault!==vault||!pathValid(path))return snapshot;
      // A save during a full traversal restarts it to avoid dropping other files.
      if(running)return rebuild();
      const token=++operation,generation=epoch,root=vault,current=()=>token===operation&&generation===epoch;
      running=true;publish();
      const parsed=await readFile(root,path,files.get(path),current);
      if(current()&&parsed){files=new Map(files);files.set(path,parsed);running=false;return publish();}return snapshot;
    },
    snapshot:()=>snapshot,
    source(id){return snapshot.records.find(record=>record.id===id)?.source??null;},
    query({type='all',status,from,to,today}={}){
      if(from&&!parseDate(from)||to&&!parseDate(to)||today&&!parseDate(today))throw Error('Ungültiges Abfragedatum.');
      if(type==='overdue'&&!today)throw Error('Überfällig benötigt ein explizites Tagesdatum.');
      if(!['all','todo','open','closed','scheduled','deadline','overdue','day','week'].includes(type))throw Error('Unbekannte Indexabfrage.');
      if((type==='day'||type==='week')&&!from)throw Error('Tages-/Wochenabfrage benötigt ein Startdatum.');
      let until=to??from;
      if(type==='week'&&!to){const d=new Date(from+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+6);until=d.getUTCFullYear()>9999?'9999-12-31':d.toISOString().slice(0,10);}
      if(from&&until&&until<from)throw Error('Ungültiger Datumsbereich.');
      const inRange=stamp=>!!stamp&&(!from||stamp.date>=from)&&(!until||stamp.date<=until);
      return snapshot.records.filter(record=>{
        if(status!==undefined&&record.status!==status)return false;
        if(type==='todo'&&record.status===null||type==='open'&&record.closed!==false||type==='closed'&&record.closed!==true)return false;
        if(type==='scheduled')return inRange(record.scheduled);
        if(type==='deadline')return inRange(record.deadline);
        // Overdue tasks are open TODO headings with a deadline before today.
        // Statusless appointments and completed tasks are deliberately excluded.
        if(type==='overdue')return record.closed===false&&record.deadline?.date<today;
        return !from&&!to||inRange(record.scheduled)||inRange(record.deadline);
      });
    }
  };
}
