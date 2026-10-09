import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, AuthUser } from '../api/client';

const ACCESS_KEY = 'veritas.accessToken';
const REFRESH_KEY = 'veritas.refreshToken';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = async (tokens: TokenPair) => {
    await AsyncStorage.setMany({
      [ACCESS_KEY]: tokens.accessToken,
      [REFRESH_KEY]: tokens.refreshToken,
    });
    setAccessToken(tokens.accessToken);
    setUser(await apiRequest<AuthUser>('/users/me', { token: tokens.accessToken }));
  };

  /**
   * Access token 15 dakikada dolar. Uygulama acilisinda once mevcut token
   * denenir; reddedilirse refresh token ile yenilenir. Ikisi de gecersizse
   * oturum temizlenir - kullanici sonsuz hata ekraninda kalmaz.
   */
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getMany([ACCESS_KEY, REFRESH_KEY]);
        const access = stored[ACCESS_KEY];
        const refresh = stored[REFRESH_KEY];
        if (access) {
          try {
            setUser(await apiRequest<AuthUser>('/users/me', { token: access }));
            setAccessToken(access);
            return;
          } catch {
            // access token gecersiz, refresh denenecek
          }
        }
        if (refresh) {
          const tokens = await apiRequest<TokenPair>('/auth/refresh', {
            method: 'POST',
            token: refresh,
          });
          await persist(tokens);
          return;
        }
        await AsyncStorage.removeMany([ACCESS_KEY, REFRESH_KEY]);
      } catch {
        await AsyncStorage.removeMany([ACCESS_KEY, REFRESH_KEY]);
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      loading,
      login: async (email, password) => {
        const res = await apiRequest<{ tokens: TokenPair }>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        await persist(res.tokens);
      },
      register: async (email, username, password) => {
        const res = await apiRequest<{ tokens: TokenPair }>('/auth/register', {
          method: 'POST',
          body: { email, username, password },
        });
        await persist(res.tokens);
      },
      logout: async () => {
        await AsyncStorage.removeMany([ACCESS_KEY, REFRESH_KEY]);
        setUser(null);
        setAccessToken(null);
      },
    }),
    [user, accessToken, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
