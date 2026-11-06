// DOM-only split policy. CSS owns defaults; callers may override these named
// custom properties without touching ring/editor behavior or document state.
const properties={height:'--workspace-height',minHeight:'--workspace-min-height',maxHeight:'--workspace-max-height',panelShare:'--work-panel-share'};
const offset=(element,key)=>Number(element?.[key])||0;
const bounded=(value,size,viewport)=>Math.max(0,Math.min(value,Math.max(0,size-viewport)));

export function createPanelLayout({workspace,host,view,document:doc=globalThis.document,policy={}}){
  const previous=[];
  for(const [key,property] of Object.entries(properties))if(policy[key]!=null&&workspace?.style){
    previous.push([property,workspace.style.getPropertyValue(property)]);workspace.style.setProperty(property,policy[key]);
  }
  let destroyed=false;
  function preserve(action){
    const state=view.state,scroll=view.scrollDOM,win=doc?.defaultView;
    const top=offset(scroll,'scrollTop'),left=offset(scroll,'scrollLeft'),x=offset(win,'scrollX'),y=offset(win,'scrollY');
    try{return action();}
    finally{
      // Synchronous only: no callback may later undo a user's scroll or restore
      // offsets into a changed file. Enlarging near EOF may unavoidably clamp.
      if(view.state===state&&view.scrollDOM===scroll){
        if(scroll){
          scroll.scrollTop=bounded(top,offset(scroll,'scrollHeight'),offset(scroll,'clientHeight'));
          scroll.scrollLeft=bounded(left,offset(scroll,'scrollWidth'),offset(scroll,'clientWidth'));
        }
        if(win&&(offset(win,'scrollX')!==x||offset(win,'scrollY')!==y))win.scrollTo?.({left:x,top:y,behavior:'instant'});
      }
    }
  }
  function setOpen(open,action=()=>{}){
    if(destroyed)return;
    return preserve(()=>{host.hidden=!open;workspace?.classList.toggle('panel-open',open);return action();});
  }
  setOpen(false);
  return {preserve,setOpen,destroy(){if(destroyed)return;setOpen(false);destroyed=true;for(const [key,value] of previous)workspace.style.setProperty(key,value);}};
}

// Scroll this result container only, never the page/editor ancestor chain.
export function revealPanelRow(results,row){
  const top=offset(row,'offsetTop'),bottom=top+offset(row,'offsetHeight'),current=offset(results,'scrollTop'),height=offset(results,'clientHeight');
  let next=current;if(top<current)next=top;else if(bottom>current+height)next=bottom-height;
  results.scrollTop=bounded(next,offset(results,'scrollHeight'),height);
}
