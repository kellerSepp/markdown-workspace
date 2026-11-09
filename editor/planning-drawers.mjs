import {syntaxTree} from '@codemirror/language';
import {frontmatterEnd} from './structure.mjs';

const marker=/^ {0,3}:(PROPERTIES|LOGBOOK|END):[ \t]*$/i;
function excluded(state,pos,{end=false}={}){
  for(let n=syntaxTree(state).resolveInner(pos,1);n;n=n.parent)
    if(['FencedCode','CodeBlock','Blockquote','HTMLBlock',...(!end?['ListItem']:[])].includes(n.name))return true;
  return false;
}
// Only two recognized literal drawers. Values and history remain inert text.
export function readPlanningDrawers(state,{from=0,to=state.doc.length}={}){
  const drawers=[],errors=[],front=frontmatterEnd(state);let opened=null;
  const headings=new Set();syntaxTree(state).iterate({from,to,enter(ref){if(/^(?:ATX|Setext)Heading[1-6]$/.test(ref.name)&&ref.node.parent?.name==='Document')headings.add(state.doc.lineAt(ref.from).from);}});
  for(let number=state.doc.lineAt(from).number;number<=state.doc.lines;number++){
    const line=state.doc.line(number);if(line.from>=to)break;if(line.from<front)continue;
    if(opened&&headings.has(line.from)){errors.push('Metadatendrawer endet nicht vor der nächsten Überschrift.');drawers.push({...opened,to:line.from-1,invalid:true});opened=null;}
    const m=marker.exec(line.text),near=/^ {0,3}:(PROPERTIES|LOGBOOK|END)(?::|[ \t]|$)/i.exec(line.text);
    if(!m){
      if(near&&!excluded(state,line.from,{end:!!opened&&near[1].toUpperCase()==='END'})){
        errors.push('Ungültiger Metadatendrawer-Marker.');
        if(!opened&&near[1].toUpperCase()!=='END')opened={kind:near[1].toUpperCase(),from:line.from,start:line,contentFrom:line.to<state.doc.length?line.to+1:line.to,invalid:true};
      }
      continue;
    }
    if(excluded(state,line.from,{end:!!opened&&m[1].toUpperCase()==='END'}))continue;
    const kind=m[1].toUpperCase();
    if(kind==='END'){
      if(!opened){errors.push('Drawer-Ende ohne Beginn.');continue;}
      drawers.push({...opened,to:line.to,end:line});opened=null;
    }else if(opened){errors.push('Verschachtelte oder unvollständige Metadatendrawer.');}
    else opened={kind,from:line.from,start:line,contentFrom:line.to<state.doc.length?line.to+1:line.to};
  }
  if(opened){errors.push('Metadatendrawer ohne :END:.');drawers.push({...opened,to,invalid:true});}
  return {drawers,errors};
}
const cached=new WeakMap();
export function planningDrawerRanges(state){
  const tree=syntaxTree(state);let trees=cached.get(state.doc);if(!trees)cached.set(state.doc,trees=new WeakMap());
  if(!trees.has(tree))trees.set(tree,readPlanningDrawers(state).drawers);
  return trees.get(tree);
}
export const inPlanningDrawer=(ranges,pos)=>ranges.some(range=>pos>=range.from&&pos<=range.to);
