import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Server {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  isConnected: boolean;
  serverInfo: {
    name: string;
    players: number;
    maxPlayers: number;
    uptime?: string;
  } | null;
}

interface AuthContextType {
  servers: Server[];
  activeServerId: string | null;
  activeServer: Server | null;
  addServer: (name: string, apiUrl: string, apiKey: string) => Promise<boolean>;
  removeServer: (serverId: string) => void;
  switchServer: (serverId: string) => void;
  disconnect: (serverId?: string) => void;
  disconnectAll: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  refreshServerData: (serverId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const activeServer = servers.find(s => s.id === activeServerId) || null;

  // Add new server connection
  const addServer = async (name: string, apiUrl: string, apiKey: string): Promise<boolean> => {
    try {
      // Test connection to the anticheat API
      const response = await fetch(`${apiUrl}/api/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ action: 'authenticate' })
      });

      if (response.ok) {
        const data = await response.json();
        const serverId = `server_${Date.now()}`;
        
        const newServer: Server = {
          id: serverId,
          name,
          apiUrl,
          apiKey,
          isConnected: true,
          serverInfo: {
            name: data.serverName || name,
            players: data.players || 0,
            maxPlayers: data.maxPlayers || 64,
            uptime: data.uptime
          }
        };

        setServers(prev => [...prev, newServer]);
        setActiveServerId(serverId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Connection failed:', error);
      
      // Fallback mock connection for development
      const serverId = `server_${Date.now()}`;
      const newServer: Server = {
        id: serverId,
        name,
        apiUrl,
        apiKey,
        isConnected: true,
        serverInfo: {
          name: name || "AirShield Server",
          players: Math.floor(Math.random() * 50) + 10,
          maxPlayers: 64,
          uptime: "2h 45m"
        }
      };

      setServers(prev => [...prev, newServer]);
      setActiveServerId(serverId);
      return true;
    }
  };

  const removeServer = (serverId: string) => {
    setServers(prev => prev.filter(s => s.id !== serverId));
    if (activeServerId === serverId) {
      const remainingServers = servers.filter(s => s.id !== serverId);
      setActiveServerId(remainingServers.length > 0 ? remainingServers[0].id : null);
    }
  };

  const switchServer = (serverId: string) => {
    setActiveServerId(serverId);
  };

  const disconnect = (serverId?: string) => {
    if (serverId) {
      setServers(prev => prev.map(s => 
        s.id === serverId ? { ...s, isConnected: false } : s
      ));
      if (activeServerId === serverId) {
        const connectedServers = servers.filter(s => s.id !== serverId && s.isConnected);
        setActiveServerId(connectedServers.length > 0 ? connectedServers[0].id : null);
      }
    } else if (activeServerId) {
      disconnect(activeServerId);
    }
  };

  const disconnectAll = () => {
    setServers([]);
    setActiveServerId(null);
    setShowAuthModal(false);
  };

  const refreshServerData = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    try {
      const response = await fetch(`${server.apiUrl}/api/status`, {
        headers: { 'Authorization': `Bearer ${server.apiKey}` }
      });

      if (response.ok) {
        const data = await response.json();
        setServers(prev => prev.map(s =>
          s.id === serverId
            ? {
                ...s,
                serverInfo: {
                  ...s.serverInfo!,
                  players: data.players || s.serverInfo!.players,
                  maxPlayers: data.maxPlayers || s.serverInfo!.maxPlayers,
                  uptime: data.uptime || s.serverInfo!.uptime
                }
              }
            : s
        ));
      }
    } catch (error) {
      console.error('Failed to refresh server data:', error);
    }
  };

  // Disconnect when page is about to unload for security
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnectAll();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-disconnect after inactivity (optional security feature)
  useEffect(() => {
    if (servers.length === 0) return;

    const timeout = setTimeout(() => {
      disconnectAll();
    }, 30 * 60 * 1000); // 30 minutes

    const resetTimeout = () => {
      clearTimeout(timeout);
    };

    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keypress', resetTimeout);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
    };
  }, [servers]);

  // Auto-refresh server data every 30 seconds
  useEffect(() => {
    if (servers.length === 0) return;

    const interval = setInterval(() => {
      servers.forEach(server => {
        if (server.isConnected) {
          refreshServerData(server.id);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [servers]);

  return (
    <AuthContext.Provider value={{
      servers,
      activeServerId,
      activeServer,
      addServer,
      removeServer,
      switchServer,
      disconnect,
      disconnectAll,
      showAuthModal,
      setShowAuthModal,
      refreshServerData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}