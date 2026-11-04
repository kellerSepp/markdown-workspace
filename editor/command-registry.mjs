// Local code only. The Gamebook is documentation, never loaded as configuration.
export function createCommandRegistry(definitions,getContext,notify=()=>{}) {
  const commands=new Map();
  for(const definition of definitions) {
    if(!/^[a-z][a-z0-9.-]+$/.test(definition.id)||commands.has(definition.id)||typeof definition.execute!=='function') throw Error('Ungültige oder doppelte Command-ID: '+definition.id);
    commands.set(definition.id,Object.freeze({...definition}));
  }
  function availability(command,context=getContext()) {
    if(!command) return {enabled:false,reason:'Unbekannter Befehl.'};
    const reason=command.unavailable?.(context)||'';
    return {enabled:!reason,reason};
  }
  return {
    get:id=>commands.get(id),
    list(query='',context=getContext()) {
      const words=query.toLocaleLowerCase('de').trim().split(/\s+/).filter(Boolean);
      return [...commands.values()].filter(c=>words.every(word=>[c.name,c.description,c.category,c.id,c.shortcut,c.orgShortcut,c.compatibility].join(' ').toLocaleLowerCase('de').includes(word)))
        .map(command=>({...command,...availability(command,context)}));
    },
    availability:id=>availability(commands.get(id)),
    execute(id,args) {
      const command=commands.get(id),context=getContext(),state=availability(command,context);
      if(!state.enabled) {notify(state.reason);return false;}
      return command.execute(context,args);
    }
  };
}

export function isPaletteShortcut(event) {
  return !event.isComposing&&!event.repeat&&event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.getModifierState?.('AltGraph')&&event.key.toLowerCase()==='x';
}
