import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ============================================================
 * NEXUS COMMAND CENTER — Layout com Autenticação
 * ============================================================
 * Navbar com indicador de sessão e botão de Logout.
 * ============================================================
 */

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/missions', label: 'Missões' },
    { path: '/memory', label: 'Memória' },
    { path: '/headhunter', label: 'Headhunter' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo + Nav */}
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600 hover:text-primary-700">
                Nexus Command Center
              </Link>
              <div className="hidden md:flex items-center ml-8 space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Sessão + Logout */}
            <div className="flex items-center space-x-4">
              {/* Indicador de sessão */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                <span className="hidden sm:inline">Sessão Ativa</span>
              </div>

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200"
                title="Terminar sessão"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}