import {todoRules} from './todo.mjs';

// CodeMirror may publish syntax/measurement-only transactions while file reads
// are awaited. These do not change an agenda target. Real text, selection,
// readonly or loaded-workflow changes still invalidate it.
export function sameAgendaEditorTarget(a,b){
  return a===b||!!a?.doc&&a.doc===b?.doc&&!!b.selection&&typeof a.selection?.eq==='function'&&typeof a.field==='function'&&typeof b.field==='function'&&a.selection.eq(b.selection)&&a.readOnly===b.readOnly&&a.field(todoRules,false)===b.field(todoRules,false);
}
