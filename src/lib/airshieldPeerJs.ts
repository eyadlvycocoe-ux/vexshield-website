/**
 * ICE config aligned with AirShield/html/ac-air_index.html (PeerJS + WebRTC).
 * Viewer (browser) answers with an empty MediaStream; streamer client calls peer.call(viewerPeerId, canvasStream).
 */
/**
 * Must include PeerJS cloud TURN (same as peerjs@1.5 DEFAULT_CONFIG). Our old STUN-only list
 * breaks ICE between FiveM CEF and the browser on many networks  -  call "initiates" but no `stream` on the viewer.
 */
import { getApiBaseUrl, getApiOrigin } from '@/lib/api-base';

export const AIRSHIELD_PEER_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
      username: 'peerjs',
      credential: 'your_peerjs_secret',
    },
  ],
  iceCandidatePoolSize: 10,
};

export type PeerJsSignalingMode = 'self' | 'cloud';

const SIGNALING_MODE_CACHE_KEY = 'airshield_peerjs_mode';
const SIGNALING_MODE_CACHE_MS = 5 * 60 * 1000;
let signalingModeInflight: Promise<PeerJsSignalingMode> | null = null;

function readCachedSignalingMode(): PeerJsSignalingMode | null {
  try {
    const raw = sessionStorage.getItem(SIGNALING_MODE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { mode?: PeerJsSignalingMode; at?: number };
    if (parsed.mode !== 'self' && parsed.mode !== 'cloud') return null;
    if (!parsed.at || Date.now() - parsed.at > SIGNALING_MODE_CACHE_MS) return null;
    return parsed.mode;
  } catch {
    return null;
  }
}

function writeCachedSignalingMode(mode: PeerJsSignalingMode) {
  try {
    sessionStorage.setItem(SIGNALING_MODE_CACHE_KEY, JSON.stringify({ mode, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Pick self-hosted signaling only when /api/peerjs/health + broker API respond; otherwise cloud. */
export async function resolvePeerJsSignalingMode(): Promise<PeerJsSignalingMode> {
  if (import.meta.env.VITE_PEERJS_CLOUD === 'true') return 'cloud';

  const cached = readCachedSignalingMode();
  if (cached) return cached;

  if (!signalingModeInflight) {
    signalingModeInflight = resolvePeerJsSignalingModeUncached().finally(() => {
      signalingModeInflight = null;
    });
  }

  return signalingModeInflight;
}

async function resolvePeerJsSignalingModeUncached(): Promise<PeerJsSignalingMode> {
  const explicitHost = (import.meta.env.VITE_PEERJS_HOST as string | undefined)?.trim();
  // Self-hosted only when explicitly configured  -  avoids /api/peerjs/health 404 delay on aircore.xyz.
  const preferSelf =
    import.meta.env.VITE_PEERJS_SAME_ORIGIN === 'true' ||
    (!!explicitHost && import.meta.env.VITE_PEERJS_SAME_ORIGIN !== 'false');

  if (!preferSelf) {
    writeCachedSignalingMode('cloud');
    return 'cloud';
  }

  try {
    const peerPath = resolvePeerJsSignalingPath();
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 2500);
    const healthRes = await fetch(`${getApiOrigin()}${peerPath}/health`, { cache: 'no-store', signal: ac.signal });
    if (!healthRes.ok) {
      window.clearTimeout(timer);
      writeCachedSignalingMode('cloud');
      return 'cloud';
    }
    const body = (await healthRes.json()) as { ok?: boolean };
    if (!body.ok) {
      window.clearTimeout(timer);
      writeCachedSignalingMode('cloud');
      return 'cloud';
    }
    // Health alone is not enough  -  verify the broker API (WS path is derived from this mount).
    const idRes = await fetch(`${getApiOrigin()}${peerPath}/id`, {
      cache: 'no-store',
      signal: ac.signal,
    });
    window.clearTimeout(timer);
    if (idRes.ok) {
      const idText = (await idRes.text()).trim();
      if (idText.length > 0) {
        writeCachedSignalingMode('self');
        return 'self';
      }
    }
  } catch {
    /* self-hosted not reachable */
  }

  writeCachedSignalingMode('cloud');
  return 'cloud';
}

function peerPathFromApiBase(): string {
  try {
    const apiPath = new URL(getApiBaseUrl()).pathname.replace(/\/$/, '') || '/api';
    return `${apiPath}/peerjs`;
  } catch {
    return '/api/peerjs';
  }
}

/** Self-hosted signaling path (API server mounts ExpressPeerServer here). */
export function resolvePeerJsSignalingPath(): string {
  const explicit = (import.meta.env.VITE_PEERJS_PATH as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, '') || '/api/peerjs';
  return peerPathFromApiBase();
}

/** Options passed to `new Peer(id, opts)`. Must match `ac-air_index.html` when using self-hosted signaling. */
export function buildPeerJsClientOptions(mode: PeerJsSignalingMode = 'self'): Record<string, unknown> {
  const baseRtc = {
    ...AIRSHIELD_PEER_RTC_CONFIG,
    bundlePolicy: 'max-bundle' as const,
    rtcpMuxPolicy: 'require' as const,
    sdpSemantics: 'unified-plan' as const,
  };

  const common = {
    config: baseRtc,
    debug: 0,
  };

  if (mode === 'cloud') {
    return { ...common };
  }

  const explicitHost = (import.meta.env.VITE_PEERJS_HOST as string | undefined)?.trim();
  const useSameOrigin =
    import.meta.env.VITE_PEERJS_SAME_ORIGIN === 'true' ||
    (!!explicitHost && import.meta.env.VITE_PEERJS_SAME_ORIGIN !== 'false');

  if (useSameOrigin && typeof window !== 'undefined') {
    const path = resolvePeerJsSignalingPath();
    const secure = window.location.protocol === 'https:';
    const port = window.location.port ? Number(window.location.port) : secure ? 443 : 80;
    return {
      ...common,
      host: window.location.hostname,
      port,
      path,
      secure,
    };
  }

  if (!explicitHost) {
    return { ...common };
  }

  const port = Number(import.meta.env.VITE_PEERJS_PORT || 443);
  const path =
    ((import.meta.env.VITE_PEERJS_PATH as string | undefined) || '/api/peerjs').replace(/\/$/, '') || '/api/peerjs';
  const secure = import.meta.env.VITE_PEERJS_SECURE !== 'false';

  return {
    ...common,
    host: explicitHost,
    port,
    path,
    secure,
  };
}
