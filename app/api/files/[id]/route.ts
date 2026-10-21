import {getAuthUser} from '../../../auth';
import {database,bucket,json,guard,memberProject} from '../../../lib/server';
import type {StoredFile} from '../../../lib/types';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){return guard(async()=>{
 const user=await getAuthUser();if(!user)return json({error:'Connexion requise'},401);
 const {id}=await params;
 const file=await database().prepare('SELECT * FROM files WHERE id=?').bind(id).first<StoredFile & {key:string}>();
 if(!file)return json({error:'Fichier introuvable.'},404);
 if(file.kind!=='avatar'&&file.owner!==user.userId){
  if(!file.project)return json({error:'Fichier inaccessible.'},403);
  const access=await memberProject(file.project,user.email.toLowerCase());
  if(!access)return json({error:'Fichier inaccessible.'},403);
 }
 const object=await bucket().get(file.key);if(!object)return json({error:'Fichier indisponible.'},404);
 const avatar=file.kind==='avatar';
 const safeName=file.name.replace(/[^a-zA-Z0-9 ._-]/g,'_');
 return new Response(object.body,{headers:{
  'Content-Type':avatar?file.mime:'application/octet-stream',
  'Content-Disposition':avatar?'inline':`attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g,'%27')}`,
  'Cache-Control':avatar?'private, max-age=300':'no-store',
  'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",
 }});
})}
