import {keymap,EditorView} from '@codemirror/view';
import {Prec} from '@codemirror/state';
import {indentMore,indentLess} from '@codemirror/commands';
import {syntaxTree,syntaxTreeAvailable,forceParsing} from '@codemirror/language';
import {runStructure,frontmatterEnd} from './structure.mjs';
import {orgShortcutCommand} from './org-structure.mjs';
import {listContext,listGlobalContinuation,clearListGlobalContinuation,runListInteraction} from './list-interaction.mjs';
import {cycleOrgVisibility} from './org-folding.mjs';

const navigation = new WeakSet();
const pendingAlt = new WeakSet();
export function enableFocusNavigation(view,notify=()=>{}) {
  clearListGlobalContinuation(view.state);
  navigation.add(view);view.setTabFocusMode(true);
  notify('Fokusnavigation aktiv: Tab/Shift+Tab verlässt den Editor. Beim erneuten Fokussieren gilt wieder Struktur-Tab.');
  return false; // Keep CodeMirror's ordinary Escape selection behavior.
}
export function resetFocusNavigation(view) {navigation.delete(view);view.setTabFocusMode(false);}
export function focusEntered(event,view) {
  if(!event.relatedTarget || !view.dom.contains(event.relatedTarget)) resetFocusNavigation(view);
  return false;
}
function nodesAt(state,pos) {
  const line=state.doc.lineAt(pos),content=line.from+/^[ \t]*/.exec(line.text)[0].length,nodes=[];
  if(pos<content && content<line.to) pos=content;
  for(let n=syntaxTree(state).resolveInner(pos,pos===line.to?-1:1);n;n=n.parent) nodes.push(n);
  return nodes;
}
export function tabContext(state) {
  if(state.readOnly || state.selection.main.head<frontmatterEnd(state)) return null;
  const codeAt=pos=>nodesAt(state,pos).find(n=>/^(FencedCode|CodeBlock)$/.test(n.name));
  const first=codeAt(state.selection.ranges[0].from);
  if(first && state.selection.ranges.every(range=>[range.from,range.to].every(pos=>codeAt(pos)?.from===first.from))) return 'code';
  if(state.selection.ranges.length!==1 || !state.selection.main.empty) return null;
  const nodes=nodesAt(state,state.selection.main.head);
  if(nodes.some(n=>n.name==='ListItem')) return 'list';
  if(nodes.some(n=>/^(ATX|Setext)Heading[1-6]$/.test(n.name))) return 'heading';
  return null;
}
export function structuralTab(view,outdent=false,getChildren=()=>true,notify=()=>{},execute) {
  if(navigation.has(view)) return false;
  if(!syntaxTreeAvailable(view.state) && !forceParsing(view,view.state.doc.length,50)) return false;
  const context=tabContext(view.state);
  if(context==='list'||outdent&&listGlobalContinuation(view.state)) {
    const id=outdent?'shift-tab':'tab';
    if(execute)execute('list.'+id);else runListInteraction(view,id,notify);
    return true;
  }
  if(!context) return false; // Native keyboard focus movement in ordinary prose.
  if(context==='code') {(outdent?indentLess:indentMore)(view);return true;}
  const command=context==='heading'?(outdent?'heading-promote':'heading-demote'):(outdent?'list-outdent':'list-indent');
  if(execute) execute('structure.'+command);
  else runStructure(view,command,{children:getChildren()},notify);
  return true; // Even invalid structural edits must never insert a literal Tab.
}
export function handleOrgShortcut(event,view,execute) {
  if(!execute) return false;
  if(event.key==='Enter'&&!event.ctrlKey&&!event.metaKey&&!event.isComposing&&!event.getModifierState?.('AltGraph')&&(event.altKey||!event.shiftKey)&&listContext(view.state,true)) {execute(event.altKey?(event.shiftKey?'list.insert-checkbox':'list.insert'):'list.newline');event.preventDefault();return true;}
  const id=orgShortcutCommand(view.state,event);if(!id) return false;
  execute?.(id);event.preventDefault();return true;
}
// Only the left Alt delivered to the focused editor is reserved for its commands.
// Right Alt is deliberately excluded, even on layouts reporting it as plain Alt.
export function handleEditorAlt(event,view) {
  if(event.key!=='Alt') return false;
  const pending=pendingAlt.has(view);
  if(event.type==='keyup') pendingAlt.delete(view);
  if(!view.hasFocus||event.code==='AltRight'||event.location===2||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing||event.getModifierState?.('AltGraph')) return false;
  if(event.type==='keydown') pendingAlt.add(view);
  else if(event.type!=='keyup'||!pending) return false;
  event.preventDefault();return true;
}
function editorKeydown(event,view,execute) {
  if(handleEditorAlt(event,view)) return true;
  if(handleOrgShortcut(event,view,execute)) return true;
  if(event.key==='Shift'&&pendingAlt.has(view)&&!event.ctrlKey&&!event.metaKey&&!event.isComposing&&!event.getModifierState?.('AltGraph')) return false;
  // Unknown Alt chords (including browser/system shortcuts) are not reserved.
  pendingAlt.delete(view);return false;
}
export function withoutOrgArrowConflicts(bindings) {
  return bindings.filter(binding=>!['Alt-ArrowUp','Alt-ArrowDown','Shift-Alt-ArrowUp','Shift-Alt-ArrowDown'].includes(binding.key));
}
export function orgTab(view,outdent,getOrgTab,execute,notify) {
  if(!getOrgTab()||navigation.has(view)||outdent&&listGlobalContinuation(view.state)) return null;
  const context=tabContext(view.state);
  // Code indentation and legacy list structure keep their established meaning.
  if(context==='code'||context==='list') return null;
  if(!outdent&&context!=='heading') return false;
  if(execute) execute(outdent?'fold.org-global-cycle':'fold.org-local-cycle');
  else cycleOrgVisibility(view,outdent,notify);
  return true;
}
export function structureKeyboard(getChildren,notify,execute,getOrgTab=()=>false) {
  return [
    keymap.of([
      {key:'Escape',run:view=>enableFocusNavigation(view,notify)},
      {key:'Tab',run:view=>orgTab(view,false,getOrgTab,execute,notify)??structuralTab(view,false,getChildren,notify,execute)},
      {key:'Shift-Tab',run:view=>orgTab(view,true,getOrgTab,execute,notify)??structuralTab(view,true,getChildren,notify,execute)}
    ]),
    EditorView.domEventHandlers({focus:focusEntered}),
    // keymap installs its own default-precedence DOM handler. Without this
    // priority its Alt+Left/Right cursor commands consume the event first.
    Prec.highest(EditorView.domEventHandlers({
      keydown:(event,view)=>editorKeydown(event,view,execute),
      keyup:handleEditorAlt,
      blur:(_event,view)=>{pendingAlt.delete(view);clearListGlobalContinuation(view.state);return false;}
    }))
  ];
}
