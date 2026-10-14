import { useState, useEffect } from "react";
import { Shield, Zap, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnimatedAirScannerDialogue() {
  const [activeStep, setActiveStep] = useState(0);
  const [typingText1, setTypingText1] = useState("");
  const [typingText2, setTypingText2] = useState("");

  const qText = "How do I protect my FiveM server from hidden backdoors, obfuscated triggers, and rogue scripts?";
  const aText = "Use AirScanner! Instant 100% free scanner that detects ciphers, hidden backdoors, and unauthorized code in seconds.";

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
      
      {/* FRAMELESS FREESTANDING HERO SCENE */}
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
                <span className="text-xs font-bold text-zinc-900 tracking-tight">Sophia (Server Admin)</span>
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
          <div className="relative rounded-2xl rounded-br-none bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-4 shadow-[0_16px_40px_rgba(0,120,255,0.4)] border border-blue-400/40 text-white transition-all duration-300">
            <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/20 pb-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-cyan-300 animate-pulse" />
                <span className="text-xs font-black tracking-tight text-white">Alex (Security Forensics)</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-200 font-bold">Answering...</span>
            </div>
            <p className="text-[13.5px] sm:text-sm font-bold leading-snug text-white">
              {typingText2}
              {activeStep === 1 && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-white animate-pulse" />}
            </p>

            {/* Cyan/Blue Speech Bubble Tail pointing down towards Alex's mouth */}
            <div className="absolute -bottom-3 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-indigo-600 drop-shadow" />
          </div>
        </div>

        {/* CENTERPIECE: CUTOUT CHARACTERS ARTWORK */}
        <div className="relative w-full flex-1 flex items-end justify-center pt-24 sm:pt-28 pb-4">
          
          {/* Subtle Ambient Radial Backlight Glow behind characters */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[460px] h-[340px] sm:h-[460px] bg-gradient-to-tr from-blue-600/30 via-cyan-500/20 to-indigo-600/25 rounded-full blur-[80px] pointer-events-none" />

          {/* Cutout Image of Sophia and Alex */}
          <div className="relative z-10 w-full max-w-[500px] sm:max-w-[580px] transition-transform duration-700 hover:scale-[1.02]">
            <img 
              src="/hero-dev-illustration.jpg" 
              alt="AirScanner Security Forensics Team" 
              className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-3xl border border-white/10"
            />

            {/* FLOATING METRIC BADGES ATTACHED TO SCENE */}
            <div className="absolute -bottom-2 left-4 sm:left-6 z-20 flex items-center gap-2 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-500/30 px-3.5 py-2 shadow-xl">
              <Search className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-black text-white">100% Free Backdoor Scan</span>
            </div>

            <div className="absolute top-1/2 -right-2 sm:-right-4 z-20 hidden sm:flex items-center gap-2 rounded-xl bg-black/80 backdrop-blur-md border border-blue-500/30 px-3.5 py-2 shadow-xl">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-black text-white">Obfuscation & Cipher Decoder</span>
            </div>
          </div>
        </div>

        {/* BOTTOM FLOATING STATUS BAR */}
        <div className="relative z-20 w-full flex items-center justify-between rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 px-4 py-3 text-xs shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-bold text-zinc-300">AirScanner Anti-Backdoor Engine</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-[11px] text-cyan-400">● 100% FiveM Safe</span>
            <span className="rounded-lg bg-blue-500/20 px-2.5 py-1 text-[10px] font-bold text-blue-300 border border-blue-500/30">
              Real-time Resource Analysis
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
