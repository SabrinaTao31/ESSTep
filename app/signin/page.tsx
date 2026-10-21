import SignIn from './sign-in';
import { safeReturnPath } from '../../lib/auth-http';

export const dynamic = 'force-dynamic';
export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  return <SignIn returnTo={safeReturnPath((await searchParams).return_to)} />;
}
