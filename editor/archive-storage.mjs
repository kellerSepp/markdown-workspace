import {read,equal,replace} from '../spike/storage.mjs';
import {TextCodec} from './text-codec.mjs';
import {inspectVaultPath,executeVaultFile,normalizeVaultFilePath} from './vault-files.mjs';
import {planArchiveAppend} from './archive-model.mjs';

const encode=value=>new TextEncoder().encode(JSON.stringify(value));
const decode=bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
const folderName='.storage-spike-backups';
const operationName=/^archive-op-[a-zA-Z0-9-]+\.json$/;
function settings(value){
  if(value===null)return {paths:[],defaultPath:'',quickConfirm:true};
  if(!value||!Array.isArray(value.paths)||typeof value.defaultPath!=='string'||typeof value.quickConfirm!=='boolean')throw Error('Ungültige Archiveinstellungen; Agenda bleibt bis zur Klärung gesperrt.');
  const paths=value.paths.map(path=>normalizeVaultFilePath(path));
  if(paths.some((path,n)=>path!==value.paths[n])||new Set(paths).size!==paths.length||value.defaultPath&&!paths.includes(value.defaultPath))throw Error('Ungültige Archivpfade in Einstellungen.');
  return {paths,defaultPath:value.defaultPath,quickConfirm:value.quickConfirm};
}
export function createArchiveStorage({locks=globalThis.navigator?.locks,id=()=>crypto.randomUUID(),now=()=>Date.now()}={}){
  async function permission(vault){if(await vault.queryPermission({mode:'readwrite'})!=='granted')throw Error('Ordnerrechte fehlen. Archivierung bleibt ausstehend.');}
  async function folder(vault){return vault.getDirectoryHandle(folderName,{create:true});}
  async function write(handle,bytes){let stream;try{stream=await handle.createWritable();await stream.write(bytes);await stream.close();stream=null;}catch(error){try{await stream?.abort();}catch{}throw error;}if(!equal(await read(handle),bytes))throw Error('Archiv-Sicherung nicht bytegleich.');}
  async function json(vault,name,value){const dir=await folder(vault);await write(await dir.getFileHandle(name,{create:true}),encode(value));}
  async function load(vault,name){const dir=await folder(vault);try{return decode(await read(await dir.getFileHandle(name)));}catch(error){if(error.name==='NotFoundError')return null;throw error;}}
  function valid(record){if(record?.version!==1||typeof record.id!=='string'||!operationName.test(`archive-op-${record.id}.json`)||!['forward','restore'].includes(record.direction)||!['pending','completed','restored'].includes(record.status))throw Error('Ungültiges Archivjournal.');for(const key of ['sourcePath','targetPath'])if(normalizeVaultFilePath(record[key])!==record[key])throw Error('Ungültiger Journalpfad.');for(const key of ['sourceBefore','sourceAfter','targetBefore','targetAfter'])if(!Array.isArray(record[key])||record[key].some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('Ungültige Journalbytes.');return record;}
  async function records(vault){const dir=await folder(vault),result=[];for await(const [name,handle] of dir.entries())if(operationName.test(name)){const record=valid(decode(await read(handle)));if(name!==`archive-op-${record.id}.json`)throw Error('Archivjournal-ID stimmt nicht überein.');result.push(record);}return result;}
  async function locked(vault,action){await permission(vault);if(!locks)throw Error('Web Locks fehlt; Archivierung blockiert.');return locks.request('storage-spike-write',async()=>{await permission(vault);return action();});}
  async function target(vault,path,create=false){const result=await inspectVaultPath(vault,path);if(result?.kind==='file')return result.handle;if(create&&result?.kind==='missing')return (await executeVaultFile(vault,path)).handle;throw Error(`Archivdatei fehlt oder Pfad ungültig: ${path}`);}
  async function handles(vault,r){const source=await target(vault,r.sourcePath),dest=await target(vault,r.targetPath);if(r.sourcePath===r.targetPath||await source.isSameEntry(dest))throw Error('Quelle und Archiv müssen verschiedene Dateien sein.');return {source,dest};}
  const bytes=(r,key)=>Uint8Array.from(r[key]);
  async function backup(vault,path,data){const name=`archive-backup-${id()}`;if(!/^[a-zA-Z0-9-]+$/.test(name))throw Error('Ungültige Sicherungs-ID.');const dir=await folder(vault);await write(await dir.getFileHandle(name+'.bak',{create:true}),data);await json(vault,name+'.json',{version:1,path,created:now(),backup:name+'.bak'});}
  async function update(vault,handle,path,before,after){return replace({handle,base:before,draft:after,backup:data=>backup(vault,path,data)});}
  async function journal(vault,r){await json(vault,`archive-op-${r.id}.json`,r);}
  async function run(vault,r){valid(r);const {source,dest}=await handles(vault,r),s=await read(source),t=await read(dest);
    const sb=bytes(r,'sourceBefore'),sa=bytes(r,'sourceAfter'),tb=bytes(r,'targetBefore'),ta=bytes(r,'targetAfter');
    if((!equal(s,sb)&&!equal(s,sa))||(!equal(t,tb)&&!equal(t,ta)))throw Error('Konflikt: Archivoperation weicht von ihren geprüften Dateiständen ab.');
    if(r.direction==='forward'){
      if(equal(s,sa)&&equal(t,tb))throw Error('Unsicherer Archivzustand: Quelle entfernt, Archiv fehlt. Wiederherstellung erforderlich.');
      if(equal(t,tb))await update(vault,dest,r.targetPath,tb,ta);
      // Recheck destination immediately before removing the source.
      if(!equal(await read(dest),ta))throw Error('Konflikt: Archiv wurde vor Quellentfernung geändert.');
      if(equal(s,sb))await update(vault,source,r.sourcePath,sb,sa);
      r.status='completed';
    }else{
      // Restore source first: failures leave two copies rather than losing content.
      if(equal(s,sa))await update(vault,source,r.sourcePath,sa,sb);
      if(!equal(await read(source),sb))throw Error('Konflikt: Wiederhergestellte Quelle wurde geändert.');
      if(equal(t,ta))await update(vault,dest,r.targetPath,ta,tb);
      r.status='restored';
    }
    await journal(vault,r);return {id:r.id,status:r.status,sourceBytes:await read(source),targetBytes:await read(dest)};
  }
  async function get(vault,key){if(typeof key!=='string'||!operationName.test(`archive-op-${key}.json`))throw Error('Ungültige Archiv-ID.');const r=await load(vault,`archive-op-${key}.json`);if(!r)throw Error('Archivoperation nicht gefunden.');return valid(r);}
  return {
    async execute({vault,sourcePath,targetPath,sourceBefore,sourceChanges,sourceAfter,archiveBlock}){return locked(vault,async()=>{
      if((await records(vault)).some(r=>r.status==='pending'))throw Error('Ausstehende Archivoperation zuerst fortsetzen oder wiederherstellen.');
      sourcePath=normalizeVaultFilePath(sourcePath);targetPath=normalizeVaultFilePath(targetPath);if(sourcePath===targetPath)throw Error('Quelle und Archiv müssen verschieden sein.');
      const source=await target(vault,sourcePath),dest=await target(vault,targetPath,true);if(await source.isSameEntry(dest))throw Error('Quelle und Archiv müssen verschieden sein.');
      const current=await read(source);if(!(sourceBefore instanceof Uint8Array)||!equal(current,sourceBefore))throw Error('Konflikt: Quelle wurde geändert.');
      const codec=new TextCodec(current);if(sourceChanges)codec.applyChanges(sourceChanges);const after=sourceAfter??codec.bytes();if(!(after instanceof Uint8Array)||equal(current,after))throw Error('Archivierung benötigt eine Quellentfernung.');
      const before=await read(dest),out=new TextCodec(before);if(typeof archiveBlock!=='string'||!archiveBlock.trim())throw Error('Archivinhalt fehlt.');
      const appended=planArchiveAppend(out.text,archiveBlock);if(appended.message)throw Error(appended.message);if(typeof appended.text!=='string'||!appended.text.startsWith(out.text))throw Error('Ungültiger Archiv-Anfügeplan.');out.applyChanges([{from:out.text.length,to:out.text.length,insert:appended.text.slice(out.text.length)}]);
      const r={version:1,id:id(),created:now(),direction:'forward',status:'pending',sourcePath,targetPath,sourceBefore:[...current],sourceAfter:[...after],targetBefore:[...before],targetAfter:[...out.bytes()]};valid(r);if(await load(vault,`archive-op-${r.id}.json`))throw Error('Archiv-ID bereits vorhanden.');await journal(vault,r);return run(vault,r);
    });},
    async list(vault){await permission(vault);return (await records(vault)).map(({id,created,direction,status,sourcePath,targetPath})=>({id,created,direction,status,sourcePath,targetPath}));},
    async resume(vault,key){return locked(vault,async()=>run(vault,await get(vault,key)));},
    async restore(vault,key){return locked(vault,async()=>{const r=await get(vault,key);if((await records(vault)).some(other=>other.id!==key&&other.status==='pending'))throw Error('Andere Archivoperation ist noch ausstehend.');r.direction='restore';r.status='pending';await journal(vault,r);return run(vault,r);});},
    async loadSettings(vault){await permission(vault);return settings(await load(vault,'archive-settings.json'));},
    async saveSettings(vault,value){return locked(vault,()=>json(vault,'archive-settings.json',settings(value)));}
  };
}
