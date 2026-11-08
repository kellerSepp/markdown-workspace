import {EditorState} from '@codemirror/state';
import {syntaxTree,syntaxTreeAvailable} from '@codemirror/language';
import {sectionAt} from './section-folding.mjs';
import {planningContext,timestamp} from './planning.mjs';

const complete=state=>syntaxTree(state).length>=state.doc.length&&syntaxTreeAvailable(state,state.doc.length);
// Fold weekday repair into the original input transaction. Never schedule a
// follow-up edit: undo/redo and file loading must retain their exact text.
export const planningNormalization=EditorState.transactionFilter.of(transaction=>{
  if(!transaction.docChanged||transaction.startState.readOnly||!transaction.isUserEvent('input')&&!transaction.isUserEvent('delete')||transaction.isUserEvent('input.planning')||!complete(transaction.startState))return transaction;
  const state=transaction.state;if(!complete(state))return transaction;
  const touched=[];transaction.changes.iterChangedRanges((_a,_b,from,to)=>touched.push({from,to}));
  const headings=new Map();
  for(const range of touched)for(let number=state.doc.lineAt(range.from).number;number<=state.doc.lineAt(range.to).number;number++){
    const line=state.doc.line(number);if(!/^ {0,3}(?:SCHEDULED|DEADLINE):/.test(line.text))continue;
    const h=sectionAt(state,line.from);if(h)headings.set(h.from,h);
  }
  const repairs=[];
  for(const heading of headings.values()){
    const context=planningContext(state,heading);if(context.message)continue;
    for(const entry of Object.values(context.entries)){
      const text=state.doc.sliceString(entry.from,entry.to),offset=text.indexOf('<'),from=entry.from+offset;
      if(!touched.some(range=>range.from<entry.to&&range.to>from||range.from===range.to&&range.from>from&&range.from<entry.to))continue;
      const stamp=state.doc.sliceString(from,entry.to),prefix=/^<\d{4}-\d{2}-\d{2}(?:([ \t]+)([A-Za-zÄÖÜäöü]{2,3}\.?))?/.exec(stamp);if(!prefix)continue;
      const expected=timestamp(entry).text.match(/^<\d{4}-\d{2}-\d{2} ([^ >]+)/)[1];
      if(prefix[2]&&prefix[2]!==expected)repairs.push({from:from+prefix[0].length-prefix[2].length,to:from+prefix[0].length,insert:expected});
      else if(!prefix[2])repairs.push({from:from+11,to:from+11,insert:' '+expected});
    }
  }
  if(!repairs.length)return transaction;
  repairs.sort((a,b)=>a.from-b.from);const changes=state.changes(repairs);
  return [transaction,{changes,selection:transaction.newSelection.map(changes),sequential:true}];
});
