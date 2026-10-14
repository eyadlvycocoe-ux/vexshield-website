import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { apiUrl, clearCsrfToken, fetchWithTimeout } from '@/lib/api-base';
import { clearSiteStaffCache } from '@/lib/site-staff-cache';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  email?: string;
  user_metadata?: any;
}

interface Session {
  user: User;
  provider_token?: string;
}

interface UserAuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  isBlacklisted: boolean;
  signOut: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

const SESSION_BOOT_TIMEOUT_MS = 1_800;

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextId = user?.id ? String(user.id) : null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== nextId) {
      clearSiteStaffCache();
    }
    prevUserIdRef.current = nextId;
  }, [user?.id]);

  const refreshBlacklistStatus = async (hasUser: boolean) => {
    if (!hasUser) {
      setIsBlacklisted(false);
      return;
    }
    try {
      const res = await fetchWithTimeout(
        apiUrl('/api/users/me/account-limit'),
        { credentials: 'include', cache: 'no-store' },
        8_000,
      );
      if (!res.ok) {
        setIsBlacklisted(false);
        return;
      }
      const body = (await res.json()) as { blacklisted?: boolean; limited?: boolean };
      setIsBlacklisted(!!body.blacklisted || !!body.limited);
    } catch {
      setIsBlacklisted(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Check for ?token= in URL parameter from Discord callback handoff
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      try {
        localStorage.setItem('sb-aircore-token', tokenParam);
      } catch { }
      // Clean URL bar
      urlParams.delete('token');
      const cleanSearch = urlParams.toString();
      const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const bootTimer = window.setTimeout(finishLoading, 8_000);

    const checkSession = async () => {
      try {
        const sessionResult = await supabase.auth.getSession();

        if (cancelled) return;

        const existingSession = sessionResult.data?.session ?? null;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        void refreshBlacklistStatus(!!existingSession?.user);
      } catch (e) {
        console.error('Session check failed', e);
        if (!cancelled) {
          setSession(null);
          setUser(null);
        }
      } finally {
        window.clearTimeout(bootTimer);
        finishLoading();
      }
    };

    void checkSession();

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
    };
  }, []);

  const signOut = async () => {
    clearSiteStaffCache();
    clearCsrfToken();
    try {
      localStorage.removeItem('sb-aircore-token');
      localStorage.removeItem('airshield_auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch { }
    try {
      await fetch(apiUrl('/api/auth/signout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch { }
    try {
      await supabase.auth.signOut();
    } catch { }
    setUser(null);
    setSession(null);
    toast.success(t('auth.logoutSuccess'));
    window.location.href = '/auth';
  };



  return (
    <UserAuthContext.Provider value={{ user, session, loading, isBlacklisted, signOut }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
}
