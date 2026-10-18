export class ApiError extends Error {
  constructor(message:string, public reconnect=false){super(message);this.name='ApiError';}
}
export async function requestJson<T>(path:string,init:RequestInit={}):Promise<T>{
  let response:Response;
  try{
    response=await fetch(path,{
      ...init,cache:'no-store',credentials:'same-origin',redirect:'manual',
      signal:AbortSignal.timeout(15000),
      headers:{...Object.fromEntries(new Headers(init.headers)),Accept:'application/json'},
    });
  }catch{
    throw new ApiError('La connexion au serveur a été interrompue. Réessaie dans quelques instants.');
  }
  if(response.type==='opaqueredirect'||response.status===401){
    throw new ApiError('Ta connexion doit être renouvelée. Reconnecte-toi pour retrouver ton espace.',true);
  }
  if(response.status>=300&&response.status<400){
    throw new ApiError('Ta connexion doit être renouvelée. Reconnecte-toi pour retrouver ton espace.',true);
  }
  const isJson=/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(response.headers.get('Content-Type')??'');
  if(!isJson){
    throw new ApiError(response.status===403
      ? 'L’accès à ton espace est refusé. Vérifie que tu utilises le bon compte.'
      : 'Le serveur n’a pas renvoyé les données de ton espace. Réessaie ou rouvre le site.');
  }
  let data:unknown;
  try{data=await response.json()}catch{
    throw new ApiError('La réponse du serveur est incomplète. Réessaie dans quelques instants.');
  }
  if(!response.ok){
    const message=data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Impossible de terminer cette action. Réessaie.';
    throw new ApiError(message);
  }
  return data as T;
}
