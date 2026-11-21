import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { endpoints, http, removeToken, restoreToken, saveToken } from '@/src/api/client';

export type MobileUser = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  profile_completed?: boolean;
  subscription_status?: string | null;
};

type AuthValue = {
  user: MobileUser | null;
  loading: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, string>) => Promise<void>;
  signOut: () => Promise<void>;
  /** Forget the local session without calling the API (e.g. after the account was deleted). */
  clearSession: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadUser = useCallback(async () => {
    const { data } = await http.get(endpoints.auth.me);
    setUser(data);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await http.post(endpoints.auth.login, { email: email.trim(), password });
    await saveToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: Record<string, string>) => {
    const { data } = await http.post(endpoints.auth.register, payload);
    await saveToken(data.token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    try { await http.post(endpoints.auth.logout); } finally {
      await removeToken();
      setUser(null);
    }
  }, []);

  const clearSession = useCallback(async () => {
    await removeToken();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    const expired = DeviceEventEmitter.addListener('mobile:session-expired', () => setUser(null));
    restoreToken()
      .then(async (token) => {
        if (token) await reloadUser();
      })
      .catch(async () => { await removeToken(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; expired.remove(); };
  }, [reloadUser]);

  const value = useMemo(() => ({ user, loading, signedIn: Boolean(user), signIn, register, signOut, clearSession, reloadUser }),
    [user, loading, signIn, register, signOut, clearSession, reloadUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé sous AuthProvider.');
  return value;
}
