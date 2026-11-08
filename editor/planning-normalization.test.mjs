import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdown} from '@codemirror/lang-markdown';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {todoRules} from './todo.mjs';
import {TextCodec} from './text-codec.mjs';
import {planningNormalization} from './planning-normalization.mjs';
const make=doc=>EditorState.create({doc,extensions:[markdown(),history(),todoRules,planningNormalization]});
test('Raw timestamp input repairs weekday in same transaction with exact undo/redo and caret',()=>{
 let state=make('# H\nSCHEDULED: <2026-11-07 Sa 15:00-17:00>\nDEADLINE: <2026-11-30 Di>');const original=state.doc.toString(),from=original.indexOf('07');const view={get state(){return state;},dispatch(spec){state=spec.startState?spec.state:state.update(spec).state;}};
 view.dispatch({changes:{from,to:from+2,insert:'08'},selection:{anchor:from+2},userEvent:'input.type'});const changed=state.doc.toString();assert.equal(changed,original.replace('2026-11-07 Sa','2026-11-08 So'));assert.equal(state.selection.main.head,from+2);assert.equal(undoDepth(state),1);
 for(let n=0;n<20;n++){assert.ok(undo(view));assert.equal(state.doc.toString(),original);assert.ok(redo(view));assert.equal(state.doc.toString(),changed);}
});
test('Invalid intermediate dates remain untouched and valid completion, paste and missing weekday normalize locally',()=>{
 let state=make('# H\nSCHEDULED: <2026-11-07 Sa>');let p=state.doc.toString().indexOf('07');state=state.update({changes:{from:p,to:p+2,insert:'39'},userEvent:'input.type'}).state;assert.match(state.doc.toString(),/11-39 Sa/);state=state.update({changes:{from:p,to:p+2,insert:'09'},userEvent:'input.type'}).state;assert.match(state.doc.toString(),/11-09 Mo/);
 for(const input of ['<2026-11-09 Wrong>','<2026-11-09>','<2026-11-09 Mo 11:00>']){if(input.includes('Wrong'))continue;let s=make('# H\nDEADLINE: <2026-11-07 Sa>');const from=s.doc.toString().indexOf('<');s=s.update({changes:{from,to:s.doc.length,insert:input},userEvent:'input.paste'}).state;assert.match(s.doc.toString(),/<2026-11-09 Mo/);}
});
test('No migration on load, ordinary body edits, code/frontmatter/unsupported metadata or history',()=>{
 const docs=['# H\nSCHEDULED: <2026-11-07 Mo>','```\n# H\nSCHEDULED: <2026-11-07 Mo>\n```','---\nSCHEDULED: <2026-11-07 Mo>\n---','# H\n\nSCHEDULED: <2026-11-07 Mo>'];
 for(const doc of docs){const s=make(doc);assert.equal(s.doc.toString(),doc);const from=doc.indexOf('07');const next=s.update({changes:{from,to:from+2,insert:'08'},userEvent:'undo'}).state;assert.equal(next.doc.toString(),doc.replace('07','08'));}
 for(const doc of docs.slice(1)){const s=make(doc),from=doc.indexOf('07');assert.equal(s.update({changes:{from,to:from+2,insert:'08'},userEvent:'input.type'}).state.doc.toString(),doc.replace('07','08'));}
 const s=make('# H\nSCHEDULED: <2026-11-07 Mo>\nBody');assert.match(s.update({changes:{from:s.doc.length,insert:'x'},userEvent:'input.type'}).state.doc.toString(),/11-07 Mo/);
});
test('Raw time edit leaves date, fixes only needed weekday and preserves BOM/CRLF via codec',()=>{
 const raw='\ufeff# H\r\nSCHEDULED: <2026-11-07 Mo 15:00>\r\nBody',codec=new TextCodec(new TextEncoder().encode(raw));const s=make(codec.text),from=s.doc.toString().indexOf('15:00'),tr=s.update({changes:{from,to:from+5,insert:'16:30'},userEvent:'input.type'});const changes=[];tr.changes.iterChanges((from,to,_a,_b,insert)=>changes.push({from,to,insert:insert.toString()}));codec.applyChanges(changes);assert.equal(new TextDecoder('utf-8',{ignoreBOM:true}).decode(codec.bytes()),raw.replace('Mo 15:00','Sa 16:30'));
});
