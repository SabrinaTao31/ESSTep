'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { BrandMark } from '../brand';
import { browserAuth, clearSession } from '../firebase-client';

export default function SignOut() {
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      await clearSession();
      const auth = await browserAuth();
      await signOut(auth);
      if (active) window.location.replace('/signin');
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return <main className="loading"><BrandMark /><h2>{error ? 'La déconnexion n’a pas pu se terminer.' : 'Déconnexion en cours…'}</h2>
    {error && <button className="primary" onClick={() => window.location.reload()}>Réessayer</button>}
  </main>;
}
