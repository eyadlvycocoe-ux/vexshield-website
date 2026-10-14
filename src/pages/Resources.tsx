import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Search, X, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { readConnectedServer } from "@/lib/connected-server";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Resource {
  name: string;
  status: "started" | "stopped" | "starting" | "stopping" | "error";
  type?: "new" | "existing";
  detected_at?: string;
  last_updated?: string;
}

function getResourceCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("vexshield") || n.includes("electron")) return "VexShield Services";
  if (n.startsWith("esx_") || n === "es_extended" || n.includes("es_extended")) return "ESX";
  if (n.startsWith("qb-") || n === "qb-core" || n.includes("qbcore")) return "QBCore";
  if (n.startsWith("ox_") || n.startsWith("ox-") || n === "oxmysql") return "Overextended";
  if (n.includes("prison") || n.includes("standalone") || n.includes("hospital") || n.includes("map")) return "Standalone";
  return "Standalone";
}

function normalizeResourceStatus(raw: unknown): Resource["status"] {
  const s = String(raw ?? "stopped").toLowerCase().trim();
  if (s === "start" || s === "running") return "started";
  if (s === "stop") return "stopped";
  if (s === "started" || s === "stopped" || s === "starting" || s === "stopping" || s === "error") {
    return s;
  }
  return "stopped";
}

function parseResourcesList(raw: any): Resource[] {
  if (!raw) return [];
  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
      else if (parsed && Array.isArray(parsed.resources)) list = parsed.resources;
    } catch {
      list = [];
    }
  } else if (raw && Array.isArray(raw.resources)) {
    list = raw.resources;
  }

  return list
    .map((r: any) => ({
      name: r.name || r.resource_name || String(r),
      status: normalizeResourceStatus(r.status),
      type: r.type || "existing",
      detected_at: r.detected_at,
      last_updated: r.updated_at || r.last_updated,
    }))
    .filter((r: Resource) => r.name && r.name.trim() !== "")
    .sort((a: Resource, b: Resource) => a.name.localeCompare(b.name));
}

