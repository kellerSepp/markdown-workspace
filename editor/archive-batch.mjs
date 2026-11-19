import {orgHeadings} from './org-folding.mjs';
import {todoRules,DEFAULT_TODO} from './todo.mjs';
import {planArchive} from './archive-model.mjs';
import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';

const rulesKey=state=>JSON.stringify(state.field(todoRules,false)?.rules??DEFAULT_TODO);
function archiveHeadings(state){
 return orgHeadings(state).filter(h=>{
  let node=syntaxTree(state).resolveInner(h.from,1);
  while(node&&!/^ATXHeading[1-6]$/.test(node.name))node=node.parent;
  return node?.parent?.name==='Document';
 });
}
export function planArchiveBatch(state,{sourcePath,now=new Date()}={}){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'Dokument noch nicht vollständig analysiert.'};
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return {message:'Sammelarchivierung benötigt einen Cursor ohne Auswahl.'};
  // The shared outline also indexes headings inside quotes/lists for local
  // folding. Those examples must never become archive scopes or candidates.
  const headings=archiveHeadings(state);
  const scope=headings.find(h=>h.lineFrom===state.doc.lineAt(state.selection.main.head).from);
  const onHeading=!!scope;
  const offered=onHeading?headings.filter(h=>h.parent===scope&&h.container===scope.container):headings.filter(h=>h.level===1);
  const candidates=[];let openCandidates=0;
  for(const child of offered){
    const candidateState=state.update({selection:{anchor:child.from}}).state;
    const plan=planArchive(candidateState,{sourcePath,now});
    if(plan.message)return {message:plan.message};
    if(!plan.openTasks)candidates.push({from:plan.sourceChange.from,to:plan.sourceChange.to,original:plan.original,title:plan.title});else openCandidates++;
  }
  return {candidates,sourceText:state.doc.toString(),rulesKey:rulesKey(state),reviewScope:{file:!onHeading,anchor:state.selection.main.head,title:onHeading?state.doc.lineAt(scope.from).text:'',total:offered.length,open:openCandidates}};
}

// Exact expected source plus mapped offsets identifies candidates, even when
// titles are duplicated. No title matching or new broad scan after mutation.
export async function runArchiveBatch({plan,getState,current,confirm,archive,notify=()=>{},returnTo=()=>{}}){
  let expected=plan.sourceText,removed=0,archived=0,skipped=0,returnAnchor=plan.reviewScope?.anchor??0;
  const valid=()=>current()&&getState().doc.toString()===expected&&rulesKey(getState())===plan.rulesKey;
  function finish(result){
    if(valid()){
      const state=getState(),anchor=Math.min(returnAnchor,state.doc.length);
      if(!plan.reviewScope?.file)returnTo({anchor,scopeAvailable:true});
      else {
        const headers=new Set(archiveHeadings(state).map(h=>h.lineFrom)),line=state.doc.lineAt(anchor);
        if(!headers.has(line.from))returnTo({anchor,scopeAvailable:true});
        else {
          let closest=null;
          for(let number=1;number<=state.doc.lines;number++){
            const next=state.doc.line(number);
            if(!headers.has(next.from)&&(!closest||Math.abs(next.from-anchor)<Math.abs(closest.from-anchor)))closest=next;
          }
          returnTo({anchor:closest?.from??anchor,scopeAvailable:!!closest});
        }
      }
    }
    return result;
  }
  for(let index=0;index<plan.candidates.length;index++){
    if(!valid()){notify('Sammelarchivierung gestoppt: Quelle oder Regeln geändert.');return {archived,skipped,stopped:true};}
    const original=plan.candidates[index],candidate={...original,from:original.from-removed,to:original.to-removed};
    if(getState().doc.sliceString(candidate.from,candidate.to)!==candidate.original){notify('Sammelarchivierung gestoppt: Kandidat geändert.');return {archived,skipped,stopped:true};}
    const choice=await confirm({...candidate,index:index+1,total:plan.candidates.length,archived});
    if(choice===null||choice==='cancel')return finish({archived,skipped,cancelled:true});
    if(!valid()){notify('Sammelarchivierung gestoppt: Quelle geändert.');return {archived,skipped,stopped:true};}
    if(choice==='n'){skipped++;continue;}
    if(choice!=='y')return {archived,skipped,stopped:true};
    const next=expected.slice(0,candidate.from)+expected.slice(candidate.to);
    let success;
    try{success=await archive(candidate,expected);}
    catch(error){notify(`Sammelarchivierung gestoppt: ${error.message}. Bereits abgeschlossene Schritte bleiben gespeichert.`);return {archived,skipped,stopped:true};}
    if(success!==true||!current()||getState().doc.toString()!==next){notify('Sammelarchivierung gestoppt. Bereits abgeschlossene Schritte bleiben gespeichert.');return {archived,skipped,stopped:true};}
    if(returnAnchor>=candidate.to)returnAnchor-=candidate.to-candidate.from;
    else if(returnAnchor>=candidate.from)returnAnchor=candidate.from;
    expected=next;removed+=candidate.to-candidate.from;archived++;
  }
  return finish({archived,skipped});
}
