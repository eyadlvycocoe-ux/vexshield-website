import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock,
  ArrowLeft,
  Shield,
  User,
 } from "lucide-react";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { AdminSupportRemovalsPanel } from "@/components/AdminSupportRemovalsPanel";
import { AdminSupportStaffPanel } from "@/components/AdminSupportStaffPanel";
import { AdminSupportDutyLogPanel } from "@/components/AdminSupportDutyLogPanel";

export default function AdminTickets() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [adminTab, setAdminTab] = useState<"staff" | "duty" | "removals">("staff");

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070c14] text-slate-400 font-medium">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
          <div className="h-5 w-5 border-2 border-orange-500/30 border-t-orange-500 animate-spin rounded-full" />
          <span>Verifying Admin Permissions...</span>
        </div>
      </div>
    );
  }
  if (!staffOk) return null;

  return (
    <div className="min-h-screen bg-[#060b13] text-white p-4 md:p-8 flex flex-col font-sans">
      <div className="max-w-7xl mx-auto flex flex-col flex-1 gap-6 w-full">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl h-10 w-10 shrink-0"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Support Staff Oversight
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitor support staff members, active duty logs, monthly server quotas, and blacklisted server panels.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex flex-wrap gap-2 bg-black/30 border border-white/10 p-1.5 rounded-xl">
            <Button
              variant={adminTab === "staff" ? "default" : "ghost"}
              size="sm"
              className={
                adminTab === "staff"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/20 text-xs px-4"
                  : "text-slate-400 hover:text-white hover:bg-white/5 text-xs px-4"
              }
              onClick={() => setAdminTab("staff")}
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              Support Staff Roster
            </Button>
            <Button
              variant={adminTab === "duty" ? "default" : "ghost"}
              size="sm"
              className={
                adminTab === "duty"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/20 text-xs px-4"
                  : "text-slate-400 hover:text-white hover:bg-white/5 text-xs px-4"
              }
              onClick={() => setAdminTab("duty")}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Duty Logs
            </Button>
            <Button
              variant={adminTab === "removals" ? "default" : "ghost"}
              size="sm"
              className={
                adminTab === "removals"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/20 text-xs px-4"
                  : "text-slate-400 hover:text-white hover:bg-white/5 text-xs px-4"
              }
              onClick={() => setAdminTab("removals")}
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Panel Removals & Blacklist
            </Button>
          </div>
        </div>

        {/* Tab Content Display */}
        {adminTab === "removals" ? (
          <AdminSupportRemovalsPanel />
        ) : adminTab === "duty" ? (
          <AdminSupportDutyLogPanel />
        ) : (
          <AdminSupportStaffPanel />
        )}
      </div>
    </div>
  );
}
