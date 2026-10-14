import { useNavigate } from "react-router-dom";
import { ArrowLeft, LifeBuoy  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupportPanelSession } from "@/lib/connected-server";

export function SupportPanelBackBar() {
  const navigate = useNavigate();

  if (!isSupportPanelSession()) return null;

  return (
    <div className="sticky top-0 z-50 flex shrink-0 items-center gap-3 border-b border-orange-500/30 bg-orange-950/80 px-4 py-2 backdrop-blur-sm">
      <LifeBuoy className="h-4 w-4 shrink-0 text-orange-400" />
      <span className="text-sm text-orange-200/90">Support session — viewing owner panel</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="ml-auto shrink-0 border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20 hover:text-white"
        onClick={() => navigate("/staff-panel")}
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Support Panel
      </Button>
    </div>
  );
}
