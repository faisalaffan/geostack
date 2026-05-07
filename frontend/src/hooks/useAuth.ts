import { useState, useEffect, useCallback } from 'react';
import keycloak from '../lib/keycloak';
import { api } from '../lib/api';

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

  useEffect(() => {
    keycloak
      .init({ onLoad: 'check-sso', silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html' })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        if (authenticated && keycloak.token) {
          setToken(keycloak.token);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

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
