import {Decoration,EditorView,ViewPlugin,WidgetType} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {readTags} from './tag-model.mjs';
class TagGap extends WidgetType {
  toDOM(view){
    const gap=view.dom.ownerDocument.createElement('span');
    gap.className='cm-heading-tag-gap';
    gap.setAttribute('aria-hidden','true');
    return gap;
  }
  ignoreEvent(){return false;}
}
export function tagDecorations(state,visibleRanges){
  const ranges=[],model=readTags(state);
  for(const h of model.headings??[])if(h.suffix?.tagFrom!==null&&h.suffix?.tagFrom!==undefined&&!h.suffix.error&&visibleRanges.some(r=>h.suffix.tagFrom<r.to&&h.line.to>r.from)) {
    // Keep optional closing ATX hashes after the tags in the same aligned box.
    // This only styles source text: no padding is written into the document.
    // Keep one source separator with the tags. Additional spaces belong to the
    // title side, so typing a space there does not move the cursor into the box.
    const from=Math.max(h.suffix.removeFrom,h.suffix.tagFrom-1);
    ranges.push(Decoration.widget({widget:new TagGap(),side:1}).range(from));
    ranges.push(Decoration.mark({class:'cm-heading-tags cm-heading-tags-level'+h.level}).range(from,h.line.to));
  }
  return Decoration.set(ranges,true);
}
export const tagHighlight=ViewPlugin.fromClass(class{
  constructor(view){this.decorations=tagDecorations(view.state,view.visibleRanges);this.align(view);}
  update(u){
    if(u.docChanged||u.viewportChanged||syntaxTree(u.startState)!==syntaxTree(u.state))this.decorations=tagDecorations(u.state,u.view.visibleRanges);
    if(u.docChanged||u.geometryChanged||u.viewportChanged||syntaxTree(u.startState)!==syntaxTree(u.state))this.align(u.view);
  }
  align(view){
    view.requestMeasure({key:this,read:()=>measureTagGaps(view.contentDOM),write:values=>{
      for(const {gap,width} of values)if(gap.style.width!==width+'px')gap.style.width=width+'px';
    }});
  }
},{provide:plugin=>EditorView.outerDecorations.of(view=>view.plugin(plugin)?.decorations??Decoration.none)});

// The spacer stays in normal inline flow, so the cursor before it stays at the
// title end. Measure the source before the spacer, independent of its old width
// (which may have wrapped after typing or resizing). No text/history edits.
export function measureTagGaps(content){
  const result=[];
  for(const gap of content.querySelectorAll('.cm-heading-tag-gap')){
    const line=gap.closest('.cm-line'),tags=line?.querySelector('.cm-heading-tags');
    if(!line||!tags)continue;
    const range=content.ownerDocument.createRange();
    range.setStart(line,0);range.setEndBefore(gap);
    const rects=Array.from(range.getClientRects()).filter(r=>r.width>0);
    const end=rects.at(-1),box=line.getBoundingClientRect();
    // The bounding box includes CM's line padding (and optional heading
    // indentation). Only the inner content edge is available for inline text.
    // Spending the right padding on the spacer pushes the tag box onto a new
    // visual line even when the title and tags would otherwise fit.
    const style=content.ownerDocument.defaultView.getComputedStyle(line);
    const left=box.left+(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0);
    const right=box.right-(parseFloat(style.borderRightWidth)||0)-(parseFloat(style.paddingRight)||0);
    const start=end?.right??left;
    const available=right-start-tags.getBoundingClientRect().width-1;
    result.push({gap,width:Math.max(0,available)});
  }
  return result;
}
