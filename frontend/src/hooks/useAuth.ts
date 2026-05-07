import { useState, useEffect, useCallback } from 'react';
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

export function useAuth(): AuthState {
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
      .catch(console.error)
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
  }, []);

  return { isAuthenticated, isLoading, user, token, login, logout };
}
