import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Home, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const authError = useMemo(() => {
    const code = searchParams.get("error");
    if (!code) return null;
    if (code === "access_denied") {
      return t("authPage.accessDenied") || "This Discord account is not allowed to sign in or authorization was cancelled.";
    }
    if (code === "auth_failed") {
      return "Authentication failed. Server could not store Discord account. Make sure MySQL is running.";
    }
    if (code === "invalid_grant") {
      return "Discord authorization code expired or was already used. Please click below to sign in again.";
    }
    if (code === "no_code") {
      return "No authorization code returned from Discord.";
    }
    return `Authentication error: ${code}. Please try again.`;
  }, [searchParams, t]);

  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/my-servers`,
          scopes: 'identify email guilds guilds.join',
          skipBrowserRedirect: false,
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || t("authPage.signInFailed"));
      setLoading(false);
    }
  };

  const handleClearError = () => {
    searchParams.delete("error");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#050B14] text-slate-100 relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background ambient radial glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[160px]" />

      {/* Centered Auth Card */}
      <div className="w-full max-w-md space-y-6 relative z-10 rounded-2xl border border-cyan-500/20 bg-[#081322]/85 backdrop-blur-xl p-7 sm:p-9 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="rounded-xl border-cyan-500/20 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/40 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
          >
            <Home className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            Back to Home
          </Button>
          <span className="text-[11px] font-mono tracking-wider text-cyan-400/90 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full font-bold">
            VEXSHIELD AUTH
          </span>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {t("authPage.title") || "Welcome Back"}
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            {t("authPage.subtitle") || "Enter your Discord account to access your VexShield dashboard."}
          </p>
        </div>

        {/* Already logged in notice */}
        {user && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                You are signed in as {user?.user_metadata?.full_name || user?.user_metadata?.discord_username || user?.email || "User"}
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => navigate("/my-servers")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md"
              >
                My Servers <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => signOut()}
                className="border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs rounded-lg"
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}

        {/* Error notice */}
        {authError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200 backdrop-blur-sm space-y-2.5 shadow-[0_0_25px_rgba(244,63,94,0.15)]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs md:text-sm font-medium leading-relaxed">
                {authError}
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={handleClearError}
                className="text-zinc-400 hover:text-white underline underline-offset-2"
              >
                Dismiss notice
              </button>
              <button
                type="button"
                onClick={() => handleDiscordLogin()}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <RefreshCw className="h-3 w-3" /> Retry Sign In
              </button>
            </div>
          </div>
        )}

        {/* Terms checkbox */}
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-cyan-500/15 bg-white/[0.02] p-3 text-xs text-zinc-400 cursor-pointer hover:bg-white/[0.04] transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-white/20 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span className="leading-relaxed">
              {t("authPage.agreePrefix") || "I agree to the"}{" "}
              <button className="text-cyan-400 hover:underline" type="button" onClick={() => navigate("/terms")}>
                {t("authPage.terms") || "Terms"}
              </button>
              ,{" "}
              <button className="text-cyan-400 hover:underline" type="button" onClick={() => navigate("/privacy")}>
                {t("authPage.privacy") || "Privacy Policy"}
              </button>
              , {t("authPage.and") || "and"}{" "}
              <button className="text-cyan-400 hover:underline" type="button" onClick={() => navigate("/refund")}>
                {t("authPage.refund") || "Refund Policy"}
              </button>
              .
            </span>
          </label>

          {/* Discord OAuth Login Button */}
          <Button
            type="button"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold h-12 rounded-xl shadow-[0_0_25px_rgba(88,101,242,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-sm"
            onClick={() => handleDiscordLogin()}
            disabled={loading || !acceptedTerms}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            )}
            {loading ? (t("authPage.connecting") || "Connecting...") : (t("authPage.continueDiscord") || "Continue with Discord")}
          </Button>

          <div className="text-xs text-zinc-500 text-center pt-1">
            {t("authPage.needHelp") || "Need help?"}{" "}
            <button className="text-cyan-400 hover:underline" onClick={() => navigate('/faqs')}>
              {t("nav.faqs") || "FAQs"}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-cyan-500/10">
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            {t("authPage.signInLegal") || "By signing in, you agree to our Terms of Service and Privacy Policy."}
          </p>
        </div>
      </div>
    </div>
  );
}
