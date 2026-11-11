import {Decoration,ViewPlugin} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {readTags} from './tag-model.mjs';
function decorations(view){
  const ranges=[],model=readTags(view.state);
  for(const h of model.headings??[])if(h.suffix?.tagFrom!==null&&h.suffix?.tagFrom!==undefined&&!h.suffix.error&&view.visibleRanges.some(r=>h.suffix.tagFrom<r.to&&h.suffix.end>r.from))
    ranges.push(Decoration.mark({class:'cm-heading-tags'}).range(h.suffix.tagFrom,h.suffix.end));
  return Decoration.set(ranges,true);
}
export const tagHighlight=ViewPlugin.fromClass(class{
  constructor(view){this.decorations=decorations(view);}
  update(u){if(u.docChanged||u.viewportChanged||syntaxTree(u.startState)!==syntaxTree(u.state))this.decorations=decorations(u.view);}
},{decorations:v=>v.decorations});
