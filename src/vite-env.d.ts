/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PEERJS_HOST?: string;
  readonly VITE_PEERJS_PORT?: string;
  readonly VITE_PEERJS_PATH?: string;
  readonly VITE_PEERJS_SECURE?: string;
  /** Use current website host for PeerJS signaling (first-party; avoids blocked 0.peerjs.com). Requires nginx + peer-server on /peerjs in prod. */
  readonly VITE_PEERJS_SAME_ORIGIN?: string;
  readonly VITE_DEV_PEER_SERVER?: string;
  readonly VITE_ASUAS_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
