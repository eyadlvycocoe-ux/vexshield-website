import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, ShieldAlert, Loader2, ArrowLeft, ShieldCheck, Settings } from "lucide-react";
import { apiUrl, apiMutationHeaders, ensureMutationCsrf } from "@/lib/api-base";

interface Panel2faPromptModalProps {
  panelTitle: string; // e.g. "Admin Panel" or "Support Panel"
  requiresSetup?: boolean;
  onSuccess: () => void;
}

export function Panel2faPromptModal({ panelTitle, requiresSetup, onSuccess }: Panel2faPromptModalProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!requiresSetup && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [requiresSetup]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTime === null || lockoutTime <= 0) return;
    const timer = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const handleChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    if (!cleanValue) return;

    const newCode = [...code];
    if (cleanValue.length > 1) {
      const pastedCode = cleanValue.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || "";
      }
      setCode(newCode);
      const lastIdx = Math.min(cleanValue.length - 1, 5);
      inputRefs.current[lastIdx]?.focus();
      return;
    }

    newCode[index] = cleanValue;
    setCode(newCode);

    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const newCode = [...code];
      if (!code[index] && index > 0) {
        newCode[index - 1] = "";
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const cleanValue = pastedData.replace(/[^0-9]/g, "").slice(0, 6);
    if (cleanValue.length === 6) {
      const newCode = cleanValue.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const verificationCode = code.join("");
    if (verificationCode.length !== 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl("/api/auth/panel-2fa/verify"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ code: verificationCode, panelType: panelTitle }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setLockoutTime(data.retryAfter);
          toast.error(`Too many attempts. Locked out for ${data.retryAfter} seconds.`);
        } else {
          toast.error(data.error || "Invalid authentication code.");
        }
        setCode(Array(6).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success(`${panelTitle} 2FA Verification successful! Access Granted.`);
      onSuccess();
    } catch {
      toast.error("An error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const formatLockTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const isComplete = code.every((digit) => digit !== "");

  if (requiresSetup) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#040810] px-4 py-12 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />
        <Card className="relative w-full max-w-md border-amber-500/30 bg-[#0b101b]/95 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 shadow-inner border border-amber-500/20 mb-5 animate-pulse">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">2FA Activation Required</h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Security Policy Enforced: You must activate Two-Factor Authentication (2FA) on your account before accessing the <strong className="text-amber-400">{panelTitle}</strong>.
            </p>
            <div className="w-full space-y-3">
              <Button
                onClick={() => navigate("/profile-settings")}
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Go to Profile Settings & Enable 2FA
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-10 border-white/10 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#040810] px-4 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-sky-500/10 pointer-events-none" />

      <Card className="relative w-full max-w-md border-white/10 bg-[#0b101b]/95 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 shadow-inner border border-amber-500/20 mb-5 animate-pulse">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{panelTitle} 2FA Verification</h1>
          <p className="text-sm text-slate-400 max-w-xs mb-8">
            Enter the 6-digit verification code from your authenticator app to enter <span className="text-amber-400 font-medium">{panelTitle}</span>.
          </p>
        </div>

        {lockoutTime !== null ? (
          <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-red-400">
            <ShieldAlert className="h-5 w-5 mb-1.5" />
            <p className="text-sm font-medium">Security Lockout Active</p>
            <p className="text-xs text-red-400/80 mt-1">
              Too many invalid attempts. Try again in <span className="font-mono font-semibold">{formatLockTime(lockoutTime)}</span>
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center gap-2 sm:gap-2.5">
            {code.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                ref={(el) => (inputRefs.current[idx] = el)}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading || lockoutTime !== null}
                className="h-12 sm:h-14 flex-1 min-w-0 rounded-xl border border-white/15 bg-slate-900/90 text-center text-2xl font-bold font-mono text-white shadow-inner focus:border-amber-400 focus:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 transition-all"
              />
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading || !isComplete || lockoutTime !== null}
            className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Verify & Enter {panelTitle}
          </Button>
        </form>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Cancel & Exit
          </button>
        </div>
      </Card>
    </div>
  );
}
