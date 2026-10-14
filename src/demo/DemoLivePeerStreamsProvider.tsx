import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LivePeerStreamEntry } from "@/contexts/LivePeerStreamsContext";

type Registry = Map<string, LivePeerStreamEntry>;

const DemoLiveStreamsContext = createContext<Registry | null>(null);

function createDemoCanvasStream(label: string): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;

  let t = 0;
  const draw = () => {
    t += 1;

    // background gradient
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, "#050a0f");
    g.addColorStop(1, "#0b1a2a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // scanline shimmer
    ctx.fillStyle = "rgba(34,197,94,0.05)";
    for (let y = (t % 18); y < canvas.height; y += 18) {
      ctx.fillRect(0, y, canvas.width, 1);
    }

    // HUD box
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(26, 26, 520, 110, 18);
    ctx.fill();
    ctx.stroke();

    // label
    ctx.fillStyle = "rgba(226,232,240,0.92)";
    ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(label, 52, 74);
    ctx.font = "500 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "rgba(148,163,184,0.95)";
    ctx.fillText("Demo stream • simulated camera feed", 52, 104);

    // moving cursor dot
    const x = 820 + Math.sin(t / 14) * 240;
    const y = 360 + Math.cos(t / 18) * 180;
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(56,189,248,0.12)";
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, Math.PI * 2);
    ctx.fill();

    // timestamp
    ctx.fillStyle = "rgba(226,232,240,0.65)";
    ctx.font = "600 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    const ts = new Date().toLocaleTimeString(undefined, { hour12: false });
    ctx.fillText(ts, canvas.width - 110, canvas.height - 28);
  };

  const interval = window.setInterval(draw, 1000 / 15);
  draw();

  const stream = canvas.captureStream(15);
  // Keep a handle for cleanup
  (stream as any).__demoInterval = interval;
  return stream;
}

function stopDemoStream(stream: MediaStream | null) {
  if (!stream) return;
  const interval = (stream as any).__demoInterval as number | undefined;
  if (typeof interval === "number") window.clearInterval(interval);
  for (const tr of stream.getTracks()) tr.stop();
}

export function DemoLivePeerStreamsProvider({
  streamPlayerIds,
  labelForPlayerId,
  children,
}: {
  streamPlayerIds: readonly string[];
  labelForPlayerId: (id: string) => string;
  children: ReactNode;
}) {
  const [registry, setRegistry] = useState<Registry>(() => new Map());
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  useEffect(() => {
    const desired = new Set(streamPlayerIds.filter(Boolean));

    // add new
    for (const id of desired) {
      if (streamsRef.current.has(id)) continue;
      const label = labelForPlayerId(id);
      const s = createDemoCanvasStream(label);
      streamsRef.current.set(id, s);
      setRegistry((prev) => {
        const next = new Map(prev);
        next.set(id, { remoteStream: s, status: "connected" });
        return next;
      });
    }

    // remove stale
    for (const [id, s] of streamsRef.current.entries()) {
      if (desired.has(id)) continue;
      stopDemoStream(s);
      streamsRef.current.delete(id);
      setRegistry((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }

    return () => {
      // no-op, lifecycle cleanup handled below
    };
  }, [streamPlayerIds, labelForPlayerId]);

  useEffect(() => {
    return () => {
      for (const s of streamsRef.current.values()) stopDemoStream(s);
      streamsRef.current.clear();
      setRegistry(new Map());
    };
  }, []);

  const value = useMemo(() => registry, [registry]);
  return <DemoLiveStreamsContext.Provider value={value}>{children}</DemoLiveStreamsContext.Provider>;
}

export function useDemoLivePeerStream(playerId: string | undefined | null): LivePeerStreamEntry | null {
  const map = useContext(DemoLiveStreamsContext);
  if (!map || !playerId) return null;
  return map.get(playerId) ?? null;
}

