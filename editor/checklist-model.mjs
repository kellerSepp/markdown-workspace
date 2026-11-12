import {syntaxTree,ensureSyntaxTree} from '@codemirror/language';
import {frontmatterEnd} from './structure.mjs';
import {planningDrawerRanges,inPlanningDrawer} from './planning-drawers.mjs';
import {headingSuffix} from './heading-suffix.mjs';

const cache=new WeakMap();
const overlaps=(a,b)=>a.from===a.to?a.from>=b.from&&a.from<b.to:b.from===b.to?b.from>=a.from&&b.from<a.to:a.from<b.to&&a.to>b.from;
const excludedInline=/^(InlineCode|Link|Image|Autolink|Escape|HTMLTag)$/;
function inlineOverlap(state,node,from,to,references){
  let found=false;
  node.toTree().iterate({enter(ref){
    if(!excludedInline.test(ref.name)||node.from+ref.from>=to||node.from+ref.to<=from)return;
    // Lezer also represents unresolved bare [text] as Link. Our literal
    // checkbox/cookie is allowed only when it is that entire bare expression.
    const label=state.doc.sliceString(from+1,to-1).trim().replace(/\s+/g,' ').toLowerCase();
    if(ref.name==='Link'&&node.from+ref.from===from&&node.from+ref.to===to&&!ref.node.getChild('URL')&&!references.has(label))return;
    found=true;
  }});
  return found;
}
function cookie(state,node,line,references){
  const heading=/^ATXHeading/.test(node.name)?headingSuffix(line.text,line.from):null;
  const content=heading?line.text.slice(0,heading.contentEnd-line.from):line.text;
  const matches=[...content.matchAll(/\[(?:\d*\/\d*|\d*%)\]/g)];
  if(!matches.length)return {};
  if(matches.length>2||new Set(matches.map(m=>m[0].includes('%'))).size!==matches.length)return {error:'Pro Zeile höchstens einen Bruch- und einen Prozentzähler verwenden.'};
  const cookies=[];
  for(const match of matches){
    const from=line.from+match.index,to=from+match[0].length;
    if(inlineOverlap(state,node,from,to,references))return {error:'Fortschrittszähler in Code oder Links bleiben unverändert.'};
    cookies.push({from,to,percent:match[0].includes('%')});
  }
  if(content.slice(matches.at(-1).index+matches.at(-1)[0].length).trim())return {};
  if(matches.length===2&&!/^[ \t]+$/.test(line.text.slice(matches[0].index+matches[0][0].length,matches[1].index)))return {error:'Fortschrittszähler am Zeilenende durch Leerraum trennen.'};
  return {cookie:cookies[0],cookies};
}
// A disposable projection of the existing Markdown tree, never a second parser
// or a persistent task index. Finish the tree within a bounded parsing budget.
export function readChecklists(state){
  const tree=ensureSyntaxTree(state,state.doc.length,100);
  if(!tree)return {message:'Checklisten: Dokument noch nicht vollständig analysiert.'};
  if(syntaxTree(state).length<state.doc.length)state=state.update({}).state;
  let trees=cache.get(state.doc);if(!trees)cache.set(state.doc,trees=new WeakMap());
  if(trees.has(tree))return trees.get(tree);
  const front=frontmatterEnd(state),drawers=planningDrawerRanges(state),items=[],headings=[],errors=[],roots=new Map(),byFrom=new Map();
  const references=new Set();tree.iterate({enter(ref){if(ref.name==='LinkReference'&&ref.from>=front&&!inPlanningDrawer(drawers,ref.from)){const label=ref.node.getChild('LinkLabel');if(label)references.add(state.doc.sliceString(label.from+1,label.to-1).trim().replace(/\s+/g,' ').toLowerCase());}}});
  tree.iterate({enter(ref){
    const node=ref.node;
    if((ref.name==='ListItem'||/Heading[1-6]$/.test(ref.name))&&(ref.from<front||inPlanningDrawer(drawers,ref.from)))return false;
    if(/^(?:ATX|Setext)Heading[1-6]$/.test(ref.name)&&node.parent?.name==='Document'){
      const line=state.doc.lineAt(ref.from),entry={from:line.from,to:ref.to,line,items:[],supported:ref.name.startsWith('ATX')};
      if(entry.supported)Object.assign(entry,cookie(state,node,line,references));
      headings.push(entry);return false;
    }
    if(ref.name!=='ListItem')return;
    let root=node.parent;while(root.parent?.name==='ListItem')root=root.parent.parent;
    if(root.parent?.name!=='Document')return false;
    if(!roots.has(root.from)){
      let unsafe=false;
      root.toTree().iterate({enter(n){
        if(/^(CodeBlock|FencedCode|HTMLBlock|Blockquote|HorizontalRule|Table|LinkReference|.*Heading[1-6])$/.test(n.name))unsafe=true;
        if(n.name==='ListItem'){
          const text=state.doc.lineAt(root.from+n.from).text,p=/^([ \t]*)([-+*]|\d+[.)])([ \t]+|$)/.exec(text);
          if(!p||p[0].includes('\t')||p[2].endsWith(')'))unsafe=true;
        }
      }});
      const value={from:root.from,to:root.to,unsafe};roots.set(root.from,value);
      if(unsafe&&/(?:^|\n)[ \t]*[-+*\d.)]+[ \t]+\[[ xX-]\]/.test(state.doc.sliceString(root.from,root.to)))errors.push({...value,message:'Checkliste mit Code, Mischcontainern oder nicht unterstützten Markern bleibt geschützt.'});
    }
    const rootInfo=roots.get(root.from);if(rootInfo.unsafe)return false;
    const line=state.doc.lineAt(ref.from),prefix=/^( *)([-+*]|\d+\.)( +|$)/.exec(line.text);
    if(!prefix||node.getChild('ListMark')?.to!==line.from+prefix[1].length+prefix[2].length)return false;
    const body=line.from+prefix[0].length,match=/^\[([ xX-])\](?:[ \t]+|$)/.exec(state.doc.sliceString(body,line.to));
    let parent=node.parent?.parent;const parentItem=parent?.name==='ListItem'?byFrom.get(parent.from):null;
    const entry={from:ref.from,to:ref.to,line,body,root:rootInfo,parent:parentItem??null,children:[]};
    if(match){
      if(inlineOverlap(state,node,body,body+3,references)){entry.error='Checkboxmarker in einem Link oder Code bleibt unverändert.';}
      else {entry.mark={from:body,to:body+3,end:body+match[0].length};entry.value=match[1].toLowerCase();}
    }
    Object.assign(entry,cookie(state,node,line,references));
    byFrom.set(ref.from,entry);items.push(entry);parentItem?.children.push(entry);
  }});
  for(let i=0;i<headings.length;i++)headings[i].end=headings[i+1]?.from??state.doc.length;
  let h=-1;for(const item of items){while(h+1<headings.length&&headings[h+1].from<item.from)h++;item.heading=headings[h]??null;if(!item.parent)item.heading?.items.push(item);}
  for(const entry of [...headings,...items])if(entry.error)errors.push({from:entry.from,to:entry.line.to,message:entry.error});
  const model={items,headings,errors};trees.set(tree,model);return model;
}
export function checklistContext(state){
  if(state.readOnly)return {message:'Editor ist schreibgeschützt.'};
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return {message:'Checklisten benötigen einen Cursor ohne Textauswahl.'};
  const model=readChecklists(state);if(model.message)return model;
  const line=state.doc.lineAt(state.selection.main.head);
  const item=model.items.find(item=>item.line.from===line.from),heading=model.headings.find(heading=>heading.line.from===line.from&&heading.supported);
  return {model,item,heading,line};
}
export function checklistEdits(model,ranges=[{from:0,to:Infinity}]){
  const selected=entry=>ranges.some(range=>overlaps(range,entry.heading?{from:entry.heading.from,to:entry.heading.end}:entry.root??{from:entry.from,to:entry.end}));
  const relevantErrors=model.errors.filter(error=>ranges.some(range=>overlaps(range,error)));
  // Never turn a protected/unrecognized checklist into a misleading 0/0 count.
  const activeHeadings=model.headings.filter(h=>selected(h));
  const error=model.errors.find(error=>activeHeadings.some(h=>overlaps(error,{from:h.from,to:h.end})) )??relevantErrors[0];
  if(error)return {message:error.message};
  const edits=[],values=new Map();
  const updateCookie=(entry,children)=>{
    if(!entry.cookie)return;
    const total=children.length,done=children.filter(c=>(values.get(c)??c.value)==='x').length;
    for(const cookie of entry.cookies){
      const text=cookie.percent?`[${total?Math.floor(done*100/total):0}%]`:`[${done}/${total}]`;
      edits.push({from:cookie.from,to:cookie.to,insert:text});
    }
  };
  for(let n=model.items.length-1;n>=0;n--){
    const item=model.items[n];if(!selected(item))continue;
    const children=item.children.filter(child=>child.mark);
    let value=item.value;
    if(item.mark&&children.length){value=children.every(c=>(values.get(c)??c.value)===' ')?' ':children.every(c=>(values.get(c)??c.value)==='x')?'x':'-';
      if(value!==item.value)edits.push({from:item.mark.from+1,to:item.mark.from+2,insert:value});
    }
    values.set(item,value);updateCookie(item,children);
  }
  for(const heading of activeHeadings)updateCookie(heading,heading.items.filter(item=>item.mark));
  return {edits:edits.sort((a,b)=>a.from-b.from)};
}
