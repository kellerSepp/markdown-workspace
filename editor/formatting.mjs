import {syntaxTree,syntaxTreeAvailable,forceParsing,ensureSyntaxTree} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {frontmatterEnd} from './structure.mjs';

const formats={bold:{node:'StrongEmphasis',mark:'EmphasisMark',open:'**',close:'**'},italic:{node:'Emphasis',mark:'EmphasisMark',open:'*',close:'*'},strike:{node:'Strikethrough',mark:'StrikethroughMark',open:'~~',close:'~~'},code:{node:'InlineCode',mark:'CodeMark'},underline:{open:'<u>',close:'</u>'}};
const fail=message=>({message});
function nodesIn(state,from,to,predicate) {
  const result=[];
  syntaxTree(state).iterate({from,to,enter(ref){if(ref.from<to&&ref.to>from&&predicate(ref)) result.push(ref.node);}});
  return result;
}
function marks(node,name) {const result=[];for(let child=node.firstChild;child;child=child.nextSibling) if(child.name===name) result.push(child);return result;}
function content(state,node,format) {
  const boundaries=marks(node,format.mark);
  if(boundaries.length!==2) return null;
  let from=boundaries[0].to,to=boundaries[1].from;
  if(format.node==='InlineCode') {
    const text=state.doc.sliceString(from,to);
    if(text.startsWith(' ')&&text.endsWith(' ')&&!/^ +$/.test(text)) {from++;to--;}
  }
  return {from,to};
}
function selection(range,from,to) {return range.anchor>range.head?{anchor:to,head:from}:{anchor:from,head:to};}
function specFor(state,range,changes,from,to) {
  return {spec:{changes,selection:selection(range,from,to),annotations:isolateHistory.of('full'),scrollIntoView:true}};
}
function unwrapNode(state,range,node,format) {
  const inner=content(state,node,format);
  if(!inner) return null;
  if(!(range.from===node.from&&range.to===node.to || range.from===inner.from&&range.to===inner.to)) return null;
  const changes=state.changes([{from:node.from,to:inner.from,insert:''},{from:inner.to,to:node.to,insert:''}]);
  return specFor(state,range,changes,node.from,node.from+inner.to-inner.from);
}
function underlineRange(state,range) {
  const {from,to}=range,text=state.doc.sliceString(from,to),doc=state.doc;
  const candidates=[];
  if(text.startsWith('<u>')&&text.endsWith('</u>')) candidates.push({from,to});
  if(doc.sliceString(Math.max(0,from-3),from)==='<u>'&&doc.sliceString(to,to+4)==='</u>') candidates.push({from:from-3,to:to+4});
  for(const outer of candidates) {
  const tags=nodesIn(state,outer.from,outer.to,n=>n.name==='HTMLTag');
  const open=tags.some(n=>n.from===outer.from&&n.to===outer.from+3),close=tags.some(n=>n.from===outer.to-4&&n.to===outer.to);
  if(!open||!close) continue;
  let depth=0,valid=true;
  for(const tag of tags.sort((a,b)=>a.from-b.from)) {
    const text=doc.sliceString(tag.from,tag.to);
    if(/^<u(?:\s[^>]*)?>$/i.test(text)) depth++;
    else if(/^<\/u\s*>$/i.test(text)) {
      if(--depth<0 || depth===0&&tag.to!==outer.to) {valid=false;break;}
    }
  }
  if(valid&&depth===0) return outer;
  }
  return null;
}
export function planFormat(state,kind) {
  const format=formats[kind];
  if(!Object.hasOwn(formats,kind)) return fail('Unbekannte Formatierung.');
  if(state.readOnly) return fail('Editor ist schreibgeschützt.');
  if(!syntaxTreeAvailable(state)) return fail('Dokument noch nicht vollständig analysiert. Bitte erneut versuchen.');
  if(state.selection.ranges.length!==1||state.selection.main.empty) return fail('Bitte genau einen Textbereich markieren.');
  const originalRange=state.selection.main,rawText=state.doc.sliceString(originalRange.from,originalRange.to);
  if(/\r|\n/.test(rawText)) return fail('Bitte einen einzeiligen Textbereich markieren.');
  // History may restore a selection with exterior spaces. Keep them outside emphasis.
  const trim=kind==='code'?0:/^\s*/u.exec(rawText)[0].length,endTrim=kind==='code'?0:/\s*$/u.exec(rawText)[0].length;
  const from=originalRange.from+trim,to=originalRange.to-endTrim;
  if(from>=to) return fail('Bitte sichtbaren Text markieren.');
  const range={from,to,anchor:originalRange.anchor,head:originalRange.head},text=state.doc.sliceString(from,to);
  if(from<frontmatterEnd(state)) return fail('Frontmatter bleibt unverändert.');
  if(!text.isWellFormed()) return fail('Die Auswahl trennt ein Unicode-Zeichen.');
  if(nodesIn(state,from,to,n=>n.name==='FencedCode'||n.name==='CodeBlock').length) return fail('Innerhalb von Codeblöcken ist Textformatierung gesperrt.');
  if(nodesIn(state,from,to,n=>n.name==='Escape'||n.name==='Entity').some(n=>n.from<from||n.to>to)) return fail('Escape-Sequenzen und Entities bitte vollständig markieren.');
  if(!nodesIn(state,from,to,n=>/^(?:Paragraph|(?:ATX|Setext)Heading[1-6]|TableCell)$/.test(n.name)).some(n=>n.from<=from&&n.to>=to)) return fail('Bitte Text innerhalb eines Absatzes, einer Überschrift oder einer einzelnen Tabellenzelle markieren.');
  const markers=nodesIn(state,from,to,n=>['HeaderMark','ListMark','QuoteMark','LinkMark','URL','TableDelimiter','TableMark'].includes(n.name));
  if(markers.some(marker=>{
    if(!['LinkMark','URL'].includes(marker.name)) return true;
    let link=marker;while(link&&!['Link','Image'].includes(link.name)) link=link.parent;
    return !link||link.from<from||link.to>to;
  })) return fail('Struktur- und Linkmarker bitte nicht teilweise formatieren.');

  if(kind==='underline') {
    const outer=underlineRange(state,range);
    if(outer) {
      const innerFrom=outer.from+3,innerTo=outer.to-4;
      return specFor(state,range,state.changes([{from:outer.from,to:innerFrom,insert:''},{from:innerTo,to:outer.to,insert:''}]),outer.from,outer.from+innerTo-innerFrom);
    }
  } else {
    const candidates=nodesIn(state,from,to,n=>n.name===format.node).sort((a,b)=>(a.to-a.from)-(b.to-b.from));
    for(const node of candidates) {const result=unwrapNode(state,range,node,format);if(result) return result;}
  }
  if(kind!=='code'&&nodesIn(state,from,to,n=>n.name==='InlineCode').length) return fail('Inline-Code zunächst vollständig mit „Inline-Code“ entfernen.');
  if(kind!=='underline'&&nodesIn(state,from,to,n=>n.name==='HTMLTag').length) {
    const outer=underlineRange(state,range);
    if(!outer||outer.from!==from||outer.to!==to) return fail('HTML-Tags nicht als einzelne Formatierungszeichen bearbeiten.');
  }
  // Do not reinterpret a partial delimiter or an inner substring of a styled range.
  const inlineNodes=nodesIn(state,from,to,n=>['StrongEmphasis','Emphasis','Strikethrough','InlineCode','HTMLTag'].includes(n.name));
  const enclosing=inlineNodes.filter(n=>n.from<from||n.to>to);
  if(enclosing.some(n=>{
    const known=Object.values(formats).find(f=>f.node===n.name),inner=known&&content(state,n,known);
    return !inner||inner.from!==from||inner.to!==to;
  })) return fail('Bitte den vollständigen formatierten Bereich oder dessen vollständigen Inhalt markieren.');

  let coreFrom=from,coreTo=to;
  if(kind!=='code') {
    coreFrom+=/^\s*/u.exec(text)[0].length;
    coreTo-= /\s*$/u.exec(text)[0].length;
    if(coreTo<=coreFrom) return fail('Bitte sichtbaren Text markieren.');
  }
  const payload=state.doc.sliceString(coreFrom,coreTo);
  let open=format.open,close=format.close,pad='';
  if(kind==='code') {
    const runs=payload.match(/`+/g)??[];
    open=close='`'.repeat(Math.max(0,...runs.map(run=>run.length))+1);
    if(payload.startsWith('`')||payload.endsWith('`')||payload.startsWith(' ')&&payload.endsWith(' ')&&!/^ +$/.test(payload)) pad=' ';
  }
  const changes=state.changes([{from:coreFrom,insert:open+pad},{from:coreTo,insert:pad+close}]);
  let candidate=state.update({changes}).state;
  const parsed=ensureSyntaxTree(candidate,candidate.doc.length,50);
  if(!parsed) return fail('Formatierung noch nicht sicher analysierbar; Text bleibt unverändert.');
  if(parsed!==syntaxTree(candidate)) candidate=candidate.update({}).state;
  const mappedFrom=coreFrom+open.length+pad.length,mappedTo=mappedFrom+payload.length;
  if(kind==='underline') {
    const probe={from:mappedFrom,to:mappedTo};
    if(!underlineRange(candidate,probe)) return fail('HTML-Unterstreichung ist an dieser Stelle nicht sicher möglich.');
    return specFor(state,range,changes,mappedFrom,mappedTo);
  }
  let expectedFrom=mappedFrom,expectedTo=mappedTo;
  // Triple emphasis may place the new strong node inside the existing italic node.
  const selectedStyle=inlineNodes.find(n=>n.from===coreFrom&&n.to===coreTo&&['Emphasis','StrongEmphasis'].includes(n.name));
  if(selectedStyle&&kind!=='code') {
    const inner=content(state,selectedStyle,{node:selectedStyle.name,mark:'EmphasisMark'});
    if(inner) {expectedFrom+=inner.from-coreFrom;expectedTo-=coreTo-inner.to;}
  }
  const envelopeFrom=changes.mapPos(Math.min(coreFrom,...enclosing.map(n=>n.from)),-1),envelopeTo=changes.mapPos(Math.max(coreTo,...enclosing.map(n=>n.to)),1);
  const target=nodesIn(candidate,expectedFrom,expectedTo,n=>n.name===format.node).find(n=>{
    const inner=content(candidate,n,format);
    return inner&&inner.from<=expectedFrom&&inner.to>=expectedTo&&n.from>=envelopeFrom&&n.to<=envelopeTo;
  });
  if(!target) return fail('Die Auswahl würde mehrdeutige Markdown-Syntax erzeugen; Text bleibt unverändert.');
  const inner=content(candidate,target,format);
  return specFor(state,range,changes,inner.from,inner.to);
}
export function runFormat(view,kind,notify=()=>{}) {
  if(!syntaxTreeAvailable(view.state)&&!forceParsing(view,view.state.doc.length,50)) {notify('Dokument noch nicht vollständig analysiert.');return false;}
  const result=planFormat(view.state,kind);
  if(!result.spec) {notify(result.message);return false;}
  view.dispatch(result.spec);
  // Record the actual content selection so native Redo restores it, not a mapped marker range.
  view.dispatch({selection:view.state.selection,userEvent:'select.format'});
  notify('Formatierung geändert. Undo/Redo verfügbar.');return true;
}
