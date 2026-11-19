import {panelMove} from './panel-navigation.mjs';
import {Prec} from '@codemirror/state';
import {EditorView,ViewPlugin} from '@codemirror/view';
import {enableFocusNavigation,handleEditorAlt} from './structure-keymap.mjs';
import {PREFIX_TREE} from './emacs-policy.mjs';
export {PREFIX_BINDINGS} from './emacs-policy.mjs';

// Local policy only; documentation and note contents are never executable.

export function createPrefixRouter({registry,bindings=PREFIX_TREE,getContext=()=>({}),showHelp=()=>{},hideHelp=()=>{},moveHelp=()=>{},activateHelp=()=>{},notify=()=>{}}){
  let target=null,released=false,argument=null,nodes=bindings,path=[];
  const ready=view=>{const c=getContext();return view.hasFocus&&!c.busy&&((c.hasDocument!==false&&!view.state.readOnly)||(c.hasDocument===false&&c.canFindFile));};
  function cancel(){const active=!!target;target=null;released=false;argument=null;nodes=bindings;path=[];if(active)hideHelp();}
  const available=binding=>binding.children?{enabled:binding.children.some(child=>available(child).enabled),reason:'Kein verfügbarer Befehl.'}:argument&&!binding.argument?{enabled:false,reason:'Dieser Befehl unterstützt das Prefixargument nicht.'}:registry.availability(binding.id);
  function choices(){return nodes.map(binding=>({...binding,name:binding.name??(binding.children?'Untermenü':registry.get(binding.id).name),...available(binding)}));}
  function show(view){showHelp(choices(),key=>choose(view,key),()=>cancel(),{sequence:['C-c',...path].join(' '),argument:!!argument});}
  function choose(view,key){
    if(!target)return false;
    const valid=released&&target===view.state&&ready(view)&&(!argument||argument.state===view.state);
    const binding=nodes.find(b=>b.key===key);
    if(!valid||!binding){cancel();notify('Prefix verworfen: Ziel oder Folge ungültig.');return false;}
    if(argument&&!binding.children&&!binding.argument){cancel();notify('Dieser Befehl unterstützt das Prefixargument nicht.');return false;}
    if(binding.children){if(binding.modifier)argument={state:view.state};nodes=binding.children;path.push(binding.label??binding.key);show(view);return true;}
    const universal=!!argument;cancel();
    return universal?registry.execute(binding.id,{universal:true}):registry.execute(binding.id);
  }
  function keyDown(event,view){
    const key=event.key.toLowerCase();
    if(!view.hasFocus){cancel();return false;}
    if(event.isComposing||event.keyCode===229||event.getModifierState?.('AltGraph')){cancel();return false;}
    if(event.metaKey){const hadArgument=!!argument;cancel();if(hadArgument){event.preventDefault();event.stopPropagation?.();notify('Dieser Befehl unterstützt das Prefixargument nicht.');}return hadArgument;}
    // An unsupported argument chord must not bubble to global save handlers.
    if(argument)event.stopPropagation?.();
    if(target&&event.key==='Alt'){
      if(event.code==='AltRight'||event.location===2){cancel();return false;}
      if(handleEditorAlt(event,view))return true;
    }
    const move=target?panelMove(event,{plain:true}):0;
    if(move){
      event.preventDefault();
      if(target!==view.state||!ready(view)){cancel();return true;}
      if(released)moveHelp(move);
      return true;
    }
    if(event.altKey){const hadArgument=!!argument;cancel();if(hadArgument){event.preventDefault();notify('Dieser Befehl unterstützt das Prefixargument nicht.');}return hadArgument;}
    const start=key==='c'&&event.ctrlKey&&!event.shiftKey;
    if(!target){
      if(!start)return false;
      event.preventDefault();
      if(!event.repeat&&ready(view)){
        target=view.state;released=false;
        show(view);
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
    const binding=nodes.find(b=>b.key===key);
    if(!released||!!event.ctrlKey!==!!binding?.ctrl||event.shiftKey){cancel();notify('Prefix verworfen: Tasten erst loslassen.');return true;}
    if(event.key==='Enter'){
      if(target!==view.state||!ready(view)){cancel();return true;}
      activateHelp();return true;
    }
    choose(view,key);return true;
  }
  function keyUp(event){const key=event.key.toLowerCase();if(target&&key==='c')released=true;return false;}
  function extension(){return [
    Prec.highest(EditorView.domEventHandlers({keydown:keyDown,keyup:keyUp,
      blur:()=>{cancel();return false;},
      compositionstart:()=>{cancel();return false;},mousedown:()=>{cancel();return false;}})),
    EditorView.updateListener.of(update=>{if(target&&target!==update.state||argument&&argument.state!==update.state)cancel();}),
    ViewPlugin.define(view=>{
      const win=view.dom?.ownerDocument?.defaultView;
      win?.addEventListener('blur',cancel);
      return {destroy(){win?.removeEventListener('blur',cancel);cancel();}};
    })
  ];}
  return {keyDown,keyUp,choose,cancel,extension,get active(){return !!target||!!argument;}};
}
