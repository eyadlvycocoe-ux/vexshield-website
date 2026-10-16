import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Car, User, Zap, Package, Bomb, Search, Copy, Check, Grid3X3, List, ZoomIn, X, 
  ChevronLeft, ChevronRight, Layers, Home, Code, ExternalLink, Sparkles, 
  SlidersHorizontal, ArrowUpDown, Terminal, Shield, Eye, CheckCircle2,
  Image as ImageIcon, HelpCircle, ArrowRight, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAllModels, getModelsByType, type Model, type ModelType } from "@/lib/models-data";
import { useParams, useNavigate } from "react-router-dom";

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

function toHexHash(hash: string | number): string {
  const n = typeof hash === "number" ? hash : parseInt(hash, 10);
  if (Number.isNaN(n)) return typeof hash === "string" ? hash : "0x0";
  return "0x" + (n >>> 0).toString(16).toUpperCase();
}

function toUnsignedHash(hash: string | number): string {
  const n = typeof hash === "number" ? hash : parseInt(hash, 10);
  if (Number.isNaN(n)) return String(hash);
  return (n >>> 0).toString();
}

const MODEL_TYPE_CONFIG: Record<ModelType, { 
  icon: any; 
  label: string; 
  color: string;
  badgeClass: string;
  glowClass: string;
  borderClass: string;
  gradientText: string;
}> = {
  vehicle: {
    icon: Car,
    label: "Vehicle",
    color: "cyan",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    glowClass: "group-hover:border-cyan-500/50 group-hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.25)]",
    borderClass: "border-cyan-500/30",
    gradientText: "from-cyan-400 to-blue-500",
  },
  ped: {
    icon: User,
    label: "Ped Model",
    color: "emerald",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    glowClass: "group-hover:border-emerald-500/50 group-hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]",
    borderClass: "border-emerald-500/30",
    gradientText: "from-emerald-400 to-teal-500",
  },
  weapon: {
    icon: Zap,
    label: "Weapon",
    color: "rose",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    glowClass: "group-hover:border-rose-500/50 group-hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.25)]",
    borderClass: "border-rose-500/30",
    gradientText: "from-rose-400 to-pink-500",
  },
  object: {
    icon: Package,
    label: "Prop / Object",
    color: "violet",
    badgeClass: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    glowClass: "group-hover:border-violet-500/50 group-hover:shadow-[0_0_25px_-5px_rgba(139,92,246,0.25)]",
    borderClass: "border-violet-500/30",
    gradientText: "from-violet-400 to-purple-500",
  },
  explosion: {
    icon: Bomb,
    label: "Explosion",
    color: "amber",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    glowClass: "group-hover:border-amber-500/50 group-hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]",
    borderClass: "border-amber-500/30",
    gradientText: "from-amber-400 to-orange-500",
  },
};

type SortOption = "name-asc" | "name-desc" | "hash-asc" | "hash-desc";

