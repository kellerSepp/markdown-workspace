import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';
import {sectionAt} from './section-folding.mjs';
import {todoContext} from './todo.mjs';
import {listContext,planListInteraction,runListInteraction} from './list-interaction.mjs';
import {headingSuffix} from './heading-suffix.mjs';

export function planMetaReturn(state){
  const fail=message=>({message});
  if(state.readOnly)return fail('Editor ist schreibgeschützt.');
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return fail('Alt+Enter benötigt einen Cursor ohne Auswahl.');
  if(!syntaxTreeAvailable(state,state.doc.length))return fail('Dokument noch nicht vollständig analysiert.');
  const pos=state.selection.main.head,line=state.doc.lineAt(pos);
  if(pos>0&&pos<state.doc.length&&/[\uD800-\uDBFF]/.test(state.doc.sliceString(pos-1,pos))&&/[\uDC00-\uDFFF]/.test(state.doc.sliceString(pos,pos+1)))return fail('Unicode-Zeichen nicht in der Mitte teilen.');
  if(pos<frontmatterEnd(state))return fail('Frontmatter bleibt geschützt.');
  if(listContext(state,true)){
    const plan=planListInteraction(state,'insert');
    return plan.message?plan:{list:true};
  }
  const tree=syntaxTree(state),nodes=[];
  // Check both line edges as well as the cursor, including opening/closing fences.
  for(const point of [line.from,pos,line.to])for(let n=tree.resolveInner(point,point===line.to?-1:1);n;n=n.parent)nodes.push(n);
  if(nodes.some(n=>/^(FencedCode|CodeBlock|HTMLBlock|Table|Blockquote|ListItem|SetextHeading[1-6])$/.test(n.name)))return fail('Code, Tabellen und Container bleiben geschützt.');
  const heading=nodes.find(n=>/^ATXHeading[1-6]$/.test(n.name)&&n.from>=line.from&&n.from<=line.to);
  const section=sectionAt(state,pos),level=heading?Number(heading.name.at(-1)):section?.level??1;
  const marker='#'.repeat(level)+' ';
  let from=pos,to=pos,insert;
  if(heading){
    if(/[ \t]+#+[ \t]*$/.test(line.text))return fail('Überschriften mit schließenden #-Markern bleiben geschützt.');
    const prefix=/^ {0,3}#{1,6}(?:[ \t]+|$)/.exec(line.text);
    if(!prefix)return fail('Keine sichere Überschrift.');
    const content=line.from+prefix[0].length;
    if(pos<content){from=line.from;insert=marker+'\n';}
    else {
      const task=todoContext(state,{headingOnly:true});
      if(task.status&&pos>task.from&&pos<task.to)return fail('Aufgabenstatus nicht mitten im Wort teilen.');
    }
  }
  if(insert===undefined){
    if(!heading&&pos===line.from){insert=marker;}
    else {
      if(nodes.some(n=>/^(Link|Image|InlineCode|Emphasis|StrongEmphasis|Autolink|HTMLTag)$/.test(n.name)&&pos>n.from&&pos<n.to))return fail('Markdown-Auszeichnung nicht mitten im Ausdruck teilen.');
      // Remove only whitespace adjacent to the split, leaving all title words intact.
      while(from>line.from&&/[ \t]/.test(state.doc.sliceString(from-1,from)))from--;
      if(heading)from=Math.max(from,line.from+/^ {0,3}#{1,6}/.exec(line.text)[0].length);
      while(to<line.to&&/[ \t]/.test(state.doc.sliceString(to,to+1)))to++;
      insert='\n'+marker;
    }
  }
  let edits;
  const suffix=heading?headingSuffix(line.text,line.from):null;
  if(suffix?.error)return fail(suffix.error);
  if(suffix?.tagFrom!=null&&!insert.endsWith('\n')){
    if(pos>=suffix.tagFrom&&pos<suffix.end)return fail('Tagblock nicht in der Mitte teilen.');
    if(pos>=suffix.removeFrom){from=to=line.to;insert='\n'+marker;}
    else {
      insert=' '+state.doc.sliceString(suffix.tagFrom,suffix.end)+'\n'+marker;
      edits=[{from,to,insert},{from:suffix.removeFrom,to:suffix.end,insert:''}];
    }
  }
  const anchor=insert.endsWith('\n')?from+marker.length:from+insert.length;
  return {spec:{changes:edits??{from,to,insert},selection:{anchor},annotations:isolateHistory.of('full'),userEvent:'input.meta-return',scrollIntoView:true}};
}

export function runMetaReturn(view,notify=()=>{}){
  const plan=planMetaReturn(view.state);
  if(plan.list)return runListInteraction(view,'insert',notify);
  if(!plan.spec){notify(plan.message);return false;}
  const previous=view.state.doc;view.dispatch(plan.spec);return previous!==view.state.doc;
}
