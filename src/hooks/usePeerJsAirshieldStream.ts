import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import Peer from "peerjs";
import type { MediaConnection } from "peerjs";
import { supabase } from "@/integrations/supabase/client";
import { buildPeerJsClientOptions, resolvePeerJsSignalingMode, type PeerJsSignalingMode } from "@/lib/airshieldPeerJs";

export type PeerStreamStatus = "idle" | "connecting" | "connected" | "disconnected";

async function queueServerCommand(
  serverId: string,
  command_type: string,
  command_data: Record<string, unknown>,
) {
  const raw = sessionStorage.getItem("connected_server");
  if (!raw) throw new Error("No server connection");
  const { license_key } = JSON.parse(raw) as { license_key?: string };
  const { error } = await supabase.functions.invoke("server-command", {
    body: { server_id: serverId, license_key, command_type, command_data },
  });
  if (error) throw error;
}

const CONNECT_TIMEOUT_MS = 22_000;
const STREAM_REQUEST_RETRY_MS = 6_000;
const STREAM_REQUEST_BURST_MS = [] as const;
const STREAM_REQUEST_MIN_GAP_MS = 2500;
const CALL_CLOSE_GRACE_MS = 5_000;
const CALL_CLOSE_COOLDOWN_MS = 8_000;

/** Legacy sessionStorage key — removed on cleanup so old bundles do not leave stale ids. */
function stableViewerPeerStorageKey(serverId: string, playerId: string): string {
  return `airshield_live_peerjs_id:v1:${serverId}:${playerId}`;
}

/** Every `Peer` instance gets its own id. Never reuse from storage: multiple hooks (grid + modal) or Strict Mode would collide on the broker (`unavailable-id`). */
function generateWebPeerId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `web-${crypto.randomUUID()}`;
    }
  } catch {
    /* ignore */
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Tiny canvas stream so `answer()` has a real video track; empty MediaStream can leave SDP/ICE stuck on some browsers. */
function createMinimalAnswerMediaStream(): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#010101";
    ctx.fillRect(0, 0, 2, 2);
  }
  return canvas.captureStream(2);
}

function hasRenderableVideoTrack(stream: MediaStream): boolean {
  return stream.getVideoTracks().some((track) => track.readyState === "live");
}

/**
 * Browser PeerJS viewer → FiveM `request_peer_stream` → target NUI `streamMyScreen` (same as ac-air_index).
 *
 * React Strict Mode runs mount→unmount→mount quickly; without care, cleanup destroys the Peer before
 * the game server polls `request_peer_stream`, so the stream never connects. We generation-guard teardown.
 */
function buildPeerStreamIdentity(playerId: string, playerName: string | undefined, license: string | undefined) {
  const data: Record<string, unknown> = {};
  const rawId = String(playerId ?? "").trim();
  if (rawId !== "") {
    data.player_id_str = rawId;
    const n = Number(rawId);
    if (Number.isFinite(n) && n > 0) {
      data.source = n;
      data.player_id = n;
    }
  }
  const name = (playerName ?? "").trim();
  if (name.length > 0) {
    data.player_name = name;
  }
  const lic = (license ?? "").trim();
  if (lic.length > 0) {
    data.license = lic;
  }
  return data;
}

/**
 * Grid card + modal can alternate `enabled` for the same player. Releasing the card must not send
 * `stop_peer_stream` while the modal still holds the stream — that was killing NUI / PeerJS mid-session.
 */
const STREAM_HOLD_STOP_DEBOUNCE_MS = 800;
const streamHoldCounts = new Map<string, number>();
const streamHoldStopTimers = new Map<string, number>();

/**
 * Global dedup: at most one PeerJS hook may be active per server+player.
 * Prevents Strict Mode or rapid remounts from spawning duplicate peers that
 * fight over the same stream and cause connect/disconnect churn.
 */
const activePeerHooks = new Map<string, number>();

function streamHoldKey(serverId: string, playerId: string) {
  return `${serverId}:${playerId}`;
}

