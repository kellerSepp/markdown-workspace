import {syntaxTree,syntaxTreeAvailable,forceParsing,foldEffect,unfoldEffect,foldedRanges} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {ViewPlugin} from '@codemirror/view';
import {frontmatterEnd} from './structure.mjs';
import {orgHeadings} from './org-folding.mjs';
import {readDrawers,planningDrawerRanges,drawerFoldRanges} from './planning-drawers.mjs';

export const validDrawerName=name=>typeof name==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(name)&&!['END','LOGBOOK','PROPERTIES'].includes(name.toUpperCase());
export function invalidDrawerAt(state,pos){
  return readDrawers(state).invalidRanges.some(r=>pos>=r.from&&pos<=r.to);
}
export function guardInvalidDrawer(view,pos=view.state.selection.main.head,notify=()=>{}){
  if(!forceParsing(view,view.state.doc.length,100)){
    notify('Drawer-Kontext noch nicht vollständig analysiert; Faltung unverändert.');return true;
  }
  const invalid=readDrawers(view.state).invalidRanges;
  if(!invalid.some(r=>pos>=r.from&&pos<=r.to))return false;
  const stale=[];foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>{
    if(invalid.some(r=>from===r.marker))stale.push(unfoldEffect.of({from,to}));
  });
  if(stale.length)view.dispatch({effects:stale});
  notify('Ungültiger Drawer: Überschriften oder verschachtelte Drawer sind darin nicht erlaubt. Marker und END bitte prüfen.');return true;
}

