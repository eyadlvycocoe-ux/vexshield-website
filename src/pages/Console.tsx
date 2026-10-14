import { Terminal, Send, Download, Trash2  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FallingPapers } from "@/components/FallingPapers";

interface ConsoleEntry {
  id: number;
  timestamp: string;
  type: "info" | "warning" | "error" | "command";
  message: string;
}


export default function Console() {
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  
  const consoleRef = useRef<HTMLDivElement>(null);

  // Load logs + subscribe to real-time updates for the connected server
  useEffect(() => {
    const connectedServerStr = sessionStorage.getItem("connected_server");
    if (!connectedServerStr) return;

    const connected = JSON.parse(connectedServerStr);
    const serverId = connected?.server_id;
    if (!serverId) return;

    const loadLogs = async () => {
      const { data, error } = await supabase
        .from("consoles")
        .select("logs")
        .eq("server_id", serverId)
        .maybeSingle();

      if (error) {
        console.error("[Console] Failed to load logs:", error);
        return;
      }

      const arr = Array.isArray(data?.logs) ? data!.logs : [];
      const mapped: ConsoleEntry[] = arr.map((l: any, idx: number) => ({
        id: Number(l.ts) || idx,
        timestamp: new Date(Number(l.ts) || Date.now()).toLocaleTimeString("en-US", { hour12: false }),
        type: "info",
        message: String(l.message),
      }));
      setLogs(mapped);
    };

    loadLogs();

    const channel = supabase
      .channel("demo-console-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consoles",
          filter: `server_id=eq.${serverId}`,
        },
        (payload) => {
          const nextLogs = (payload.new as any)?.logs;
          if (!Array.isArray(nextLogs)) return;

          const mapped: ConsoleEntry[] = nextLogs.map((l: any, idx: number) => ({
            id: Number(l.ts) || idx,
            timestamp: new Date(Number(l.ts) || Date.now()).toLocaleTimeString("en-US", { hour12: false }),
            type: "info",
            message: String(l.message),
          }));

          setLogs(mapped);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSendCommand = async () => {
    if (!command.trim()) return;

    const connectedServerStr = sessionStorage.getItem("connected_server");
    const connected = connectedServerStr ? JSON.parse(connectedServerStr) : null;
    if (!connected) return;

    const newCommand: ConsoleEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "command",
      message: `> ${command}`,
    };

    setLogs((prev) => [...prev, newCommand]);

    try {
      const { error } = await supabase.functions.invoke("server-command", {
        body: {
          server_id: connected.server_id,
          license_key: connected.license_key,
          command_type: "execute_command",
          command_data: { 
            command: command.trim()
          },
        },
      });

      if (error) {
        console.error("Command error:", error);
        const errorLog: ConsoleEntry = {
          id: Date.now() + 1,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          type: "error",
          message: `Failed to execute command: ${error.message}`,
        };
        setLogs((prev) => [...prev, errorLog]);
      }
    } catch (err) {
      console.error("Command failed:", err);
    }

    setCommand("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const logContent = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-console-${new Date().toISOString().split('T')[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "error": return "text-destructive";
      case "warning": return "text-warning";
      case "command": return "text-primary";
      case "info": 
      default: return "text-zinc-200";
    }
  };

  return (
    <div className="relative min-h-full w-full p-4 md:p-6 bg-[#0F1017] text-white space-y-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.02),transparent_55%)] -z-10" />
      <FallingPapers />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Server Console
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Execute commands and monitor server output in real-time
          </p>
        </div>
      </div>

      {/* Console Controls */}
      <div className="rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-[#181B26] p-4 shadow-2xl relative z-10 transition-all">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50 animate-pulse"></div>
            <span className="text-xs font-black uppercase tracking-wider text-white">Server Online</span>
            <span className="text-xs text-blue-400/70">• Real-time live pipe</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadLogs} className="h-9 rounded-xl border-white/10 bg-[#141414] hover:bg-[#111722] hover:border-blue-500/30 text-zinc-300 hover:text-white text-xs font-bold px-3.5">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs} className="h-9 rounded-xl border-white/10 bg-[#141414] hover:bg-[#111722] hover:border-blue-500/30 text-zinc-300 hover:text-white text-xs font-bold px-3.5">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="rounded-2xl border border-white/10 hover:border-blue-500/30 bg-[#181B26] shadow-2xl overflow-hidden relative z-10 transition-all">
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#050505]">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Console Output</h2>
            <div className="ml-auto text-[11px] font-mono text-blue-400">
              {logs.length} entries
            </div>
          </div>
        </div>
        
        <div 
          ref={consoleRef}
          className="h-[450px] overflow-y-auto overflow-x-hidden scrollbar-none bg-[#030303] p-4 font-mono text-xs text-zinc-300"
        >
          {logs.map((log) => {
            const isBanner = log.message.includes('\n') || log.message.includes('AIRCORE') || log.message.includes('---');
            return (
              <div key={log.id} className="mb-1 hover:bg-blue-500/[0.04] px-3 py-1 rounded-lg transition-colors border-l-2 border-transparent hover:border-blue-500/50 flex flex-row items-start font-mono text-xs">
                <span className="text-zinc-500 mr-3 text-[11px] select-none shrink-0">[{log.timestamp}]</span>
                {!isBanner && (
                  <span className={`mr-2 font-bold text-[11px] shrink-0 ${getTypeColor(log.type)}`}>
                    {log.type.toUpperCase()}:
                  </span>
                )}
                <span className="text-zinc-200 whitespace-pre-wrap break-words flex-1 font-mono">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Command Input */}
      <div className="rounded-2xl border border-white/10 hover:border-blue-500/30 bg-[#181B26] p-5 shadow-2xl relative z-10 space-y-3 transition-all">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono font-bold min-w-0">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>root@fivem:~$</span>
          </div>
          <div className="flex-1 flex gap-2 min-w-0">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your command here..."
              className="h-10 font-mono text-xs bg-[#050505] border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
            />
            <Button 
              onClick={handleSendCommand}
              disabled={!command.trim()}
              className="h-10 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs px-5 rounded-xl shadow-lg shadow-blue-500/10 transition-all gap-2"
            >
              <Send className="w-3.5 h-3.5 text-black" />
              Execute
            </Button>
          </div>
        </div>
        
        <div className="p-3 bg-[#050505] rounded-xl border border-blue-500/15">
          <p className="text-[11px] text-zinc-400">
            <span className="text-blue-400 font-bold">Quick commands:</span> 
            <code className="mx-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 font-mono">help</code>
            <code className="mx-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 font-mono">restart [resource]</code>
            <code className="mx-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 font-mono">status</code>
            <code className="mx-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 font-mono">kick [id]</code>
          </p>
        </div>
      </div>
    </div>
  );
}