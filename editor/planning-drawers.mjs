import {syntaxTree} from '@codemirror/language';
import {frontmatterEnd} from './structure.mjs';

const marker=/^ {0,3}:([A-Za-z][A-Za-z0-9_]*):[ \t]*$/;
function excluded(state,pos,{end=false}={}){
  for(let n=syntaxTree(state).resolveInner(pos,1);n;n=n.parent)
    if(['FencedCode','CodeBlock','Blockquote','HTMLBlock','CommentBlock','ProcessingInstructionBlock',...(!end?['ListItem']:[])].includes(n.name))return true;
  return false;
}
// Shared positional scanner: protected Markdown stays inert.
export function readDrawers(state,{from=0,to=state.doc.length}={}){
  const drawers=[],errors=[],front=frontmatterEnd(state);let opened=null,broken=null;
  const headings=new Set();syntaxTree(state).iterate({from,to,enter(ref){if(/^(?:ATX|Setext)Heading[1-6]$/.test(ref.name)&&ref.node.parent?.name==='Document')headings.add(state.doc.lineAt(ref.from).from);}});
  for(let number=state.doc.lineAt(from).number;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=to)break;if(line.from<front)continue;
    if(broken&&headings.has(line.from))broken=null;
    if(opened&&headings.has(line.from)){
      errors.push('Metadatendrawer endet nicht vor der nächsten Überschrift.');
      broken={...opened,to:line.from-1,invalid:true};drawers.push(broken);opened=null;
    }
    const m=marker.exec(line.text),near=/^ {0,3}:(PROPERTIES|LOGBOOK|END)(?::|[ \t]|$)/i.exec(line.text);
    if(!m){
      if(near&&!excluded(state,line.from,{end:!!(opened||broken)&&near[1].toUpperCase()==='END'})){
        errors.push('Ungültiger Metadatendrawer-Marker.');
        if(!opened&&near[1].toUpperCase()!=='END')opened={kind:near[1].toUpperCase(),from:line.from,start:line,contentFrom:line.to<state.doc.length?line.to+1:line.to,invalid:true};
      }
      continue;
    }
    if(excluded(state,line.from,{end:!!(opened||broken)&&m[1].toUpperCase()==='END'}))continue;
    const kind=m[1].toUpperCase();
    if(broken){
      if(kind==='END')broken.diagnosticTo=line.to;
      broken=null;
    }
    if(kind==='END'){
      if(!opened){errors.push('Drawer-Ende ohne Beginn.');continue;}
      drawers.push({...opened,to:line.to,end:line});opened=null;
    }else if(opened){
      if(['PROPERTIES','LOGBOOK'].includes(opened.kind)&&kind!=='LOGBOOK'&&kind!=='PROPERTIES')continue;
      errors.push('Verschachtelte oder unvollständige Metadatendrawer.');opened.invalid=true;
    }
    else opened={kind,from:line.from,start:line,contentFrom:line.to<state.doc.length?line.to+1:line.to};
  }
  if(opened){errors.push('Metadatendrawer ohne :END:.');drawers.push({...opened,to,invalid:true});}
  // Diagnostics may cover one offending heading through its explicit END, but
  // never extend an unterminated marker across unrelated following headings.
  const invalidRanges=drawers.filter(d=>d.invalid).map(d=>({from:d.from,to:d.diagnosticTo??d.end?.to??d.start.to,marker:d.start.to}));
  return {drawers,errors,invalidRanges};
}
export function readPlanningDrawers(state,options){
  const result=readDrawers(state,options);
  return {...result,drawers:result.drawers.filter(d=>['LOGBOOK','PROPERTIES'].includes(d.kind))};
}
const cached=new WeakMap();
export function planningDrawerRanges(state){
  const tree=syntaxTree(state);let trees=cached.get(state.doc);if(!trees)cached.set(state.doc,trees=new WeakMap());
  if(!trees.has(tree))trees.set(tree,readDrawers(state).drawers);
  return trees.get(tree);
}
export const inPlanningDrawer=(ranges,pos)=>ranges.some(range=>pos>=range.from&&pos<=range.to);

export function logbookRanges(state){
  return readPlanningDrawers(state).drawers.filter(d=>d.kind==='LOGBOOK'&&!d.invalid&&d.end).map(d=>({from:d.start.to,to:d.end.to})).filter(r=>r.to>r.from);
}

export function drawerFoldRanges(state){
  return planningDrawerRanges(state).filter(d=>d.kind!=='PROPERTIES'&&!d.invalid&&d.end).map(d=>({from:d.start.to,to:d.end.to})).filter(r=>r.to>r.from);
}
