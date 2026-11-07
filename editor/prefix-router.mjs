import {panelMove} from './panel-navigation.mjs';
import {Prec} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {enableFocusNavigation,handleEditorAlt} from './structure-keymap.mjs';
import {PREFIX_BINDINGS} from './emacs-policy.mjs';
export {PREFIX_BINDINGS} from './emacs-policy.mjs';

// Local policy only; documentation and note contents are never executable.

export function createPrefixRouter({registry,getContext=()=>({}),showHelp=()=>{},hideHelp=()=>{},moveHelp=()=>{},activateHelp=()=>{},notify=()=>{}}){
  let target=null,released=false;
  const ready=view=>{const c=getContext();return view.hasFocus&&!c.busy&&c.hasDocument!==false&&!view.state.readOnly;};
  function cancel(){const active=!!target;target=null;released=false;if(active)hideHelp();}
  function choices(){return PREFIX_BINDINGS.map(binding=>({...binding,name:registry.get(binding.id).name,...registry.availability(binding.id)}));}
  function choose(view,key){
    if(!target)return false;
    const valid=released&&target===view.state&&ready(view);
    const binding=PREFIX_BINDINGS.find(b=>b.key===key);
    cancel();
    if(!valid||!binding){notify('Prefix verworfen: Ziel oder Folge ungültig.');return false;}
    // Registry checks current context again, including the folding context.
    return registry.execute(binding.id);
  }
  function keyDown(event,view){
    const key=event.key.toLowerCase();
    if(!view.hasFocus){cancel();return false;}
    if(event.isComposing||event.keyCode===229||event.getModifierState?.('AltGraph')||event.metaKey){cancel();return false;}
    if(target&&event.key==='Alt'){
      if(event.code==='AltRight'||event.location===2){cancel();return false;}
      if(handleEditorAlt(event,view))return true;
    }
    const move=target?panelMove(event):0;
    if(move){
      event.preventDefault();
      if(target!==view.state||!ready(view)){cancel();return true;}
      if(released)moveHelp(move);
      return true;
    }
    if(event.altKey){cancel();return false;}
    const start=key==='c'&&event.ctrlKey&&!event.shiftKey;
    if(!target){
      if(!start)return false;
      event.preventDefault();
      if(!event.repeat&&ready(view)){
        target=view.state;released=false;
        showHelp(choices(),key=>choose(view,key),()=>cancel());
      }
      return true; // Never native Copy inside the editor, even when blocked.
    }
    if(event.key==='Escape'&&!event.ctrlKey&&!event.shiftKey){
      cancel();event.preventDefault();enableFocusNavigation(view,notify);return true;
    }
    if(key==='g'&&event.ctrlKey&&!event.shiftKey){cancel();event.preventDefault();return true;}
    if(event.key==='Control'&&!event.shiftKey)return false;
    if(event.key==='Shift'){cancel();return false;}
    event.preventDefault();
    if(event.repeat)return true;
    const binding=PREFIX_BINDINGS.find(b=>b.key===key);
    if(!released||!!event.ctrlKey!==!!binding?.ctrl||event.shiftKey){cancel();notify('Prefix verworfen: Tasten erst loslassen.');return true;}
    if(event.key==='Enter'){
      if(target!==view.state||!ready(view)){cancel();return true;}
      activateHelp();return true;
    }
    choose(view,key);return true;
  }
  function keyUp(event){if(target&&event.key.toLowerCase()==='c')released=true;return false;}
  function extension(){return [
    Prec.highest(EditorView.domEventHandlers({keydown:keyDown,keyup:keyUp,
      blur:()=>{cancel();return false;},
      compositionstart:()=>{cancel();return false;},mousedown:()=>{cancel();return false;}})),
    EditorView.updateListener.of(update=>{if(target&&target!==update.state)cancel();}),
    ViewPlugin.define(view=>{
      const win=view.dom?.ownerDocument?.defaultView;
      win?.addEventListener('blur',cancel);
      return {destroy(){win?.removeEventListener('blur',cancel);cancel();}};
    })
  ];}
  return {keyDown,keyUp,choose,cancel,extension,get active(){return !!target;}};
}
