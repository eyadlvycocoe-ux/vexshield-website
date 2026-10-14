import { useEffect, useState } from "react";

/** Stop infinite spinners — surface timedOut so UI can show retry / empty state. */
export function useLoadingTimeout(active: boolean, timeoutMs = 15_000) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const id = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(id);
  }, [active, timeoutMs]);

  return timedOut;
}
