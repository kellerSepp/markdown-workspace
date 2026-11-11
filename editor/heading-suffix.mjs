// Shared, data-only Markdown heading suffix grammar. No editor/controller imports.
export const validTag=name=>typeof name==='string'&&/^[\p{L}\p{N}_@#%]+$/u.test(name);
export function headingSuffix(text,offset=0){
  const prefix=/^ {0,3}#{1,6}(?:[ \t]+|$)/.exec(text);
  if(!prefix)return null;
  const closing=/[ \t]+#+[ \t]*$/.exec(text),end=closing?.index??text.length;
  const raw=text.slice(prefix[0].length,end),trimmed=raw.trimEnd();
  const candidate=/(?:^|[ \t])(:[^\s]*:)$/.exec(trimmed);
  let tags=[],tagFrom=null,removeFrom=null,error='';
  if(candidate){
    const block=candidate[1],names=block.slice(1,-1).split(':');
    const start=prefix[0].length+candidate.index+candidate[0].length-block.length;
    if(names.every(validTag)){
      tags=[...new Set(names)];tagFrom=offset+start;
      let from=start;while(from>prefix[0].length&&/[ \t]/.test(text[from-1]))from--;
      removeFrom=offset+from;
      if(/(?:^|[ \t]):[^\s]*:$/.test(text.slice(prefix[0].length,from)))error='Mehrere getrennte Tagblöcke; bitte im Rohtext zu einem Block zusammenführen.';
    }else error='Ungültiger Tagblock; bitte im Rohtext korrigieren.';
  }else if(/(?:^|[ \t]):[^\n]*$/.test(trimmed))error='Unvollständiger oder mehrdeutiger Tagblock; bitte im Rohtext korrigieren.';
  const contentEnd=tagFrom===null?end:removeFrom-offset;
  return {content:text.slice(prefix[0].length,contentEnd).trimEnd(),contentFrom:offset+prefix[0].length,contentEnd:offset+contentEnd,tags,tagFrom,removeFrom,end:offset+end,closingFrom:closing?offset+closing.index:null,error};
}
