import {Prec} from '@codemirror/state';
import {Decoration,EditorView,ViewPlugin} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {readChecklists} from './checklist-model.mjs';

export function checklistDecorations(state,ranges){
  const model=readChecklists(state);if(model.message)return Decoration.none;
  const marks=[];
  for(const item of model.items){
    if(!item.mark||!ranges.some(r=>item.mark.from<r.to&&item.mark.to>r.from))continue;
    const derived=item.children.some(child=>child.mark),checked=item.value==='x'?'true':item.value==='-'?'mixed':'false';
    const title=derived?'Aus Unterpunkten berechnet; bitte Unterpunkte abhaken.':'Checkbox umschalten: Klick, Enter/Leertaste oder C-c C-c auf der Listenzeile.';
    marks.push(Decoration.mark({class:'cm-checklist-marker cm-checklist-'+(checked==='true'?'done':checked==='mixed'?'partial':'open'),attributes:{role:'checkbox','aria-checked':checked,'aria-label':title,title,tabindex:'0','data-checklist-from':String(item.mark.from)}}).range(item.mark.from,item.mark.to));
  }
  return Decoration.set(marks,true);
}
export function handleChecklistMarker(event,view,execute,getContext=()=>({})){
  const target=event.target?.closest?.('[data-checklist-from]');
  if(!target||!view.contentDOM.contains(target)||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.isComposing||event.keyCode===229||event.getModifierState?.('AltGraph')||view.composing)return false;
  if(event.type==='mousedown'&&event.button!==0||event.type==='keydown'&&!['Enter',' '].includes(event.key))return false;
  const context=getContext();if(context.busy||context.hasDocument===false||view.state.readOnly||view.state.selection.ranges.length!==1||!view.state.selection.main.empty)return false;
  const from=Number(target.getAttribute('data-checklist-from')),model=readChecklists(view.state);
  if(model.message||!model.items.some(item=>item.mark?.from===from))return false;
  event.preventDefault();
  if(event.repeat)return true;
  view.dispatch({selection:{anchor:from}});
  execute('checklist.toggle');view.focus();return true;
}
export function checklistView(execute,getContext){return [
  ViewPlugin.fromClass(class{
    constructor(view){this.decorations=checklistDecorations(view.state,view.visibleRanges);}
    update(u){if(u.docChanged||u.viewportChanged||syntaxTree(u.startState)!==syntaxTree(u.state))this.decorations=checklistDecorations(u.state,u.view.visibleRanges);}
  },{decorations:v=>v.decorations}),
  Prec.highest(EditorView.domEventHandlers({
    mousedown:(e,view)=>handleChecklistMarker(e,view,execute,getContext),
    keydown:(e,view)=>handleChecklistMarker(e,view,execute,getContext)
  }))
];}
