import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Maximize2,
  Tv,
  Check,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayerStreamCard } from "./PlayerStreamCard";
import type { StreamPlayer } from "./PlayerStreamCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MultiStreamViewerProps {
  serverId: string;
  players: StreamPlayer[];
  isVisible: boolean;
  selectedPlayers: Set<string>;
  setSelectedPlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
  onStreamStateChange?: (playerId: string, isStreaming: boolean) => void;
  onExpand?: (player: StreamPlayer) => void;
  onKick?: (player: StreamPlayer) => void;
  onBan?: (player: StreamPlayer) => void;
  actionLoading?: string | null;
}

type SortField = "threatScore" | "name" | "ping" | "id";
type SortDirection = "asc" | "desc";
type LayoutPreset = "auto" | "1x1" | "2x2" | "3x3" | "4x2";

export function MultiStreamViewer({
  serverId,
  players,
  isVisible,
  selectedPlayers,
  setSelectedPlayers,
  onStreamStateChange,
  onExpand,
  onKick,
  onBan,
  actionLoading,
}: MultiStreamViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable player references
  const [stablePlayers, setStablePlayers] = useState<StreamPlayer[]>([]);

  useEffect(() => {
    setStablePlayers((prevStable) => {
      const newStable: StreamPlayer[] = [];
      const prevPlayerMap = new Map(
        prevStable.map((player) => [player.id, player])
      );

      players.forEach((newPlayer) => {
        const existingPlayer = prevPlayerMap.get(newPlayer.id);

        if (existingPlayer) {
          const hasChanged =
            existingPlayer.name !== newPlayer.name ||
            existingPlayer.ping !== newPlayer.ping ||
            existingPlayer.threatScore !== newPlayer.threatScore ||
            existingPlayer.inVehicle !== newPlayer.inVehicle;

          newStable.push(hasChanged ? newPlayer : existingPlayer);
        } else {
          newStable.push(newPlayer);
        }
      });

      return newStable;
    });
  }, [players]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const [visibleStreamIds, setVisibleStreamIds] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("auto");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("threatScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [maximizedPlayerId, setMaximizedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (isMobile && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = [...stablePlayers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (player) =>
          player.name.toLowerCase().includes(q) ||
          player.id.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortField) {
        case "threatScore":
          aVal = a.threatScore || 0;
          bVal = b.threatScore || 0;
          break;
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "ping":
          aVal = a.ping;
          bVal = b.ping;
          break;
        case "id":
          aVal = Number(a.id) || a.id;
          bVal = Number(b.id) || b.id;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stablePlayers, searchQuery, sortField, sortDirection]);

  const activeStreams = useMemo(() => {
    const selectedList = stablePlayers.filter((p) => selectedPlayers.has(p.id));
    if (maximizedPlayerId) {
      const target = selectedList.find((p) => p.id === maximizedPlayerId);
      return target ? [target] : selectedList;
    }
    return selectedList;
  }, [stablePlayers, selectedPlayers, maximizedPlayerId]);

  const getGridClasses = () => {
    if (maximizedPlayerId || layoutPreset === "1x1") {
      return "grid-cols-1 grid-rows-1";
    }

    if (isMobile) {
      return "grid-cols-1";
    }

    switch (layoutPreset) {
      case "2x2":
        return "grid-cols-2 grid-rows-2";
      case "3x3":
        return "grid-cols-3 grid-rows-3";
      case "4x2":
        return "grid-cols-4 grid-rows-2";
      case "auto":
      default: {
        const count = activeStreams.length;
        if (count <= 1) return "grid-cols-1 grid-rows-1";
        if (count === 2) return "grid-cols-2 grid-rows-1";
        if (count <= 4) return "grid-cols-2 grid-rows-2";
        if (count <= 6) return "grid-cols-3 grid-rows-2";
        if (count <= 9) return "grid-cols-3 grid-rows-3";
        return "grid-cols-4 grid-rows-2";
      }
    }
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        if (maximizedPlayerId === playerId) setMaximizedPlayerId(null);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredAndSortedPlayers.map((p) => p.id);
    setSelectedPlayers(new Set(allIds));
    toast.success(`Selected ${allIds.length} players`);
  };

  const handleSelectNone = () => {
    setSelectedPlayers(new Set());
    setMaximizedPlayerId(null);
  };

  useEffect(() => {
    if (!isVisible || !containerRef.current) {
      setVisibleStreamIds(new Set());
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleIds = new Set(visibleStreamIds);
        entries.forEach((entry) => {
          const playerId = entry.target.getAttribute("data-player-id");
          if (!playerId) return;

          if (entry.isIntersecting) {
            newVisibleIds.add(playerId);
          } else {
            newVisibleIds.delete(playerId);
          }
        });
        setVisibleStreamIds(newVisibleIds);
      },
      {
        root: containerRef.current,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    const streamElements = containerRef.current.querySelectorAll("[data-player-id]");
    streamElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [isVisible, activeStreams, visibleStreamIds]);

  if (!isVisible) return null;

  return (
    <div className="relative flex flex-col h-full w-full min-h-0 min-w-0 bg-[#0c1017] text-white overflow-hidden">
      {/* Clean Top Header Bar */}
      <div className="flex-none flex items-center justify-between gap-3 px-4 py-3 bg-[#0F1017] border-b border-white/[0.08] z-20">
        {/* Left: Title & Active Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <h1 className="font-bold text-sm text-white tracking-wide">Live View</h1>
          </div>

          <Badge variant="outline" className="border-white/10 text-xs text-zinc-400 font-normal">
            {activeStreams.length} of {stablePlayers.length} streaming
          </Badge>
        </div>

        {/* Right: Layout Switcher & Roster Button */}
        <div className="flex items-center gap-2">
          {/* Simple Layout Selector */}
          <div className="hidden sm:flex items-center rounded-lg bg-white/[0.04] border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setLayoutPreset("auto");
                setMaximizedPlayerId(null);
              }}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                layoutPreset === "auto" && !maximizedPlayerId
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutPreset("1x1");
                setMaximizedPlayerId(null);
              }}
              title="1 Stream"
              className={cn(
                "p-1.5 rounded transition-colors",
                layoutPreset === "1x1" && !maximizedPlayerId
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutPreset("2x2");
                setMaximizedPlayerId(null);
              }}
              title="4 Streams (2x2)"
              className={cn(
                "p-1.5 rounded transition-colors",
                layoutPreset === "2x2"
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutPreset("3x3");
                setMaximizedPlayerId(null);
              }}
              title="9 Streams (3x3)"
              className={cn(
                "p-1.5 rounded transition-colors",
                layoutPreset === "3x3"
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Select Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
          >
            Select All
          </Button>

          {activeStreams.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectNone}
              className="h-8 px-2.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-lg"
            >
              Clear
            </Button>
          )}

          {/* Toggle Roster Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-8 px-3 text-xs gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 rounded-lg"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Players</span>
            <span className="text-zinc-400">({stablePlayers.length})</span>
            {isSidebarCollapsed ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Stream Grid & Sidebar */}
      <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Stream Area */}
        <div
          ref={containerRef}
          className="flex-1 flex flex-col justify-center items-center min-h-0 min-w-0 p-3 overflow-hidden bg-black/40"
        >
          {activeStreams.length === 0 ? (
            /* Clean Empty State */
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-zinc-400">
                <Tv className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">No players selected</h3>
              <p className="text-xs text-zinc-400 mb-5 leading-normal">
                Select players from the sidebar to start watching their live gameplay streams.
              </p>
              <Button
                onClick={handleSelectAll}
                className="h-9 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Watch All Players ({stablePlayers.length})
              </Button>
            </div>
          ) : (
            /* Clean Video Grid */
            <div className={cn("grid gap-2.5 h-full w-full min-h-0 min-w-0", getGridClasses())}>
              {activeStreams.map((player) => {
                const isMaximized = maximizedPlayerId === player.id;

                return (
                  <div
                    key={player.id}
                    data-player-id={player.id}
                    className="w-full h-full min-h-0 min-w-0 flex flex-col justify-center items-center overflow-hidden"
                  >
                    <PlayerStreamCard
                      player={player}
                      dimmed={false}
                      isMaximized={isMaximized}
                      onExpand={() => {
                        setMaximizedPlayerId((prev) =>
                          prev === player.id ? null : player.id
                        );
                      }}
                      onKick={onKick}
                      onBan={onBan}
                      actionLoading={actionLoading}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clean Sidebar Roster */}
        <div
          className={cn(
            "flex-none flex flex-col h-full bg-[#0F1017] border-l border-white/[0.08] transition-all duration-200 z-30 overflow-hidden",
            isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-72 sm:w-80"
          )}
        >
          {/* Sidebar Search & Controls */}
          <div className="flex-none p-3 border-b border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Online Players</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/10 text-zinc-300">
                  {stablePlayers.length}
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="h-5 w-5 flex items-center justify-center rounded text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-black/40 border-white/10 text-xs text-white placeholder:text-zinc-500 rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <Select value={sortField} onValueChange={(val: SortField) => setSortField(val)}>
              <SelectTrigger className="h-7 text-xs bg-black/40 border-white/10 text-zinc-300 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141824] border-white/10 text-white rounded-lg">
                <SelectItem value="threatScore">Threat Score</SelectItem>
                <SelectItem value="name">Player Name</SelectItem>
                <SelectItem value="ping">Ping</SelectItem>
                <SelectItem value="id">Player ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Player List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {filteredAndSortedPlayers.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No matching players
              </div>
            ) : (
              filteredAndSortedPlayers.map((player) => {
                const isSelected = selectedPlayers.has(player.id);
                const isHighThreat = player.threatScore >= 80;
                const isMedThreat = player.threatScore >= 60 && player.threatScore < 80;

                return (
                  <div
                    key={player.id}
                    onClick={() => handlePlayerToggle(player.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs",
                      isSelected
                        ? "bg-blue-600/15 border border-blue-500/30 text-white"
                        : "hover:bg-white/[0.04] text-zinc-300 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "border-white/20"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 truncate">
                        <span className="text-zinc-500 font-mono text-[11px] mr-1.5">
                          #{player.id}
                        </span>
                        <span className="font-medium text-white">{player.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-mono",
                          isHighThreat
                            ? "border-red-500/40 text-red-400 bg-red-500/10"
                            : isMedThreat
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                            : "border-white/10 text-zinc-400"
                        )}
                      >
                        {player.threatScore}
                      </Badge>
                      <span className="text-[10px] text-zinc-500 font-mono">{player.ping}ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