function acquireAirshieldStreamHold(serverId: string, playerId: string) {
  const k = streamHoldKey(serverId, playerId);
  const t = streamHoldStopTimers.get(k);
  if (t !== undefined) {
    clearTimeout(t);
    streamHoldStopTimers.delete(k);
  }
  streamHoldCounts.set(k, (streamHoldCounts.get(k) ?? 0) + 1);
}

function releaseAirshieldStreamHold(serverId: string, playerId: string, onFinalStop: () => void) {
  const k = streamHoldKey(serverId, playerId);
  const current = streamHoldCounts.get(k) ?? 0;
  if (current <= 0) return;
  const n = current - 1;
  if (n > 0) {
    streamHoldCounts.set(k, n);
    return;
  }
  streamHoldCounts.delete(k);
  const prevT = streamHoldStopTimers.get(k);
  if (prevT !== undefined) clearTimeout(prevT);
  streamHoldStopTimers.set(
    k,
    window.setTimeout(() => {
      streamHoldStopTimers.delete(k);
      onFinalStop();
    }, STREAM_HOLD_STOP_DEBOUNCE_MS),
  );
}

export function usePeerJsAirshieldStream({
  serverId,
  playerId,
  playerName,
  license,
  enabled,
}: {
  serverId: string;
  playerId: string;
  playerName?: string;
  license?: string;
  enabled: boolean;
}) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<PeerStreamStatus>("idle");
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const callGenRef = useRef(0);
  const receivedStreamRef = useRef(false);
  const mediaReadyRef = useRef(false);
  const activeMediaRef = useRef<MediaStream | null>(null);
  const effectGenRef = useRef(0);
  /** Count PeerServer "id taken" errors per stream target; reset on successful `open` or when server/player changes. */
  const unavailableIdRetryRef = useRef(0);
  const streamTargetKeyRef = useRef("");
  /** Full Peer recreate when signaling drops before media (reconnect() keeps stale state and races). */
  const signalingPreMediaRecycleRef = useRef(0);

  const [peerIdRegen, setPeerIdRegen] = useState(0);
  const [signalingMode, setSignalingMode] = useState<PeerJsSignalingMode | null>(null);
  const cloudFallbackAttemptedRef = useRef(false);
  /** Timestamp of last successful stream attachment — prevents aggressive re-request loops. */
  const lastConnectedAtRef = useRef(0);

  /** Snapshot polling updates name/license strings — must not restart PeerJS or play() races with srcObject clears. */
  const streamIdentityRef = useRef({ playerName, license });
  streamIdentityRef.current = { playerName, license };

  useEffect(() => {
    if (!enabled || !serverId || !playerId) {
      return;
    }
    acquireAirshieldStreamHold(serverId, playerId);
    return () => {
      releaseAirshieldStreamHold(serverId, playerId, () => {
        const { playerName: pn, license: lic } = streamIdentityRef.current;
        void queueServerCommand(serverId, "stop_peer_stream", buildPeerStreamIdentity(playerId, pn, lic)).catch(() => {});
      });
    };
  }, [enabled, serverId, playerId]);

  useEffect(() => {
    if (!enabled || !serverId || !playerId) {
      setSignalingMode(null);
      return;
    }
    let cancelled = false;
    void resolvePeerJsSignalingMode().then((mode) => {
      if (!cancelled) {
        cloudFallbackAttemptedRef.current = false;
        setSignalingMode(mode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, serverId, playerId]);

  useEffect(() => {
    if (!enabled || !serverId || !playerId || signalingMode === null) {
      if (!enabled || !serverId || !playerId) {
        setRemoteStream(null);
        setStatus("idle");
        unavailableIdRetryRef.current = 0;
      }
      return;
    }

    const targetKey = `${serverId}:${playerId}`;
    if (streamTargetKeyRef.current !== targetKey) {
      streamTargetKeyRef.current = targetKey;
      unavailableIdRetryRef.current = 0;
      signalingPreMediaRecycleRef.current = 0;
      cloudFallbackAttemptedRef.current = false;
    }

    const dedupKey = targetKey;
    const myGen = ++effectGenRef.current;
    const existingHookGen = activePeerHooks.get(dedupKey);
    if (existingHookGen !== undefined) {
      return;
    }
    activePeerHooks.set(dedupKey, myGen);
    let cancelled = false;
    let peerIdConflict = false;
    receivedStreamRef.current = false;
    mediaReadyRef.current = false;
    activeMediaRef.current = null;
    lastConnectedAtRef.current = 0;
    setRemoteStream(null);
    setStatus("connecting");

    const destroyPeerSafe = (p: Peer | null) => {
      if (!p) return;
      try {
        p.destroy();
      } catch {
        /* ignore */
      }
    };

    destroyPeerSafe(peerRef.current);
    peerRef.current = null;

    const localPeerId = generateWebPeerId();
    const opts = buildPeerJsClientOptions(signalingMode) as Record<string, unknown>;

    const peer = new Peer(localPeerId, opts);
    peerRef.current = peer;

    let streamRequestIssued = false;
    let streamRetryTimer: number | undefined;
    let lastStreamRequestAt = 0;
    let streamRequestCount = 0;

    const requestStream = (viewerPeerId: string, force = false) => {
      if (!force && (receivedStreamRef.current || (activeMediaRef.current && hasRenderableVideoTrack(activeMediaRef.current)))) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastStreamRequestAt < STREAM_REQUEST_MIN_GAP_MS) return;
      lastStreamRequestAt = now;
      streamRequestCount += 1;

      const { playerName: pn, license: lic } = streamIdentityRef.current;
      const payload = {
        ...buildPeerStreamIdentity(playerId, pn, lic),
        peer_id: viewerPeerId,
        signaling_mode: signalingMode ?? "cloud",
      };
      if (streamRequestCount === 1 || streamRequestCount % 5 === 0) {
      }
      queueServerCommand(serverId, "request_peer_stream", payload).catch((e) => {
        console.error("[PeerJS Viewer] request_peer_stream failed:", e);
        if (!cancelled && effectGenRef.current === myGen && !activeMediaRef.current && !receivedStreamRef.current) {
          setRemoteStream(null);
          setStatus("disconnected");
        }
      });
    };

    const startStreamRequestLoop = (viewerPeerId: string) => {
      requestStream(viewerPeerId, true);
      const burstTimers: number[] = [];
      for (const delay of STREAM_REQUEST_BURST_MS) {
        burstTimers.push(
          window.setTimeout(() => {
            if (cancelled || effectGenRef.current !== myGen || receivedStreamRef.current) return;
            requestStream(viewerPeerId);
          }, delay),
        );
      }
      streamRetryTimer = window.setInterval(() => {
        if (cancelled || effectGenRef.current !== myGen || receivedStreamRef.current) {
          if (streamRetryTimer !== undefined) {
            window.clearInterval(streamRetryTimer);
            streamRetryTimer = undefined;
          }
          return;
        }
        requestStream(viewerPeerId);
      }, STREAM_REQUEST_RETRY_MS);
      return () => {
        burstTimers.forEach((t) => window.clearTimeout(t));
      };
    };

    let clearBurstTimers: (() => void) | undefined;

    peer.on("open", (viewerPeerId) => {
      if (cancelled || effectGenRef.current !== myGen) return;
      unavailableIdRetryRef.current = 0;
      if (streamRequestIssued) {
        console.log("[PeerJS Viewer] Skipping duplicate request_peer_stream (same effect generation)");
        return;
      }
      streamRequestIssued = true;
      clearBurstTimers = startStreamRequestLoop(viewerPeerId);
    });

    peer.on("call", (call) => {
      if (cancelled || effectGenRef.current !== myGen) return;
      const currentMedia = activeMediaRef.current;
      if (currentMedia) {
        try {
          call.close();
        } catch {
          /* duplicate incoming call while a stream is already attached */
        }
        return;
      }

      const thisCallGen = ++callGenRef.current;
      const prevCall = callRef.current;
      callRef.current = call;
      let closedPrevCall = false;
      const closePrevCallIfNeeded = () => {
        if (closedPrevCall || !prevCall || prevCall === call) return;
        closedPrevCall = true;
        try {
          prevCall.close();
        } catch {
          /* ignore — close handler ignores stale generation */
        }
      };

      const localDummy = createMinimalAnswerMediaStream();
      let dummyStopped = false;
      const stopDummy = () => {
        if (dummyStopped) return;
        dummyStopped = true;
        try {
          localDummy.getTracks().forEach((t) => t.stop());
        } catch {
          /* ignore */
        }
      };
      call.answer(localDummy);

      const attachRemote = (remote: MediaStream) => {
        if (cancelled || effectGenRef.current !== myGen || thisCallGen !== callGenRef.current) return;

        // Keep the original MediaStream object, but do not mark it connected until it
        // actually receives frames. A track event can arrive while Chromium still has
        // readyState=HAVE_NOTHING, which leaves the card stuck on a black "live" video.
        if (activeMediaRef.current === remote) {
          return;
        }

        activeMediaRef.current = remote;
        mediaReadyRef.current = false;
        receivedStreamRef.current = true;
        lastConnectedAtRef.current = Date.now();
        if (streamRetryTimer !== undefined) {
          window.clearInterval(streamRetryTimer);
          streamRetryTimer = undefined;
        }
        clearBurstTimers?.();
        try {
          remote.getVideoTracks().forEach((t) => {
            t.enabled = true;
            try {
              if ("contentHint" in t) t.contentHint = "motion";
              if ("playoutDelayHint" in t) (t as MediaStreamTrack & { playoutDelayHint?: number }).playoutDelayHint = 0;
            } catch {
              /* ignore */
            }
            t.addEventListener("ended", () => {
              if (cancelled || effectGenRef.current !== myGen || activeMediaRef.current !== remote) return;
              if (remote.getVideoTracks().some((vt) => vt.readyState === "live")) return;
              const sinceLastConnected = Date.now() - lastConnectedAtRef.current;
              if (lastConnectedAtRef.current > 0 && sinceLastConnected < CALL_CLOSE_COOLDOWN_MS) {
                return;
              }
              receivedStreamRef.current = false;
              mediaReadyRef.current = false;
              activeMediaRef.current = null;
              setRemoteStream(null);
              setStatus("connecting");
              const viewerPeerId = peer.id;
              if (viewerPeerId && !peer.destroyed) {
                window.setTimeout(() => {
                  if (cancelled || effectGenRef.current !== myGen) return;
                  requestStream(viewerPeerId, true);
                }, STREAM_REQUEST_MIN_GAP_MS);
              }
            });
          });
        } catch {
          /* ignore */
        }

        const markRemoteReady = () => {
          if (cancelled || effectGenRef.current !== myGen || thisCallGen !== callGenRef.current) return;
          if (activeMediaRef.current !== remote || !hasRenderableVideoTrack(remote)) return;
          receivedStreamRef.current = true;
          mediaReadyRef.current = true;
          closePrevCallIfNeeded();
          if (streamRetryTimer !== undefined) {
            window.clearInterval(streamRetryTimer);
            streamRetryTimer = undefined;
          }
          clearBurstTimers?.();
          signalingPreMediaRecycleRef.current = 0;
          setStatus("connected");
        };

        for (const track of remote.getVideoTracks()) {
          track.addEventListener("unmute", markRemoteReady, { once: true });
        }

        setRemoteStream(remote);
        setStatus(hasRenderableVideoTrack(remote) ? "connected" : "connecting");
        markRemoteReady();
      };

      call.on("stream", (remote) => {
        console.log("[PeerJS Viewer] Stream track received! Video Tracks:", remote.getVideoTracks().length);
        attachRemote(remote);
      });

      const pc = (call as MediaConnection & { peerConnection?: RTCPeerConnection }).peerConnection;
      if (pc) {
        pc.addEventListener("track", (ev) => {
          const incoming = ev.streams?.[0];
          if (incoming) {
            attachRemote(incoming);
          }
        });
      }

      call.on("close", () => {
        stopDummy();
        if (thisCallGen !== callGenRef.current) return;
        window.setTimeout(() => {
          if (cancelled || effectGenRef.current !== myGen || thisCallGen !== callGenRef.current) return;
          const media = activeMediaRef.current;
          if (mediaReadyRef.current && media && hasRenderableVideoTrack(media)) {
            return;
          }
          const sinceLastConnected = Date.now() - lastConnectedAtRef.current;
          if (lastConnectedAtRef.current > 0 && sinceLastConnected < CALL_CLOSE_COOLDOWN_MS) {
            return;
          }
          receivedStreamRef.current = false;
          mediaReadyRef.current = false;
          activeMediaRef.current = null;
          setRemoteStream(null);
          setStatus("connecting");

          const viewerPeerId = peer.id;
          if (viewerPeerId && !peer.destroyed && streamRequestIssued) {
            requestStream(viewerPeerId, true);
          }
        }, CALL_CLOSE_GRACE_MS);
      });

      call.on("error", (err) => {
        stopDummy();
        closePrevCallIfNeeded();
        if (thisCallGen !== callGenRef.current) return;
        console.error("[PeerJS Viewer] Call error:", err);
        if (!cancelled && effectGenRef.current === myGen) {
          const media = activeMediaRef.current;
          if (mediaReadyRef.current && media && hasRenderableVideoTrack(media)) return;
          const sinceLastConnected = Date.now() - lastConnectedAtRef.current;
          if (lastConnectedAtRef.current > 0 && sinceLastConnected < CALL_CLOSE_COOLDOWN_MS) {
            return;
          }
          receivedStreamRef.current = false;
          mediaReadyRef.current = false;
          activeMediaRef.current = null;
          setRemoteStream(null);
          setStatus("connecting");
          const viewerPeerId = peer.id;
          if (viewerPeerId && !peer.destroyed) requestStream(viewerPeerId, true);
        }
      });
    });

    const tryCloudFallback = () => {
      if (
        cloudFallbackAttemptedRef.current ||
        signalingMode !== "self" ||
        receivedStreamRef.current ||
        cancelled ||
        effectGenRef.current !== myGen
      ) {
        return false;
      }
      cloudFallbackAttemptedRef.current = true;
      try {
        sessionStorage.setItem(
          "airshield_peerjs_mode",
          JSON.stringify({ mode: "cloud", at: Date.now() }),
        );
      } catch {
        /* ignore */
      }
      console.warn("[PeerJS Viewer] Self-hosted signaling failed; falling back to PeerJS cloud …");
      destroyPeerSafe(peer);
      if (peerRef.current === peer) peerRef.current = null;
      setSignalingMode("cloud");
      setPeerIdRegen((n) => n + 1);
      return true;
    };

    peer.on("disconnected", () => {
      if (cancelled || effectGenRef.current !== myGen) return;
      if (peerIdConflict) {
        return;
      }
      const media = activeMediaRef.current;
      if (receivedStreamRef.current && mediaReadyRef.current && media && hasRenderableVideoTrack(media)) {
        // PeerJS cloud can drop the broker socket after media is already flowing.
        // The RTCPeerConnection may keep the video alive, so do not clear the UI.
        setStatus("connected");
        try {
          if (!peer.destroyed && peer.disconnected) peer.reconnect();
        } catch {
          /* reconnect is best-effort; the active media stream remains authoritative */
        }
        return;
      }
      if (!receivedStreamRef.current && tryCloudFallback()) {
        return;
      }
      if (!receivedStreamRef.current && streamRequestIssued && signalingPreMediaRecycleRef.current < 2) {
        const sinceLastConnected = Date.now() - lastConnectedAtRef.current;
        if (lastConnectedAtRef.current > 0 && sinceLastConnected < CALL_CLOSE_COOLDOWN_MS) {
          try {
            if (!peer.destroyed && peer.disconnected) peer.reconnect();
          } catch { /* ignore */ }
          return;
        }
        signalingPreMediaRecycleRef.current += 1;
        console.log(
          `[PeerJS Viewer] Signaling dropped before media; recreating Peer (${signalingPreMediaRecycleRef.current}/2) …`,
        );
        destroyPeerSafe(peer);
        if (peerRef.current === peer) peerRef.current = null;
        setPeerIdRegen((n) => n + 1);
        return;
      }
      setRemoteStream(null);
      setStatus("disconnected");
    });

    peer.on("error", (err) => {
      const errType = (err as { type?: string }).type;
      if (cancelled || effectGenRef.current !== myGen) return;
      if (errType === "peer-unavailable") {
        console.warn("[PeerJS Viewer] Ignoring stale streamer peer:", err);
        return;
      }
      console.error("[PeerJS Viewer] Peer error:", errType, err);
      if (
        (errType === "network" || errType === "server-error" || errType === "socket-error") &&
        tryCloudFallback()
      ) {
        return;
      }
      if (errType === "unavailable-id") {
        peerIdConflict = true;
        if (unavailableIdRetryRef.current >= 5) {
          console.warn("[PeerJS Viewer] unavailable-id: max retries, giving up");
          try {
            sessionStorage.removeItem(stableViewerPeerStorageKey(serverId, playerId));
          } catch {
            /* ignore */
          }
          setRemoteStream(null);
          setStatus("disconnected");
          return;
        }
        unavailableIdRetryRef.current += 1;
        try {
          sessionStorage.removeItem(stableViewerPeerStorageKey(serverId, playerId));
        } catch {
          /* ignore */
        }
        destroyPeerSafe(peer);
        if (peerRef.current === peer) peerRef.current = null;
        setPeerIdRegen((n) => n + 1);
        return;
      }
      setRemoteStream(null);
      setStatus("disconnected");
    });

    const timeout = window.setTimeout(() => {
      if (cancelled || effectGenRef.current !== myGen) return;
      if (!receivedStreamRef.current) {
        setRemoteStream(null);
        setStatus("disconnected");
      }
    }, CONNECT_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (activePeerHooks.get(dedupKey) === myGen) {
        activePeerHooks.delete(dedupKey);
      }
      window.clearTimeout(timeout);
      clearBurstTimers?.();
      if (streamRetryTimer !== undefined) {
        window.clearInterval(streamRetryTimer);
      }
      const genAtCleanup = myGen;

      window.setTimeout(() => {
        if (effectGenRef.current !== genAtCleanup) return;

        try {
          callRef.current?.close();
        } catch {
          /* ignore */
        }
        callRef.current = null;

        if (peerRef.current === peer) {
          destroyPeerSafe(peer);
          peerRef.current = null;
        }
        try {
          sessionStorage.removeItem(stableViewerPeerStorageKey(serverId, playerId));
        } catch {
          /* ignore */
        }
        setRemoteStream(null);
        setStatus("idle");
        activeMediaRef.current = null;
        mediaReadyRef.current = false;
      }, 900);
    };
  }, [enabled, serverId, playerId, peerIdRegen, signalingMode]);

  return { remoteStream, status };
}

/** Attach the same WebRTC `MediaStream` to a local `<video>` (grid + modal can each use this). */
export function useAttachRemoteMediaStream(
  videoRef: RefObject<HTMLVideoElement | null>,
  media: MediaStream | null,
) {
  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el) {
      console.error("[useAttachRemoteMediaStream] No video element ref!");
      return;
    }
    
    // console.log("[useAttachRemoteMediaStream] Attaching media stream:", media);
    
    // Make sure element is visible
    el.style.opacity = "1";
    el.style.visibility = "visible";
    el.style.display = "block";
    el.playsInline = true;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.setAttribute("preload", "auto");

    const cleanups: Array<() => void> = [];

    const tryPlay = async () => {
      if (!el) return;
      if (el.srcObject !== media) return;
      
      // console.log("[useAttachRemoteMediaStream] Trying to play video! paused:", el.paused, "videoWidth:", el.videoWidth, "videoHeight:", el.videoHeight);
      
      // Force reload and play, but only if not already playing
      try {
        if (el.paused) {
          const playPromise = el.play();
          if (playPromise !== undefined) {
            await playPromise;
            // console.log("[useAttachRemoteMediaStream] Video playing successfully!");
          }
        }
      } catch (err) {
        // console.error("[useAttachRemoteMediaStream] Play error:", err);
        // Retry on failure
        setTimeout(() => {
          if (el && el.srcObject === media) {
            try {
              if (el.paused) {
                const retryPromise = el.play();
                if (retryPromise !== undefined) {
                  retryPromise.catch((e) => {
                    // console.error("[useAttachRemoteMediaStream] Retry play error:", e)
                  });
                }
              }
            } catch (e) {
              // console.error("[useAttachRemoteMediaStream] Retry error:", e);
            }
          }
        }, 150);
      }
    };

    if (!media) {
      el.srcObject = null;
      return;
    }

    // Only update srcObject if it changed
    if (el.srcObject !== media) {
      el.srcObject = media;
      // console.log("[useAttachRemoteMediaStream] Set srcObject to new media stream!");
    }

    // Log tracks
    // console.log("[useAttachRemoteMediaStream] Video tracks:", media.getVideoTracks());
    // console.log("[useAttachRemoteMediaStream] Audio tracks:", media.getAudioTracks());
    
    // media.getVideoTracks().forEach((track, idx) => {
    //   console.log(`[useAttachRemoteMediaStream] Video track ${idx}:`, track);
    //   console.log(`[useAttachRemoteMediaStream] Video track ${idx} enabled:`, track.enabled);
    //   console.log(`[useAttachRemoteMediaStream] Video track ${idx} readyState:`, track.readyState);
    // });

    const onMediaEvent = () => tryPlay();
    const events = ["loadedmetadata", "loadeddata", "canplay", "canplaythrough", "playing", "timeupdate", "progress", "play", "pause"] as const;
    for (const ev of events) {
      el.addEventListener(ev, onMediaEvent);
      cleanups.push(() => el.removeEventListener(ev, onMediaEvent));
    }

    for (const track of media.getVideoTracks()) {
      track.enabled = true;
      const onUnmute = () => tryPlay();
      track.addEventListener("unmute", onUnmute);
      track.addEventListener("mute", onUnmute);
      // Fires when WebRTC delivers the first decoded frame dimensions.
      const onResize = () => tryPlay();
      try {
        (track as MediaStreamTrack & { onresize?: (() => void) | null }).onresize = onResize;
      } catch {
        /* ignore */
      }
      cleanups.push(() => {
        track.removeEventListener("unmute", onUnmute);
        track.removeEventListener("mute", onUnmute);
        try {
          (track as MediaStreamTrack & { onresize?: (() => void) | null }).onresize = null;
        } catch {
          /* ignore */
        }
      });
    }

    // Enable audio tracks and retry play when they unmute
    for (const track of media.getAudioTracks()) {
      track.enabled = true;
      const onAudioUnmute = () => tryPlay();
      track.addEventListener("unmute", onAudioUnmute);
      track.addEventListener("mute", onAudioUnmute);
      cleanups.push(() => {
        track.removeEventListener("unmute", onAudioUnmute);
        track.removeEventListener("mute", onAudioUnmute);
      });
    }

    queueMicrotask(tryPlay);
    // More aggressive retry schedule
    const playRetries = [50, 150, 300, 600, 1000, 2000, 3500, 5000, 7000, 10000].map((ms) =>
      window.setTimeout(tryPlay, ms),
    );
    cleanups.push(() => playRetries.forEach((t) => window.clearTimeout(t)));

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [media, videoRef]);
}
