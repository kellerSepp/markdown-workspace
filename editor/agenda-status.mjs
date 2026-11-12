import {createWorkPanel} from './work-panel.mjs';
import {createTodoController} from './todo.mjs';
import {sameAgendaEditorTarget} from './agenda-editor-target.mjs';

// An alternate host for the existing status controller, never a second editor.
// Loading uses the established source adapter. Only an initially foreign source
// may opt into the app's existing save path after an actual status edit.
export function createAgendaStatus({host,editor,view,ring,getContext,navigate,getSource=()=>null,saveForeign=null,onSaving=()=>{},cancelNavigation=()=>{},isActive,onClose=()=>{},focusAgenda=()=>{},notify=()=>{},document:doc=globalThis.document,now}){
  let operation=0,shown=false,disposed=false,saving=false,targetSource=null,foreign=false;
  const sameSource=(a,b)=>a===b||!!a&&!!b&&a.session===b.session&&a.vault===b.vault&&a.path===b.path;
  const hide=()=>{if(!shown)return;shown=false;host.hidden=true;editor.hidden=false;onClose();};
  const panel=createWorkPanel({host,view,ring,getContext,notify,document:doc,onClose:hide,focusAfterClose:focusAgenda,
    sameTarget:(a,b)=>sameSource(targetSource,getSource())&&sameAgendaEditorTarget(a,b)});
  async function persistForeign(source,doc,token){
    let feedback;
    try{
      if(disposed||token!==operation||!sameSource(source,getSource())||view.state.doc!==doc)throw Error('Speicherziel hat sich geändert.');
      const result=await saveForeign({source,doc});
      feedback=`Status gespeichert: ${source.path}${result?.backupName?' · Sicherung: '+result.backupName:''}`;
    }catch(error){feedback='Status geändert; automatisches Speichern nicht bestätigt: '+(error.message??String(error))+'. Bitte Quelle prüfen und gegebenenfalls ausdrücklich speichern.';}
    finally{saving=false;onSaving(false);}
    notify(feedback);
  }
  const statusPanel={openChoices(options){return panel.openChoices({...options,choose:(name,saved)=>{
    const before=view.state.doc,source=targetSource,token=operation,shouldSave=foreign;
    const applied=options.choose(name,saved);
    if(applied&&shouldSave&&saveForeign&&view.state.doc!==before){
      const doc=view.state.doc;saving=true;onSaving(true);
      queueMicrotask(()=>{void persistForeign(source,doc,token);});
    }
    return applied;
  }});}};
  const todo=createTodoController({view,panel:statusPanel,getContext,notify,...(now?{now}:{})});
  return {
    async open(id,{current=()=>true}={}){
      const context=getContext();
      if(disposed||shown||saving||context.busy||context.hasDocument!==false&&view.state.readOnly)return false;
      const token=++operation,initialSource=getSource();
      if(!await navigate(id,{follow:true})||disposed||token!==operation||!current()||!isActive())return false;
      targetSource=getSource();foreign=!!targetSource&&!sameSource(initialSource,targetSource);
      shown=true;editor.hidden=true;host.hidden=false;
      if(todo.open())return true;
      hide();return false;
    },
    close(){operation++;cancelNavigation();panel.close({restore:false});hide();},
    invalidateStale(){panel.invalidateStale();},
    get active(){return shown||saving;},
    get saving(){return saving;},
    destroy(){if(disposed)return;operation++;panel.destroy();hide();disposed=true;}
  };
}
