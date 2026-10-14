import { useState, useEffect, useCallback } from "react";
import { Search, BarChart3, Monitor, MessageSquare, Users  } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FallingPapers } from "@/components/FallingPapers";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { useIsDemoMode } from "@/demo/demoMode";
import { parsePlayersSnapshot } from "@/lib/players-snapshot";

interface Player {
  id: string;
  name: string;
  serverId: string;
  status?: string;
}

export default function Players() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    if (isDemo) {
      // Provide some demo placeholder data for demo mode
      setPlayers([
        { id: "1", name: "DemoPlayer1", serverId: "demo", status: "online" },
        { id: "2", name: "DemoPlayer2", serverId: "demo", status: "online" },
        { id: "3", name: "DemoPlayer3", serverId: "demo", status: "online" },
      ]);
      setLoading(false);
      return;
    }

    try {
      // Get connected server from sessionStorage
      const connectedServerStr = sessionStorage.getItem("connected_server");
      let connectedServer: { server_id?: string } | null = null;
      if (connectedServerStr) {
        try {
          connectedServer = JSON.parse(connectedServerStr);
        } catch {
          connectedServer = null;
        }
      }
      const serverIdCtx = serverId || connectedServer?.server_id;
      if (!serverIdCtx) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const { data: snapshotData, error } = await supabase
        .from("players_snapshots")
        .select("server_id, snapshot, total_players, updated_at")
        .eq("server_id", serverIdCtx)
        .maybeSingle();

      if (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Error loading players:", error);
        setPlayers([]);
        return;
      }

      const { players: snapshot } = parsePlayersSnapshot(snapshotData ?? undefined);
      if (snapshot.length === 0) {
        setPlayers([]);
      } else {
        const mappedPlayers: Player[] = snapshot.map(
          (player: Record<string, unknown>) => ({
            id: String(player.player_id || player.id || "0"),
            name: String(player.player_name || player.name || "Unknown"),
            serverId: serverIdCtx ?? "",
            status: "online",
          })
        );
        setPlayers(mappedPlayers);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [serverId, isDemo]);

  useEffect(() => {
    void fetchPlayers();
    const poll = window.setInterval(() => void fetchPlayers(), 8000);

    const connected = sessionStorage.getItem("connected_server");
    let serverIdCtx = serverId;
    if (connected) {
      try {
        serverIdCtx = JSON.parse(connected).server_id ?? serverId;
      } catch {
        /* ignore */
      }
    }

    const channel =
      serverIdCtx && !isDemo
        ? supabase
            .channel("server-changes")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "players_snapshots",
                filter: `server_id=eq.${serverIdCtx}`,
              },
              () => {
                void fetchPlayers();
              }
            )
            .subscribe()
        : null;

    return () => {
      window.clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchPlayers, serverId, isDemo]);

  const onlinePlayers = players.filter((p) => p.status === "online").length;

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <FallingPapers />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header with Search */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-2">
            {loading ? "Loading…" : `${onlinePlayers} Players Online`}
          </Badge>
        </div>

        {/* Players Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading players…</p>
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery ? "No players found matching your search." : "No players online."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players
              .filter((player) =>
                player.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((player) => (
                <Card
                  key={player.id}
                  className="group bg-gradient-to-b from-[#0c1017] to-[#04060a] border-white/[0.08] overflow-hidden transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-950/20 rounded-2xl cursor-pointer"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs text-white truncate">{player.name}</h3>
                          <p className="text-[11px] text-blue-400/80 font-mono">ID: {player.id}</p>
                        </div>
                      </div>
                      {player.status === "online" && (
                        <div className="w-2 h-2 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50 animate-pulse"></div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.06]">
                      {player.status === "online" && (
                        <>
                          <button
                            className="flex-1 p-1.5 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors group/btn text-zinc-400"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Monitor className="w-3.5 h-3.5 mx-auto" />
                          </button>
                          <button
                            className="flex-1 p-1.5 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors group/btn text-zinc-400"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5 mx-auto" />
                          </button>
                          <button
                            className="flex-1 p-1.5 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors group/btn text-zinc-400"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <BarChart3 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
