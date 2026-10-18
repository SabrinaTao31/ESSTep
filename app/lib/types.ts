export type Profile={id:string;email:string;name:string;role:'student'|'mentor';bio:string;avatar:string;website:string};
export type Project={id:string;myRole:'student'|'mentor';title:string;description:string;github:string;student:string;mentor:string;updated:string;created:string;status:'active'|'finished';showcase:number;finished:string|null};
export type Task={id:string;project:string;title:string;due:string;status:'todo'|'doing'|'done';priority:'normal'|'high'};
export type Comment={id:string;project:string;name:string;author:string;body:string;created:string;kind:'message'|'feedback'|'reminder'};
export type Notification={id:string;project:string;title:string;body:string;target:'discussion'|'tasks'|'files'|'overview';created:string;read_at:string|null};
export type StoredFile={id:string;owner:string;project:string|null;name:string;mime:string;size:number;kind:string;purpose:string;created:string};
export type GalleryProject={id:string;title:string;description:string;github:string;finished:string;author:string;avatar:string};
export type Student={email:string;name:string;avatar:string;bio:string;website:string;registered:number};
export type WorkspaceData={profile:Profile|null;projects:Project[];tasks:Task[];comments:Comment[];notifications:Notification[];files:StoredFile[];gallery:GalleryProject[];unreadCount:number;students:Student[];members:Member[];invitations:Invitation[];follows:FollowRequest[]};
export const emptyWorkspace:WorkspaceData={profile:null,projects:[],tasks:[],comments:[],notifications:[],files:[],gallery:[],unreadCount:0,students:[],members:[],invitations:[],follows:[]};

export type Member={project:string;email:string;role:'student'|'mentor';status:'pending'|'accepted'|'declined';name:string;avatar:string};
export type Invitation={project:string;email:string;role:'student'|'mentor';title:string;invited_by:string};
export type FollowRequest={id:string;student:string;mentor:string;status:'pending'|'accepted'|'declined';created:string};
