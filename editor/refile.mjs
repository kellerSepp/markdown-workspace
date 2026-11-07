import {EditorState,EditorSelection} from '@codemirror/state';
import {syntaxTree,syntaxTreeAvailable,ensureSyntaxTree,foldedRanges,unfoldEffect} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {headingSections,sectionAt} from './section-folding.mjs';
import {setEmacsMark,emacsMark} from './emacs-editing.mjs';
import {refileSelection} from './refile-history.mjs';
import {frontmatterEnd} from './structure.mjs';

const fail=message=>({message});
function header(state,h){let n=syntaxTree(state).resolveInner(h.from,1);while(n&&!/^(ATX|Setext)Heading/.test(n.name))n=n.parent;return n;}
const plain=(state,h)=>{const n=header(state,h);return n?.name.startsWith('ATX')&&n.parent?.name==='Document';};
export function refileContext(state){
  if(state.readOnly)return fail('Editor ist schreibgeschützt.');
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return fail('Refile unterstützt nur einen Cursor, keine Region.');
  if(!syntaxTreeAvailable(state,state.doc.length))return fail('Dokument noch nicht vollständig analysiert.');
  const pos=state.selection.main.head,fm=frontmatterEnd(state),source=sectionAt(state,pos);
  if(pos<fm||!source||source.from<fm)return fail('Keine aktuelle Überschrift außerhalb Frontmatter.');
  if(!plain(state,source))return fail('Setext-/Containerüberschrift als Quelle wird nicht sicher unterstützt.');
  const all=headingSections(state),children=all.filter(h=>h.from>=source.from&&h.from<source.limit);
  if(children.some(h=>!plain(state,h)))return fail('Teilbaum enthält Setext-/Containerüberschriften; Refile verweigert.');
  if(children.some(h=>h.level+2-source.level>6))return fail('Gesamter Teilbaum würde H6 überschreiten.');
  const targets=all.filter(h=>h.level===1&&h.from>=fm&&plain(state,h)&&!(h.from>=source.from&&h.from<source.limit))
    .map(h=>({id:h.from,text:state.doc.lineAt(h.from).text.replace(/^\s*#\s*/, '').replace(/\s+#+\s*$/,''),line:state.doc.lineAt(h.from).number}));
  if(!targets.length)return fail('Kein sicheres H1-Ziel außerhalb des eigenen Teilbaums.');
  return {source,children,targets};
}
// Comparing top-level parser nodes catches fence, HTML, list and paragraph merges.
function shape(state,tree=syntaxTree(state)){const out=[];for(let n=tree.topNode.firstChild;n;n=n.nextSibling){
  if(/Heading/.test(n.name)){out.push('Heading:'+state.doc.sliceString(n.from,n.to).replace(/^ {0,3}#{1,6}/,''));continue;}
  out.push(n.toTree().toString()+':'+state.doc.sliceString(n.from,n.to));
}return out.sort();}
export function planRefile(state,targetId){
  const context=refileContext(state);if(context.message)return context;
  const {source,children,targets}=context;
  if(!targets.some(t=>t.id===targetId))return fail('Ziel ist kein zulässiges H1 dieser Datei.');
  const target=headingSections(state).find(h=>h.from===targetId),delta=2-source.level;
  if(target.limit===source.limit&&target.from<source.from&&delta===0)return {noop:true,message:'Teilbaum steht bereits als letztes Kind am Ziel.'};
  const from=source.lineFrom,to=source.limit,edits=children.map(h=>{const mark=header(state,h).getChild('HeaderMark');return {from:mark.from-from,to:mark.to-from,insert:'#'.repeat(h.level+delta)};});
  const block=state.doc.sliceString(from,to),local=EditorState.create({doc:block}),shift=local.changes(edits);
  let insert=shift.apply(local.doc).toString(),at=target.limit;
  const before=state.doc.sliceString(Math.max(0,at-2),at),after=at<state.doc.length;
  const prefix=before&&!before.endsWith('\n\n')?(before.endsWith('\n')?'\n':'\n\n'):'';
  if(after&&!insert.endsWith('\n\n'))insert+=insert.endsWith('\n')?'\n':'\n\n';
  insert=prefix+insert;
  const changes=state.changes([{from,to,insert:''},{from:at,insert}].sort((a,b)=>a.from-b.from));
  const anchor=changes.mapPos(at,-1)+prefix.length+shift.mapPos(state.selection.main.head-from);
  const checked=EditorState.create({doc:changes.apply(state.doc),extensions:markdown({base:markdownLanguage})});
  const checkedTree=ensureSyntaxTree(checked,checked.doc.length,100);
  if(!checkedTree||JSON.stringify(shape(state))!==JSON.stringify(shape(checked,checkedTree)))return fail('Markdown-Blockstruktur würde sich ändern; Refile sicher verweigert.');
  const effects=[];foldedRanges(state).between(0,state.doc.length,(a,b)=>{if(a<to&&b>from||a<=at&&b>=at)effects.push(unfoldEffect.of({from:a,to:b}));});
  return {spec:{changes,selection:{anchor},effects:[...effects.map(e=>e.map(changes)).filter(Boolean),refileSelection.of({selection:EditorSelection.single(anchor),inverse:state.selection})],annotations:isolateHistory.of('full'),userEvent:'move.refile',scrollIntoView:true}};
}

export function createRefileController({view,panel,getContext=()=>({}),notify=()=>{}}){
  const ready=()=>{const c=getContext();return !c.busy&&c.hasDocument!==false&&!view.state.readOnly;};
  return {open(){
    if(!ready()){notify('Editor nicht bereit.');return false;}
    const context=refileContext(view.state);if(context.message){notify(context.message);return false;}
    if(view.state.field(emacsMark,false)?.active)view.dispatch({effects:setEmacsMark.of(false)});
    return panel.openChoices({title:'Teilbaum unter H1 verschieben',entries:context.targets.map(t=>({...t,text:t.text+' · Zeile '+t.line})),choose:(id,saved)=>{
      if(!ready()||saved.state!==view.state){notify('Refile verworfen: Datei, Cursor oder Zustand geändert.');return false;}
      const result=planRefile(view.state,id);if(result.noop){notify(result.message);return true;}if(!result.spec){notify(result.message);return false;}
      const expected=result.spec.changes.apply(view.state.doc);view.dispatch(result.spec);return view.state.doc.eq(expected);
    }});
  }};
}
