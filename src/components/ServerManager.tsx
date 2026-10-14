import { useState } from 'react';
import { Server, Users, Trash2, Power, PowerOff  } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTranslation } from "react-i18next";

export function ServerManager() {
  const { t } = useTranslation();
  const { servers, activeServerId, switchServer, disconnect, removeServer, setShowAuthModal } = useAuth();
  const [showManager, setShowManager] = useState(false);

  if (servers.length === 0) {
    return (
      <Button onClick={() => setShowAuthModal(true)} variant="outline" size="sm">
        <Server className="w-4 h-4 mr-2" />
        {t("serverManager.addServer")}
      </Button>
    );
  }

  return (
    <Dialog open={showManager} onOpenChange={setShowManager}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Server className="w-4 h-4 mr-2" />
          {t("serverManager.servers", { count: servers.length })}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("serverManager.title")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {t("serverManager.description")}
            </p>
            <Button onClick={() => setShowAuthModal(true)} size="sm">
              <Server className="w-4 h-4 mr-2" />
              {t("serverManager.addServer")}
            </Button>
          </div>

          <div className="grid gap-4">
            {servers.map((server) => (
              <Card key={server.id} className={`border ${activeServerId === server.id ? 'border-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {server.serverInfo?.name || server.name}
                      {activeServerId === server.id && (
                        <Badge variant="default">{t("serverManager.active")}</Badge>
                      )}
                      <Badge variant={server.isConnected ? "default" : "secondary"}>
                        {server.isConnected ? t("serverManager.connected") : t("serverManager.disconnected")}
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      {server.isConnected && activeServerId !== server.id && (
                        <Button
                          onClick={() => {
                            switchServer(server.id);
                            setShowManager(false);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => disconnect(server.id)}
                        size="sm"
                        variant="outline"
                        disabled={!server.isConnected}
                      >
                        <PowerOff className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => removeServer(server.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("serverManager.apiEndpoint")}:</span>
                      <p className="font-mono truncate">{server.apiUrl}</p>
                    </div>
                    {server.serverInfo && (
                      <>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{t("serverManager.players", { count: server.serverInfo.players, max: server.serverInfo.maxPlayers })}</span>
                        </div>
                        {server.serverInfo.uptime && (
                          <div>
                            <span className="text-muted-foreground">{t("serverManager.uptime")}:</span>
                            <p>{server.serverInfo.uptime}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}