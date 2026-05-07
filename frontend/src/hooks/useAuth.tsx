import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import keycloak from '../lib/keycloak';
import { setApiToken } from '../lib/api';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  token: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const exchangeToken = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/login');
      const data = await res.json();
      const backendToken = data.token;
      setToken(backendToken);
      setApiToken(backendToken);
      return backendToken;
    } catch (err) {
      console.error('Token exchange failed:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    keycloak
      .init({ onLoad: 'check-sso', silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html' })
      .then(async (authenticated) => {
        setIsAuthenticated(authenticated);
        if (authenticated) {
          await exchangeToken();
        }
      })
      .catch((err) => {
        console.error('Keycloak init failed:', err);
      })
      .finally(() => setIsLoading(false));
  }, [exchangeToken]);

  const login = useCallback(() => {
    keycloak.login();
  }, []);

  const logout = useCallback(() => {
    keycloak.logout();
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setApiToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
