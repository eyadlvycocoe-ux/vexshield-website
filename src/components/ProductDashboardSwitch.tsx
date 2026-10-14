import { useIsDemoMode } from "@/demo/demoMode";
import { Home, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type ProductDashboardSwitchProps = {
  className?: string;
  layout?: "sidebar" | "page";
};

export function ProductDashboardSwitch({ className, layout = "sidebar" }: ProductDashboardSwitchProps) {
  const navigate = useNavigate();
  const { serverId } = useParams();
  const isDemoMode = useIsDemoMode();

  if (!serverId || isDemoMode) return null;

  return (
    <div
      className={cn(
        layout === "page"
          ? "flex flex-wrap items-center gap-2"
          : "rounded-xl border border-white/[0.08] bg-[#121214]/60 p-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#121214] text-zinc-300 transition-all hover:border-zinc-700 hover:bg-[#1a1a1e] hover:text-white",
          layout === "page" ? "h-9 px-3 text-sm" : "h-9 w-full text-sm",
        )}
      >
        <Home className="h-4 w-4" />
        Home
      </button>

      <button
        type="button"
        onClick={() => navigate(`/${serverId}/dashboard`)}
        className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-left text-xs font-semibold text-blue-400"
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400" />
        <span>VexShield Anticheat</span>
      </button>
    </div>
  );
}
