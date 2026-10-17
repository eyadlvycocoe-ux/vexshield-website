import { useState, useEffect } from "react";
import { Shield, Sparkles, Terminal, Activity, Zap, CheckCircle2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-base";

export function AnimatedHeroDialogue() {
  const [activeStep, setActiveStep] = useState(0);
  const [typingText1, setTypingText1] = useState("");
  const [typingText2, setTypingText2] = useState("");
  const [buildVersion, setBuildVersion] = useState<string>("Beta");

  useEffect(() => {
    fetch(apiUrl("/api/db/anticheat_files?select=version,is_active&order=uploaded_at:DESC&limit=1"))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]?.version) {
          setBuildVersion(data[0].version.trim());
        }
      })
      .catch(() => {});
  }, []);

  const qText = "Do you know what's the best anticheat for FiveM?";
  const aText = "Definitely VexShield! 0% FPS drop, instant detection, and total protection.";

  // Typing animation loop
  useEffect(() => {
    let t1: any;
    let t2: any;
    let loopTimeout: any;

    const startTyping = () => {
      setTypingText1("");
      setTypingText2("");
      setActiveStep(0);

      let i = 0;
      t1 = setInterval(() => {
        if (i <= qText.length) {
          setTypingText1(qText.slice(0, i));
          i++;
        } else {
          clearInterval(t1);
          setActiveStep(1);
          setTimeout(() => {
            let j = 0;
            t2 = setInterval(() => {
              if (j <= aText.length) {
                setTypingText2(aText.slice(0, j));
                j++;
              } else {
                clearInterval(t2);
                setActiveStep(2);
                loopTimeout = setTimeout(startTyping, 9000);
              }
            }, 30);
          }, 600);
        }
      }, 35);
    };

    startTyping();

    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearTimeout(loopTimeout);
    };
  }, []);

  return (
    <div className="relative w-full max-w-[780px] mx-auto select-none">
      
      {/* =========================================================================
          FRAMELESS FREESTANDING HERO SCENE (Seamlessly Part of Website Background)
         ========================================================================= */}
      <div className="relative w-full min-h-[520px] sm:min-h-[580px] flex flex-col justify-between">

        {/* SPEECH BUBBLE 1 - SOPHIA ASKING (White Bubble on Top Left) */}
        <div 
          className={cn(
            "absolute -top-4 sm:top-0 left-0 sm:left-2 z-30 max-w-[290px] sm:max-w-[340px] transition-all duration-500",
            activeStep === 0 
              ? "opacity-100 scale-100 translate-y-0" 
              : "opacity-90 scale-[0.98]"
          )}
        >
          <div className="relative rounded-2xl rounded-bl-none bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.85)] border border-zinc-200 transition-all duration-300">
            <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-zinc-100 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-zinc-900 tracking-tight">Sophia (Server Owner)</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 font-semibold">Asking...</span>
            </div>
            <p className="text-[13.5px] sm:text-sm font-bold text-zinc-900 leading-snug">
              {typingText1}
              {activeStep === 0 && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-black animate-pulse" />}
            </p>

            {/* White Speech Bubble Tail pointing down towards Sophia's mouth */}
            <div className="absolute -bottom-3 left-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-white drop-shadow" />
          </div>
        </div>

        {/* SPEECH BUBBLE 2 - ALEX REPLYING (White Bubble on Top Right) */}
        <div 
          className={cn(
            "absolute top-6 sm:top-8 right-0 sm:right-2 z-30 max-w-[310px] sm:max-w-[360px] transition-all duration-500",
            activeStep >= 1 
              ? "opacity-100 scale-100 translate-y-0" 
              : "opacity-0 scale-90 translate-y-3 pointer-events-none"
          )}
        >
          <div className="relative rounded-2xl rounded-br-none bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.9)] border border-zinc-200 transition-all duration-300">
            <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-zinc-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-zinc-900 tracking-tight">Alex (Lead Dev)</span>
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[8.5px] font-black text-white uppercase tracking-wider">Verified</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 font-semibold">Response</span>
            </div>
            
            <p className="text-[13.5px] sm:text-sm font-bold text-zinc-900 leading-snug">
              {typingText2}
              {activeStep === 1 && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-black animate-pulse" />}
            </p>

            {activeStep >= 2 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100 animate-fade-in">
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[9.5px] font-black text-zinc-900">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 0% FPS Loss
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[9.5px] font-black text-zinc-900">
                  <Zap className="h-3 w-3 text-blue-600" /> Real-time Ban
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[9.5px] font-black text-zinc-900">
                  <Shield className="h-3 w-3 text-blue-600" /> 100% Secure
                </span>
              </div>
            )}

            {/* White Speech Bubble Tail pointing down towards Alex */}
            <div className="absolute -bottom-3 right-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-white drop-shadow" />
          </div>
        </div>

        {/* =========================================================================
            PURE ISOLATED ILLUSTRATION (Direct Seamless Part of the Background)
           ========================================================================= */}
        <div className="relative w-full mt-24 pt-4 flex items-end justify-center">
          <img
            src="/hero-dev-illustration.jpg"
            alt="VexShield Developers Dialogue"
            className="w-full h-auto max-h-[480px] sm:max-h-[520px] object-contain transition-transform duration-700 hover:scale-[1.01]"
          />
        </div>

        {/* Floating live metrics footer pill */}
        <div className="mt-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-white font-semibold">
              VexShield {buildVersion.toLowerCase().startsWith("v") ? buildVersion : `v${buildVersion}`} Enterprise Core
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-zinc-400">
            <span className="text-emerald-400 font-bold">● 0 Cheat Injections</span>
            <span>|</span>
            <span className="text-blue-400 font-bold">100% Protected</span>
          </div>
        </div>

      </div>
    </div>
  );
}
