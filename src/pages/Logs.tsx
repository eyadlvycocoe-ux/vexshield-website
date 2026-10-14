import { ScrollText, Filter, Download, Search  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { FallingPapers } from "@/components/FallingPapers";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "ban" | "kick" | "warn" | "unban";
  playerName: string;
  adminName: string;
  reason: string;
  details?: string;
}

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs] = useState<LogEntry[]>([
    { id: 1, timestamp: "2024-01-15 15:45:30", type: "ban", playerName: "Cheater123", adminName: "AdminOne", reason: "Aimbot detected", details: "Automatic detection triggered" },
    { id: 2, timestamp: "2024-01-15 15:30:22", type: "kick", playerName: "BadPlayer", adminName: "AdminOne", reason: "Excessive trolling", details: "Multiple player reports" },
    { id: 3, timestamp: "2024-01-15 14:20:15", type: "warn", playerName: "NewPlayer", adminName: "AdminTwo", reason: "Minor rule violation", details: "First warning issued" },
    { id: 4, timestamp: "2024-01-15 13:10:45", type: "ban", playerName: "SpeedHacker", adminName: "AdminTwo", reason: "Speed hacking", details: "Speed exceeded normal limits" },
    { id: 5, timestamp: "2024-01-15 12:05:30", type: "unban", playerName: "ReformedPlayer", adminName: "AdminOne", reason: "Appeal accepted", details: "Behavior improved, appeal successful" },
    { id: 6, timestamp: "2024-01-15 11:30:15", type: "kick", playerName: "AFKPlayer", adminName: "AutoMod", reason: "AFK in active area", details: "Automatic system kick" },
  ]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ban": return "bg-destructive/15 text-destructive border-destructive/30";
      case "kick": return "bg-warning/15 text-warning border-warning/30";
      case "warn": return "bg-accent/15 text-accent border-accent/30";
      case "unban": return "bg-green-500/15 text-green-500 border-green-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const filteredLogs = logs.filter(log =>
    log.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <FallingPapers />

      <div className="relative z-10">
        <h1 className="text-3xl font-bold text-wave">Moderation Logs</h1>
        <p className="text-muted-foreground mt-2">Complete history of all moderation actions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        {[
          { label: "Total Actions", value: logs.length, icon: ScrollText, color: "primary" },
          { label: "Bans", value: logs.filter(l => l.type === "ban").length, color: "destructive" },
          { label: "Kicks", value: logs.filter(l => l.type === "kick").length, color: "warning" },
          { label: "Warnings", value: logs.filter(l => l.type === "warn").length, color: "accent" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card/60 border-border/40 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold text-${color}`}>{value}</p>
              </div>
              {Icon && <Icon className={`w-8 h-8 text-${color}`} />}
            </div>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card className="bg-card/60 border-border/40 backdrop-blur p-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-background/50" />
          </div>
          <Button variant="outline" size="sm" className="bg-card/80 border-border/60">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="bg-card/80 border-border/60">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </Card>

      {/* Logs */}
      <Card className="bg-card/60 border-border/40 backdrop-blur overflow-hidden relative z-10">
        <div className="p-5 border-b border-border/40">
          <h2 className="text-xl font-semibold">Action History</h2>
        </div>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-border/30">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getTypeColor(log.type)}>
                      {log.type.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{log.playerName}</span>
                    <span className="text-muted-foreground text-sm">by {log.adminName}</span>
                    <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                  </div>
                  <p className="text-sm"><span className="font-medium">Reason:</span> {log.reason}</p>
                  {log.details && <p className="text-sm text-muted-foreground">{log.details}</p>}
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Details</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