// CodeMirror maps existing folds through raw edits. A former drawer range must
// not survive if editing its contents turns it into an invalid drawer.
export class DrawerFoldCleanup {
  constructor(view){this.view=view;this.pending=[];this.scheduled=false;this.destroyed=false;}
  update(update){
    if(!update.docChanged)return;
    this.pending=this.pending.map(r=>({from:update.changes.mapPos(r.from,1),to:update.changes.mapPos(r.to,-1)}));
    const previous=drawerFoldRanges(update.startState);
    foldedRanges(update.startState).between(0,update.startState.doc.length,(from,to)=>{
      if(previous.some(r=>r.from===from&&r.to===to))this.pending.push({from:update.changes.mapPos(from,1),to:update.changes.mapPos(to,-1)});
    });
    if(this.scheduled||!this.pending.length)return;
    this.scheduled=true;queueMicrotask(()=>{
      this.scheduled=false;if(this.destroyed)return;
      const parsed=forceParsing(this.view,this.view.state.doc.length,100),valid=parsed?drawerFoldRanges(this.view.state):[],candidates=this.pending;this.pending=[];
      const effects=[];foldedRanges(this.view.state).between(0,this.view.state.doc.length,(from,to)=>{
        if(candidates.some(r=>r.from===from&&r.to===to)&&!valid.some(r=>r.from===from&&r.to===to))effects.push(unfoldEffect.of({from,to}));
      });
      if(effects.length)this.view.dispatch({effects});
    });
  }
  destroy(){this.destroyed=true;this.pending=[];}
}
export const drawerFoldCleanup=ViewPlugin.fromClass(DrawerFoldCleanup);
function protectedAt(state,pos){
  for(let n=syntaxTree(state).resolveInner(pos,1);n;n=n.parent)if(/^(FencedCode|CodeBlock|HTMLBlock|CommentBlock|ProcessingInstructionBlock|Blockquote|ListItem)$/.test(n.name))return true;
  return false;
}
export function drawerContext(state){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'Dokument noch nicht vollständig analysiert.'};
  if(state.selection.ranges.length!==1)return {message:'Nur eine Auswahl oder einen Cursor verwenden.'};
  const selection=state.selection.main,first=state.doc.lineAt(selection.from),last=state.doc.lineAt(selection.to);
  if(selection.from<frontmatterEnd(state))return {message:'Frontmatter bleibt geschützt.'};
  if(!selection.empty&&(selection.from!==first.from||selection.to!==last.to&&selection.to!==last.from))return {message:'Nur vollständige Textzeilen auswählen.'};
  const headings=orgHeadings(state),heading=headings.filter(h=>h.lineFrom<=selection.from).at(-1);
  if(!heading||!/^ {0,3}#{1,6}(?:\s|$)/.test(state.doc.lineAt(heading.from).text))return {message:'Drawer unter einer H1–H6-Überschrift anlegen.'};
  if(selection.from<=heading.headerEnd)return {message:'Cursor oder Auswahl auf Textzeilen unter der Überschrift setzen.'};
  const next=headings.find(h=>h.from>heading.from)?.lineFrom??state.doc.length;
  if(selection.to>next)return {message:'Auswahl darf keine Überschrift einschließen.'};
  const end=selection.empty?first.to:selection.to;
  const scan=readDrawers(state,{from:heading.headerEnd,to:next});
  if(scan.errors.length)return {message:'Beschädigte Drawer im eigenen Abschnitt zuerst korrigieren.'};
  if(planningDrawerRanges(state).some(d=>d.from<=end&&d.to>=first.from))return {message:'Vorhandene Drawer bleiben geschützt.'};
  for(let n=first.number;n<=state.doc.lineAt(Math.max(first.from,end-1)).number;n++){
    const line=state.doc.line(n);
    if(protectedAt(state,line.from)||/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text)||/^ {0,3}#\+/.test(line.text))return {message:'Geschützte Text- und Metadatenbereiche nicht verpacken.'};
  }
  return {from:selection.empty?first.from:selection.from,to:selection.empty?first.from:selection.to,empty:selection.empty};
}
export function planDrawer(state,name){
  const c=drawerContext(state);if(c.message)return c;
  if(!validDrawerName(name))return {message:'Name: Buchstabe, danach Buchstaben/Ziffern/Unterstrich; END, LOGBOOK und PROPERTIES sind reserviert.'};
  name=name.toUpperCase();
  const selected=state.doc.sliceString(c.from,c.to),ends=selected.endsWith('\n');
  const insert=`:${name}:\n${selected}${!selected||!ends?'\n':''}:END:`+(c.empty&&c.to<state.doc.length||ends?'\n':'');
  const changes=state.changes({from:c.from,to:c.to,insert});
  return {spec:{changes,selection:c.empty?{anchor:c.from+name.length+3}:{anchor:c.from+name.length+3+(state.selection.main.anchor>state.selection.main.head?selected.length:0),head:c.from+name.length+3+(state.selection.main.anchor>state.selection.main.head?0:selected.length)},annotations:isolateHistory.of('full'),userEvent:'input.drawer'},marker:c.from};
}
export function toggleDrawer(view,pos=view.state.selection.main.head){
  if(!forceParsing(view,view.state.doc.length,100))return false;
  const s=view.state;if(s.selection.ranges.length!==1||!s.selection.main.empty)return false;
  const line=s.doc.lineAt(pos),r=drawerFoldRanges(s).find(r=>r.from===line.to);
  if(!r)return false;
  let folded=false;foldedRanges(s).between(r.from,r.to,(from,to)=>{if(from===r.from&&to===r.to)folded=true;});
  const head=s.selection.main.head;
  view.dispatch({effects:(folded?unfoldEffect:foldEffect).of(r),...(!folded&&head>r.from&&head<r.to?{selection:{anchor:line.from}}:{})});return true;
}
export function createDrawerController({view,panel,getContext=()=>({}),notify=()=>{}}){
  const ready=()=>{const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;};
  return {open(){
    if(!ready()||!forceParsing(view,view.state.doc.length,100))return false;
    const c=drawerContext(view.state);if(c.message){notify(c.message);return false;}
    return panel.openDrawer({choose:(name,saved)=>{
      if(!ready()||saved.state!==view.state){notify('Drawerziel geändert; bitte erneut öffnen.');return false;}
      const p=planDrawer(view.state,name);if(p.message){notify(p.message);return false;}
      const expected=p.spec.changes.apply(view.state.doc);view.dispatch(p.spec);if(!view.state.doc.eq(expected))return false;
      // Leave a new drawer open so its body can be edited immediately.
      view.dispatch({selection:view.state.selection,userEvent:'select.drawer'});
      notify('Drawer angelegt. Mit Strg+S Datei speichern.');return true;
    }});
  }};
}
