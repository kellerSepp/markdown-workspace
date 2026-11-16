import {syntaxTree,syntaxTreeAvailable,forceParsing,foldEffect,unfoldEffect,foldedRanges} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {orgHeadings} from './org-folding.mjs';
export {logbookRanges} from './planning-drawers.mjs';
import {logbookRanges,readPlanningDrawers} from './planning-drawers.mjs';
import {WEEKDAYS} from './planning-date.mjs';

export function toggleLogbook(view){
  if(!forceParsing(view,view.state.doc.length,100))return false;
  const s=view.state;if(s.selection.ranges.length!==1||!s.selection.main.empty)return false;
  const line=s.doc.lineAt(s.selection.main.head),r=logbookRanges(s).find(r=>r.from===line.to);
  if(!r)return false;
  let folded=false;foldedRanges(s).between(r.from,r.to,(from,to)=>{if(from===r.from&&to===r.to)folded=true;});
  view.dispatch({effects:(folded?unfoldEffect:foldEffect).of(r)});return true;
}
export function logbookContext(state){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'Dokument noch nicht vollständig analysiert.'};
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return {message:'Einzelnen Cursor in der Aufgabe verwenden.'};
  const pos=state.selection.main.head;
  for(let n=syntaxTree(state).resolveInner(pos,1);n;n=n.parent)if(/^(FencedCode|CodeBlock|HTMLBlock|CommentBlock|Blockquote)$/.test(n.name))return {message:'Notizen außerhalb geschützter Bereiche starten.'};
  const headings=orgHeadings(state).filter(h=>/^ {0,3}#{1,6}(?:\s|$)/.test(state.doc.lineAt(h.from).text));
  const h=headings.filter(h=>h.lineFrom<=pos).at(-1);if(!h)return {message:'Keine aktuelle H1–H6-Überschrift.'};
  const end=headings.find(next=>next.from>h.from)?.lineFrom??state.doc.length;
  const result=readPlanningDrawers(state,{from:h.headerEnd,to:end});
  if(result.errors.length)return {message:result.errors[0]};
  const logs=result.drawers.filter(d=>d.kind==='LOGBOOK');if(logs.length>1)return {message:'Mehrere eigene LOGBOOK-Drawer; Notiz verweigert.'};
  let insertAt=h.headerEnd;
  for(let n=state.doc.lineAt(h.headerEnd).number+1;n<=state.doc.lines;n++){
    const line=state.doc.line(n);if(line.from>=end)break;
    if(/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text))insertAt=line.to;else break;
  }
  const properties=result.drawers.find(d=>d.kind==='PROPERTIES');if(properties&&properties.from===insertAt+1)insertAt=properties.to;
  return {heading:h,logbook:logs[0],insertAt};
}
export function planLogbookNote(state,text,now=new Date()){
  const c=logbookContext(state);if(c.message)return c;
  if(typeof text!=='string'||!text.trim())return {message:'Bitte eine Notiz eingeben.'};
  if(!Number.isFinite(now.getTime())||now.getFullYear()<1||now.getFullYear()>9999)return {message:'Ungültiger Zeitpunkt.'};
  const pad=n=>String(n).padStart(2,'0');
  const stamp=`[${String(now.getFullYear()).padStart(4,'0')}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${WEEKDAYS[now.getDay()]} ${pad(now.getHours())}:${pad(now.getMinutes())}]`;
  // Indentation makes headings and drawer-like text in a note inert Markdown.
  const note=text.replace(/\r\n?/g,'\n').split('\n').map(line=>'    '+line).join('\n');
  const entry=`- Note taken on ${stamp} \\\\\n${note}\n`;
  const changes=state.changes(c.logbook?{from:c.logbook.contentFrom,insert:entry}:{from:c.insertAt,insert:`\n:LOGBOOK:\n${entry}:END:`});
  return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.logbook'}};
}
export function createLogbookController({view,panel,getContext=()=>({}),notify=()=>{},now=()=>new Date()}){
  const ready=()=>{const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;};
  return {open(){
    if(!ready()||!forceParsing(view,view.state.doc.length,100))return false;
    const c=logbookContext(view.state);if(c.message){notify(c.message);return false;}
    return panel.openNote({choose:(text,saved)=>{
      if(!ready()||saved.state!==view.state){notify('Notizziel geändert; bitte erneut öffnen.');return false;}
      const p=planLogbookNote(view.state,text,now());if(p.message){notify(p.message);return false;}
      const expected=p.spec.changes.apply(view.state.doc);view.dispatch(p.spec);if(!view.state.doc.eq(expected))return false;
      forceParsing(view,view.state.doc.length,100);
      const ranges=logbookRanges(view.state),own=logbookContext(view.state).logbook;
      const r=own&&ranges.find(r=>r.from===own.start.to);
      view.dispatch({...(r?{effects:foldEffect.of(r),...(view.state.selection.main.head>r.from&&view.state.selection.main.head<r.to?{selection:{anchor:r.from}}:{})}:{}),userEvent:'select.logbook'});
      notify('Logbuchnotiz hinzugefügt. Mit Strg+S Datei speichern.');return true;
    }});
  }};
}
