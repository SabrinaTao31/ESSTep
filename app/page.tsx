import {requireAuthUser} from './auth';
import Workspace from './workspace';
import SessionSync from './session-sync';
export const dynamic='force-dynamic';
export default async function Home(){const user=await requireAuthUser('/');return <><SessionSync userId={user.userId}/><Workspace name={user.displayName} email={user.email}/></>;}
