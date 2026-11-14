import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setAccessToken, setSessionHandlers } from '../api/client';
import { authApi } from '../api/endpoints';
import type { Session, TokenResponse } from '../api/contracts';
import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './tokenStore';
import { hasPermission, hasAnyPermission, isStaffSession } from '../authorization/permissions';

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; session: Session };

type AuthValue = AuthState & {
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { fullName: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const anonymous = useCallback(async () => {
    setAccessToken(null);
    await clearRefreshToken().catch(() => undefined);
    setState({ status: 'anonymous' });
  }, []);

  /** Stores the new refresh token and loads the authorization context the server returns. */
  const adopt = useCallback(async (tokens: TokenResponse) => {
    await writeRefreshToken(tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    const session = await authApi.session();
    setState({ status: 'authenticated', session });
  }, []);

  const refreshAccess = useCallback(async (): Promise<string | null> => {
    const stored = await readRefreshToken();
    if (!stored) return null;
    try {
      const tokens = await authApi.refresh(stored);
      await writeRefreshToken(tokens.refreshToken);
      return tokens.accessToken;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setSessionHandlers({ refresh: refreshAccess, onSessionLost: () => void anonymous() });
    let alive = true;
    (async () => {
      const stored = await readRefreshToken().catch(() => null);
      if (!stored) {
        if (alive) setState({ status: 'anonymous' });
        return;
      }
      try {
        const tokens = await authApi.refresh(stored);
        if (alive) await adopt(tokens);
      } catch {
        if (alive) await anonymous();
      }
    })();
    return () => {
      alive = false;
      setSessionHandlers(null);
    };
  }, [adopt, anonymous, refreshAccess]);

  const login = useCallback(async (email: string, password: string) => {
    await adopt(await authApi.login(email.trim(), password));
  }, [adopt]);

  const register = useCallback(async (input: { fullName: string; email: string; phone?: string; password: string }) => {
    await adopt(await authApi.register(input));
  }, [adopt]);

  const logout = useCallback(async () => {
    const stored = await readRefreshToken().catch(() => null);
    if (stored) {
      // The server revokes the session even if this call fails; the local state is cleared regardless.
      await authApi.logout(stored).catch(() => undefined);
    }
    await anonymous();
  }, [anonymous]);

  const value = useMemo<AuthValue>(() => {
    const permissions = state.status === 'authenticated' ? state.session.permissions : [];
    return {
      ...state,
      hasPermission: (key) => hasPermission(permissions, key),
      hasAnyPermission: (keys) => hasAnyPermission(permissions, keys),
      isStaff: state.status === 'authenticated' && isStaffSession(state.session.roles),
      login,
      register,
      logout,
    };
  }, [state, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

