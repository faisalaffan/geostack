import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Geostack</h1>
          <p className="text-sm text-gray-400">{user?.organizationName}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`
            }
          >
            Map Viewer
          </NavLink>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm">{user?.username}</p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-sm text-gray-400 hover:text-white mt-1"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
