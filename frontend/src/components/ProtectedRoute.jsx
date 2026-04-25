import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ============================================================
 * NEXUS COMMAND CENTER — Rota Protegida
 * ============================================================
 * Redireciona para /login se o utilizador não estiver autenticado.
 * Mostra spinner enquanto verifica o token.
 * ============================================================
 */

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Enquanto verifica o token existente, mostra loading
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f1a',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(129, 140, 248, 0.2)',
            borderTopColor: '#818cf8',
            borderRadius: '50%',
            animation: 'nexusSpin 0.8s linear infinite',
          }} />
          <span style={{ color: '#818cf8', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            VERIFICANDO ACESSO...
          </span>
        </div>
      </div>
    );
  }

  // Se não autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se autenticado, renderizar o conteúdo protegido
  return children;
}