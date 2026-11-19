import {EditorView} from '@codemirror/view';
import {foldedRanges,unfoldEffect} from '@codemirror/language';

// Archive reloads the source into a new editor state. Restore its useful edit
// position only after the busy lock is removed, never during the file write.
export function revealArchivePosition(view,position){
  const anchor=Math.max(0,Math.min(position,view.state.doc.length)),effects=[];
  foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>{if(anchor>from&&anchor<to)effects.push(unfoldEffect.of({from,to}));});
  effects.push(EditorView.scrollIntoView(anchor,{y:'center'}));view.dispatch({selection:{anchor},effects});
}
export function prepareArchiveFocus(view,{getContext,vault,path,document:doc=globalThis.document,allowFocusTarget=()=>false}){
  const editorOrBody=element=>element===doc.body||element===doc.documentElement||view.dom.contains(element);
  let moved=!doc.hasFocus()||!editorOrBody(doc.activeElement),target=null;
  const focus=event=>{if(!editorOrBody(event.target)&&!allowFocusTarget(event.target))moved=true;};
  const blur=()=>{moved=true;};
  doc.addEventListener('focusin',focus);doc.defaultView?.addEventListener('blur',blur);
  return {
    complete(sourceDoc,anchor){target={doc:sourceDoc,anchor};},
    finish(){
      doc.removeEventListener('focusin',focus);doc.defaultView?.removeEventListener('blur',blur);
      const context=getContext(),session=context.session;
      if(!target||moved||!doc.hasFocus()||!editorOrBody(doc.activeElement)||context.vault!==vault||session?.vault!==vault||session?.path!==path||!session?.hasDocument||view.state.doc!==target.doc||view.state.readOnly)return;
      revealArchivePosition(view,target.anchor);view.focus();
    }
  };
}
