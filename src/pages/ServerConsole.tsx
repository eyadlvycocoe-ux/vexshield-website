import { Terminal, Send, Download, Trash2, Search, CheckCircle2  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogEntry {
  ts: number;
  message: string;
}

type LogTag = 'INFO' | 'WARN' | 'ERROR' | 'CHAT' | 'BAN' | 'KICK' | 'ANTICHEAT' | 'CMD';

function isAsciiOrBanner(msg: string): boolean {
  if (msg.includes('\n')) return true;
  if (msg.match(/^\s*[\.|\/|\\|\_|\-|\(|\)|\'\`\|\+]+\s*/) && (msg.includes('AIRCORE') || msg.includes('___') || msg.includes('.---.') || (msg.includes('AirShield') || msg.includes('VexShield')))) return true;
  if (msg.includes('╔') || msg.includes('║') || msg.includes('╚') || msg.includes('═') || msg.includes('┌') || msg.includes('┐') || msg.includes('└') || msg.includes('┘')) return true;
  return false;
}

function isAlreadyTagged(msg: string): boolean {
  return /^\s*\[.+?\]/.test(msg);
}

function renderConsoleMessage(msg: string) {
  const parts = msg.split(/(\^[0-9])/g);
  let currentColor = "text-zinc-200";

  const elements: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part.match(/^\^[0-9]$/)) {
      const code = part[1];
      switch (code) {
        case "1": currentColor = "text-red-400 font-semibold"; break;
        case "2": currentColor = "text-emerald-400 font-semibold"; break;
        case "3": currentColor = "text-yellow-400 font-semibold"; break;
        case "4": currentColor = "text-sky-400 font-semibold"; break;
        case "5": currentColor = "text-cyan-400 font-semibold"; break;
        case "6": currentColor = "text-purple-400 font-semibold"; break;
        case "7": currentColor = "text-zinc-200"; break;
        case "8": currentColor = "text-red-600 font-semibold"; break;
        case "9": currentColor = "text-pink-400 font-semibold"; break;
      }
    } else if (part) {
      elements.push(
        <span key={i} className={currentColor}>
          {part}
        </span>
      );
    }
  });

  return elements.length > 0 ? elements : msg;
}

export default function ServerConsole() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connected = sessionStorage.getItem('connected_server');
    if (!connected) { toast.error("Please connect to a server first"); navigate('/'); return; }
    let serverData: any;
    try { serverData = JSON.parse(connected); }
    catch {
      toast.error("Invalid server connection");
      sessionStorage.removeItem("connected_server");
      navigate("/");
      return;
    }
    if (serverData.server_id !== serverId) { toast.error("Invalid server connection"); navigate('/'); return; }

    const loadLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('consoles')
          .select('logs')
          .eq('server_id', serverId)
          .maybeSingle();
        if (error) throw error;
        if (data && data.logs != null) {
          let raw = data.logs as unknown;
          if (typeof raw === 'string') {
            try {
              raw = JSON.parse(raw);
            } catch {
              raw = [];
            }
          }
          setLogs(Array.isArray(raw) ? (raw as LogEntry[]) : []);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error('Error loading logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    const poll = window.setInterval(loadLogs, 8000);

    const channel = supabase
      .channel("server-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consoles", filter: `server_id=eq.${serverId}` },
        () => {
          void loadLogs();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [serverId, navigate]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSendCommand = async () => {
    if (!command.trim()) return;

    const connectedServerStr = sessionStorage.getItem('connected_server');
    if (!connectedServerStr) { toast.error("Not connected to a server"); return; }
    const serverData = JSON.parse(connectedServerStr);

    // Immediately show the command in console
    const cmdEntry: LogEntry = { ts: Date.now(), message: `> ${command.trim()}` };
    setLogs(prev => [...prev, cmdEntry]);

    try {
      const { error } = await supabase.functions.invoke('server-command', {
        body: {
          server_id: serverData.server_id,
          license_key: serverData.license_key,
          command_type: 'execute_command',
          command_data: { command: command.trim() },
        },
      });

      if (error) {
        console.error('Error sending command:', error);
        toast.error(error.message || "Failed to send command");
      }
    } catch (error) {
      console.error('Error sending command:', error);
      toast.error("Failed to send command");
    }

    setCommand("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendCommand();
  };

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const logContent = logs.map(log =>
      `[${new Date(log.ts).toLocaleTimeString("en-US", { hour12: false })}] ${log.message}`
    ).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-console-${serverId}-${new Date().toISOString().split('T')[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l => l.message.toLowerCase().includes(q));
  }, [logs, searchQuery]);

  return (
    <div className="p-6 space-y-4 relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />

      {/* Header bar — like txAdmin */}
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Live Console</h1>
          <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded font-medium">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(!showSearch)} className="gap-1.5">
            <Search className="w-4 h-4" /> Search
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadLogs} disabled={logs.length === 0} className="gap-1.5">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button variant="ghost" size="sm" onClick={clearLogs} disabled={logs.length === 0} className="gap-1.5">
            <Trash2 className="w-4 h-4" /> Clear
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="relative z-10">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs..."
            className="bg-background/50 font-mono text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Connected status */}
      <div className="relative z-10 flex items-center gap-2 text-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-400">Connected to server console</span>
      </div>

      {/* Console output — dark terminal style like txAdmin */}
      <div
        ref={consoleRef}
        className="relative z-10 h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-none bg-[#0a0e14] rounded-lg border border-border/30 p-4 font-mono text-[13px] leading-relaxed"
      >
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No matching logs' : 'No logs available'}
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isBanner = isAsciiOrBanner(log.message);
            const isTagged = isAlreadyTagged(log.message);
            const timestamp = new Date(log.ts).toLocaleTimeString("en-US", { hour12: false });
            return (
              <div key={index} className="hover:bg-white/[0.03] px-1 py-[1px] flex flex-row items-start font-mono text-[12.5px] leading-relaxed">
                <span className="text-muted-foreground/60 mr-2.5 select-none shrink-0 text-[11px] font-mono">[{timestamp}]</span>
                <span className="text-foreground/90 whitespace-pre-wrap break-words flex-1 font-mono">
                  {renderConsoleMessage(log.message)}
                </span>
              </div>
            );
          })
        )}
        <div className="h-1" /> {/* bottom spacer for cursor feel */}
      </div>

      {/* Command input — terminal prompt style */}
      <div className="relative z-10 flex items-center gap-2 bg-[#0a0e14] rounded-lg border border-border/30 px-4 py-2">
        <span className="text-primary/70 font-mono text-sm shrink-0 select-none">{">"}</span>
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a command..."
          className="border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        />
        <Button
          onClick={handleSendCommand}
          disabled={!command.trim()}
          size="sm"
          variant="ghost"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
