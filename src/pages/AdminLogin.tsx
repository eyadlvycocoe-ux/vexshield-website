import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-base";
import { Home, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Invalid credentials");
        return;
      }
      if (data.requires2fa) {
        toast.info("Two-Factor code required");
        navigate("/admin/verify-2fa");
        return;
      }
      setIdentifier("");
      setPassword("");
      toast.success("Logged in as admin");
      navigate("/admin");
    } catch {
      toast.error("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-bold"
        >
          <Home className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
          Back to Home
        </Button>
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-blue-500/20 bg-[#111111] p-10 shadow-[0_0_60px_rgba(0,149,255,0.08)]">
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_30px_rgba(0,149,255,0.3)]">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Secured with rate limiting &amp; CSRF protection
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <Input
              type="text"
              placeholder="Email or Discord ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              autoComplete="username"
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
            />
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
            />
            <Button
              type="submit"
              disabled={loading || !identifier.trim() || !password.trim()}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-base font-semibold text-white shadow-[0_4px_20px_rgba(0,149,255,0.3)] hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Maximum 5 login attempts per 15 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
