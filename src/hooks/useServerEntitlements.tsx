import { useEffect, useState } from "react";

export type ServerEntitlements = {
  airshield: boolean;
  airscanner: boolean;
  airpc: boolean;
  isAdminPanel: boolean;
};

function parseConnected(): ServerEntitlements {
  const raw = sessionStorage.getItem("connected_server");
  if (!raw) {
    return { airshield: true, airscanner: false, airpc: false, isAdminPanel: false };
  }
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const num = (v: unknown, def: number) => {
      if (v === undefined || v === null) return def;
      const n = Number(v);
      return Number.isNaN(n) ? def : n;
    };
    const airshield = num(j.ent_airshield, 1) !== 0;
    const airscanner = num(j.ent_airscanner, 0) !== 0;
    const airpc = num(j.ent_airpc, 0) !== 0;
    return {
      airshield,
      airscanner,
      airpc,
      isAdminPanel: j.is_admin_panel === true,
    };
  } catch {
    return { airshield: true, airscanner: false, airpc: false, isAdminPanel: false };
  }
}

/** Entitlements from connected server session (license products). */
export function useServerEntitlements(): ServerEntitlements {
  const [ent, setEnt] = useState<ServerEntitlements>(parseConnected);

  useEffect(() => {
    const sync = () => setEnt(parseConnected());
    window.addEventListener("aircore:connected-server", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aircore:connected-server", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ent;
}
