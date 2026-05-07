import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthGuard } from './components/shared/AuthGuard';
import { Layout } from './components/shared/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DatasetDetail } from './pages/DatasetDetail';
import { MapView } from './pages/MapView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/datasets/:id" element={<DatasetDetail />} />
          <Route path="/map" element={<MapView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
