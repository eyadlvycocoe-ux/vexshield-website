import { useState, useMemo, useCallback } from "react";
import { 
  Car, User, Zap, Package, Bomb, Search, Copy, Check, Grid3X3, List, ZoomIn, X, ChevronLeft, ChevronRight, Layers, Filter, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getAllModels, getModelsByType, searchModels, type Model, type ModelType } from "@/lib/models-data";

const EXPLOSION_WEAPON_MAP: Record<string, string> = {
  grenade: "WEAPON_GRENADE",
  grenade_launcher: "WEAPON_GRENADELAUNCHER",
  sticky_bomb: "WEAPON_STICKYBOMB",
  molotov: "WEAPON_MOLOTOV",
  rocket: "WEAPON_RPG",
  tankshell: "WEAPON_COMPACTLAUNCHER",
  hi_octane: "WEAPON_PETROLCAN",
  bullet: "WEAPON_COMBATPISTOL",
  smokegrenadelauncher: "WEAPON_SMOKEGRENADE",
  smokegrenade: "WEAPON_SMOKEGRENADE",
  bzgas: "WEAPON_BZGAS",
  flare: "WEAPON_FLARE",
  gas_canister: "WEAPON_PETROLCAN",
  extinguisher: "WEAPON_FIREEXTINGUISHER",
  propane: "WEAPON_PETROLCAN",
  planerocket: "WEAPON_HOMINGLAUNCHER",
  vehiclebullet: "WEAPON_MINIGUN",
  gas_tank: "WEAPON_PETROLCAN",
  exp_tag_railgun: "WEAPON_RAILGUN",
  exp_tag_firework: "WEAPON_FIREWORK",
  exp_tag_snowball: "WEAPON_SNOWBALL",
  exp_tag_proxmine: "WEAPON_PROXMINE",
  exp_tag_pipebomb: "WEAPON_PIPEBOMB",
  exp_tag_raygun: "WEAPON_RAYPISTOL",
  exp_tag_flashgrenade: "WEAPON_GRENADE",
  exp_tag_stungrenade: "WEAPON_STUNGUN",
  emplauncher_emp: "WEAPON_EMPLAUNCHER",
};

const getModelImageUrl = (model: Model): string => {
  const name = model.name.toLowerCase();
  switch (model.type) {
    case "vehicle":
      return `https://docs.fivem.net/vehicles/${name}.webp`;
    case "ped":
      return `https://docs.fivem.net/peds/${name}.webp`;
    case "weapon":
      return `https://docs.fivem.net/weapons/${name.toUpperCase()}.png`;
    case "explosion": {
      const mappedWeapon = EXPLOSION_WEAPON_MAP[name];
      if (mappedWeapon) {
        return `https://docs.fivem.net/weapons/${mappedWeapon}.png`;
      }
      return "";
    }
    case "object":
    default:
      return "";
  }
};

