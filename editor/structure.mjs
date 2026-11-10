import {EditorState} from '@codemirror/state';
import {syntaxTree, syntaxTreeAvailable, ensureSyntaxTree, forceParsing, foldedRanges, unfoldEffect} from '@codemirror/language';
import {isolateHistory} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {headingSections, sectionAt} from './section-folding.mjs';

const fail = message => ({message});
export function frontmatterEnd(state) {
  if(state.doc.line(1).text!=='---') return 0;
  for(let i=2;i<=state.doc.lines;i++) if(/^(---|\.\.\.)$/.test(state.doc.line(i).text)) return endLine(state,state.doc.line(i).from);
  return state.doc.length;
}
const endLine = (state,pos) => {const l=state.doc.lineAt(pos); return l.to<state.doc.length?l.to+1:l.to;};
function ancestors(state,pos) {
  const line=state.doc.lineAt(pos),content=line.from+/^[ \t]*/.exec(line.text)[0].length;
  if(pos<content && content<line.to) pos=content;
  const result=[];
  // EOL belongs to this physical line, including when another line follows.
  // Empty lines must not inherit the preceding item's context.
  for(let n=syntaxTree(state).resolveInner(pos,pos===line.to && line.length>0?-1:1);n;n=n.parent) result.push(n);
  return result;
}
const childrenOf = node => {const out=[]; for(let n=node.firstChild;n;n=n.nextSibling) out.push(n); return out;};
function replacement(state,from,to,insert,anchor=from) {
  if(state.doc.sliceString(from,to)===insert) return fail('Am Rand: keine Änderung.');
  const effects=[];
  foldedRanges(state).between(0,state.doc.length,(a,b)=>{if(a<to && b>from) effects.push(unfoldEffect.of({from:a,to:b}));});
  anchor=Math.max(from,Math.min(from+insert.length,anchor));
  const old=state.doc.sliceString(from,to);let start=0,end=0;
  while(start<old.length&&start<insert.length&&old[start]===insert[start]) start++;
  if(start && /[\uD800-\uDBFF]/.test(old[start-1])) start--;
  while(end<old.length-start&&end<insert.length-start&&old[old.length-1-end]===insert[insert.length-1-end]) end++;
  if(end && /[\uDC00-\uDFFF]/.test(old[old.length-end])) end--;
  const changes=state.changes({from:from+start,to:to-end,insert:insert.slice(start,insert.length-end)});
  return {spec:{changes,selection:{anchor},effects:effects.map(e=>e.map(changes)).filter(Boolean),annotations:isolateHistory.of('full'),scrollIntoView:true}};
}
function swap(state,a,b,c,pos,inFirst) {
  const left=state.doc.sliceString(a,b),right=state.doc.sliceString(b,c);
  // Each block must retain a separating newline even when moved out of EOF.
  let l=left,r=right;
  if(!r.endsWith('\n') && l.endsWith('\n')) {r+='\n';l=l.slice(0,-1);}
  return replacement(state,a,c,r+l,inFirst?a+r.length+pos-a:a+pos-b);
}
function heading(state,command,withChildren) {
  const h=sectionAt(state,state.selection.main.head);
  if(!h || h.from<frontmatterEnd(state)) return fail('Keine bearbeitbare Überschrift im Kontext.');
  const node=syntaxTree(state).resolveInner(h.from,1);
  let header=node; while(header && !/^(ATX|Setext)Heading/.test(header.name)) header=header.parent;
  if(!header || header.parent?.name!=='Document') return fail('Überschriften in Mischcontainern werden nicht verändert.');
  const all=headingSections(state).filter(x=>x.container===h.container && x.from>=frontmatterEnd(state));
  if(command==='heading-up'||command==='heading-down') {
    const siblings=all.filter(x=>x.parent===h.parent && x.level===h.level),i=siblings.indexOf(h);
    const other=siblings[i+(command==='heading-up'?-1:1)];
    if(!other) return fail('Kein benachbarter Geschwisterabschnitt.');
    // Do not cross intervening levels belonging to another structural group.
    const first=other.from<h.from?other:h,second=first===h?other:h;
    if(first.limit!==second.from) return fail('Kein unmittelbar benachbarter Geschwisterabschnitt.');
    return swap(state,first.lineFrom,second.lineFrom,second.limit,state.selection.main.head,first===h);
  }
  const delta=command==='heading-demote'?1:-1;
  const targets=withChildren?all.filter(x=>x.from>=h.from && x.from<h.limit):[h];
  if(targets.some(x=>x.level+delta<1||x.level+delta>6)) return fail('Gesamte Aktion verworfen: Überschriftenebenen müssen zwischen H1 und H6 bleiben.');
  const edits=targets.map(x=>{
    let n=syntaxTree(state).resolveInner(x.from,1); while(n&&!/^(ATX|Setext)Heading/.test(n.name)) n=n.parent;
    const level=x.level+delta;
    if(n.name.startsWith('ATX')) {const mark=n.getChild('HeaderMark');return {from:mark.from,to:mark.to,insert:'#'.repeat(level)};}
    const mark=n.getChild('HeaderMark');
    if(level<=2) return {from:mark.from,to:mark.to,insert:(level===1?'=':'-').repeat(mark.to-mark.from)};
    // Setext text can span lines; ATX cannot represent that without changing its meaning.
    const text=state.doc.sliceString(n.from,mark.from).trimEnd();
    if(text.includes('\n')) return null;
    return {from:n.from,to:n.to,insert:'#'.repeat(level)+' '+text};
  });
  if(edits.includes(null)) return fail('Mehrzeilige Setext-Überschrift kann nicht sicher in ATX umgewandelt werden.');
  const effects=[];
  foldedRanges(state).between(h.from,h.limit,(from,to)=>effects.push(unfoldEffect.of({from,to})));
  const changes=state.changes(edits);
  return {spec:{changes,selection:{anchor:changes.mapPos(state.selection.main.head)},effects:effects.map(e=>e.map(changes)).filter(Boolean),annotations:isolateHistory.of('full'),scrollIntoView:true}};
}
function itemInfo(state,node) {
  const line=state.doc.lineAt(node.from),mark=node.getChild('ListMark');
  return {node,from:line.from,to:endLine(state,node.to),indent:state.doc.sliceString(line.from,mark.from),mark,
    width:mark.to-mark.from+Math.max(1,/^ */.exec(state.doc.sliceString(mark.to,line.to))[0].length)};
}
function shift(text,amount) {
  return text.split('\n').map(line=>!line.trim()?line:amount>0?' '.repeat(amount)+line:line.slice(Math.min(-amount,/^ */.exec(line)[0].length))).join('\n');
}
function list(state,command,withChildren,prefix,org=false,orgRegion=null) {
  const chain=ancestors(state,state.selection.main.head),node=chain.find(n=>n.name==='ListItem');
  if(!node) return fail('Kein Listenpunkt im Kontext.');
  let root=node.parent;while(root.parent?.name==='ListItem') root=root.parent.parent;
  if(root.parent?.name!=='Document') return fail('Listen in Mischcontainern werden nicht verändert.');
  if(state.doc.sliceString(state.doc.lineAt(root.from).from,root.to).split('\n').some(line=>/^\s*\t/.test(line))) return fail('Tab-Einrückung ist für Strukturaktionen nicht eindeutig; Liste bleibt unverändert.');
  let unsafe=false;
  root.toTree().iterate({enter(n){if(['Blockquote','FencedCode','CodeBlock','HTMLBlock','HorizontalRule'].includes(n.name)) unsafe=true;}});
  if(unsafe) return fail('Liste mit Block-/Mischcontainer: Aktion aus Sicherheitsgründen nicht verfügbar.');
  const info=itemInfo(state,node),parent=node.parent,siblings=childrenOf(parent).filter(n=>n.name==='ListItem'),idx=siblings.findIndex(n=>n.from===node.from);
  const prev=siblings[idx-1],next=siblings[idx+1];
  const direct=childrenOf(node),nested=direct.filter(n=>/^(BulletList|OrderedList)$/.test(n.name));
  if(direct.filter(n=>n.name==='Paragraph').length>1) return fail('Mehrere Absatzblöcke im Listenpunkt: Aktion nicht verfügbar.');
  if(nested.length>1) return fail('Mehrere Unterlisten: Aktion nicht verfügbar.');
  const from=state.doc.lineAt(root.from).from,to=endLine(state,root.to);
  let text=state.doc.sliceString(from,to),anchor=info.from,cursorAdjustment=0;
  const edit=(a,b,s)=>{text=text.slice(0,a-from)+s+text.slice(b-from);};
  const whole=state.doc.sliceString(info.from,info.to);
  let own=whole,children='';
  if(!withChildren&&nested.length) {
    const childFrom=state.doc.lineAt(nested[0].from).from;
    own=state.doc.sliceString(info.from,childFrom);
    const childIndent=nested[0].from-childFrom;
    children=org?state.doc.sliceString(childFrom,info.to):shift(state.doc.sliceString(childFrom,info.to),info.indent.length-childIndent);
    if(org&&command==='list-outdent') return fail('Org-Regel: Listenpunkt mit Unterpunkten kann nicht einzeln ausgerückt werden. Unterbaumaktion verwenden.');
  }
  let region=null;
  if(org && withChildren && /^list-(indent|outdent)$/.test(command)) {
    const first=idx===0;
    const a=orgRegion?.from??(first?state.doc.lineAt(parent.from).from:info.from);
    let b=orgRegion?.to??(first?endLine(state,parent.to):info.to),boundaryIndent=null;
    // Markdown may parse differently indented markers as siblings. A physically
    // shallower marker is never part of the current item's subtree/group.
    for(let n=state.doc.lineAt(info.from).number+1;n<=state.doc.lines;n++){
      // The next physical marker may start a separate parser list exactly at
      // the region boundary. It still defines a shallower indentation level.
      const line=state.doc.line(n);if(line.from>b)break;
      const mark=/^( *)(?:[-+*]|\d+\.)(?:[ \t]+|$)/.exec(line.text);
      if(mark&&mark[1].length<info.indent.length){b=line.from;boundaryIndent=mark[1].length;break;}
    }
    const parentIndent=parent.parent?.name==='ListItem'?itemInfo(state,parent.parent).indent.length:Math.max(0,info.indent.length-2);
    const amount=command==='list-indent'?(prev?itemInfo(state,prev).width:2):-(info.indent.length-Math.max(parentIndent,boundaryIndent??parentIndent));
    if(!amount) return fail('Listenpunkt bereits auf oberster Ebene.');
    edit(a,b,shift(state.doc.sliceString(a,b),amount));anchor=info.from+amount;
    region={from:a,to:b};
  } else if(command==='list-prefix') {
    if(!['-','+','*','1.','- [ ]'].includes(prefix)) return fail('Unbekanntes Listenpräfix.');
    const line=state.doc.lineAt(node.from),tail=state.doc.sliceString(info.mark.to,line.to);
    const task=/^\s+\[[ xX-]\](?=\s|$)/.exec(tail);
    const oldEnd=task?info.mark.to+task[0].length:info.mark.to;
    const delta=(prefix==='- [ ]'?1:prefix.length)-(info.mark.to-info.mark.from);
    let changed=prefix+state.doc.sliceString(oldEnd,info.to);
    const lines=changed.split('\n');
    for(let i=1;i<lines.length;i++) if(lines[i].trim()) lines[i]=shift(lines[i],delta);
    edit(node.from,info.to,lines.join('\n'));anchor=node.from;
  } else if(command==='list-up'||command==='list-down') {
    const other=command==='list-up'?prev:next;
    if(!other) return fail('Am Listenrand: keine Änderung.');
    const oi=itemInfo(state,other);
    if(withChildren) {
      const first=command==='list-up'?oi:info,second=first===info?oi:info;
      const a=state.doc.sliceString(first.from,second.from),b=state.doc.sliceString(second.from,second.to);
      let left=a,right=b;if(!right.endsWith('\n')&&left.endsWith('\n')) {right+='\n';left=left.slice(0,-1);}
      edit(first.from,second.to,right+left);anchor=command==='list-up'?oi.from:info.from+right.length;
    } else {
      if(!own.endsWith('\n')) own+='\n';
      if(command==='list-up') {edit(oi.from,info.to,own+state.doc.sliceString(oi.from,info.from)+children);anchor=oi.from;}
      else {const otherText=state.doc.sliceString(oi.from,oi.to);edit(info.from,oi.to,children+(otherText.endsWith('\n')?otherText:otherText+'\n')+own);anchor=info.from+children.length+otherText.length+(otherText.endsWith('\n')?0:1);}
    }
  } else if(command==='list-indent') {
    if(!prev) return fail('Einrücken benötigt einen vorherigen Geschwisterpunkt.');
    const pi=itemInfo(state,prev),amount=pi.width;
    edit(info.from,info.to,shift(own,amount)+children);anchor=info.from+amount;
  } else if(command==='list-outdent') {
    const outer=parent.parent;
    if(outer?.name!=='ListItem') return fail('Listenpunkt bereits auf oberster Ebene.');
    const outerInfo=itemInfo(state,outer),amount=info.indent.length-outerInfo.indent.length;
    cursorAdjustment=-amount;
    if(org) {edit(info.from,info.to,shift(own,-amount)+children);anchor=info.from;}
    else {
    let retained=children+state.doc.sliceString(info.to,outerInfo.to);
    if(retained&&!retained.endsWith('\n')) retained+='\n';
    const moved=shift(own,-amount);
    edit(info.from,outerInfo.to,retained+moved);anchor=info.from+retained.length;}
  } else return fail('Unbekannter Listenbefehl.');
  // Renumber source/destination lists only; unrelated nested lists retain their spelling.
  const parsed=EditorState.create({doc:text,extensions:[markdown()]});
  if(!ensureSyntaxTree(parsed,parsed.doc.length,50)) return fail('Liste noch nicht vollständig analysiert; Aktion unverändert verworfen.');
  const shape=tree=>{const counts={};tree.iterate({enter(n){if(n.name==='ListItem'||/^(?:ATX|Setext)Heading[1-6]$/.test(n.name)||['HorizontalRule','CodeBlock','FencedCode','HTMLBlock','Blockquote'].includes(n.name)) counts[n.name]=(counts[n.name]??0)+1;}});return JSON.stringify(Object.entries(counts).sort());};
  if(shape(root.toTree())!==shape(syntaxTree(parsed))) return fail('Aktion würde Markdown-Blöcke umdeuten; Liste bleibt unverändert.');
  const numbers=[];let invalidNumberIndent=false;
  syntaxTree(parsed).iterate({enter(ref) {
    if(ref.name!=='OrderedList') return;
    const at=anchor-from;
    if(!(parent.name==='OrderedList' && ref.from===parent.from-from) && !(ref.from<=at && at<=ref.to)) return;
    const items=childrenOf(ref.node).filter(n=>n.name==='ListItem');
    const originalStart=ref.node.parent?.name==='Document' && root.name==='OrderedList'
      ? state.doc.sliceString(root.firstChild.from,root.firstChild.getChild('ListMark').to)
      : parent.name==='OrderedList' && ref.node.from===parent.from-from
        ? state.doc.sliceString(parent.firstChild.from,parent.firstChild.getChild('ListMark').to) : null;
    const start=Number((originalStart??parsed.doc.sliceString(items[0].from,items[0].getChild('ListMark').to)).match(/^\d+/)?.[0] ?? 1);
    for(let i=0;i<items.length;i++) {
      const mark=items[i].getChild('ListMark'),old=parsed.doc.sliceString(mark.from,mark.to),insert=String(start+i)+old.at(-1);
      if(old!==insert) {
        numbers.push({from:mark.from,to:mark.to,insert});
        const delta=insert.length-old.length;
        if(delta) {
          const item=items[i],last=parsed.doc.lineAt(item.to).number;
          for(let line=parsed.doc.lineAt(item.from).number+1;line<=last;line++) {
            const l=parsed.doc.line(line);if(!l.text.trim()) continue;
            if(delta<0&&!l.text.startsWith(' '.repeat(-delta))) {invalidNumberIndent=true;return;}
            numbers.push({from:l.from,to:l.from+Math.max(0,-delta),insert:' '.repeat(Math.max(0,delta))});
          }
        }
      }
    }
  }});
  if(invalidNumberIndent) return fail('Nummerierung: Fortsetzungszeilen nicht sicher ausgerichtet; Aktion unveraendert verworfen.');
  // Keep continuation indentation aligned when a number gains or loses a digit.
  // Org operations realign all continuation lines with changed marker widths.
  if(!org&&numbers.some(e=>e.insert.length!==e.to-e.from)) return fail('Nummernbreite würde wechseln; Aktion unverändert verworfen.');
  let finalAnchor=org?anchor+state.selection.main.head-info.from+cursorAdjustment:anchor;
  const numberChanges=parsed.changes(numbers);
  finalAnchor=from+numberChanges.mapPos(finalAnchor-from);
  for(const e of numbers.sort((a,b)=>b.from-a.from)) text=text.slice(0,e.from)+e.insert+text.slice(e.to);
  const checked=EditorState.create({doc:text,extensions:[markdown()]});
  if(!ensureSyntaxTree(checked,checked.doc.length,50)||shape(root.toTree())!==shape(syntaxTree(checked))) return fail('Nummerierung ist in diesem Markdown-Kontext nicht sicher; Aktion unveraendert verworfen.');
  const result=replacement(state,from,to,text,finalAnchor);
  if(region&&result.spec) result.orgRegion={from:from+numberChanges.mapPos(region.from-from,-1),to:result.spec.changes.mapPos(region.to,1)};
  return result;
}
export function planStructure(state,command,{children=true,prefix='-',orgSemantics=false,orgRegion=null}={}) {
  if(!['heading-up','heading-down','heading-promote','heading-demote','list-up','list-down','list-indent','list-outdent','list-prefix'].includes(command)) return fail('Unbekannter Strukturbefehl.');
  if(state.readOnly) return fail('Editor ist schreibgeschützt.');
  if(!syntaxTreeAvailable(state,state.doc.length)) return fail('Dokument noch nicht vollständig analysiert; bitte erneut versuchen.');
  if(state.selection.ranges.length!==1 || !state.selection.main.empty) return fail('Bitte eine einzelne Cursorstelle ohne Textauswahl verwenden.');
  if(state.selection.main.head<frontmatterEnd(state)) return fail('YAML-/Frontmatterbereich bleibt unverändert.');
  if(ancestors(state,state.selection.main.head).some(n=>/^(FencedCode|CodeBlock)$/.test(n.name))) return fail('Innerhalb von Codeblöcken sind Strukturaktionen gesperrt.');
  return command.startsWith('heading-')?heading(state,command,children):list(state,command,children,prefix,orgSemantics,orgRegion);
}
export function runStructure(view,command,options,notify=()=>{}) {
  if(!syntaxTreeAvailable(view.state,view.state.doc.length)&&!forceParsing(view,view.state.doc.length,50)) {notify('Dokument noch nicht vollständig analysiert.');return false;}
  const result=planStructure(view.state,command,options);
  if(!result.spec) {notify(result.message);return false;}
  const previous=view.state.doc;
  view.dispatch({...result.spec,userEvent:'move.structure'});
  if(previous===view.state.doc)return false;
  view.dispatch({selection:view.state.selection,userEvent:'select.structure'});
  notify('Struktur geändert. Undo/Redo verfügbar.');return true;
}