export default function Resources() {
  const { serverId: routeServerId } = useParams();
  const connected = readConnectedServer();
  const serverId = routeServerId && routeServerId !== "demo" ? routeServerId : connected?.server_id || null;

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const loadRealResources = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!serverId) {
        setResources([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("server_resources" as any)
        .select("*")
        .eq("server_id", serverId)
        .maybeSingle();

      if (!error && data) {
        const parsed = parseResourcesList((data as any).resources);
        setResources(parsed);
      } else {
        setResources([]);
      }
    } catch (err) {
      console.error("[Resources] Error loading real server resources:", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadRealResources();
    const interval = setInterval(() => {
      loadRealResources(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadRealResources]);

  const handleResourceAction = async (resourceName: string, action: "start" | "stop" | "restart") => {
    setActionLoading((prev) => ({ ...prev, [resourceName]: true }));

    const nextStatus: Resource["status"] =
      action === "stop" ? "stopping" : "starting";
    const settledStatus: Resource["status"] =
      action === "stop" ? "stopped" : "started";

    // Optimistically update status
    setResources((prev) =>
      prev.map((r) => (r.name === resourceName ? { ...r, status: nextStatus } : r))
    );
    setSelectedResource((cur) => (cur?.name === resourceName ? { ...cur, status: nextStatus } : cur));

    try {
      const connectedServerStr = sessionStorage.getItem("connected_server");
      if (connectedServerStr) {
        const serverData = JSON.parse(connectedServerStr);
        const commandType =
          action === "restart" ? "restart_resource" : action === "start" ? "start_resource" : "stop_resource";

        await supabase.functions.invoke("server-command", {
          body: {
            server_id: serverData.server_id,
            license_key: serverData.license_key,
            command_type: commandType,
            command_data: { resource_name: resourceName },
          },
        });
      }

      toast.success(`Resource ${resourceName} ${action} command sent`);

      window.setTimeout(() => {
        setResources((prev) =>
          prev.map((r) => (r.name === resourceName ? { ...r, status: settledStatus } : r))
        );
        setSelectedResource((cur) =>
          cur?.name === resourceName ? { ...cur, status: settledStatus } : cur
        );
      }, 1500);
    } catch {
      toast.error(`Failed to ${action} resource ${resourceName}`);
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[resourceName];
        return copy;
      });
    }
  };

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return resources;
    return resources.filter(
      (r) => r.name.toLowerCase().includes(q) || getResourceCategory(r.name).toLowerCase().includes(q)
    );
  }, [resources, searchQuery]);

  const activeResource = selectedResource
    ? resources.find((r) => r.name === selectedResource.name) ?? selectedResource
    : null;

  const isBusy = activeResource ? !!actionLoading[activeResource.name] : false;

  return (
    <div className="min-h-full w-full bg-[#030914] text-white p-6 sm:p-8 space-y-6">
      {/* Search Bar matching Electron Anticheat */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-white/10 bg-[#070e1c] pl-10 pr-8 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sync Indicator */}
        <button
          type="button"
          onClick={() => loadRealResources()}
          disabled={loading}
          title="Refresh server resources"
          className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-[#070e1c] px-3 text-xs text-zinc-300 hover:bg-[#0d162a] hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-cyan-400")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && resources.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-400">
          <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
          <p className="text-xs font-medium">Fetching real server resources...</p>
        </div>
      ) : resources.length === 0 ? (
        /* Empty State */
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-[#070e1c]/40 p-8 text-center">
          <p className="text-sm font-semibold text-white">No resources detected</p>
          <p className="text-xs text-zinc-400 max-w-sm">
            Once your FiveM server starts with VexShield anticheat, all installed and active scripts will appear here automatically.
          </p>
        </div>
      ) : (
        /* Real Resources Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredResources.map((res) => {
            const isStarted = res.status === "started" || res.status === "starting";
            return (
              <div
                key={res.name}
                onClick={() => setSelectedResource(res)}
                className="group flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#070e1c] p-4 transition-all duration-150 hover:border-white/20 hover:bg-[#0c162a] cursor-pointer shadow-sm"
              >
                <div className="min-w-0 pr-3">
                  <h3 className="truncate text-sm font-semibold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                    {res.name}
                  </h3>
                  <p className="truncate text-xs text-zinc-400 font-normal mt-0.5">
                    {getResourceCategory(res.name)}
                  </p>
                </div>

                <div className="shrink-0">
                  {/* Clean RECTANGLE Button (not capsule/pill) */}
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-md transition-all shadow-sm",
                      isStarted
                        ? "bg-white text-black font-bold"
                        : "border border-white/10 bg-white/[0.06] text-zinc-400"
                    )}
                  >
                    {res.status === "starting"
                      ? "Starting"
                      : res.status === "stopping"
                      ? "Stopping"
                      : isStarted
                      ? "Started"
                      : "Stopped"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple Resource Control Modal matching Image 3 */}
      <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-[360px] rounded-xl border border-white/10 bg-[#070e1c] p-6 text-white shadow-2xl [&>button]:hidden"
        >
          {activeResource && (
            <div className="space-y-6">
              {/* Header: Title, Category, Close Icon */}
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-base font-semibold text-white tracking-tight">
                    {activeResource.name}
                  </DialogTitle>
                  <p className="text-xs text-zinc-400 font-normal mt-0.5">
                    {getResourceCategory(activeResource.name)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResource(null)}
                  className="rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 3 Rectangle Buttons: Start, Stop, Restart */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleResourceAction(activeResource.name, "start")}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md border border-white/10 bg-[#0d172a] text-xs font-medium text-white transition-all hover:bg-[#142340] hover:border-white/20 active:scale-[0.98]",
                    isBusy && activeResource.status === "starting" && "opacity-80"
                  )}
                >
                  {isBusy && activeResource.status === "starting" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Start"
                  )}
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleResourceAction(activeResource.name, "stop")}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md border border-white/10 bg-[#0d172a] text-xs font-medium text-white transition-all hover:bg-[#142340] hover:border-white/20 active:scale-[0.98]",
                    isBusy && activeResource.status === "stopping" && "opacity-80"
                  )}
                >
                  {isBusy && activeResource.status === "stopping" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Stop"
                  )}
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleResourceAction(activeResource.name, "restart")}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-white/10 bg-[#0d172a] text-xs font-medium text-white transition-all hover:bg-[#142340] hover:border-white/20 active:scale-[0.98]"
                >
                  {isBusy && activeResource.status === "starting" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Restart"
                  )}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