const MODEL_TYPE_CONFIG: Record<ModelType, { icon: any; label: string; badgeColor: string }> = {
  vehicle: {
    icon: Car,
    label: "Vehicle",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  ped: {
    icon: User,
    label: "Ped",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  weapon: {
    icon: Zap,
    label: "Weapon",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  object: {
    icon: Package,
    label: "Object / Prop",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  explosion: {
    icon: Bomb,
    label: "Explosion",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
};

export default function Models() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ModelType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedHash, setCopiedHash] = useState<string | number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; model: Model } | null>(null);
  const itemsPerPage = 36;

  // Filter & Search models
  const filteredModels = useMemo(() => {
    let result: Model[] = [];
    if (filterType === "all") {
      result = getAllModels();
    } else {
      result = getModelsByType(filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(model => {
        const nameMatch = model.name.includes(query);
        const hashMatch = typeof model.hash === 'number'
          ? model.hash.toString().includes(query)
          : model.hash.toLowerCase().includes(query);
        return nameMatch || hashMatch;
      });
    }

    return result;
  }, [filterType, searchQuery]);

  const totalPages = Math.ceil(filteredModels.length / itemsPerPage) || 1;
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModels.slice(start, start + itemsPerPage);
  }, [filteredModels, currentPage]);

  const copyToClipboard = (text: string | number) => {
    navigator.clipboard.writeText(text.toString());
    setCopiedHash(text);
    toast({ title: "Copied!", description: `Copied "${text}" to clipboard.` });
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1017] text-slate-100 p-4 sm:p-6 overflow-y-auto space-y-6">
      
      {/* Top Breadcrumb & Return to Dashboard */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300 gap-1.5 px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Customer Area &gt; Models Library
          </Badge>
          <span className="text-[11px] text-slate-500">FiveM Entity & Hash Index</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/"}
            className="h-8 border-white/10 bg-white/[0.04] text-xs font-bold text-zinc-300 hover:text-white"
          >
            <Home className="h-3.5 w-3.5 mr-1 text-sky-400" />
            Home
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = "/my-servers"}
            className="h-8 border-white/10 bg-white/[0.04] text-xs font-bold text-zinc-300 hover:text-white"
          >
            ← Customer Area
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            FiveM Models Library
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, search, and verify 3D/2D vehicles, peds, weapons, props, and explosion hashes
          </p>
        </div>

        <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs px-3 py-1.5 self-start sm:self-auto font-mono">
          {filteredModels.length.toLocaleString()} Total Models
        </Badge>
      </div>

      {/* Action & Filter Card */}
      <Card className="bg-[#0a0a0a] border-white/10 shadow-xl p-4 space-y-4 rounded-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by model name or hash (e.g., adder, mp_m_freemode_01, pistol)..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-10 bg-[#050505] border-white/10 text-xs text-white placeholder:text-zinc-500 h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`h-9 px-3.5 text-xs gap-1.5 rounded-xl transition-all border ${viewMode === "grid" ? "bg-white border-white text-black font-extrabold shadow-md shadow-blue-500/10" : "bg-[#141414] border-white/10 text-zinc-400 hover:text-white hover:border-blue-500/30"}`}
            >
              <Grid3X3 className="h-4 w-4" /> Grid View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-9 px-3.5 text-xs gap-1.5 rounded-xl transition-all border ${viewMode === "list" ? "bg-white border-white text-black font-extrabold shadow-md shadow-blue-500/10" : "bg-[#141414] border-white/10 text-zinc-400 hover:text-white hover:border-blue-500/30"}`}
            >
              <List className="h-4 w-4" /> List View
            </Button>
          </div>

        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[
            { id: "all", label: "All Types", icon: Layers, count: getAllModels().length },
            { id: "vehicle", label: "Vehicles", icon: Car, count: getModelsByType("vehicle").length },
            { id: "ped", label: "Peds", icon: User, count: getModelsByType("ped").length },
            { id: "weapon", label: "Weapons", icon: Zap, count: getModelsByType("weapon").length },
            { id: "object", label: "Objects / Props", icon: Package, count: getModelsByType("object").length },
            { id: "explosion", label: "Explosions", icon: Bomb, count: getModelsByType("explosion").length },
          ].map(({ id, label, icon: CatIcon, count }) => (
            <button
              key={id}
              onClick={() => { setFilterType(id as any); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                filterType === id
                  ? "bg-white text-black border-white font-extrabold shadow-sm shadow-blue-500/10 [&_svg]:text-black"
                  : "bg-[#121214] text-zinc-300 border-white/[0.08] hover:border-blue-500/30 hover:bg-[#111722] hover:text-white [&_svg]:text-zinc-400 [&_svg]:hover:text-blue-400"
              }`}
            >
              <CatIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${filterType === id ? "bg-black/15 text-black font-bold" : "bg-blue-500/10 border border-blue-500/20 text-blue-400"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Models Grid / List Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {paginatedModels.map((model, idx) => {
            const config = MODEL_TYPE_CONFIG[model.type];
            const Icon = config.icon;
            const imageUrl = getModelImageUrl(model);

            return (
              <Card key={`${model.name}-${model.type}-${idx}`} className="bg-[#0a0a0a] border-white/10 hover:border-blue-500/40 transition-all shadow-md hover:shadow-lg hover:shadow-blue-950/20 group overflow-hidden flex flex-col justify-between rounded-2xl">
                <div>
                  {/* Thumbnail Container */}
                  <div className="relative w-full h-32 bg-[#050505] flex items-center justify-center p-2 overflow-hidden border-b border-white/[0.06]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={model.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const fallback = img.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {/* Icon fallback — shown when no imageUrl or on image error */}
                    <span
                      className="items-center justify-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 group-hover:border-blue-500/30 transition-colors"
                      style={{ display: imageUrl ? "none" : "flex" }}
                    >
                      <Icon className="h-9 w-9 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                    </span>

                    {/* Zoom preview button */}
                    {imageUrl && (
                      <button
                        onClick={() => setFullscreenImage({ url: imageUrl, model })}
                        className="absolute right-2 top-2 p-1.5 rounded-full bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500 hover:text-white shadow-md"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <Badge className={`absolute left-2 top-2 text-[10px] font-bold uppercase rounded-md border ${config.badgeColor}`}>
                      {config.label}
                    </Badge>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 space-y-1.5">
                    <h3 className="text-xs font-bold text-white truncate" title={model.name}>
                      {model.name}
                    </h3>
                    <p className="text-[11px] font-mono text-blue-400/80 truncate">
                      {model.hash}
                    </p>
                  </div>
                </div>

                <div className="p-3 border-t border-white/[0.06] bg-white/[0.01]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(model.name)}
                    className="w-full text-[11px] h-7 text-zinc-400 hover:text-blue-300 hover:bg-blue-500/10 font-bold rounded-lg gap-1.5 transition-colors"
                  >
                    {copiedHash === model.name ? <Check className="h-3 w-3 text-blue-400" /> : <Copy className="h-3 w-3" />}
                    {copiedHash === model.name ? "Copied" : "Copy Name"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-[#0a0a0a] border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-white/[0.08] bg-[#050505]">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Type</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Model Name</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Signed Hash</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Unsigned Hash</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {paginatedModels.map((model, idx) => {
                  const config = MODEL_TYPE_CONFIG[model.type];
                  return (
                    <tr key={`${model.name}-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3">
                        <Badge className={`text-[10px] font-bold uppercase rounded-full ${config.badgeColor}`}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-white font-mono">{model.name}</td>
                      <td className="p-3 text-zinc-400 font-mono">{model.hash}</td>
                      <td className="p-3 text-zinc-500 font-mono">{"unsignedHash" in model ? (model as any).unsignedHash : "N/A"}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(model.name)}
                          className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg font-bold"
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-zinc-400">
          Showing {paginatedModels.length} of {filteredModels.length} models
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-9 text-xs rounded-xl border-white/10 bg-[#141414] hover:bg-[#1a1a1e] text-zinc-300 hover:text-white font-bold"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <span className="text-xs font-bold px-3.5 py-1.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-zinc-300">
            Page {currentPage} of {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-9 text-xs rounded-xl border-white/10 bg-[#141414] hover:bg-[#1a1a1e] text-zinc-300 hover:text-white font-bold"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Image Modal Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={(v) => { if (!v) setFullscreenImage(null); }}>
        <DialogContent className="sm:max-w-xl bg-[#0a0a0a] border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-white flex items-center justify-between">
              <span>{fullscreenImage?.model.name}</span>
              <Badge className={`text-xs font-bold uppercase rounded-full ${fullscreenImage?.model.type ? MODEL_TYPE_CONFIG[fullscreenImage.model.type].badgeColor : ""}`}>
                {fullscreenImage?.model.type}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 bg-[#050505] rounded-xl border border-white/10 space-y-4">
            {fullscreenImage?.url && (
              <img
                src={fullscreenImage.url}
                alt={fullscreenImage.model.name}
                className="max-h-[350px] object-contain rounded-xl"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className="w-full text-center space-y-1">
              <p className="text-sm font-bold text-white">{fullscreenImage?.model.name}</p>
              <p className="text-xs font-mono text-zinc-400">Hash: {fullscreenImage?.model.hash}</p>
            </div>

            <Button
              onClick={() => fullscreenImage && copyToClipboard(fullscreenImage.model.name)}
              className="bg-white hover:bg-zinc-200 text-black font-extrabold text-xs h-10 px-5 rounded-xl shadow-lg shadow-white/10 transition-all"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5 text-black" /> Copy Model Name
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
