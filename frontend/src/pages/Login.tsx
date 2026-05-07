import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleDevLogin = async () => {
    try {
      const { token } = await api.get<{ token: string }>('/api/v1/auth/login');
      localStorage.setItem('dev_token', token);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Geostack</h1>
        <p className="text-gray-600 text-center mb-6">
          Geospatial Data Platform
        </p>
        <button
          onClick={login}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 mb-3"
        >
          Sign in with Keycloak
        </button>
        <button
          onClick={handleDevLogin}
          className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 text-sm"
        >
          Dev Mode Login (Skip Keycloak)
        </button>
      </div>
    </div>
  );
}
