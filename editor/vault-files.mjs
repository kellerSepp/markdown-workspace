// Vault-local file access only. Creation never opens a writable stream.
// Callers own UI, permissions, dirty-document checks and session persistence.
const internalNames=new Set(['.storage-spike-backups','.git','.codex','.agents','.github','.aws','.ssh','node_modules']);
const reserved=/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]|conin\$|conout\$)(?:\.|$)/iu;
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const live=options=>options.current?.()!==false;
const notFound=error=>error?.name==='NotFoundError';
const mismatch=error=>error?.name==='TypeMismatchError';

function component(name,{directory=false,partial=false}={}){
  if(!name||name==='.'||name==='..'||name.length>255||!name.isWellFormed()||/[<>:"|?*\u0000-\u001f\u007f/\\]/u.test(name))throw Error('Ungültiger Dateiname im Vault-Pfad.');
  if(!partial&&(/[. ]$/u.test(name)||reserved.test(name)))throw Error('Dateiname ist unter Windows reserviert oder endet mit Punkt/Leerzeichen.');
  if(internalNames.has(name.toLowerCase())||name.startsWith('.#')||directory&&name.startsWith('.'))throw Error('Interner oder versteckter Verwaltungsordner/-name ist für diese Dateifunktion gesperrt.');
  return name;
}
function pathParts(input,{partial=false}={}){
  if(typeof input!=='string'||input.length>1024||!input.isWellFormed())throw Error('Vault-Pfad muss ein gültiger Text mit höchstens 1024 Zeichen sein.');
  const normalized=input.replaceAll('\\','/');
  if(normalized.startsWith('/')||normalized.includes(':'))throw Error('Nur relative Pfade innerhalb des gewählten Vaults verwenden.');
  if(normalized==='')return {parts:[],trailing:false,normalized};
  const trailing=normalized.endsWith('/'),parts=normalized.split('/');if(trailing)parts.pop();
  for(let n=0;n<parts.length;n++)component(parts[n],{directory:n<parts.length-1||trailing,partial:partial&&n===parts.length-1&&!trailing});
  return {parts,trailing,normalized};
}
function markdownName(name){
  component(name);
  const file=name.includes('.')?name:name+'.md';
  if(!/\.md$/iu.test(file))throw Error('Nur Markdown-Dateien mit der Endung .md öffnen oder anlegen.');
  component(file);return file;
}
export function normalizeVaultFilePath(input){
  const {parts,trailing}=pathParts(input);
  if(!parts.length||trailing)throw Error('Eine Markdown-Datei innerhalb eines vorhandenen Ordners angeben.');
  return [...parts.slice(0,-1),markdownName(parts.at(-1))].join('/');
}
function actualName(handle,fallback,{directory=false}={}){return component(typeof handle?.name==='string'?handle.name:fallback,{directory});}
function contextual(error,path,operation){
  const wrapped=new Error(`${path||'/'}: ${operation}: ${error?.message??String(error)}`,{cause:error});
  wrapped.name=error?.name??'Error';wrapped.path=path;return wrapped;
}
async function parentDirectory(vault,parts,options){
  let directory=vault;const names=[];
  if(!directory)throw Error('Zuerst einen Vault wählen.');
  for(const part of parts){
    if(!live(options))return null;
    directory=await directory.getDirectoryHandle(part);if(!live(options))return null;
    names.push(actualName(directory,part,{directory:true}));
  }
  return {directory,names};
}
async function lookup(vault,input,options){
  const {parts,trailing}=pathParts(input);if(!live(options))return null;
  if(!parts.length){if(!vault)throw Error('Zuerst einen Vault wählen.');return {result:{kind:'directory',path:'',handle:vault}};}
  const parent=await parentDirectory(vault,parts.slice(0,-1),options);if(!parent||!live(options))return null;
  const rawName=parts.at(-1);
  // Folder names without .md stay navigable rather than becoming foo.md.
  try{
    const handle=await parent.directory.getDirectoryHandle(rawName);if(!live(options))return null;
    const name=actualName(handle,rawName,{directory:true});
    return {result:{kind:'directory',path:[...parent.names,name].join('/')+'/',handle}};
  }catch(error){if(!live(options))return null;if(!notFound(error)&&!mismatch(error))throw error;if(trailing)throw error;}
  const fileName=markdownName(rawName),path=[...parent.names,fileName].join('/');
  try{
    const handle=await parent.directory.getFileHandle(fileName);if(!live(options))return null;
    return {...parent,fileName,result:{kind:'file',path:[...parent.names,actualName(handle,fileName)].join('/'),handle}};
  }catch(error){if(!live(options))return null;if(!notFound(error))throw error;return {...parent,fileName,result:{kind:'missing',path}};}
}
export async function inspectVaultPath(vault,input,options={}){
  try{return (await lookup(vault,input,options))?.result??null;}
  catch(error){if(!live(options))return null;throw contextual(error,input,'Pfad prüfen');}
}

// Enumeration is read-only and local to the typed parent directory. A truncated
// list is explicitly incomplete and never provides an automatic completion.
export async function completeVaultPath(vault,input='',{current=()=>true,yieldTask=pause,maxEntries=5000}={}){
  const options={current};
  try{
    if(!Number.isInteger(maxEntries)||maxEntries<1)throw Error('Ungültige Vervollständigungsgrenze.');
    const {parts,trailing,normalized}=pathParts(input,{partial:true}),leaf=trailing?'':parts.at(-1)??'',parents=trailing?parts:parts.slice(0,-1);
    const parent=await parentDirectory(vault,parents,options);if(!parent||!live(options))return null;
    const candidates=[],needle=leaf.toLocaleLowerCase('de');let scannedEntries=0,incomplete=false;
    for await(const [name,handle] of parent.directory.entries()){
      if(!live(options))return null;
      if(++scannedEntries>maxEntries){incomplete=true;break;}
      if(scannedEntries%50===0){await yieldTask();if(!live(options))return null;}
      const directory=handle.kind==='directory';
      try{component(name,{directory});if(!directory&&!/\.md$/iu.test(name))continue;}catch{continue;}
      if(name.toLocaleLowerCase('de').startsWith(needle))candidates.push({kind:directory?'directory':'file',path:[...parent.names,name].join('/')+(directory?'/':'')});
    }
    if(!live(options))return null;
    candidates.sort((a,b)=>(a.kind==='directory'?0:1)-(b.kind==='directory'?0:1)||a.path.localeCompare(b.path,'de'));
    let value=normalized;
    if(!incomplete&&candidates.length===1)value=candidates[0].path;
    else if(!incomplete&&candidates.length>1){let common=candidates[0].path;for(const candidate of candidates.slice(1)){const left=Array.from(common),right=Array.from(candidate.path);let n=0;while(n<left.length&&left[n]===right[n])n++;common=left.slice(0,n).join('');}if(common.length>normalized.length)value=common;}
    return {value,candidates,incomplete,scannedEntries,message:incomplete?`Mehr als ${maxEntries} Verzeichniseinträge; Liste unvollständig, keine automatische Vervollständigung. Pfad weiter eingrenzen.`:candidates.length?'':'Keine passenden Markdown-Dateien oder Ordner gefunden.'};
  }catch(error){if(!live(options))return null;throw contextual(error,input,'Pfad vervollständigen');}
}

// The caller must lock cancellation during onCommit(true): FSA creation and the
// existing session.open are not abortable. External creators may win the race;
// creationRequested therefore deliberately does not claim exclusive creation.
export async function executeVaultFile(vault,input,{current=()=>true,onCommit=()=>{},open}={}){
  const options={current};let target,creationRequested=false;
  try{
    const found=await lookup(vault,input,options);if(!found||!live(options))return null;
    target=found.result;
    if(target.kind==='directory')throw Error('Einen Dateinamen angeben; Ordner werden nicht automatisch angelegt.');
    onCommit(true);
    try{
      if(!live(options))return null;
      if(target.kind==='missing'){
        creationRequested=true;
        const handle=await found.directory.getFileHandle(found.fileName,{create:true});
        target={kind:'file',path:[...found.names,actualName(handle,found.fileName)].join('/'),handle};
        if(!live(options))return {...target,creationRequested,stale:true,opened:false,message:'Vorgang überholt; die Datei kann bereits leer angelegt sein. Kein Quellsprung ausgeführt.'};
      }
      if(!live(options))return null;
      if(open)await open({vault,handle:target.handle,path:target.path,creationRequested});
      return {...target,creationRequested,stale:!live(options),opened:!!open};
    }finally{onCommit(false);}
  }catch(error){
    if(!creationRequested&&!live(options))return null;
    const wrapped=contextual(error,target?.path??input,'Datei öffnen/anlegen');wrapped.creationRequested=creationRequested;
    if(creationRequested)wrapped.message+=' Die Datei kann bereits vorhanden oder neu leer angelegt sein; sie wird nicht automatisch gelöscht.';
    throw wrapped;
  }
}
