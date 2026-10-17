import { useState, useEffect } from 'react';
import { Users, ArrowUpRight, Car, UserX, Package as PackageIcon  } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { effectiveLivePlayerCount } from '@/lib/players-snapshot';
import { FallingPapers } from '@/components/FallingPapers';

export default function Dashboard() {
  const { activeServer } = useAuth();
  const [stats, setStats] = useState({
    avgPlayers: 0,
    peakPlayers: 0,
    onlinePlayers: 0
  });
  const [acVersion, setAcVersion] = useState('vBeta');

  useEffect(() => {
    if (activeServer) {
      loadDashboardData();
    }
  }, [activeServer]);

  const loadDashboardData = async () => {
    try {
      let { data: fileData } = await supabase
        .from('anticheat_files')
        .select('version')
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!fileData?.version) {
        const { data: fallback } = await supabase
          .from('anticheat_files')
          .select('version')
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        fileData = fallback;
      }
      setAcVersion(fileData?.version?.trim() || 'vBeta');

      // Get stats
      const { data: snapshot } = await supabase
        .from('players_snapshots')
        .select('total_players, updated_at')
        .eq('server_id', activeServer.id)
        .maybeSingle();
      
      setStats(prev => ({ ...prev, onlinePlayers: effectiveLivePlayerCount(snapshot ?? undefined) }));
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  };

  const queueCleanupCommand = async (
    commandType: 'delete_all_vehicles' | 'delete_all_npcs' | 'delete_all_objects',
    label: string,
  ) => {
    const connectedServerStr = sessionStorage.getItem('connected_server');
    if (!connectedServerStr) return;
    const connectedServer = JSON.parse(connectedServerStr);

    try {
      const { error } = await supabase.functions.invoke('server-command', {
        body: {
          server_id: connectedServer.server_id,
          license_key: connectedServer.license_key,
          command_type: commandType,
          command_data: {},
        },
      });

      if (error) throw error;
      toast.success(`${label} cleanup command queued`);
    } catch (error) {
      console.error(`Error queueing ${label} cleanup:`, error);
      toast.error(`Failed to queue ${label} cleanup`);
    }
  };

  const handleDeleteVehicles = async () => {
    await queueCleanupCommand('delete_all_vehicles', 'Vehicles');
  };

  const handleDeleteNPCs = async () => {
    await queueCleanupCommand('delete_all_npcs', 'NPCs');
  };

  const handleDeleteObjects = async () => {
    await queueCleanupCommand('delete_all_objects', 'Objects');
  };

  if (!activeServer) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
        <div className="text-center space-y-4 relative z-10">
          <h1 className="text-2xl font-bold text-foreground">No Server Connected</h1>
          <p className="text-muted-foreground">Please connect to a server to view the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <FallingPapers />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Server Header */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{activeServer.name || 'Demo Server'}</h1>
                <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">Online</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Active protected server.</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="min-w-[5.5rem] text-center">
                <p className="text-[13px] font-medium text-slate-400">AC Version</p>
                <p className="text-lg font-bold tabular-nums text-blue-400">{acVersion}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Expires</p>
                <p className="font-bold text-foreground">Lifetime</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Status</p>
                <p className="font-bold text-emerald-400">Active</p>
              </div>
              <Button variant="default" size="sm" className="gap-2">
                <ArrowUpRight className="w-4 h-4" />
                Renew
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-card border-border p-6 text-center">
            <p className="text-4xl font-bold text-foreground mb-1">{stats.avgPlayers}</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">AVERAGE PLAYERS</p>
          </Card>
          <Card className="bg-card border-border p-6 text-center">
            <p className="text-4xl font-bold text-foreground mb-1">{stats.peakPlayers}</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">PEAK PLAYERS</p>
          </Card>
          <Card className="bg-card border-border p-6 text-center">
            <p className="text-4xl font-bold text-primary mb-1">{stats.onlinePlayers}/100</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">ONLINE PLAYERS</p>
          </Card>
        </div>

        {/* Chart Area */}
        <Card className="bg-card border-border p-6">
          <div className="h-64 flex items-end gap-2">
            {Array.from({ length: 30 }).map((_, i) => {
              const height = Math.random() * 100;
              const isHighlighted = i >= 15 && i <= 25;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${isHighlighted ? 'bg-primary' : 'bg-primary/30'}`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-center gap-8 mt-4 text-xs text-muted-foreground">
            {['11:18', '11:18', '11:18', '11:18', '11:18', '11:18', '11:18', '11:18'].map((time, i) => (
              <span key={i}>{time}</span>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-6">
          <Button 
            variant="outline" 
            className="h-14 justify-start gap-3 border-border hover:bg-muted"
            onClick={handleDeleteVehicles}
          >
            <Car className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Delete Vehicles</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-14 justify-start gap-3 border-border hover:bg-muted"
            onClick={handleDeleteNPCs}
          >
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Delete NPCs</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-14 justify-start gap-3 border-border hover:bg-muted"
            onClick={handleDeleteObjects}
          >
            <PackageIcon className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Delete Objects</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
