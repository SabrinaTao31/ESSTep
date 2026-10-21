'use client';

import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { browserAuth, syncSession, clearSession } from './firebase-client';

/** Keep the short-lived server cookie in step with Firebase's token refresh. */
export default function SessionSync({ userId }: { userId: string }) {
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    let refresh = async () => {};
    browserAuth().then(async auth => {
      if (!active) return;
      refresh = async () => {
        const user = auth.currentUser;
        if (!active || !user) return;
        await syncSession(user);
      };
      unsubscribe = onIdTokenChanged(auth, async user => {
        if (!active) return;
        try {
          if (!user) {
            await clearSession();
            if (active) window.location.replace('/signin');
            return;
          }
          await syncSession(user);
          if (active && `firebase:${auth.app.options.projectId}:${user.uid}` !== userId) {
            window.location.reload();
          }
        } catch { /* API errors expose the reconnect action if the session expires. */ }
      });
    }).catch(() => {});
    const visible = () => { if (document.visibilityState === 'visible') void refresh().catch(() => {}); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; unsubscribe(); document.removeEventListener('visibilitychange', visible); };
  }, [userId]);
  return null;
}
