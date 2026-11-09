import {Compartment} from '@codemirror/state';
import {EditorView} from '@codemirror/view';

// Tab-local view preference, retained when the application rebuilds editor state.
export function createLineWrapping() {
  const compartment=new Compartment();
  let enabled=true;
  const extension=()=>compartment.of(enabled?EditorView.lineWrapping:[]);
  return {
    extension,
    get enabled(){return enabled;},
    toggle(view){
      const next=!enabled;
      view.dispatch({effects:compartment.reconfigure(next?EditorView.lineWrapping:[])});
      enabled=next;
      return enabled;
    }
  };
}
