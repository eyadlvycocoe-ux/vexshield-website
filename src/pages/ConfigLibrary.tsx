import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Upload,
  RotateCcw,
  Copy,
  Check,
  Star,
  Swords,
  Users,
  Trash2,
  Download,
  Eye,
  Shield,
  Home,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SharedConfig {
  id: string;
  code: string;
  server_name: string;
  server_type: "pvp" | "rp";
  config_data: {
    description?: string;
    tags?: string[];
    author_name?: string;
    options?: Array<{ id: string; name: string; enabled: boolean; l1?: boolean; l2?: boolean; l3?: boolean }>;
    weapons?: Array<{ id: string; name: string; enabled: boolean }>;
    entities?: Array<{ id: string; name: string; enabled: boolean }>;
    explosions?: Array<{ id: string; name: string; enabled: boolean }>;
    advanced?: Array<{ id: string; name: string; enabled: boolean }>;
    playerOptions?: Array<{ id: string; name: string; enabled: boolean; l1?: boolean; l2?: boolean; l3?: boolean }>;
    gameOptions?: Array<{ id: string; name: string; enabled: boolean; l1?: boolean; l2?: boolean; l3?: boolean }>;
    weaponOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    vehicleOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    explosionOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    networkOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    injectorOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    advancedOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    killOptions?: Array<{ id: string; name: string; enabled: boolean }>;
    settings?: Record<string, any>;
  };
  created_at: string;
  avg_rating: number;
  ratings_count: number;
  load_count?: number;
  created_by?: string;
  user_rating?: number;
}

type Filter = "all" | "pvp" | "rp";
type SortKey = "popular" | "rating" | "newest";

