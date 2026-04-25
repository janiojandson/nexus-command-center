import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar token existente ao montar
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await axios.post('/api/auth/verify', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('nexus_token');
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem('nexus_token');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password) => {
    try {
      const response = await axios.post('/api/auth/login', { password });
      if (response.data.success) {
        localStorage.setItem('nexus_token', response.data.token);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (error) {
      const msg = error.response?.data?.error || 'Erro de conexão com o servidor';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('nexus_token');
    setIsAuthenticated(false);
  };

  const getToken = () => localStorage.getItem('nexus_token');

  const value = { isAuthenticated, isLoading, login, logout, getToken };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;