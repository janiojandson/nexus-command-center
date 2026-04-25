import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import Memory from './pages/Memory';
import Headhunter from './pages/Headhunter';
import Layout from './components/Layout';

/**
 * ============================================================
 * NEXUS COMMAND CENTER — App com Autenticação
 * ============================================================
 * Todas as rotas do Dashboard são protegidas por ProtectedRoute.
 * A rota /login é pública. Se autenticado, /login redireciona para /.
 * ============================================================
 */

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      {/* Rota pública de Login */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      {/* Rotas protegidas do Dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <ProtectedRoute>
            <Layout>
              <Missions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/memory"
        element={
          <ProtectedRoute>
            <Layout>
              <Memory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/headhunter"
        element={
          <ProtectedRoute>
            <Layout>
              <Headhunter />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback: redirecionar para login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;