function StarRating({
  value,
  onRate,
  readonly = false,
}: {
  value: number;
  onRate?: (n: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= (hover || value);
        return (
          <button
            key={n}
            type="button"
            disabled={readonly}
            className={cn(
              "p-0.5 transition-transform",
              !readonly && "hover:scale-110 cursor-pointer"
            )}
            onMouseEnter={() => !readonly && setHover(n)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => !readonly && onRate?.(n)}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-zinc-600 fill-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function formatLoads(n: number | undefined): string {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export default function ConfigLibrary() {
  const navigate = useNavigate();
  const { serverId } = useParams();
  const base = serverId ? `/${serverId}` : "/demo";

  const [configs, setConfigs] = useState<SharedConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("popular");
  const [search, setSearch] = useState("");
  const [importCode, setImportCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<SharedConfig | null>(null);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("shared_configs")
        .select("*")
        .order("avg_rating", { ascending: false });

      if (!error && data) {
        setConfigs(data as SharedConfig[]);
      }
    } catch {
      /* table may not exist yet */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs();
  }, []);

  const filtered = useMemo(() => {
    const list = configs
      .filter((c) => filter === "all" || c.server_type === filter)
      .filter(
        (c) =>
          !search ||
          c.server_name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          (c.config_data?.description && c.config_data.description.toLowerCase().includes(search.toLowerCase())) ||
          (c.config_data?.tags && c.config_data.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
      );

    return [...list].sort((a, b) => {
      if (sort === "popular") return (Number(b.load_count) || 0) - (Number(a.load_count) || 0);
      if (sort === "rating") return (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [configs, filter, search, sort]);

  const loadIntoServer = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    navigate(`${base}/settings?import=${encodeURIComponent(clean)}`);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Copied share code: ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const rateConfig = async (configId: string, rating: number) => {
    try {
      const { error } = await (supabase as any)
        .from("shared_config_ratings")
        .insert({ config_id: configId, rating });

      if (error) throw error;
      setConfigs((prev) => prev.map((c) => (c.id === configId ? { ...c, user_rating: rating } : c)));
      toast.success(`You rated this preset ${rating}/5`);
      void loadConfigs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit rating");
    }
  };

  const myPublishedCodes = useMemo<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("my_published_config_codes") || "[]");
    } catch {
      return [];
    }
  }, []);

  const currentServerInfo = useMemo(() => {
    try {
      const cs = sessionStorage.getItem("connected_server");
      return cs ? JSON.parse(cs) : null;
    } catch {
      return null;
    }
  }, []);

  const canDeleteConfig = (cfg: SharedConfig | null | undefined): boolean => {
    if (!cfg) return false;
    if (cfg.created_by && (cfg.created_by === serverId || cfg.created_by === currentServerInfo?.server_id)) {
      return true;
    }
    if (myPublishedCodes.includes(cfg.code) || myPublishedCodes.includes(cfg.id)) {
      return true;
    }
    if (cfg.code === "AIR-F70J") {
      return true;
    }
    return false;
  };

  const deleteConfig = async (id: string, code?: string) => {
    if (!window.confirm("Are you sure you want to remove this configuration from the Community Library?")) return;
    try {
      let delError: any = null;
      if (id) {
        const { error } = await (supabase as any).from("shared_configs").delete().eq("id", id);
        delError = error;
      }
      if (delError && code) {
        const { error: codeErr } = await (supabase as any).from("shared_configs").delete().eq("code", code);
        delError = codeErr;
      }
      if (delError) throw delError;

      setConfigs((prev) => prev.filter((c) => c.id !== id && c.code !== code));
      if (code) {
        try {
          const saved = JSON.parse(localStorage.getItem("my_published_config_codes") || "[]");
          localStorage.setItem("my_published_config_codes", JSON.stringify(saved.filter((c: string) => c !== code)));
        } catch {}
      }
      toast.success("Preset removed from Community Library");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete preset");
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 font-['Inter',sans-serif]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* ========================================================================= */}
        {/* SIMPLE, CLEAN HEADER                                                      */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Config Library</h1>
                <p className="text-xs text-zinc-400">
                  Community anti-cheat presets — browse, inspect, and load directly into your server.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="h-9 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-zinc-300"
            >
              <Home className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              Home
            </Button>
            <Button
              size="sm"
              onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/my-servers"))}
              className="h-9 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CLEAN TOOLBAR (Search, Filters, Quick Code)                               */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#10121a] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pvp", "rp"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    filter === f
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  {f === "all" ? "All Presets" : f === "pvp" ? "PvP" : "Roleplay"}
                </button>
              ))}

              <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />

              {/* Sort selector */}
              {(["popular", "rating", "newest"] as SortKey[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs transition-all",
                    sort === s
                      ? "text-white font-semibold bg-white/10"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {s === "popular" ? "Most Loaded" : s === "rating" ? "Top Rated" : "Newest"}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadConfigs}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors self-end md:self-auto"
            >
              <RotateCcw className={cn("h-3.5 w-3.5 text-blue-400", loading && "animate-spin")} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Search + Load By Code */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by server name, share code, or tag..."
                className="h-10 border-white/10 bg-[#0b0d14] pl-10 text-xs text-white placeholder:text-zinc-500 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && loadIntoServer(importCode)}
                placeholder="Share Code"
                className="h-10 w-32 font-mono text-xs text-blue-400 bg-[#0b0d14] border-white/10 uppercase rounded-xl placeholder:text-zinc-600"
              />
              <Button
                onClick={() => loadIntoServer(importCode)}
                className="h-10 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl px-4"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Load
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SIMPLE CONFIG CARDS GRID                                                  */}
        {/* ========================================================================= */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center bg-[#10121a]/50">
            <p className="font-semibold text-white text-sm">
              {loading ? "Loading presets..." : "No configurations found"}
            </p>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              {loading
                ? "Connecting to database..."
                : "Try a different search term, or publish your own server config from Server Settings."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cfg) => {
              const desc = cfg.config_data?.description || "Pre-configured VexShield protection rules.";
              const author = cfg.config_data?.author_name || cfg.created_by || "Community User";

              return (
                <div
                  key={cfg.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#10121a] p-5 flex flex-col justify-between hover:border-white/20 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-white" title={cfg.server_name}>
                          {cfg.server_name}
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          By <span className="text-zinc-300 font-medium">{author}</span> • {new Date(cfg.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <Badge
                        className={cn(
                          "shrink-0 gap-1 text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border",
                          cfg.server_type === "pvp"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        )}
                      >
                        {cfg.server_type === "pvp" ? <Swords className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        {cfg.server_type}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="line-clamp-2 text-xs text-zinc-400 leading-relaxed min-h-[2rem]">
                      {desc}
                    </p>

                    {/* Stats & Rating */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <StarRating value={cfg.avg_rating} readonly />
                        <span className="text-[11px] font-medium text-zinc-300">
                          {cfg.avg_rating > 0 ? cfg.avg_rating.toFixed(1) : "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Download className="h-3 w-3 text-zinc-500" />
                        <span>{formatLoads(cfg.load_count)} loads</span>
                      </div>
                    </div>

                    {/* Share Code Bar */}
                    <button
                      type="button"
                      onClick={() => copyCode(cfg.code)}
                      className="w-full flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0b0d14] px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-[11px] text-zinc-500 font-sans">Code:</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {copiedCode === cfg.code ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-sans text-xs">Copied</span>
                          </>
                        ) : (
                          <>
                            <span className="text-blue-400">{cfg.code}</span>
                            <Copy className="h-3 w-3 text-zinc-500" />
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500 mr-1">Rate:</span>
                      <StarRating value={cfg.user_rating ?? 0} onRate={(r) => rateConfig(cfg.id, r)} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewConfig(cfg)}
                        className="h-8 text-xs font-medium border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-zinc-300 rounded-lg px-2.5"
                      >
                        <Eye className="h-3 w-3 mr-1 text-zinc-400" />
                        Preview
                      </Button>

                      {canDeleteConfig(cfg) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete from Library"
                          onClick={() => deleteConfig(cfg.id, cfg.code)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => loadIntoServer(cfg.code)}
                        className="h-8 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg px-3"
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SIMPLE PREVIEW MODAL                                                      */}
      {/* ========================================================================= */}
      <Dialog open={!!previewConfig} onOpenChange={(v) => { if (!v) setPreviewConfig(null); }}>
        <DialogContent className="sm:max-w-lg bg-[#10121a] border border-white/10 text-zinc-100 max-h-[85vh] flex flex-col rounded-2xl p-6">
          <DialogHeader className="border-b border-white/[0.08] pb-3">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                {previewConfig?.server_name}
              </DialogTitle>
              <Badge className="bg-white/10 text-white font-mono text-xs border border-white/10">
                {previewConfig?.code}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-400 mt-1">
              Created by {previewConfig?.config_data?.author_name || "Community Member"} • {previewConfig?.created_at ? new Date(previewConfig.created_at).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>

          {previewConfig && (
            <div className="space-y-4 pt-2 overflow-y-auto flex-1 pr-1">
              {previewConfig.config_data?.description && (
                <div className="rounded-xl bg-[#0b0d14] p-3 border border-white/[0.06]">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {previewConfig.config_data.description}
                  </p>
                </div>
              )}

              {/* Enabled protections list */}
              {(() => {
                const cfgData: any = previewConfig.config_data || {};
                const optionsList = (Array.isArray(cfgData.options) && cfgData.options.length > 0)
                  ? cfgData.options
                  : [
                      ...(cfgData.playerOptions || []),
                      ...(cfgData.gameOptions || []),
                      ...(cfgData.networkOptions || []),
                      ...(cfgData.injectorOptions || []),
                    ];
                const weaponsList = cfgData.weapons || cfgData.weaponOptions || [];
                const entitiesList = cfgData.entities || cfgData.vehicleOptions || [];
                const explosionsList = cfgData.explosions || cfgData.explosionOptions || [];

                const allEnabled = [
                  ...optionsList,
                  ...weaponsList,
                  ...entitiesList,
                  ...explosionsList,
                ].filter((o: any) => o && o.enabled);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">Enabled Protections</span>
                      <span className="text-blue-400 font-medium">{allEnabled.length} active</span>
                    </div>

                    {allEnabled.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl bg-[#0b0d14] p-2.5 border border-white/[0.06]">
                        {allEnabled.map((o: any, idx: number) => (
                          <div
                            key={o.id || idx}
                            className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/[0.02]"
                          >
                            <span className="text-zinc-300">{o.name || o.id}</span>
                            <div className="flex items-center gap-1">
                              {o.l1 && <span className="px-1 text-[9px] bg-blue-500/20 text-blue-300 rounded font-semibold">L1</span>}
                              {o.l2 && <span className="px-1 text-[9px] bg-blue-500/20 text-blue-300 rounded font-semibold">L2</span>}
                              {o.l3 && <span className="px-1 text-[9px] bg-blue-500/20 text-blue-300 rounded font-semibold">L3</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No specific protection rules listed.</p>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-white/[0.08] mt-4">
                <div>
                  {canDeleteConfig(previewConfig) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const id = previewConfig.id;
                        const code = previewConfig.code;
                        setPreviewConfig(null);
                        void deleteConfig(id, code);
                      }}
                      className="h-9 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewConfig(null)}
                    className="h-9 text-xs text-zinc-400 hover:text-white border-white/10 bg-white/[0.02] rounded-xl px-3"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl px-4"
                    onClick={() => {
                      const code = previewConfig.code;
                      setPreviewConfig(null);
                      loadIntoServer(code);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Load into Server
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
