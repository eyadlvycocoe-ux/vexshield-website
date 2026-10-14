import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";

type Coords = { x: number; y: number; z?: number };

export function PlayerMapPreview({
  open,
  player,
  anchorRect,
}: {
  open: boolean;
  player: { id: string; name: string; coords?: Coords; admin?: boolean; inVehicle?: boolean; threatScore?: number } | null;
  anchorRect: DOMRect | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const style = useMemo(() => {
    if (!open || !anchorRect) return { display: "none" } as CSSProperties;

    const margin = 12;
    const width = 360;
    const height = 240;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const preferRight = anchorRect.right + margin + width <= viewportW;
    const left = preferRight
      ? anchorRect.right + margin
      : Math.max(margin, anchorRect.left - margin - width);

    const top = Math.min(
      Math.max(margin, anchorRect.top),
      Math.max(margin, viewportH - margin - height)
    );

    return {
      position: "fixed",
      left,
      top,
      width,
      height,
      zIndex: 60,
      pointerEvents: "none",
    } as CSSProperties;
  }, [open, anchorRect]);

  useEffect(() => {
    if (!open || !player?.coords) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const { x, y } = player.coords;
    const msgPlayers = {
      type: "updatePlayers",
      players: [
        {
          id: player.id,
          name: player.name,
          x,
          y,
          admin: !!player.admin,
          inVehicle: !!player.inVehicle,
          threatScore: player.threatScore || 0,
        },
      ],
    };

    iframe.contentWindow.postMessage(msgPlayers, window.location.origin);
    iframe.contentWindow.postMessage(
      { type: "focusPlayer", player: { id: player.id, name: player.name, x, y } },
      window.location.origin
    );
  }, [open, player]);

  if (!open) return null;

  return (
    <div style={style}>
      <Card className="h-full w-full overflow-hidden border border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/10">
        <div className="h-full w-full relative">
          <iframe
            ref={iframeRef}
            title="Player location preview"
            src="/map/index.html?embed=1"
            className="absolute inset-0 h-full w-full border-0"
          />
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
            <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur text-xs text-white/90 font-medium truncate max-w-[75%]">
              {player?.name || "Player"}
            </div>
            <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur text-xs text-white/70 font-mono">
              {player?.coords ? `X:${player.coords.x.toFixed(1)} Y:${player.coords.y.toFixed(1)}` : "No coords"}
            </div>
          </div>
          {!player?.coords && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-xs text-white/80">No location available</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

