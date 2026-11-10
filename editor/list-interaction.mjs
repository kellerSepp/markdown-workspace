import {EditorState} from '@codemirror/state';
import {syntaxTree,syntaxTreeAvailable,ensureSyntaxTree,foldedRanges,foldEffect,unfoldEffect} from '@codemirror/language';
import {markdown} from '@codemirror/lang-markdown';
import {isolateHistory} from '@codemirror/commands';
import {orgContext} from './org-structure.mjs';
import {orgVisibilityPlans} from './org-folding.mjs';
import {frontmatterEnd} from './structure.mjs';

export const LIST_COMMANDS=Object.freeze([
  ['tab','Liste: Leerpunkt einruecken oder Kinder falten','Tab (Liste)'],
  ['shift-tab','Liste: Leerpunkt ausruecken oder globale Sichtbarkeit','Umschalt+Tab (Liste)'],
  ['newline','Zeile im Listenpunkt fortsetzen','Enter (Liste)'],
  ['insert','Listenpunkt einfuegen','Alt+Enter'],
  ['insert-checkbox','Checkbox oder TODO erstellen','Alt+Umschalt+Enter']
].map(Object.freeze));
const globalCycles=new WeakMap();
export const listGlobalContinuation=state=>globalCycles.has(state);
export const clearListGlobalContinuation=state=>globalCycles.delete(state);
const fail=message=>({message});
const items=node=>{const result=[];for(let n=node.firstChild;n;n=n.nextSibling)if(n.name==='ListItem')result.push(n);return result;};
const lists=node=>{const result=[];for(let n=node.firstChild;n;n=n.nextSibling)if(/^(BulletList|OrderedList)$/.test(n.name))result.push(n);return result;};
export function listContext(state,continuation=false) {
  if(orgContext(state)!=='list'&&!continuation) return null;
  if(state.readOnly||state.selection.ranges.length!==1||!state.selection.main.empty||state.selection.main.head<frontmatterEnd(state)||!syntaxTreeAvailable(state,state.doc.length))return null;
  const line=state.doc.lineAt(state.selection.main.head),pos=line.from+/^ */.exec(line.text)[0].length;
  let lookup=Math.min(line.to,Math.max(pos,state.selection.main.head));
  if(continuation&&!line.text.trim()&&line.number>1){let n=line.number-1;while(n>1&&!state.doc.line(n).text.trim())n--;lookup=state.doc.line(n).to;}
  let node=syntaxTree(state).resolveInner(lookup,lookup===state.doc.lineAt(lookup).to?-1:1);while(node&&node.name!=='ListItem'){if(['CodeBlock','FencedCode','HTMLBlock','Blockquote'].includes(node.name))return null;node=node.parent;}
  if(!node)return null;
  let root=node.parent;while(root.parent?.name==='ListItem')root=root.parent.parent;
  if(root.parent?.name!=='Document')return null;
  const firstLine=state.doc.lineAt(node.from),match=/^( *)([-+*]|\d+\.)([ \t]+|$)(\[[ xX-]\](?:[ \t]+|$))?/.exec(firstLine.text);
  if(!match||match[0].includes('\t'))return null;
  if(line.number!==firstLine.number&&/^ */.exec(line.text)[0].length<match[1].length+match[2].length+match[3].length)return null;
  const body=line.from+(line.number===firstLine.number?match[0].length:/^ */.exec(line.text)[0].length);
  return {node,root,line,indent:match[1].length,marker:match[2],body,continuation:line.number!==firstLine.number,width:match[1].length+match[2].length+match[3].length,empty:line.number===firstLine.number&&!line.text.slice(match[0].length).trim()&&!lists(node).length&&node.to<=line.to};
}
function shape(state) {let count=0,bad=false;syntaxTree(state).iterate({enter(n){if(n.name==='ListItem')count++;if(['CodeBlock','FencedCode','HTMLBlock','Blockquote','HorizontalRule'].includes(n.name))bad=true;}});return {count,bad};}
function editPlan(state,changes,anchor,added=0,moving=null) {
  const changeSet=state.changes(changes),doc=changeSet.apply(state.doc);
  const parsed=EditorState.create({doc,extensions:[markdown()]});
  if(!ensureSyntaxTree(parsed,doc.length,50))return fail('Liste noch nicht vollstaendig analysiert.');
  // Only list-item count is allowed to change; protected blocks retain their types.
  const blockShape=s=>{const out=[];syntaxTree(s).iterate({enter(n){if(/^(?:ATX|Setext)Heading/.test(n.name)||['CodeBlock','FencedCode','HTMLBlock','Blockquote','HorizontalRule'].includes(n.name))out.push(n.name);}});return out.join(',');};
  if(shape(parsed).count!==shape(state).count+added||blockShape(state)!==blockShape(parsed))return fail('Aktion wuerde Markdown-Bloecke umdeuten; unveraendert verworfen.');
  // Existing items keep their parent identities; only the targeted empty item
  // may move. Item counts alone cannot detect accidental sibling adoption.
  const mapped=new Map(),seen=new Set(),original=[];
  syntaxTree(state).iterate({enter(ref){if(ref.name==='ListItem')original.push(ref.node);}});
  for(const node of original){
    const mark=node.getChild('ListMark');if(!mark)return fail('Unklare Listenstruktur.');
    let next=syntaxTree(parsed).resolveInner(changeSet.mapPos(mark.from,1),1);
    while(next&&next.name!=='ListItem')next=next.parent;
    if(!next||seen.has(next.from))return fail('Bestehender Listenpunkt wuerde verloren gehen.');
    seen.add(next.from);mapped.set(node.from,next);
  }
  const parentItem=node=>{for(let n=node.parent;n;n=n.parent)if(n.name==='ListItem')return n;return null;};
  for(const node of original){
    if(node.from===moving)continue;
    const parent=parentItem(node),nextParent=parentItem(mapped.get(node.from));
    if((parent?mapped.get(parent.from)?.from:null)!==(nextParent?.from??null))return fail('Aktion wuerde bestehende Listenhierarchie umhaengen; unveraendert verworfen.');
  }
  const effects=[];foldedRanges(state).between(0,state.doc.length,(from,to)=>{if(changes.some(c=>c.from<=to&&(c.to??c.from)>=from))effects.push(unfoldEffect.of({from,to}));});
  return {spec:{changes:changeSet,selection:{anchor},effects:effects.map(e=>e.map(changeSet)).filter(Boolean),annotations:isolateHistory.of('full'),scrollIntoView:true}};
}
function emptyTab(state,c,reverse) {
  const siblings=items(c.node.parent),index=siblings.findIndex(n=>n.from===c.node.from);
  let indent;
  if(reverse){
    const parent=c.node.parent.parent;
    if(parent?.name!=='ListItem')return {spec:{},notice:'Listenpunkt bereits auf oberster Ebene.'};
    indent=/^ */.exec(state.doc.lineAt(parent.from).text)[0].length;
  }else{
    const previous=siblings[index-1];
    if(!previous)return {spec:{},notice:'Kein vorheriger Geschwisterpunkt zum Einruecken.'};
    const line=state.doc.lineAt(previous.from),match=/^( *)([-+*]|\d+\.)( +|$)/.exec(line.text);
    if(!match)return fail('Unklare Einrueckung des vorherigen Punkts.');
    indent=match[0].length;
  }
  const changes=[{from:c.line.from,to:c.line.from+c.indent,insert:' '.repeat(indent)}];
  const column=state.selection.main.head-c.line.from;
  const anchor=c.line.from+(column<c.indent?Math.min(column,indent):column+indent-c.indent);
  return editPlan(state,changes,anchor,0,c.node.from);
}

