import {StateEffect,Prec,Transaction} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {invertedEffects,undo,redo} from '@codemirror/commands';

// Each effect carries both endpoints of this isolated move. Inversion swaps
// them, so later cursor movement cannot replace the original move destination.
export const refileSelection=StateEffect.define({map:(value,changes)=>({...value,selection:value.selection.map(changes)})});
export function refileHistory(){return [
  invertedEffects.of(tr=>tr.effects.filter(effect=>effect.is(refileSelection))
    .map(({value})=>refileSelection.of({selection:value.inverse,inverse:value.selection}))),
  // CM's built-in beforeinput handler calls native history directly. Route only
  // these history inputs through the same scoped executor as Registry actions.
  Prec.highest(EditorView.domEventHandlers({beforeinput(event,view){
    const action=event.inputType==='historyUndo'?undoRefile:event.inputType==='historyRedo'?redoRefile:null;
    if(!action)return false;
    event.preventDefault();action(view);return true;
  }}))
];}
function historyCommand(action,{state,dispatch}){
  return action({state,dispatch:tr=>{
    const selection=tr.effects.find(effect=>effect.is(refileSelection))?.value.selection;
    // Keep the original CM transaction intact, including its opaque history
    // annotations (not public API). Batch an unrecorded selection correction in
    // the same view update. The single text-history event stays unchanged.
    dispatch(selection?[tr,tr.state.update({selection,filter:false,
      annotations:Transaction.addToHistory.of(false),userEvent:'select.refile-history',scrollIntoView:true})]:tr);
  }});
}
export const undoRefile=target=>historyCommand(undo,target);
export const redoRefile=target=>historyCommand(redo,target);
