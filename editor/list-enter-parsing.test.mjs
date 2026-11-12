import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {syntaxTreeAvailable} from '@codemirror/language';
import {history,undo,redo} from '@codemirror/commands';
import {runListInteraction} from './list-interaction.mjs';
import {runMetaReturn} from './meta-return.mjs';
import {runTaskInsert} from './task-insert.mjs';
import {checklistNormalization} from './checklists.mjs';

test('Checklist Enter commands finish parsing text beyond the initial parse window',()=>{
  const tail='\n\n# Following section\n'+('Paragraph after the checklist.\n\n'.repeat(1500))+'## Final section\n- [ ] Final task\n';
  for(const [run,prefix] of [
    [(v,n)=>runListInteraction(v,'newline',n),'- [ ] Item\n  '],
    [runMetaReturn,'- [ ] Item\n- '],
    [runTaskInsert,'- [ ] Item\n- [ ] ']
  ]){
    const doc='- [ ] Item'+tail;
    const view={state:EditorState.create({doc,selection:{anchor:10},extensions:[markdown({base:markdownLanguage}),history(),checklistNormalization()]})};
    view.dispatch=spec=>{view.state=view.state.update(spec).state;};
    assert.equal(syntaxTreeAvailable(view.state,doc.length),false,'fixture must start with a partial tree');
    const messages=[];
    assert.equal(run(view,m=>messages.push(m)),true,messages.join('; '));
    assert.equal(view.state.doc.toString(),prefix+tail);
    const anchor=view.state.selection.main.head;
    assert.equal(undo(view),true);assert.equal(view.state.doc.toString(),doc);
    assert.equal(redo(view),true);assert.equal(view.state.doc.toString(),prefix+tail);
    assert.equal(view.state.selection.main.head,anchor);
  }
});
