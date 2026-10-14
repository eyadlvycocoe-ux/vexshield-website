import { useState } from 'react';
import { Shield, Loader2, AlertCircle  } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, addServer } = useAuth();
  const [licenseKey, setLicenseKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter your license key');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Auto-generate server name from license key prefix
      const serverName = `Server-${licenseKey.substring(0, 8)}`;
      const success = await addServer(serverName, '', licenseKey);
      if (success) {
        setShowAuthModal(false);
        setLicenseKey('');
      } else {
        setError('Invalid license key or connection failed');
      }
    } catch (error) {
      setError('Connection failed. Please check your license key.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
      <DialogContent className="sm:max-w-md bg-waves border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-wave">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center wave-pulse">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            VexShield Authentication
          </DialogTitle>
          <p className="text-muted-foreground mt-2">
            Connect to your anticheat system with your license key
          </p>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <Label htmlFor="licenseKey" className="text-sm font-medium">License Key</Label>
            <div className="relative">
              <Input
                id="licenseKey"
                type="password"
                placeholder="Enter your VexShield license key"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                disabled={isConnecting}
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                className="pr-12 h-12 bg-card/50 border-primary/20 focus:border-primary/60 transition-all duration-300"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAuthModal(false)}
              disabled={isConnecting}
              className="flex-1 h-12 border-border/50 hover:border-primary/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !licenseKey.trim()}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 wave-shimmer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Your license key is encrypted and stored securely</p>
            <p>Connection will be cleared when you leave the site</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}