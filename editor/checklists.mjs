import {EditorState,Transaction} from '@codemirror/state';
import {ensureSyntaxTree} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {readChecklists,checklistContext,checklistEdits} from './checklist-model.mjs';
import {checklistRepairMapping} from './checklist-transaction.mjs';
export {readChecklists,checklistContext} from './checklist-model.mjs';

function scope(context){
  const heading=context.heading??context.item?.heading;
  return heading?{from:heading.from,to:heading.end}:context.item?.root;
}
export function checklistReason(state,id){
  const c=checklistContext(state);if(c.message)return c.message;
  if(id==='refresh')return '';
  if(!c.item)return 'Cursor muss auf der ersten Listenpunktzeile stehen.';
  if(c.item.error)return c.item.error;
  if(id==='marker')return c.item.children.some(child=>child.mark)?'Elterncheckbox mit Unterpunkten: Marker unverändert lassen.':'';
  if(!c.item.mark)return 'Listenpunkt hat keine Checkbox.';
  return c.item.children.some(child=>child.mark)?'Elterncheckbox wird aus den Unterpunkten berechnet; bitte diese abhaken.':'';
}
export function checklistConfirmReason(state){
  const c=checklistContext(state);if(c.message)return c.message;
  if(c.heading?.error)return c.heading.error;
  if(c.heading?.cookie)return '';
  return checklistReason(state,'toggle');
}
// Compose marker edits and all dependent repairs before dispatch. History sees
// exactly one transaction, including selection mapping across changing counts.
export function planChecklist(state,id='toggle'){
  const c=checklistContext(state);if(c.message)return c;
  if(id==='confirm')id=c.heading?.cookie?'section':'toggle';
  if(!['toggle','marker','section','refresh'].includes(id))return {message:'Unbekannter Checklistenbefehl.'};
  if(id!=='section'){
    const reason=checklistReason(state,id);if(reason)return {message:reason};
  }
  if(id==='section'&&!c.heading?.cookie)return {message:'Überschrift hat keinen Fortschrittszähler.'};
  let changes=state.changes([]);
  if(id==='toggle')changes=state.changes({from:c.item.mark.from+1,to:c.item.mark.from+2,insert:c.item.value==='x'?' ':'x'});
  if(id==='marker')changes=state.changes(c.item.mark?{from:c.item.mark.from,to:c.item.mark.end,insert:''}:{from:c.item.body,insert:(state.doc.sliceString(c.item.body-1,c.item.body)===' '?'':' ')+'[ ] '});
  const intermediate=changes.empty?state:state.update({changes,filter:false}).state;
  if(!ensureSyntaxTree(intermediate,intermediate.doc.length,100))return {message:'Checklisten: Dokument noch nicht vollständig analysiert.'};
  const model=readChecklists(intermediate);if(model.message)return model;
  const range=scope(c),ranges=id==='refresh'?undefined:[{from:changes.mapPos(range.from,-1),to:changes.mapPos(range.to,1)}];
  const normalized=checklistEdits(model,ranges);if(normalized.message)return normalized;
  const edits=normalized.edits.filter(edit=>intermediate.doc.sliceString(edit.from,edit.to)!==edit.insert);
  changes=changes.compose(intermediate.changes(edits));
  if(changes.empty)return {noop:true};
  return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.checklist',scrollIntoView:true}};
}
export function runChecklist(view,id,notify=()=>{}){
  const plan=planChecklist(view.state,id);
  if(plan.noop){notify('Checklisten sind aktuell.');return true;}
  if(!plan.spec){notify(plan.message);return false;}
  const expected=plan.spec.changes.apply(view.state.doc);view.dispatch(plan.spec);
  const applied=view.state.doc.eq(expected);if(applied)notify('Checkliste geändert. Undo/Redo verfügbar.');
  return applied;
}
// Only explicit structural commands opt in. Raw input, paste, loading, saves,
// TODO completion and history never recalculate checklists as a side effect.
export function checklistNormalization(notify=()=>{}){return EditorState.transactionFilter.of(tr=>{
  if(!tr.docChanged||tr.startState.readOnly||!['move.list','move.structure','move.line-move','input.meta-return'].includes(tr.annotation(Transaction.userEvent)))return tr;
  if(!/\[(?:[ xX-]|\d*\/\d*|\d*%)\]/.test(tr.startState.doc.toString())&&!/\[(?:[ xX-]|\d*\/\d*|\d*%)\]/.test(tr.newDoc.toString()))return tr;
  const before=readChecklists(tr.startState),state=tr.state;
  if(!ensureSyntaxTree(state,state.doc.length,100)||before.message){notify('Strukturaktion verworfen: Checklisten noch nicht vollständig analysiert.');return [];}
  const model=readChecklists(state);if(model.message){notify(model.message);return [];}
  const ranges=[];
  tr.changes.iterChangedRanges((fromA,toA,from,to)=>{
    ranges.push({from,to});
    // Deleting the last item can collapse the entire old scope to a point.
    for(const entry of [...before.headings,...before.items.filter(item=>!item.parent&&!item.heading)]){
      const end=entry.end??entry.root.to;
      if(entry.from<=toA&&end>=fromA)ranges.push({from:tr.changes.mapPos(entry.from,-1),to:tr.changes.mapPos(end,1)});
    }
  });
  const normalized=checklistEdits(model,ranges);
  if(normalized.message){notify('Strukturaktion verworfen: '+normalized.message);return [];}
  const edits=normalized.edits.filter(edit=>state.doc.sliceString(edit.from,edit.to)!==edit.insert);
  if(!edits.length)return tr;
  const changes=state.changes(edits);
  return [tr,{changes,selection:tr.newSelection.map(changes),annotations:checklistRepairMapping.of(changes),sequential:true}];
});}
