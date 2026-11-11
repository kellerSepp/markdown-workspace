import {isolateHistory} from '@codemirror/commands';
import {emacsMark,setEmacsMark} from './emacs-editing.mjs';
import {validTag} from './heading-suffix.mjs';
import {tagContext,readTags} from './tag-model.mjs';
import {tagRules,reloadTags,readTagRules,tagDefinitionLine} from './tag-rules.mjs';
export {tagContext} from './tag-model.mjs';
export function planTags(state,names){
  const c=tagContext(state);if(c.message)return c;
  if(!Array.isArray(names)||!names.every(validTag))return {message:'Ungültige Tagnamen.'};
  const tags=[...new Set(names)];
  if(JSON.stringify(tags)===JSON.stringify(c.tags))return {noop:true};
  let from=c.removeFrom??c.end;
  while(from>c.contentFrom&&/[ \t]/.test(state.doc.sliceString(from-1,from)))from--;
  const suffix=tags.length?(from===c.contentFrom?'':' ')+':'+tags.join(':')+':':'';
  // Only the suffix is edited, preserving title, cookies, closing hashes and body.
  const changes=state.changes({from,to:c.end,insert:suffix});
  return {spec:{changes,selection:state.selection.map(changes),annotations:isolateHistory.of('full'),userEvent:'input.tags'}};
}
export function createTagsController({view,panel,getContext=()=>({}),notify=()=>{}}){
  const ready=()=>!getContext().busy&&getContext().hasDocument!==false&&!view.state.readOnly;
  return {
    open(){
      if(!ready())return false;
      const c=tagContext(view.state);if(c.message){notify(c.message);return false;}
      if(view.state.field(emacsMark,false)?.active)view.dispatch({effects:setEmacsMark.of(false)});
      const loaded=view.state.field(tagRules,false),entries=new Map((loaded?.entries??[]).map(e=>[e.name,e]));
      for(const h of readTags(view.state).headings)for(const name of h.tags)if(!entries.has(name))entries.set(name,{name});
      return panel.openTags({entries:[...entries.values()],current:c.tags,inherited:c.heading.inherited,origins:c.heading.origins,warning:loaded?.error,choose:(names,saved)=>{
        if(!ready()||saved.state!==view.state){notify('Tagziel geändert; bitte erneut öffnen.');return false;}
        const plan=planTags(view.state,names);if(plan.noop)return true;if(!plan.spec){notify(plan.message);return false;}
        const expected=plan.spec.changes.apply(view.state.doc);view.dispatch(plan.spec);
        if(!view.state.doc.eq(expected))return false;
        view.dispatch({selection:view.state.selection,userEvent:'select.tags'});return true;
      }});
    },
    reload(){
      if(!ready()||view.state.selection.ranges.length!==1||!view.state.selection.main.empty||!tagDefinitionLine(view.state))return false;
      const result=readTagRules(view.state);view.dispatch({effects:reloadTags.of(result)});notify(result.message??'Tagvorlagen geladen.');return !result.message;
    }
  };
}
