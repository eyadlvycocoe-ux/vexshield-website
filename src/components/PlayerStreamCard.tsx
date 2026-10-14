import { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react";
import {
  Camera,
  Circle,
  Square,
  MoreVertical,
  ExternalLink,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  UserX,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Gavel,
  Car,
  Bike,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { useAttachRemoteMediaStream } from "@/hooks/usePeerJsAirshieldStream";
import { useLivePeerStream } from "@/contexts/LivePeerStreamsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface StreamPlayer {
  id: string;
  name: string;
  license?: string;
  ping: number;
  threatScore: number;
  tags: string[];
  flags?: unknown[];
  discordId?: string | null;
  inVehicle?: boolean;
  onBike?: boolean;
}

interface PlayerStreamCardProps {
  player: StreamPlayer;
  /** When true, this card's stream is shown in the expanded modal — tone down the card chrome. */
  dimmed?: boolean;
  isMaximized?: boolean;
  onExpand?: () => void;
  onKick?: (player: StreamPlayer) => void;
  onBan?: (player: StreamPlayer) => void;
  actionLoading?: string | null;
}

function pingIcon(ping: number) {
  if (ping >= 120) return SignalLow;
  if (ping >= 70) return SignalMedium;
  return SignalHigh;
}

export function PlayerStreamCard({
  player,
  dimmed,
  isMaximized,
  onExpand,
  onKick,
  onBan,
  actionLoading,
}: PlayerStreamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useLivePeerStream(player.id);
  const media = stream?.remoteStream ?? null;
  const status = stream?.status ?? "idle";

  const [isPlaying, setIsPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useAttachRemoteMediaStream(videoRef, media);

  useLayoutEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.muted = true;
      if (isPlaying && el.paused) {
        el.play().catch(() => {});
      }
    }
  }, [isPlaying]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const hasVideo = !!media || status === "connected";
  const waitingStream = !media && (status === "idle" || status === "connecting");
  const connectTimedOut = useLoadingTimeout(waitingStream, 28_000);
  const showLoading = waitingStream && !connectTimedOut;
  const showUnavailable = !media && (status === "disconnected" || connectTimedOut);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Screenshot functionality
  const takeScreenshot = () => {
    const video = videoRef.current;
    if (!video || !hasVideo) {
      toast.error("No active stream to capture");
      return;
    }

    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        toast.error("Failed to capture screenshot");
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate screenshot file");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screenshot-${player.id}-${player.name || "player"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Screenshot saved for #${player.id} ${player.name}`);
      }, "image/png");
    } catch (err) {
      console.error("Screenshot error:", err);
      toast.error("Could not capture screenshot");
    }
  };

  // Recording functionality
  const startRecording = () => {
    const video = videoRef.current;
    let streamToRecord: MediaStream | null = media;

    if (!streamToRecord && video && (video as any).captureStream) {
      try {
        streamToRecord = (video as any).captureStream();
      } catch {
        streamToRecord = null;
      }
    }

    if (!streamToRecord) {
      toast.error("No active stream to record");
      return;
    }

    try {
      recordedChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? { mimeType: "video/webm;codecs=vp9" }
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? { mimeType: "video/webm;codecs=vp8" }
        : { mimeType: "video/webm" };

      const mediaRecorder = new MediaRecorder(streamToRecord, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-${player.id}-${player.name || "player"}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Recording saved for #${player.id} ${player.name}`);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success(`Recording started for #${player.id}`);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Stop recording error:", err);
      }
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const togglePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const openLookup = () => {
    const isDemo = window.location.pathname.startsWith("/demo");
    const query = player.license || player.id;
    const path = isDemo
      ? `/demo/users/search?query=${encodeURIComponent(query)}`
      : `/users/search?query=${encodeURIComponent(query)}`;
    window.open(path, "_blank");
  };

  const isHighThreat = player.threatScore >= 80;
  const isMedThreat = player.threatScore >= 60 && player.threatScore < 80;

  const PingIconComponent = pingIcon(player.ping);

  return (
    <div
      className={cn(
        "group relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 transition-all duration-200 flex flex-col justify-center items-center select-none shadow-lg",
        isMaximized && "ring-2 ring-blue-500 border-blue-500 z-20",
        dimmed && "opacity-40 pointer-events-none"
      )}
    >
      {/* Remote Video Stream */}
      <video
        ref={videoRef}
        className={cn(
          "h-full w-full object-contain bg-black max-h-full max-w-full transition-opacity duration-200",
          dimmed && hasVideo && "pointer-events-none opacity-0"
        )}
        playsInline
        autoPlay
        muted
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Top Left: Player Name & Threat Badge */}
      <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-lg bg-black/75 backdrop-blur-md px-2.5 py-1 border border-white/10 text-xs shadow-md">
          <span className="font-mono text-zinc-400 text-[11px]">#{player.id}</span>
          <span className="truncate max-w-[130px] font-semibold text-white text-xs">{player.name}</span>

          {player.inVehicle && (
            <span title="In Vehicle" className="text-sky-400">
              <Car className="h-3 w-3" />
            </span>
          )}
          {player.onBike && (
            <span title="On Bike" className="text-amber-400">
              <Bike className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Threat Pill */}
        <div
          className={cn(
            "rounded-lg px-2 py-1 text-[10px] font-mono font-bold border shadow-md backdrop-blur-md",
            isHighThreat
              ? "bg-red-500/20 text-red-300 border-red-500/40"
              : isMedThreat
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          )}
        >
          {player.threatScore}
        </div>
      </div>

      {/* Recording Overlay */}
      {isRecording && (
        <div className="absolute left-2.5 top-11 z-10 flex items-center gap-1.5 rounded-lg bg-red-600/90 border border-red-400/50 px-2 py-0.5 text-[11px] font-mono font-bold text-white shadow-md animate-pulse">
          <div className="h-2 w-2 rounded-full bg-white" />
          <span>REC {formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Top Right: Actions Bar */}
      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 p-1 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
        {/* Ping */}
        <div
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono",
            player.ping <= 50 ? "text-emerald-400" : player.ping <= 100 ? "text-amber-400" : "text-red-400"
          )}
          title={`Ping: ${player.ping}ms`}
        >
          <PingIconComponent className="h-3 w-3" />
          <span>{player.ping}ms</span>
        </div>

        <span className="h-3.5 w-[1px] bg-white/10" />

        {/* Screenshot */}
        <button
          type="button"
          onClick={takeScreenshot}
          title="Take Screenshot"
          disabled={!hasVideo}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>

        {/* Record */}
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            title="Record Stream"
            disabled={!hasVideo}
            className="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-30"
          >
            <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" />
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            title="Stop Recording"
            className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            <Square className="h-2.5 w-2.5 fill-white" />
          </button>
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Player Actions"
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#0e1320] border-white/10 text-white shadow-xl rounded-xl p-1">
            <DropdownMenuLabel className="text-xs text-zinc-400 font-mono px-2 py-1">
              #{player.id} {player.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {onKick && (
              <DropdownMenuItem
                onClick={() => onKick(player)}
                disabled={actionLoading === `kick-${player.id}`}
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer text-xs flex items-center gap-2 rounded-lg py-1.5"
              >
                <UserX className="h-3.5 w-3.5" />
                Kick Player
              </DropdownMenuItem>
            )}
            {onBan && (
              <DropdownMenuItem
                onClick={() => onBan(player)}
                disabled={actionLoading === `ban-${player.id}`}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer text-xs flex items-center gap-2 rounded-lg py-1.5"
              >
                <Gavel className="h-3.5 w-3.5" />
                Ban Player
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={openLookup}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 cursor-pointer text-xs flex items-center gap-2 rounded-lg py-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Player Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Maximize */}
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            title={isMaximized ? "Restore Grid" : "Maximize Stream"}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:text-white hover:bg-white/10 transition-colors",
              isMaximized && "bg-blue-500/20 text-blue-300"
            )}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Bottom Right: Play/Pause and Live Indicator */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={togglePlayPause}
          title={isPlaying ? "Pause Stream" : "Resume Stream"}
          disabled={!hasVideo}
          className="flex h-6 w-6 items-center justify-center rounded bg-black/75 backdrop-blur-md border border-white/10 text-white/90 hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>

        {hasVideo ? (
          <div className="flex items-center gap-1.5 rounded bg-black/75 backdrop-blur-md border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>LIVE</span>
          </div>
        ) : (
          <div className="rounded bg-black/75 backdrop-blur-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500 font-mono">
            STANDBY
          </div>
        )}
      </div>

      {/* Loading State */}
      {showLoading && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2.5 bg-black/90 text-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <p className="text-xs text-zinc-400">Connecting to stream...</p>
        </div>
      )}

      {/* Stream Unavailable */}
      {showUnavailable && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-black/90 text-center p-4">
          <Signal className="h-6 w-6 text-zinc-600" />
          <p className="text-xs text-zinc-400">Stream offline</p>
        </div>
      )}
    </div>
  );
}


