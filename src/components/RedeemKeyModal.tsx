import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, ShieldCheck, Loader2, Globe, CheckCircle2, Sparkles, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureCsrfCookie } from "@/lib/api-base";

interface RedeemKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RedeemKeyModal({ open, onOpenChange, onSuccess }: RedeemKeyModalProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [serverIp, setServerIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLicenseKey(text.trim().toUpperCase());
        toast.success("License key pasted");
      }
    } catch {
      // clipboard access denied, ignore
    }
  };

  const handleRedeem = async () => {
    const key = licenseKey.trim();
    const ip = serverIp.trim();

    if (!key) {
      toast.error("Please enter your License Key");
      return;
    }
    if (!ip) {
      toast.error("Please enter your Server IP");
      return;
    }

    setLoading(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl("/api/license/redeem"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          license_key: key,
          server_ip: ip,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.error?.message === "string"
            ? data.error.message
            : typeof data?.message === "string"
            ? data.message
            : "Failed to redeem license key";
        throw new Error(errorMsg);
      }

      setIsSuccess(true);
      toast.success(data.message || "License key redeemed successfully!");

      setTimeout(() => {
        setLicenseKey("");
        setServerIp("");
        setIsSuccess(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : typeof e === "string"
          ? e
          : "Failed to redeem key";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-gradient-to-b from-[#091122] via-[#060b17] to-[#040812] border border-cyan-500/25 text-white shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.12)] rounded-2xl p-6 overflow-hidden">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent" />

        <DialogHeader className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Key className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold text-cyan-300 uppercase tracking-widest font-mono">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Vex Activation
            </span>
          </div>

          <div>
            <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Redeem License Key</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1 leading-relaxed">
              Enter your VexShield license key and target server address to bind and activate autonomous defense.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* License Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <span>License Key</span>
              <button
                type="button"
                onClick={handlePasteKey}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <ClipboardPaste className="h-3 w-3" />
                Paste
              </button>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-zinc-500">
                <Key className="h-4 w-4 text-cyan-400/70" />
              </div>
              <Input
                placeholder="VEXSHIELD-XXXXXX-XXXXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="pl-10 pr-4 bg-[#040814] border-cyan-500/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 text-white rounded-xl h-11 font-mono tracking-widest text-xs placeholder:text-zinc-600 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Server IP Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <span>Server Host / IP</span>
              <span className="text-zinc-500 font-normal text-[11px] normal-case">Target node address</span>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-zinc-500">
                <Globe className="h-4 w-4 text-cyan-400/70" />
              </div>
              <Input
                placeholder="e.g. 192.168.1.1 or cfx.re/join/xxx"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="pl-10 pr-4 bg-[#040814] border-cyan-500/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 text-white rounded-xl h-11 font-mono text-xs placeholder:text-zinc-600 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleRedeem}
            disabled={loading || isSuccess}
            className={`w-full h-11 font-bold rounded-xl transition-all duration-200 mt-3 text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.35)] ${
              isSuccess
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white active:scale-[0.99]"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                Validating License...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2 text-white" />
                License Activated!
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2 text-white" />
                Activate Server Protection
              </>
            )}
          </Button>

          {/* Mini Security Badges */}
          <div className="pt-2 flex items-center justify-center gap-3 text-[10px] text-zinc-400 font-mono">
            <span>✓ Instant Bind</span>
            <span>·</span>
            <span>✓ Heuristic Matrix</span>
            <span>·</span>
            <span>✓ 24/7 SLA</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
