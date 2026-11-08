import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {Decoration,ViewPlugin} from '@codemirror/view';
import {todoRules} from './todo.mjs';
import {planningRecords} from './planning.mjs';

// Reuse the planning parser, caching across cursor/viewport/theme transactions.
// Documents/trees/rules are immutable and weak keys never retain closed files.
const documents=new WeakMap();
function recordsFor(state){
  const tree=syntaxTree(state),rules=state.field(todoRules,false)?.rules;
  if(!rules||tree.length<state.doc.length||!syntaxTreeAvailable(state,state.doc.length))return [];
  let trees=documents.get(state.doc);if(!trees)documents.set(state.doc,trees=new WeakMap());
  let versions=trees.get(tree);if(!versions)trees.set(tree,versions=new WeakMap());
  if(!versions.has(rules))versions.set(rules,planningRecords(state).records??[]);
  return versions.get(rules);
}
export function planningDecorations(state,ranges){
  const marks=[];
  for(const record of recordsFor(state)){
    if(record.error)continue;
    for(const [kind,entry] of [['SCHEDULED',record.scheduled],['DEADLINE',record.deadline]]){
      if(!entry||!ranges.some(r=>entry.from<r.to&&entry.to>r.from))continue;
      marks.push(Decoration.mark({class:'cm-planning-keyword',attributes:{title:kind==='SCHEDULED'?'Zur Bearbeitung vorgesehen':'Fällig bis'}}).range(entry.from,entry.from+kind.length+1));
      const text=state.doc.sliceString(entry.from,entry.to),offset=text.indexOf('<');
      marks.push(Decoration.mark({class:'cm-planning-timestamp'}).range(entry.from+offset,entry.to));
    }
  }
  return Decoration.set(marks,true);
}
export const planningHighlight=ViewPlugin.fromClass(class{
  constructor(view){this.decorations=planningDecorations(view.state,view.visibleRanges);}
  update(update){if(update.docChanged||update.viewportChanged||syntaxTree(update.startState)!==syntaxTree(update.state)||update.startState.field(todoRules,false)?.rules!==update.state.field(todoRules,false)?.rules)this.decorations=planningDecorations(update.state,update.view.visibleRanges);}
},{decorations:v=>v.decorations});
