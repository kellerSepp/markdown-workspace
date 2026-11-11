import {todoDefinitionLine} from './todo.mjs';
import {tagDefinitionLine} from './tag-rules.mjs';
import {readTags,tagContext} from './tag-model.mjs';
import {checklistConfirmReason} from './checklists.mjs';
export function confirmAction(state){
  if(todoDefinitionLine(state))return 'todo.reload';
  if(tagDefinitionLine(state))return 'tags.reload';
  const line=state.doc.lineAt(state.selection.main.head),model=readTags(state);
  if(model.headings?.some(h=>h.line.from===line.from&&h.suffix))return 'tags.edit';
  return 'checklist.confirm';
}
export function confirmReason(state){
  if(state.readOnly)return 'Editor ist schreibgeschützt.';
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return 'Nur ein Cursor ohne Auswahl.';
  const action=confirmAction(state);
  return action==='tags.edit'?tagContext(state,{headingOnly:true}).message??'':action.endsWith('.reload')?'':checklistConfirmReason(state);
}