export default function Models() {
  const { serverId } = useParams<{ serverId?: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ModelType | "all">("all");
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState<number>(36);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inspectModel, setInspectModel] = useState<Model | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"hash" | "spawn" | "whitelist" | "blacklist">("hash");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter, Search & Sort
  const filteredModels = useMemo(() => {
    let result: Model[] = [];
    if (filterType === "all") {
      result = getAllModels();
    } else {
      result = getModelsByType(filterType);
    }

    if (onlyWithImages) {
      result = result.filter(m => getModelImageUrl(m) !== "");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(model => {
        const nameMatch = model.name.toLowerCase().includes(q);
        const hashStr = String(model.hash).toLowerCase();
        const hashMatch = hashStr.includes(q);
        const hex = toHexHash(model.hash).toLowerCase();
        const hexMatch = hex.includes(q);
        return nameMatch || hashMatch || hexMatch;
      });
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      const hashA = Number(a.hash) || 0;
      const hashB = Number(b.hash) || 0;
      if (sortBy === "hash-asc") return hashA - hashB;
      if (sortBy === "hash-desc") return hashB - hashA;
      return 0;
    });

    return result;
  }, [filterType, searchQuery, onlyWithImages, sortBy]);

  const totalPages = Math.ceil(filteredModels.length / itemsPerPage) || 1;
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModels.slice(start, start + itemsPerPage);
  }, [filteredModels, currentPage, itemsPerPage]);

  const copyToClipboard = (text: string | number, label: string) => {
    navigator.clipboard.writeText(String(text));
    const k = `${label}-${text}`;
    setCopiedKey(k);
    toast.success(`Copied ${label} to clipboard`, {
      description: String(text),
      duration: 1800,
    });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!Number.isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      setPageInput("");
    } else {
      toast.error(`Please enter a valid page between 1 and ${totalPages}`);
    }
  };

  // Model Counts Summary
  const counts = useMemo(() => ({
    all: getAllModels().length,
    vehicle: getModelsByType("vehicle").length,
    ped: getModelsByType("ped").length,
    weapon: getModelsByType("weapon").length,
    object: getModelsByType("object").length,
    explosion: getModelsByType("explosion").length,
  }), []);

  // Code generator helper
  const getSnippet = (model: Model, type: "hash" | "spawn" | "whitelist" | "blacklist") => {
    const name = model.name;
    const hash = model.hash;
    switch (type) {
      case "hash":
        return `local modelHash = GetHashKey("${name}") -- ${toHexHash(hash)}`;
      case "spawn":
        if (model.type === "vehicle") {
          return `-- Spawn Vehicle\nlocal hash = GetHashKey("${name}")\nRequestModel(hash)\nwhile not HasModelLoaded(hash) do Wait(0) end\nlocal veh = CreateVehicle(hash, coords.x, coords.y, coords.z, heading, true, false)\nSetModelAsNoLongerNeeded(hash)`;
        }
        if (model.type === "ped") {
          return `-- Spawn Ped\nlocal hash = GetHashKey("${name}")\nRequestModel(hash)\nwhile not HasModelLoaded(hash) do Wait(0) end\nlocal ped = CreatePed(4, hash, coords.x, coords.y, coords.z, heading, true, false)\nSetModelAsNoLongerNeeded(hash)`;
        }
        if (model.type === "weapon") {
          return `-- Give Weapon\nGiveWeaponToPed(PlayerPedId(), GetHashKey("${name}"), 250, false, true)`;
        }
        if (model.type === "object") {
          return `-- Spawn Object\nlocal hash = GetHashKey("${name}")\nRequestModel(hash)\nwhile not HasModelLoaded(hash) do Wait(0) end\nlocal obj = CreateObject(hash, coords.x, coords.y, coords.z, true, true, false)\nSetModelAsNoLongerNeeded(hash)`;
        }
        return `AddExplosion(coords.x, coords.y, coords.z, ${hash}, 1.0, true, false, 1.0)`;
      case "whitelist":
        return `["${name}"] = true, -- Hash: ${hash} (${toHexHash(hash)})`;
      case "blacklist":
        return `["${name}"] = true, -- Blocked Entity`;
      default:
        return "";
    }
  };

  const getDocumentationUrl = (model: Model) => {
    const n = model.name.toLowerCase();
    switch (model.type) {
      case "vehicle":
        return `https://docs.fivem.net/vehicles/${n}/`;
      case "ped":
        return `https://docs.fivem.net/peds/${n}/`;
      case "weapon":
        return `https://docs.fivem.net/weapons/${n.toUpperCase()}/`;
      default:
        return "https://docs.fivem.net/docs/game-references/";
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full min-h-screen bg-[#07090e] text-slate-100 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
      
      {/* Background Ambience & Cyber Grid */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-[#07090e] to-[#04060a]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative z-10 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Top Breadcrumb & Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                <span className="text-zinc-400">VexShield Enterprise</span>
                <span className="text-zinc-600">/</span>
                <span className="text-blue-400">Models & Entity Matrix</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">Real-Time FiveM Hash Registry & Whitelist Generator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="h-8 px-3 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-semibold text-zinc-300 hover:text-white rounded-lg transition-all"
            >
              <Home className="h-3.5 w-3.5 mr-1.5 text-zinc-400" /> Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverId ? navigate(`/${serverId}/dashboard`) : (window.history.length > 1 ? window.history.back() : navigate("/my-servers"))}
              className="h-8 px-3 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-300 hover:text-blue-200 rounded-lg transition-all"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[11px] font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>OFFICIAL GTA V &amp; FIVEM ASSET REGISTRY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              FiveM <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">Models Library</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Explore 13,690+ verified entities with signed hashes, hex codes, visual previews, and instant anticheat protection whitelist snippets.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0c101d] border border-white/10 p-2.5 rounded-xl shadow-lg shadow-black/40 self-start md:self-auto shrink-0">
            <div className="flex flex-col text-right pr-2 border-r border-white/10">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Total Database</span>
              <span className="text-lg font-black font-mono text-white tracking-tight">{counts.all.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-emerald-400">100% Synced</span>
            </div>
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { id: "all", label: "All Types", icon: Layers, count: counts.all, color: "blue", activeBorder: "border-blue-400 shadow-blue-500/20" },
            { id: "vehicle", label: "Vehicles", icon: Car, count: counts.vehicle, color: "cyan", activeBorder: "border-cyan-400 shadow-cyan-500/20" },
            { id: "ped", label: "Peds", icon: User, count: counts.ped, color: "emerald", activeBorder: "border-emerald-400 shadow-emerald-500/20" },
            { id: "weapon", label: "Weapons", icon: Zap, count: counts.weapon, color: "rose", activeBorder: "border-rose-400 shadow-rose-500/20" },
            { id: "object", label: "Objects / Props", icon: Package, count: counts.object, color: "violet", activeBorder: "border-violet-400 shadow-violet-500/20" },
            { id: "explosion", label: "Explosions", icon: Bomb, count: counts.explosion, color: "amber", activeBorder: "border-amber-400 shadow-amber-500/20" },
          ].map(({ id, label, icon: CatIcon, count, color, activeBorder }) => {
            const isActive = filterType === id;
            return (
              <button
                key={id}
                onClick={() => { setFilterType(id as any); setCurrentPage(1); }}
                className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all duration-200 group ${
                  isActive
                    ? `bg-[#10182b] ${activeBorder} shadow-lg ring-1 ring-white/20`
                    : "bg-[#090d16]/80 border-white/[0.08] hover:border-white/20 hover:bg-[#0c1220]"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className={`p-1.5 rounded-lg ${isActive ? "bg-white/10 text-white" : "bg-white/[0.04] text-zinc-400 group-hover:text-white group-hover:bg-white/[0.08]"} transition-colors`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-white/20 text-white" : "bg-white/[0.05] text-zinc-400"}`}>
                    {count.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-bold block truncate ${isActive ? "text-white" : "text-zinc-300 group-hover:text-white"}`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {id === "all" ? "Full Matrix" : "GTA V Native"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Controls Card */}
        <Card className="bg-[#090d18]/90 border border-white/10 shadow-2xl p-4 rounded-2xl backdrop-blur-xl space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search models by name, signed hash (e.g. 987258349), or hex (e.g. 0x3AD85DED)... (Press '/' to focus)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-20 bg-[#05070d] border-white/10 text-xs text-white placeholder:text-zinc-500 h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-all font-mono"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setCurrentPage(1); searchInputRef.current?.focus(); }}
                    className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-white/[0.05] border border-white/10 rounded">
                  /
                </kbd>
              </div>
            </div>

            {/* Filter & View Mode Bar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              
              {/* Only With Preview Asset Toggle */}
              <button
                onClick={() => { setOnlyWithImages(!onlyWithImages); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-semibold border transition-all ${
                  onlyWithImages
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-bold shadow-sm shadow-blue-500/20"
                    : "bg-[#05070d] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                }`}
                title="Filter to show only models with official preview images"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images Only</span>
              </button>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#05070d] border border-white/10 rounded-xl px-2.5 h-10">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="name-asc" className="bg-[#090d18] text-white">Name (A-Z)</option>
                  <option value="name-desc" className="bg-[#090d18] text-white">Name (Z-A)</option>
                  <option value="hash-asc" className="bg-[#090d18] text-white">Hash (Ascending)</option>
                  <option value="hash-desc" className="bg-[#090d18] text-white">Hash (Descending)</option>
                </select>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 bg-[#05070d] border border-white/10 rounded-xl px-2.5 h-10">
                <span className="text-[11px] text-zinc-500 font-mono">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-transparent text-xs text-zinc-300 font-bold focus:outline-none cursor-pointer"
                >
                  <option value={24} className="bg-[#090d18] text-white">24</option>
                  <option value={36} className="bg-[#090d18] text-white">36</option>
                  <option value={48} className="bg-[#090d18] text-white">48</option>
                  <option value={72} className="bg-[#090d18] text-white">72</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center p-0.5 bg-[#05070d] border border-white/10 rounded-xl">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg text-xs transition-all ${viewMode === "grid" ? "bg-white text-black shadow-sm font-bold" : "text-zinc-400 hover:text-white"}`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg text-xs transition-all ${viewMode === "list" ? "bg-white text-black shadow-sm font-bold" : "text-zinc-400 hover:text-white"}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Active Search & Filter Indicators */}
          {(searchQuery || filterType !== "all" || onlyWithImages) && (
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400">Filter Applied:</span>
                {filterType !== "all" && (
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px] font-mono">
                    Category: {filterType}
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="outline" className="border-white/20 bg-white/[0.05] text-white text-[10px] font-mono">
                    Query: "{searchQuery}"
                  </Badge>
                )}
                {onlyWithImages && (
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px] font-mono">
                    With Image Asset
                  </Badge>
                )}
                <span className="text-zinc-500 font-mono text-[11px]">
                  Found {filteredModels.length.toLocaleString()} matches
                </span>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setOnlyWithImages(false);
                  setCurrentPage(1);
                }}
                className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </Card>

        {/* Empty Search Result State */}
        {filteredModels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#090d18]/60 border border-white/10 rounded-2xl text-center space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-zinc-400">
              <Search className="w-8 h-8 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Models Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                No FiveM entity matches your search query "{searchQuery}". Try searching with a different model name, signed hash, or clearing your active filters.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearchQuery(""); setFilterType("all"); setOnlyWithImages(false); }}
              className="text-xs border-white/10 hover:bg-white/10 text-white"
            >
              Clear Search Query
            </Button>
          </div>
        )}

        {/* Models Grid View */}
        {viewMode === "grid" && filteredModels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
            {paginatedModels.map((model, idx) => {
              const config = MODEL_TYPE_CONFIG[model.type];
              const Icon = config.icon;
              const imageUrl = getModelImageUrl(model);
              const hexHash = toHexHash(model.hash);
              const isCopiedName = copiedKey === `name-${model.name}`;
              const isCopiedHash = copiedKey === `hash-${model.hash}`;

              return (
                <div
                  key={`${model.name}-${model.type}-${idx}`}
                  className={`group relative flex flex-col justify-between rounded-xl bg-[#090d18]/90 border border-white/[0.08] ${config.glowClass} transition-all duration-200 overflow-hidden shadow-lg shadow-black/40 hover:-translate-y-0.5`}
                >
                  {/* Top Preview Canvas */}
                  <div className="relative w-full h-32 bg-[#04060c] flex items-center justify-center p-2.5 overflow-hidden border-b border-white/[0.06]">
                    
                    {/* Background Radial Glow based on Category */}
                    <div className="pointer-events-none absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent" />
                    
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={model.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)]"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const fallback = img.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}

                    {/* High-Tech Hologram Placeholder if No Image */}
                    <div
                      className="items-center justify-center flex-col gap-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] group-hover:border-white/20 transition-all text-center w-full h-full"
                      style={{ display: imageUrl ? "none" : "flex" }}
                    >
                      <Icon className="h-7 w-7 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-600 group-hover:text-zinc-400 transition-colors">
                        Standard Prop
                      </span>
                    </div>

                    {/* Category Pill Tag */}
                    <div className="absolute left-2 top-2">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.badgeClass} shadow-sm backdrop-blur-md`}>
                        {model.type}
                      </span>
                    </div>

                    {/* Quick Inspect Button on Hover */}
                    <button
                      onClick={() => setInspectModel(model)}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-black/70 text-zinc-300 hover:text-white hover:bg-blue-600/90 border border-white/10 opacity-0 group-hover:opacity-100 transition-all shadow-md backdrop-blur-md"
                      title="Inspect & Generate Code"
                    >
                      <Code className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 
                        className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors cursor-pointer"
                        title={model.name}
                        onClick={() => copyToClipboard(model.name, "name")}
                      >
                        {model.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                      <span 
                        onClick={() => copyToClipboard(model.hash, "hash")}
                        className="text-sky-400 hover:text-sky-300 cursor-pointer truncate font-semibold"
                        title="Click to copy signed decimal hash"
                      >
                        {model.hash}
                      </span>
                      <span 
                        onClick={() => copyToClipboard(hexHash, "hex")}
                        className="text-zinc-500 hover:text-zinc-300 cursor-pointer truncate"
                        title="Click to copy hex hash"
                      >
                        {hexHash}
                      </span>
                    </div>
                  </div>

                  {/* Card Quick Action Bar */}
                  <div className="grid grid-cols-2 gap-1 p-2 pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(model.name, "name")}
                      className="h-6 text-[10px] text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-md font-medium"
                    >
                      {isCopiedName ? <Check className="h-3 w-3 text-emerald-400 mr-1" /> : <Copy className="h-3 w-3 mr-1 text-zinc-500" />}
                      {isCopiedName ? "Copied" : "Name"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(model.hash, "hash")}
                      className="h-6 text-[10px] text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-md font-medium"
                    >
                      {isCopiedHash ? <Check className="h-3 w-3 text-emerald-400 mr-1" /> : <Hash className="h-3 w-3 mr-1 text-zinc-500" />}
                      {isCopiedHash ? "Copied" : "Hash"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Models List View (Dense Table) */}
        {viewMode === "list" && filteredModels.length > 0 && (
          <Card className="bg-[#090d18]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-white/[0.08] bg-[#04060c]">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400 w-16">Preview</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Type</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Model Name</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Signed Hash</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Hex Hash</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-zinc-400">Unsigned Hash</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider text-zinc-400">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {paginatedModels.map((model, idx) => {
                    const config = MODEL_TYPE_CONFIG[model.type];
                    const Icon = config.icon;
                    const imageUrl = getModelImageUrl(model);
                    const hexHash = toHexHash(model.hash);
                    const unsignedHash = toUnsignedHash(model.hash);

                    return (
                      <tr key={`${model.name}-${idx}`} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="p-2.5">
                          <div className="w-10 h-10 rounded-lg bg-[#05070d] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={model.name}
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                            ) : (
                              <Icon className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${config.badgeClass}`}>
                            {model.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span 
                            onClick={() => copyToClipboard(model.name, "name")}
                            className="font-bold text-white font-mono hover:text-blue-400 cursor-pointer"
                          >
                            {model.name}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-sky-400 font-semibold">{model.hash}</td>
                        <td className="p-3 font-mono text-amber-400/90">{hexHash}</td>
                        <td className="p-3 font-mono text-zinc-500">{unsignedHash}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(model.name, "name")}
                              className="h-7 text-xs text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/10 rounded-lg"
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy Name
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setInspectModel(model)}
                              className="h-7 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg"
                            >
                              <Code className="h-3 w-3 mr-1" /> Inspect
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination & Jump Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/[0.08]">
          <div className="text-xs text-zinc-400 font-mono">
            Showing <span className="text-white font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-white font-bold">{Math.min(currentPage * itemsPerPage, filteredModels.length)}</span> of <span className="text-white font-bold">{filteredModels.length.toLocaleString()}</span> models
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3 text-xs rounded-xl border-white/10 bg-[#0c101d] hover:bg-[#141a2e] text-zinc-300 hover:text-white font-bold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            {/* Jump to Page Form */}
            <form onSubmit={handlePageJump} className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 font-mono">Page</span>
              <Input
                placeholder={String(currentPage)}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className="w-14 h-9 text-xs text-center font-mono font-bold bg-[#05070d] border-white/15 text-white rounded-lg p-0"
              />
              <span className="text-xs text-zinc-500 font-mono">of {totalPages}</span>
            </form>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-9 px-3 text-xs rounded-xl border-white/10 bg-[#0c101d] hover:bg-[#141a2e] text-zinc-300 hover:text-white font-bold disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

      </div>

      {/* Developer Model Inspector Modal */}
      <Dialog open={!!inspectModel} onOpenChange={(v) => { if (!v) setInspectModel(null); }}>
        <DialogContent className="sm:max-w-2xl bg-[#090d18] border border-white/15 text-white rounded-2xl shadow-2xl p-6 overflow-hidden">
          {inspectModel && (
            <div className="space-y-5">
              
              {/* Modal Header */}
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      {inspectModel.type === "vehicle" && <Car className="w-5 h-5" />}
                      {inspectModel.type === "ped" && <User className="w-5 h-5" />}
                      {inspectModel.type === "weapon" && <Zap className="w-5 h-5" />}
                      {inspectModel.type === "object" && <Package className="w-5 h-5" />}
                      {inspectModel.type === "explosion" && <Bomb className="w-5 h-5" />}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-black text-white font-mono tracking-tight">
                        {inspectModel.name}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-zinc-400 font-mono">
                        Type: <span className="uppercase text-blue-400 font-bold">{inspectModel.type}</span> &bull; FiveM Native Asset
                      </DialogDescription>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md border ${MODEL_TYPE_CONFIG[inspectModel.type].badgeClass}`}>
                    {inspectModel.type}
                  </span>
                </div>
              </DialogHeader>

              {/* Asset Preview Stage */}
              <div className="relative w-full h-48 bg-[#04060c] rounded-xl border border-white/10 flex items-center justify-center p-4 overflow-hidden">
                {getModelImageUrl(inspectModel) ? (
                  <img
                    src={getModelImageUrl(inspectModel)}
                    alt={inspectModel.name}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <Package className="w-10 h-10" />
                    <span className="text-xs font-mono">No Visual Preview Asset in Official Docs</span>
                  </div>
                )}
              </div>

              {/* Hash Data Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div 
                  onClick={() => copyToClipboard(inspectModel.hash, "signed hash")}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Signed Decimal</span>
                  <span className="text-xs font-mono font-bold text-sky-400 block truncate">{inspectModel.hash}</span>
                </div>

                <div 
                  onClick={() => copyToClipboard(toHexHash(inspectModel.hash), "hex hash")}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Hexadecimal</span>
                  <span className="text-xs font-mono font-bold text-amber-400 block truncate">{toHexHash(inspectModel.hash)}</span>
                </div>

                <div 
                  onClick={() => copyToClipboard(toUnsignedHash(inspectModel.hash), "unsigned hash")}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Unsigned Hash</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 block truncate">{toUnsignedHash(inspectModel.hash)}</span>
                </div>
              </div>

              {/* Code Generator Snippet Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" /> FiveM Code Snippet
                  </span>

                  <div className="flex items-center gap-1 p-0.5 bg-black/50 border border-white/10 rounded-lg text-[10px] font-mono">
                    <button
                      onClick={() => setActiveSnippetTab("hash")}
                      className={`px-2 py-0.5 rounded ${activeSnippetTab === "hash" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                    >
                      GetHashKey
                    </button>
                    <button
                      onClick={() => setActiveSnippetTab("spawn")}
                      className={`px-2 py-0.5 rounded ${activeSnippetTab === "spawn" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                    >
                      Spawn
                    </button>
                    <button
                      onClick={() => setActiveSnippetTab("whitelist")}
                      className={`px-2 py-0.5 rounded ${activeSnippetTab === "whitelist" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                    >
                      Whitelist
                    </button>
                    <button
                      onClick={() => setActiveSnippetTab("blacklist")}
                      className={`px-2 py-0.5 rounded ${activeSnippetTab === "blacklist" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"}`}
                    >
                      Blacklist
                    </button>
                  </div>
                </div>

                <div className="relative p-3 rounded-xl bg-[#030509] border border-white/10 font-mono text-xs text-blue-200 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{getSnippet(inspectModel, activeSnippetTab)}</pre>
                  
                  <button
                    onClick={() => copyToClipboard(getSnippet(inspectModel, activeSnippetTab), "snippet")}
                    className="absolute right-2.5 top-2.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 border border-white/10 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>

              {/* External Links & Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <a
                  href={getDocumentationUrl(inspectModel)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-blue-400 flex items-center gap-1 transition-colors font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open FiveM Docs Reference
                </a>

                <Button
                  onClick={() => copyToClipboard(inspectModel.name, "name")}
                  className="bg-white hover:bg-zinc-200 text-black font-bold text-xs h-9 px-4 rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Model Name
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