const canonical=ranges=>ranges.filter(r=>r&&r.to>r.from).sort((a,b)=>a.from-b.from||b.to-a.to);
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// A parent's own blocks may follow or separate its direct child lists.
// Use each list node's actual boundary rather than the whole parent item.
const childRanges=(state,node)=>lists(node).map(list=>({from:state.doc.lineAt(list.from).from-1,to:list.to}));
function listRanges(state){
  const result=[],protectedEnd=frontmatterEnd(state);
  syntaxTree(state).iterate({enter(ref){
    if(ref.name!=='ListItem'||ref.from<protectedEnd)return;
    let root=ref.node.parent;while(root.parent?.name==='ListItem')root=root.parent.parent;
    if(root.parent?.name!=='Document')return;
    let depth=0;for(let n=ref.node.parent;n;n=n.parent)if(n.name==='ListItem')depth++;
    for(const range of childRanges(state,ref.node))result.push({...range,depth});
  }});return result;
}
function visibility(state,c,global) {
  const children=global?[]:childRanges(state,c.node),current=[];
  foldedRanges(state).between(0,state.doc.length,(from,to)=>{
    if(global||children.some(r=>from>=r.from&&to<=r.to))current.push({from,to});
  });
  let next;
  if(!global){if(!children.length)return {spec:{},notice:'Listenpunkt ohne Unterpunkte.'};next=current.length?[]:children;}
  else {
    const lr=listRanges(state),depth=Math.max(-1,...lr.map(r=>r.depth));
    const headings=orgVisibilityPlans(state,true),plans=[];
    const push=ranges=>{const r=canonical(ranges);if(!plans.some(p=>same(p,r)))plans.push(r);};
    push([...headings[0].ranges,...lr.filter(r=>r.depth===0).map(({from,to})=>({from,to}))]);
    if(headings.length>2)push([...headings[1].ranges,...lr.filter(r=>r.depth===0).map(({from,to})=>({from,to}))]);
    push(lr.filter(r=>r.depth===0).map(({from,to})=>({from,to})));
    for(let d=1;d<=depth;d++)push(lr.filter(r=>r.depth===d).map(({from,to})=>({from,to})));
    push([]);next=plans[(plans.findIndex(p=>same(p,current))+1)%plans.length];
  }
  const effects=[...current.map(r=>unfoldEffect.of(r)),...next.map(r=>foldEffect.of(r))];
  const hidden=next.find(r=>state.selection.main.head>r.from&&state.selection.main.head<r.to);
  return {spec:{effects,...(hidden?{selection:{anchor:hidden.from}}:{})},...(global?{globalContext:c}:{}),notice:'Listen-Sichtbarkeit geaendert.'};
}
function insertItem(state,c,checkbox) {
  let unsafe=false;c.root.toTree().iterate({enter(n){if(['CodeBlock','FencedCode','HTMLBlock','Blockquote'].includes(n.name))unsafe=true;}});
  if(unsafe)return fail('Liste mit Code oder Mischcontainer bleibt geschuetzt.');
  const pos=state.selection.main.head,before=!c.continuation&&(pos<c.body||!c.empty&&pos===c.body),atEnd=pos===c.line.to;
  if(/[\uD800-\uDBFF]/.test(state.doc.sliceString(pos-1,pos))&&/[\uDC00-\uDFFF]/.test(state.doc.sliceString(pos,pos+1)))return fail('Cursor trennt ein Unicode-Zeichen; unveraendert verworfen.');
  const direct=[];for(let n=c.node.firstChild;n;n=n.nextSibling)direct.push(n);
  if(!before&&!atEnd&&(c.node.to>c.line.to||direct.some(n=>n.name!=='ListMark'&&n.name!=='Paragraph')||direct.some(n=>n.name==='Paragraph'&&n.firstChild)))return fail('Komplexen Listenpunkt nur vor dem Text oder am Zeilenende erweitern.');
  const siblings=items(c.node.parent),index=siblings.findIndex(n=>n.from===c.node.from),ordered=/^\d/.test(c.marker)&&!checkbox;
  const number=ordered?Number(c.marker.slice(0,-1))+(before?0:1):null;
  const marker=checkbox?'-':ordered?number+'.':c.marker;
  const prefix=' '.repeat(c.indent)+marker+' '+(checkbox?'[ ] ':'');
  let changes=[],anchor;
  if(before){changes.push({from:c.line.from,insert:prefix+'\n'});anchor=c.line.from+prefix.length;}
  else if(atEnd){const end=state.doc.lineAt(Math.max(c.node.to,c.line.to)),at=end.to;changes.push({from:at,insert:'\n'+prefix});anchor=at+1+prefix.length;}
  else {changes.push({from:pos,insert:'\n'+prefix});anchor=pos+1+prefix.length;}
  if(ordered){for(let i=before?index:index+1;i<siblings.length;i++){
    const item=siblings[i],mark=item.getChild('ListMark'),old=state.doc.sliceString(mark.from,mark.to),value=String(number+(i-index)+(before?1:0))+'.',delta=value.length-old.length;
    changes.push({from:mark.from,to:mark.to,insert:value});
    if(delta)for(let n=state.doc.lineAt(item.from).number+1;n<=state.doc.lineAt(item.to).number;n++){
      const l=state.doc.line(n);if(!l.text.trim())continue;
      if(delta<0&&!l.text.startsWith(' '.repeat(-delta)))return fail('Nummernbreite mit unklarer Fortsetzung; unveraendert verworfen.');
      changes.push({from:l.from,to:l.from+Math.max(0,-delta),insert:' '.repeat(Math.max(0,delta))});
    }
  }}
  // Prefix position is in the new document; existing renumbering before it shifts it.
  const insertion=changes[0];for(const ch of changes.slice(1))if(ch.from<insertion.from)anchor+=ch.insert.length-((ch.to??ch.from)-ch.from);
  return editPlan(state,changes,anchor,1);
}
export function planListInteraction(state,id) {
  if(!LIST_COMMANDS.some(c=>c[0]===id))return fail('Unbekannter Listenbefehl.');
  if(!syntaxTreeAvailable(state,state.doc.length))return fail('Dokument noch nicht vollstaendig analysiert.');
  const c=listContext(state,['newline','insert','insert-checkbox'].includes(id))??(id==='shift-tab'?globalCycles.get(state):null);if(!c)return fail('Einzelnen Cursor auf einer Listenpunktzeile verwenden.');
  if(id==='tab'||id==='shift-tab')return c.empty?emptyTab(state,c,id==='shift-tab'):visibility(state,c,id==='shift-tab');
  if(id==='newline'){
    const pos=state.selection.main.head;
    if(pos<c.body||/[\uD800-\uDBFF]/.test(state.doc.sliceString(pos-1,pos))&&/[\uDC00-\uDFFF]/.test(state.doc.sliceString(pos,pos+1)))return fail('Cursor vor dem Listentext oder innerhalb eines Unicode-Zeichens.');
    const insert='\n'+' '.repeat(c.width);
    return editPlan(state,[{from:pos,insert}],pos+insert.length);
  }
  return insertItem(state,c,id==='insert-checkbox');
}
export function runListInteraction(view,id,notify=()=>{}) {
  const result=planListInteraction(view.state,id);if(!result.spec){notify(result.message);return false;}
  const previous=view.state.doc;
  view.dispatch({...result.spec,userEvent:'move.list'});
  if(result.spec.changes&&previous===view.state.doc)return false;
  if(result.spec.changes)view.dispatch({selection:view.state.selection,userEvent:'select.list'});
  if(result.globalContext)globalCycles.set(view.state,result.globalContext);
  notify(result.notice??'Listenpunkt geaendert. Undo/Redo verfuegbar.');return true;
}
