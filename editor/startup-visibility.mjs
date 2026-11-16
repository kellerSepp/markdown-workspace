import {syntaxTree,syntaxTreeAvailable,forceParsing,foldEffect} from '@codemirror/language';
import {orgHeadings,orgVisibilityPlans} from './org-folding.mjs';
import {frontmatterEnd} from './structure.mjs';
import {planningDrawerRanges,inPlanningDrawer,drawerFoldRanges} from './planning-drawers.mjs';

const modes=new Set(['overview','content','showall','showeverything','show2levels','show3levels','show4levels','show5levels']);
function protectedAt(tree,pos){
  for(let node=tree.resolveInner(pos,1);node;node=node.parent)
    if(/^(FencedCode|CodeBlock|HTMLBlock|CommentBlock|ProcessingInstructionBlock|Blockquote|ListItem)$/.test(node.name))return true;
  return false;
}
export function startupDefinitionLines(state){
  const definitions=[],tree=syntaxTree(state),front=frontmatterEnd(state),drawers=planningDrawerRanges(state);
  for(let n=1;n<=state.doc.lines;n++){
    const line=state.doc.line(n);
    if(line.from<front||!/^ {0,3}#\+STARTUP\b/i.test(line.text)||protectedAt(tree,line.from)||inPlanningDrawer(drawers,line.from))continue;
    definitions.push(line);
  }
  return definitions;
}
export function readStartupVisibility(state){
  if(!syntaxTreeAvailable(state,state.doc.length))return {message:'STARTUP: Dokument noch nicht vollständig analysiert.'};
  const definitions=startupDefinitionLines(state);
  if(!definitions.length)return {mode:null};
  if(definitions.length!==1)return {message:'STARTUP: Genau eine Definition pro Datei erlaubt; Ansicht bleibt offen.'};
  const mode=/^ {0,3}#\+STARTUP:[ \t]*(\S+)[ \t]*$/i.exec(definitions[0].text)?.[1].toLowerCase();
  return modes.has(mode)?{mode}:{message:'STARTUP: Ungültige Startansicht; Ansicht bleibt offen.'};
}
export function startupVisibilityPlan(state){
  const result=readStartupVisibility(state);
  if(result.message||!result.mode)return result;
  const {mode}=result,headings=orgHeadings(state);
  let ranges=[];
  if(mode==='overview')ranges=orgVisibilityPlans(state,true)[0].ranges;
  else if(mode==='content')ranges=headings.map((h,i)=>({from:h.headerEnd,to:headings[i+1]?headings[i+1].lineFrom-1:state.doc.length}));
  else if(/^show[2-5]levels$/.test(mode)){
    const level=Number(mode[4]);
    // Keep headings through the chosen level; hide bodies and deeper trees.
    const visible=headings.filter(h=>h.level<=level);
    ranges=visible.map((h,i)=>({from:h.headerEnd,to:visible[i+1]?visible[i+1].lineFrom-1:state.doc.length}));
  }
  return {mode,ranges:ranges.filter(r=>r&&r.to>r.from)};
}
export function applyStartupVisibility(view,notify=()=>{}){
  if(!forceParsing(view,view.state.doc.length,100)){
    notify('STARTUP: Dokument noch nicht vollständig analysiert; Ansicht bleibt offen.');return false;
  }
  const plan=startupVisibilityPlan(view.state);
  if(plan.message){notify(plan.message);return false;}
  plan.ranges=[...(plan.ranges??[]),...drawerFoldRanges(view.state)];
  if(!plan.ranges.length)return true;
  const hidden=plan.ranges.find(r=>view.state.selection.ranges.some(s=>s.from>r.from&&s.from<r.to||s.to>r.from&&s.to<r.to));
  view.dispatch({effects:plan.ranges.map(r=>foldEffect.of(r)),...(hidden?{selection:{anchor:hidden.from}}:{})});
  return true;
}
