import {parseAgendaFile} from './agenda-index.mjs';
import {TextCodec} from './text-codec.mjs';

const sameRecord=(a,b)=>a.from===b.from&&a.level===b.level&&a.title===b.title&&a.status===b.status&&a.closed===b.closed&&JSON.stringify(a.scheduled)===JSON.stringify(b.scheduled)&&JSON.stringify(a.deadline)===JSON.stringify(b.deadline);
// Source adapter performs reads and delegates opening to the established session.
// No source IDs are guessed from titles, and no dirty editor is replaced.
export function createAgendaSource({index,getVault,getSession,getState,open,jump,permission=async()=>{},onCommit=()=>{},notify=()=>{}}){
  let operation=0;
  return {cancel(){operation++;},async navigate(id,{follow=false}={}){
    const token=++operation,snapshot=index.snapshot(),record=snapshot.records.find(r=>r.id===id),vault=getVault(),session=getSession(),state=getState();
    const current=()=>token===operation&&getVault()===vault&&getSession()===session&&getState()===state&&index.snapshot().epoch===snapshot.epoch&&index.snapshot().revision===snapshot.revision;
    try{
      if(!record||!index.source(id))throw Error('Quelle ist veraltet. Agenda bitte aktualisieren und Eintrag erneut wählen.');
      if(snapshot.running)throw Error('Index wird noch gelesen. Bitte das Ende abwarten.');
      if(session.dirty)throw Error('Ungespeicherte Editoränderungen: Bitte vor dem Quellsprung ausdrücklich speichern. Der Entwurf bleibt unverändert.');
      await permission();if(!current())return false;
      let dir=vault;const parts=record.path.split('/');
      if(parts.some(p=>!p||p==='.'||p==='..'))throw Error('Ungültiger Quellenpfad.');
      for(const part of parts.slice(0,-1)){dir=await dir.getDirectoryHandle(part);if(!current())return false;}
      const handle=await dir.getFileHandle(parts.at(-1)),file=await handle.getFile();if(!current())return false;
      const bytes=new Uint8Array(await file.arrayBuffer());if(!current())return false;
      const parsed=await parseAgendaFile(bytes,record.path,undefined,{current});if(!current()||!parsed)return false;
      const target=parsed.records.find(r=>sameRecord(r,record));
      if(!target||parsed.diagnostics.length)throw Error('Quelldatei oder Regeln haben sich geändert. Agenda neu einlesen; Sprung wurde verworfen.');
      if(!current()||session.dirty)return false;
      const text=new TextCodec(bytes).text;
      // The app runs this adapter under its existing busy gate. The session
      // performs its own permission/persistence checks when opening a new file.
      if(session.hasDocument&&session.vault===vault&&session.path===record.path){
        if(session.text!==text)throw Error('Geöffnete Datei ist extern geändert. Bitte erneut öffnen und Agenda aktualisieren.');
        jump(target.from,{follow});return true;
      }
      // session.open cannot be interrupted after it starts. Keep the view in a
      // short explicit commit phase rather than promising an ineffective close.
      onCommit(true);
      try{await open({vault,handle,path:record.path});}finally{onCommit(false);}
      if(token!==operation||getVault()!==vault||getSession()!==session||session.dirty||index.snapshot().epoch!==snapshot.epoch||index.snapshot().revision!==snapshot.revision){notify('Quellnavigation überholt. Bitte Eintrag im aktuellen Index erneut wählen.');return false;}
      // session.open reads again; reject a changed second read before selecting.
      if(session.text!==text){notify('Quelle hat sich während des Öffnens geändert. Datei geladen; Agenda aktualisieren, kein Positionssprung.');return false;}
      jump(target.from,{follow});return true;
    }catch(error){notify(error.message??String(error));return false;}
  }};
}
