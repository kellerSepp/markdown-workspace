import {syntaxTree, foldable, foldedRanges, foldEffect, unfoldEffect} from '@codemirror/language';

// Structural information comes exclusively from CodeMirror's Markdown syntax tree.
// Cached per completed tree, never rescanned by a timer or on each typed character.
const indexes = new WeakMap();
export function headingSections(state) {
  const tree = syntaxTree(state);
  if (indexes.has(tree)) return indexes.get(tree);
  const headings = [];
  tree.iterate({enter(ref) {
    const match = /^(?:ATX|Setext)Heading([1-6])$/.exec(ref.name);
    if (!match) return;
    const node = ref.node, parent = node.parent;
    const line = state.doc.lineAt(node.from);
    const native = foldable(state,line.from,line.to);
    headings.push({from:node.from, level:Number(match[1]), lineFrom:line.from,
      headerEnd:state.doc.lineAt(node.to).to, range:native,
      container:`${parent.from}:${parent.to}:${parent.type.id}`, limit:parent.to, parent:null});
  }});
  const groups = new Map();
  for (const heading of headings) {
    if (!groups.has(heading.container)) groups.set(heading.container,[]);
    groups.get(heading.container).push(heading);
  }
  for (const group of groups.values()) {
    const stack = [];
    for (let n=0;n<group.length;n++) {
      const h = group[n];
      while (stack.length && stack.at(-1).level>=h.level) {
        const ended = stack.pop(); ended.limit=h.from;
      }
      h.parent=stack.at(-1) ?? null;
      h.to=Math.max(h.headerEnd,h.range?.to ?? h.headerEnd);
      stack.push(h);
    }
  }
  indexes.set(tree,headings);
  return headings;
}
export function sectionAt(state,pos) {
  return headingSections(state).filter(h => h.lineFrom<=pos && (pos<h.limit || pos===state.doc.length && pos===h.limit)).at(-1) ?? null;
}
function localBlock(state,pos) {
  for (let node=syntaxTree(state).resolveInner(pos,pos===state.doc.length?-1:1);node;node=node.parent) {
    if (!/^(?:ListItem|BulletList|OrderedList|FencedCode|CodeBlock|Blockquote)$/.test(node.name)) continue;
    const line=state.doc.lineAt(node.from), native=foldable(state,line.from,line.to);
    const range=/^(?:ListItem|BulletList|OrderedList)$/.test(node.name) ? {from:line.to,to:node.to} : native ?? {from:line.to,to:node.to};
    if (range.to>range.from) return {from:node.from,headerEnd:line.to,to:range.to,range,block:true};
  }
  return null;
}
export function foldingContext(state,pos=state.selection.main.head) {
  return sectionAt(state,pos) ?? localBlock(state,pos);
}
function within(state,context) {
  const ranges=[];
  foldedRanges(state).between(context.from,context.to,(from,to) => {
    if (from>=context.from && to<=context.to) ranges.push({from,to});
  });
  return ranges;
}
const same = (a,b) => a.length===b.length && a.every((r,n)=>r.from===b[n].from && r.to===b[n].to);
export function visibilityPlans(state,context) {
  if (context.block) return [{name:'vollständig offen',ranges:[]}];
  const all=headingSections(state).filter(h=>h.container===context.container && h.from>=context.from && h.from<=context.to);
  if (all.length<2) return [{name:'vollständig offen',ranges:[]}];
  const bodies=all.map((h,n) => ({heading:h,from:h.headerEnd,to:Math.min(context.to,all[n+1] ? all[n+1].lineFrom-1 : context.to)}))
    .filter(r=>r.to>r.from);
  const plans=[
    {name:'Gliederung',ranges:bodies.map(({from,to})=>({from,to}))},
    {name:'Text der direkten Kinder',ranges:bodies.filter(r=>r.heading!==context && r.heading.parent!==context).map(({from,to})=>({from,to}))},
    {name:'vollständig offen',ranges:[]}
  ];
  return plans.filter((p,n)=> p.name==='vollständig offen' || p.ranges.length && !plans.slice(0,n).some(before=>same(before.ranges,p.ranges)));
}
function applyPlan(view,context,ranges,notify,name) {
  const effects=within(view.state,context).map(r=>unfoldEffect.of(r)).concat(ranges.map(r=>foldEffect.of(r)));
  const head=view.state.selection.main.head;
  // CodeMirror clears folds covering an explicit selection; move hidden cursors first.
  const selection=ranges.some(r=>head>r.from && head<r.to) ? {anchor:context.headerEnd} : undefined;
  view.dispatch({effects,...(selection ? {selection} : {})});
  notify?.(`Abschnitt: ${name}.`);
  return true;
}
export function collapseContext(view,notify,pos) {
  const context=foldingContext(view.state,pos);
  if (!context?.range || context.range.to<=context.range.from) return false;
  // Preserve nested folds when adding the surrounding fold.
  const range=context.range, head=view.state.selection.main.head;
  view.dispatch({effects:foldEffect.of(range),...(head>range.from && head<range.to ? {selection:{anchor:context.from}} : {})});
  notify?.('Abschnitt: geschlossen.');
  return true;
}
export function revealContext(view,notify,pos,fully=false) {
  const context=foldingContext(view.state,pos);
  if (!context) return false;
  const current=within(view.state,context);
  if (!current.length) return true;
  const closed=context.range && current.some(r=>same([r],[context.range]));
  const plans=visibilityPlans(view.state,context);
  const found=plans.findIndex(p=>same(current,p.ranges));
  // Mixed/manual folds have no canonical stage. Opening them must never hide more text.
  const next=fully || found<0 && !closed ? plans.at(-1) : closed ? plans[0] : plans[found+1] ?? plans.at(-1);
  return applyPlan(view,context,next.ranges,notify,next.name);
}
export function cycleContext(view,notify,pos) {
  const context=foldingContext(view.state,pos);
  if (!context) return false;
  return within(view.state,context).length ? revealContext(view,notify,pos) : collapseContext(view,notify,pos);
}

// Escape hatch for an existing fold while a changed/large document is not fully parsed.
// It uses only actual folded ranges, never an incomplete heading boundary.
export function unfoldExisting(view,notify,pos=view.state.selection.main.head) {
  const line=view.state.doc.lineAt(pos), all=[];
  foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>all.push({from,to}));
  const range=all.find(r=>r.from>=line.from && r.from<=line.to || r.from<=pos && r.to>=pos);
  if (!range) return false;
  view.dispatch({effects:all.filter(r=>r.from>=range.from && r.to<=range.to).map(r=>unfoldEffect.of(r))});
  notify?.('Vorhandener Faltbereich geöffnet. Weitere Stufen nach vollständiger Analyse.');
  return true;
}
