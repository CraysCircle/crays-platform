import {readCraysBff} from './platform/bff.mjs';
import { useEffect, useState } from 'react';
/** UI only. The common server independently authorises EVERY Work business request. */
export function useUnifiedWorkAccess(accountId: string) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    const refresh = async () => {
      setReady(false);
      try {
        const response = await readCraysBff('workAccess', { signal: controller.signal });
        const result = await response.json() as { status?: string };
        if (!current) return;
        // A click may renew the original Work SSO session; the server still authorises every Work request.
        if (result.status === 'ready' || result.status === 'work_sign_in_required') { setReady(true); return; }
        // Work access remains unavailable until its canonical original session is ready.
        // Personal entry never triggers an unsolicited Work document navigation.
      } catch { if (current) setReady(false); }
    };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); else setReady(false); };
    void refresh(); window.addEventListener('pageshow', visible); window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { current = false; controller.abort(); window.removeEventListener('pageshow', visible); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [accountId]);
  return ready;
}
