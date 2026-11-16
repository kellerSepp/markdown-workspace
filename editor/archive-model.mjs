import {EditorState} from '@codemirror/state';
import {markdown,markdownLanguage} from '@codemirror/lang-markdown';
import {syntaxTree,syntaxTreeAvailable,ensureSyntaxTree} from '@codemirror/language';
import {headingSections,sectionAt} from './section-folding.mjs';
import {frontmatterEnd} from './structure.mjs';
import {readDrawers} from './planning-drawers.mjs';
import {todoRules,DEFAULT_TODO} from './todo.mjs';
import {planningContext} from './planning-context.mjs';

const fail=message=>({message});
function header(state,h){let n=syntaxTree(state).resolveInner(h.from,1);while(n&&!/^(ATX|Setext)Heading/.test(n.name))n=n.parent;return n;}
function parsed(doc){const state=EditorState.create({doc,extensions:markdown({base:markdownLanguage})});return ensureSyntaxTree(state,state.doc.length,200)?state:null;}
function shape(state){const out=[];for(let n=syntaxTree(state).topNode.firstChild;n;n=n.nextSibling)out.push(/Heading/.test(n.name)?'Heading:'+state.doc.sliceString(n.from,n.to).replace(/^ {0,3}#{1,6}/,''):n.toTree().toString()+':'+state.doc.sliceString(n.from,n.to));return out;}
function title(state,h){return state.doc.lineAt(h.from).text.replace(/^ {0,3}#{1,6}(?:[ \t]+|$)/,'').replace(/[ \t]+#+[ \t]*$/,'');}
function stamp(now){if(!(now instanceof Date)||!Number.isFinite(now.getTime())||now.getFullYear()<1||now.getFullYear()>9999)return null;const pad=n=>String(n).padStart(2,'0');return `${String(now.getFullYear()).padStart(4,'0')}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;}

// Pure plan only: callers must validate source revision and own durable storage.
export function planArchive(state,{sourcePath,now=new Date(),rules}={}){
  if(state.readOnly)return fail('Editor ist schreibgeschützt.');
  if(state.selection.ranges.length!==1||!state.selection.main.empty)return fail('Archivieren benötigt einen Cursor ohne Auswahl.');
  if(!syntaxTreeAvailable(state,state.doc.length))return fail('Dokument noch nicht vollständig analysiert.');
  const source=sectionAt(state,state.selection.main.head),front=frontmatterEnd(state);
  if(state.selection.main.head<front||!source||source.from<front)return fail('Keine aktuelle Überschrift außerhalb Frontmatter.');
  if(typeof sourcePath!=='string'||!sourcePath||/[\r\n]/.test(sourcePath))return fail('Ungültiger Quellpfad.');
  const time=stamp(now);if(!time)return fail('Ungültiger Archivierungszeitpunkt.');
  const headings=headingSections(state).filter(h=>h.from>=source.from&&h.from<source.limit);
  if(headings.some(h=>{const n=header(state,h);return !n?.name.startsWith('ATX')||n.parent?.name!=='Document';}))return fail('Nur normale H1–H6-Teilbäume werden sicher archiviert.');
  const scanned=readDrawers(state);
  if(scanned.errors.length)return fail('Ungültige oder mehrdeutige Drawer; Archivierung verweigert.');
  const ownEnd=headings[1]?.lineFrom??source.limit;
  const planning=planningContext(state,source,ownEnd);if(planning.message)return planning;
  const properties=scanned.drawers.filter(d=>d.kind==='PROPERTIES'&&d.from>source.from&&d.from<ownEnd);
  if(properties.length>1)return fail('Mehrere eigene PROPERTIES-Drawer; Archivierung verweigert.');
  const property=properties[0];
  if(property)for(let number=property.start.number+1;number<property.end.number;number++){
    const line=state.doc.line(number);if(!line.text.trim())continue;
    const match=/^ {0,3}:([^:\s]+):[ \t]*(.*)$/.exec(line.text);
    if(!match)return fail('Ungültige PROPERTIES-Zeile; Archivierung verweigert.');
    if(/^ARCHIVE_(TIME|FILE|OLPATH|TODO)$/i.test(match[1]))return fail('Archivherkunft bereits vorhanden; nicht überschrieben.');
  }
  const loaded=state.field(todoRules,false);rules??=loaded?.rules??DEFAULT_TODO;
  const status=h=>loaded?.cycleFrom===h.lineFrom?null:rules.find(r=>r.name===/^\S+/.exec(title(state,h))?.[0]);
  const rootStatus=status(source)?.name??'',openTasks=headings.filter(h=>{const s=status(h);return s&&!s.closed;}).length;
  const ancestors=[];for(let h=source.parent;h;h=h.parent)ancestors.unshift(title(state,h));
  const from=source.lineFrom,to=source.limit,original=state.doc.sliceString(from,to);
  const edits=headings.map(h=>{const mark=header(state,h).getChild('HeaderMark');return {from:mark.from-from,to:mark.to-from,insert:'#'.repeat(h.level+1-source.level)};});
  const local=EditorState.create({doc:original}),shift=local.changes(edits),shifted=shift.apply(local.doc).toString();
  const sourceChange={from,to,insert:''},sourceText=state.changes(sourceChange).apply(state.doc).toString();
  const remainder=parsed(sourceText),block=parsed(shifted);
  if(!remainder||!block||JSON.stringify([...shape(remainder),...shape(block)].sort())!==JSON.stringify(shape(state).sort()))return fail('Markdown-Blockstruktur würde sich ändern; Archivierung verweigert.');
  const metadata=`:ARCHIVE_TIME: ${time}\n:ARCHIVE_FILE: ${sourcePath}\n:ARCHIVE_OLPATH: ${ancestors.join(' / ')}\n:ARCHIVE_TODO: ${rootStatus}\n`;
  let archiveBlock;
  if(property){const at=shift.mapPos(property.end.from-from);archiveBlock=shifted.slice(0,at)+metadata+shifted.slice(at);}
  else {const at=shift.mapPos((planning.lines.at(-1)?.to??state.doc.lineAt(source.from).to)-from);archiveBlock=shifted.slice(0,at)+`\n:PROPERTIES:\n${metadata}:END:`+shifted.slice(at);}
  return {sourceChange,sourceText,archiveBlock,original,from,to,openTasks,openChildren:headings.slice(1).filter(h=>{const s=status(h);return s&&!s.closed;}).length,title:title(state,source),sourcePath,originPath:ancestors,originalStatus:rootStatus};
}

export function appendArchiveBlock(archiveText,archiveBlock){
  const prefix=archiveText&&!archiveText.endsWith('\n\n')?(archiveText.endsWith('\n')?'\n':'\n\n'):'';
  const result=archiveText+prefix+archiveBlock;
  return result.endsWith('\n')?result:result+'\n';
}

// Validate the exact combined Markdown, rather than trusting blank separators.
export function planArchiveAppend(archiveText,archiveBlock){
  if(typeof archiveText!=='string'||typeof archiveBlock!=='string'||!archiveBlock.trim())return fail('Archivtext fehlt oder ist ungültig.');
  const before=parsed(archiveText),block=parsed(archiveBlock),text=appendArchiveBlock(archiveText,archiveBlock),after=parsed(text);
  if(!before||!block||!after)return fail('Archivziel noch nicht vollständig analysiert.');
  if(before.doc.line(1).text==='---'&&!Array.from({length:before.doc.lines-1},(_,i)=>before.doc.line(i+2).text).some(line=>/^(---|\.\.\.)$/.test(line)))return fail('Archivziel enthält unvollständiges Frontmatter.');
  if(readDrawers(before).errors.length||readDrawers(block).errors.length||readDrawers(after).errors.length)return fail('Archivziel oder Archivblock enthält ungültige Drawer.');
  const root=headingSections(block)[0];
  if(!root||root.lineFrom!==0||root.level!==1||header(block,root)?.parent?.name!=='Document')return fail('Archivblock benötigt eine normale H1-Wurzel.');
  const ownEnd=headingSections(block)[1]?.lineFrom??block.doc.length;
  const properties=readDrawers(block).drawers.filter(d=>d.kind==='PROPERTIES'&&d.from<ownEnd);
  if(properties.length!==1)return fail('Archivblock benötigt eindeutige Herkunftsproperties.');
  const found=new Set();
  for(let number=properties[0].start.number+1;number<properties[0].end.number;number++){
    const line=block.doc.line(number).text;if(!line.trim())continue;
    const match=/^ {0,3}:([^:\s]+):[ \t]*(.*)$/.exec(line);if(!match)return fail('Ungültige Archivproperties.');
    const key=match[1].toUpperCase();if(/^ARCHIVE_(TIME|FILE|OLPATH|TODO)$/.test(key)){if(found.has(key))return fail('Doppelte Archivherkunft.');found.add(key);}
  }
  if(found.size!==4)return fail('Archivherkunft ist unvollständig.');
  if(JSON.stringify([...shape(before),...shape(block)])!==JSON.stringify(shape(after)))return fail('Markdown-Blockstruktur im Archivziel würde sich ändern.');
  return {text};
}
