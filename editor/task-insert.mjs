import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';
import {todoRules,DEFAULT_TODO} from './todo.mjs';
import {readChecklists,planChecklist} from './checklists.mjs';
import {planListInteraction} from './list-interaction.mjs';
import {planningDrawerRanges,inPlanningDrawer} from './planning-drawers.mjs';

// Shift+Alt+Enter operates on an existing unmarked item in place; only an
// already marked item inserts a new checkbox sibling. Blank prose and headings
// create TODOs; existing headings and their title text are preserved.
export function planTaskInsert(state){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return {message:'Alt+Shift+Enter benötigt einen Cursor ohne Auswahl.'};
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'Dokument noch nicht vollständig analysiert.'};
  const line=state.doc.lineAt(state.selection.main.head),model=readChecklists(state);if(model.message)return model;
  const rules=state.field(todoRules,false)?.rules??DEFAULT_TODO,status=rules.find(rule=>!rule.closed)?.name;
  const heading=model.headings.find(h=>h.supported&&h.line.from===line.from);
  if(heading){
    if(!status)return {message:'Kein offener TODO-Zustand geladen.'};
    const prefix=/^( {0,3}#{1,6})/.exec(line.text)[1],insert='\n'+prefix+' '+status+' ';
    return {spec:{changes:{from:line.to,insert},selection:{anchor:line.to+insert.length},annotations:isolateHistory.of('full'),userEvent:'input.meta-return',scrollIntoView:true}};
  }
  if(line.text.trim()){
    const item=model.items.find(item=>item.line.from===line.from);
    if(!item)return {message:'Überschrift, Listenpunkt oder leere Textzeile verwenden.'};
    if(item.mark)return planListInteraction(state,'insert-checkbox');
    const plan=planChecklist(state,'marker');
    if(plan.spec){
      const changes=plan.spec.changes;
      // Keep a cursor already in the title at its logical text position, but
      // snap marker/indentation cursors past the newly inserted "[ ] ".
      plan.spec.selection={anchor:Math.max(changes.mapPos(state.selection.main.head,1),changes.mapPos(item.body,1))};
    }
    return plan;
  }
  if(line.from<frontmatterEnd(state)||inPlanningDrawer(planningDrawerRanges(state),line.from))return {message:'Frontmatter und Metadatendrawer bleiben geschützt.'};
  if(!/^ {0,3}$/.test(line.text))return {message:'Eingerückte Containerzeile bleibt geschützt.'};
  for(const point of [line.from,line.to])for(let n=syntaxTree(state).resolveInner(point,1);n;n=n.parent)
    if(/^(FencedCode|CodeBlock|HTMLBlock|Table|Blockquote|ListItem)$/.test(n.name))return {message:'Code und Container bleiben geschützt.'};
  const level=model.headings.filter(h=>h.supported&&h.from<line.from).at(-1)?.line.text.match(/^ {0,3}(#{1,6})/)?.[1].length??1;
  if(!status)return {message:'Kein offener TODO-Zustand geladen.'};
  const insert='#'.repeat(level)+' '+status+' ';
  return {spec:{changes:{from:line.from,to:line.to,insert},selection:{anchor:line.from+insert.length},annotations:isolateHistory.of('full'),userEvent:'input.meta-return',scrollIntoView:true}};
}
export function runTaskInsert(view,notify=()=>{}){
  const plan=planTaskInsert(view.state);if(!plan.spec){notify(plan.message);return false;}
  const before=view.state.doc;
  // Existing checkbox insertion remains an explicit structural operation.
  view.dispatch({...plan.spec,userEvent:plan.spec.userEvent??'move.list'});
  const applied=!before.eq(view.state.doc);
  if(applied){view.dispatch({selection:view.state.selection,userEvent:'select.task-insert'});notify('Checkbox oder TODO erstellt. Undo/Redo verfügbar.');}
  return applied;
}
