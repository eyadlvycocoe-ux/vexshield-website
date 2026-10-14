import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { apiUrl, apiMutationHeaders, ensureMutationCsrf } from "@/lib/api-base";

export default function MfaVerify() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

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
    // If user pasted a code
    if (cleanValue.length > 1) {
      const pastedCode = cleanValue.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || "";
      }
      setCode(newCode);
      // Focus last input or submit
      const lastIdx = Math.min(cleanValue.length - 1, 5);
      inputRefs.current[lastIdx]?.focus();
      return;
    }

    newCode[index] = cleanValue;
    setCode(newCode);

    // Auto-advance to next input
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
      const res = await fetch(apiUrl("/api/auth/verify-2fa"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setLockoutTime(data.retryAfter);
          toast.error(`Too many attempts. You are locked out.`);
        } else {
          toast.error(data.error || "Invalid authentication code.");
        }
        setCode(Array(6).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success("Authentication successful!");
      navigate("/my-servers");
    } catch (err) {
      toast.error("An error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await ensureMutationCsrf();
      await fetch(apiUrl("/api/auth/cancel-2fa"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
      });
    } catch {
      /* ignore */
    }
    navigate("/auth");
  };

  const formatLockTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const isComplete = code.every((digit) => digit !== "");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#040810] px-4 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-transparent to-blue-500/10 pointer-events-none" />

      <Card className="relative w-full max-w-md border-white/10 bg-[#0b101b]/95 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 shadow-inner border border-sky-500/20 mb-5 animate-pulse">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Two-Factor Verification</h1>
          <p className="text-sm text-slate-400 max-w-xs mb-8">
            Enter the 6-digit authorization code from your authenticator app.
          </p>
        </div>

        {lockoutTime !== null ? (
          <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-red-400">
            <ShieldAlert className="h-5 w-5 mb-1.5" />
            <p className="text-sm font-medium">Security Lockout Active</p>
            <p className="text-xs text-red-400/80 mt-1">
              Too many invalid codes. Try again in <span className="font-mono font-semibold">{formatLockTime(lockoutTime)}</span>
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
                className="h-12 sm:h-14 flex-1 min-w-0 rounded-xl border border-white/15 bg-slate-900/90 text-center text-2xl font-bold font-mono text-white shadow-inner focus:border-sky-400 focus:bg-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:shadow-[0_0_15px_rgba(56,189,248,0.2)] disabled:opacity-50 transition-all"
              />
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading || !isComplete || lockoutTime !== null}
            className="w-full h-11 bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-xl shadow-lg shadow-sky-500/20 transition-all"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Verify Code
          </Button>
        </form>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Cancel Login
          </button>
        </div>
      </Card>
    </div>
  );
}
