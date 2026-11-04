import {Facet,RangeSetBuilder} from '@codemirror/state';
import {Decoration,ViewPlugin,gutter,GutterMarker} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {frontmatterEnd} from './structure.mjs';

export const MARKER_STYLES=Object.freeze(['-','*','+','○','●']);
export const DEFAULT_VISUAL_STRUCTURE=Object.freeze({headingIndent:false,listMarkers:false,hierarchicalNumbers:false,markers:Object.freeze(['-','○','●','*','+'])});
export function normalizeVisualSettings(value={}) {
  return {headingIndent:!!value.headingIndent,listMarkers:!!value.listMarkers,hierarchicalNumbers:!!value.hierarchicalNumbers,
    markers:Array.from({length:5},(_,n)=>MARKER_STYLES.includes(value.markers?.[n])?value.markers[n]:DEFAULT_VISUAL_STRUCTURE.markers[n])};
}
export const visualSettings=Facet.define({combine:values=>normalizeVisualSettings(values.at(-1)??DEFAULT_VISUAL_STRUCTURE)});
const ordinalIndexes=new WeakMap();
function ordinal(state,item) {
  const tree=syntaxTree(state),parent=item.parent,key=`${parent.from}:${parent.to}`;
  if(!ordinalIndexes.has(tree)) ordinalIndexes.set(tree,new Map());
  const indexes=ordinalIndexes.get(tree);
  if(!indexes.has(key)) {
    const first=parent.firstChild,values=new Map();
    let number=parent.name==='OrderedList'?Number(state.doc.sliceString(first.from,first.getChild('ListMark').to).match(/^\d+/)?.[0]??1):1;
    for(let n=first;n;n=n.nextSibling) if(n.name==='ListItem') values.set(n.from,number++);
    indexes.set(key,values);
  }
  return indexes.get(key).get(item.from);
}
export function listPresentation(state,item,settings) {
  const path=[];
  for(let n=item;n;n=n.parent) if(n.name==='ListItem') path.unshift(ordinal(state,n));
  const level=path.length;
  if(item.parent.name==='OrderedList') return settings.hierarchicalNumbers?{level,label:path.join('.')+'.',kind:'number'}:null;
  return settings.listMarkers?{level,label:settings.markers[Math.min(level-1,4)],kind:'bullet'}:null;
}
// A viewport model: no replacement decorations, so raw prefixes/copy/cursor stay intact.
export function visualModel(state,visibleRanges,rawSettings) {
  const settings=normalizeVisualSettings(rawSettings),lines=new Map(),markers=new Map(),tree=syntaxTree(state),front=frontmatterEnd(state);
  for(const visible of visibleRanges) tree.iterate({from:visible.from,to:visible.to,enter(ref) {
    if(ref.from<front) return;
    const node=ref.node,heading=/^(?:ATX|Setext)Heading([1-6])$/.exec(ref.name);
    if(heading && settings.headingIndent) {
      for(let n=state.doc.lineAt(node.from).number;n<=state.doc.lineAt(node.to).number;n++) {
        const line=state.doc.line(n);if(line.to>=visible.from && line.from<=visible.to) lines.set(line.from,{from:line.from,headingLevel:Number(heading[1])});
      }
    }
    if(ref.name==='FencedCode'||ref.name==='CodeBlock') {
      const first=state.doc.lineAt(Math.max(node.from,visible.from)).number,last=state.doc.lineAt(Math.min(node.to,visible.to)).number;
      for(let n=first;n<=last;n++) {const line=state.doc.line(n);lines.set(line.from,{from:line.from,code:true});}
      return false;
    }
    if(ref.name==='ListItem') {
      const line=state.doc.lineAt(node.from),presentation=listPresentation(state,node,settings);
      if(presentation && line.from>=visible.from && line.from<=visible.to) markers.set(line.from,{from:line.from,...presentation});
    }
  }});
  return {lines:[...lines.values()].sort((a,b)=>a.from-b.from),markers:[...markers.values()].sort((a,b)=>a.from-b.from)};
}
class StructureMarker extends GutterMarker {
  constructor(label,kind,level) {super();this.label=label;this.kind=kind;this.level=level;}
  eq(other) {return this.label===other.label&&this.kind===other.kind&&this.level===other.level;}
  toDOM() {const span=document.createElement('span');span.textContent=this.label;span.title=`${this.label} – Gliederungsanzeige, Ebene ${this.level}; Markdown-Präfix unverändert`;span.setAttribute('aria-label',span.title);return span;}
}
const visuals=ViewPlugin.fromClass(class {
  constructor(view) {this.build(view);}
  update(update) {
    if(update.docChanged||update.viewportChanged||syntaxTree(update.startState)!==syntaxTree(update.state)||update.startState.facet(visualSettings)!==update.state.facet(visualSettings)) this.build(update.view);
  }
  build(view) {
    const model=visualModel(view.state,view.visibleRanges,view.state.facet(visualSettings)),decorations=new RangeSetBuilder(),markers=new RangeSetBuilder();
    for(const line of model.lines) decorations.add(line.from,line.from,Decoration.line({class:line.code?'cm-codeBlock':'cm-heading-indent cm-heading-level'+line.headingLevel}));
    for(const marker of model.markers) markers.add(marker.from,marker.from,new StructureMarker(marker.label,marker.kind,marker.level));
    this.decorations=decorations.finish();this.markers=markers.finish();
  }
},{decorations:plugin=>plugin.decorations});
export function visualStructure(settings=DEFAULT_VISUAL_STRUCTURE) {
  return [visualSettings.of(settings),visuals,gutter({class:'cm-structureGutter',markers:view=>view.plugin(visuals)?.markers??Decoration.none})];
}
