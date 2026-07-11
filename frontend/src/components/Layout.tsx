import { Outlet, NavLink, useNavigate } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/usuarios', label: 'Usuarios', adminOnly: true },
  { to: '/categorias', label: 'Categorias', adminOnly: true },
  { to: '/productos', label: 'Productos', adminOnly: true },
  { to: '/mesas', label: 'Mesas' },
  { to: '/cambiar-contrasena', label: 'Cambiar contraseña' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') ?? '{}') as {
    firstName?: string;
    lastName?: string;
    role?: string;
  };

  const visibleItems = navItems.filter((item) => !item.adminOnly || user.role === 'ADMIN');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Restaurante</h1>
          <p className="text-xs text-gray-400 mt-1">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Administrador' : 'Mesero'}</p>
        </div>
        <nav className="flex-1 p-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm mb-1 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full text-sm text-gray-400 hover:text-white text-left px-3 py-2 rounded hover:bg-gray-700"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
