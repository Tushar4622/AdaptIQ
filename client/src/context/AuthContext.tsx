import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, {
  getAccessToken,
  getCsrfHeaders,
  refreshAccessToken,
  resetCsrfToken,
  setAccessToken,
} from '@/lib/api';
import { toast } from '@/components/ui';
import type { User, AwardedBadge } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthFlowResult>;
  register: (data: RegisterData) => Promise<AuthFlowResult>;
  startMfaSetup: (setupToken: string) => Promise<MfaSetupData>;
  verifyMfaSetup: (setupToken: string, code: string) => Promise<MfaSetupCompletion>;
  completeMfaSetup: (session: MfaSetupCompletion['session']) => void;
  verifyMfa: (
    challengeToken: string,
    credentials: { code?: string; recoveryCode?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher';
  institution?: string;
}

export type AuthFlowResult =
  | { status: 'authenticated' }
  | { status: 'mfa_required'; challengeToken: string }
  | { status: 'mfa_setup_required'; setupToken: string };

export interface MfaSetupData {
  secret: string;
  otpauthUri: string;
  expiresIn: number;
}

export interface MfaSetupCompletion {
  recoveryCodes: string[];
  session: { token: string; user: User };
}

interface AuthResponse {
  token?: string;
  user?: User;
  mfaRequired?: boolean;
  challengeToken?: string;
  mfaSetupRequired?: boolean;
  setupToken?: string;
  recoveryCodes?: string[];
  awardedBadges?: AwardedBadge[];
}

const showAwardedBadgeToasts = (badges: AwardedBadge[] = []) => {
  badges.forEach((badge) => {
    toast(`🏅 Badge earned: ${badge.icon ? `${badge.icon} ` : ''}${badge.name}`, 'success');
  });
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = getAccessToken() || await refreshAccessToken();
      const { data } = await api.get('/users/me');
      setState({ user: data.user, token, isLoading: false, isAuthenticated: true });
    } catch {
      setAccessToken(null);
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);

  const acceptAuthenticatedSession = useCallback((data: AuthResponse) => {
    if (!data.token || !data.user) throw new Error('Authentication response is incomplete.');
    resetCsrfToken();
    setAccessToken(data.token);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setState({
      user: data.user,
      token: data.token,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const login = async (email: string, password: string): Promise<AuthFlowResult> => {
    const { data } = await api.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { headers: { 'X-Auth-Token-Mode': 'cookie' } }
    );

    if (data.mfaSetupRequired && data.setupToken) {
      setAccessToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return { status: 'mfa_setup_required', setupToken: data.setupToken };
    }
    if (data.mfaRequired && data.challengeToken) {
      setAccessToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return { status: 'mfa_required', challengeToken: data.challengeToken };
    }
    acceptAuthenticatedSession(data);

    showAwardedBadgeToasts(Array.isArray(data.awardedBadges) ? data.awardedBadges : []);
    return { status: 'authenticated' };
  };

  const register = async (formData: RegisterData): Promise<AuthFlowResult> => {
    const { data } = await api.post<AuthResponse>('/auth/register', formData, {
      headers: { 'X-Auth-Token-Mode': 'cookie' },
    });

    if (data.mfaSetupRequired && data.setupToken) {
      setAccessToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return { status: 'mfa_setup_required', setupToken: data.setupToken };
    }
    acceptAuthenticatedSession(data);
    return { status: 'authenticated' };
  };

  const startMfaSetup = useCallback(async (setupToken: string) => {
    const { data } = await api.post<MfaSetupData>(
      '/auth/mfa/setup',
      { setupToken },
      { headers: await getCsrfHeaders() }
    );
    return data;
  }, []);

  const verifyMfaSetup = useCallback(async (setupToken: string, code: string) => {
    const { data } = await api.post<AuthResponse>(
      '/auth/mfa/verify-setup',
      { setupToken, code },
      { headers: { ...await getCsrfHeaders(), 'X-Auth-Token-Mode': 'cookie' } }
    );
    if (!data.token || !data.user) throw new Error('Authentication response is incomplete.');
    return {
      recoveryCodes: data.recoveryCodes || [],
      session: { token: data.token, user: data.user },
    };
  }, []);

  const completeMfaSetup = useCallback((session: MfaSetupCompletion['session']) => {
    acceptAuthenticatedSession(session);
  }, [acceptAuthenticatedSession]);

  const verifyMfa = useCallback(async (
    challengeToken: string,
    credentials: { code?: string; recoveryCode?: string }
  ) => {
    const { data } = await api.post<AuthResponse>(
      '/auth/mfa/verify',
      { challengeToken, ...credentials },
      { headers: { ...await getCsrfHeaders(), 'X-Auth-Token-Mode': 'cookie' } }
    );
    acceptAuthenticatedSession(data);
    showAwardedBadgeToasts(Array.isArray(data.awardedBadges) ? data.awardedBadges : []);
  }, [acceptAuthenticatedSession]);

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: await getCsrfHeaders() });
    } catch {
      toast(
        'The server could not revoke this session. Please try signing out again when online.',
        'error'
      );
    }
    setAccessToken(null);
    resetCsrfToken();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  };

  const updateUser = (updates: Partial<User>) => {
    setState((s) => s.user ? { ...s, user: { ...s.user, ...updates } } : s);
  };

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      startMfaSetup,
      verifyMfaSetup,
      completeMfaSetup,
      verifyMfa,
      logout,
      refreshUser,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
