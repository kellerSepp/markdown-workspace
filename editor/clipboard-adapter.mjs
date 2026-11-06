// Browser access only on explicit commands. No permission requests or polling.
// Writes serialize so an older in-flight write cannot finish after a newer one.
// A browser write already submitted cannot be cancelled; stale queued work skips.
export function createClipboardAdapter({clipboard=()=>globalThis.navigator?.clipboard}={}){
  let writes=Promise.resolve();
  const failure=error=>({ok:false,error:error?.name??'ClipboardUnavailable'});
  return {
    async readText({isCurrent=()=>true}={}){
      if(!isCurrent())return {ok:false,stale:true};
      try{
        const api=clipboard();if(!api?.readText)return failure();
        const value=await api.readText();
        return isCurrent()?{ok:true,value}:{ok:false,stale:true};
      }catch(error){return isCurrent()?failure(error):{ok:false,stale:true};}
    },
    writeText(text,{isCurrent=()=>true}={}){
      const task=writes.then(async()=>{
        if(!isCurrent())return {ok:false,stale:true};
        try{
          const api=clipboard();if(!api?.writeText)return failure();
          await api.writeText(text);
          return isCurrent()?{ok:true}:{ok:false,stale:true};
        }catch(error){return isCurrent()?failure(error):{ok:false,stale:true};}
      });
      writes=task.then(()=>{},()=>{});return task;
    }
  };
}
