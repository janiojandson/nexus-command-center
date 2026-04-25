import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * ============================================================
 * NEXUS COMMAND CENTER — Tela de Login
 * ============================================================
 * Interface imersiva e moderna para autenticação por senha mestra.
 * Animações CSS nativas, gradientes dinâmicos, partículas de fundo.
 * ============================================================
 */

export default function Login() {
  const { login, isLoading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.1,
    }))
  );

  useEffect(() => {
    // Prevenir scroll na página de login
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(password);
      if (!result.success) {
        setError(result.error || 'Falha na autenticação');
        setPassword('');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Partículas animadas de fundo */}
      <div style={styles.particlesContainer}>
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              ...styles.particle,
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Grid de fundo */}
      <div style={styles.gridOverlay} />

      {/* Card de Login */}
      <div style={styles.loginCard}>
        {/* Logo / Ícone */}
        <div style={styles.logoContainer}>
          <div style={styles.logoRing}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#818cf8' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 style={styles.title}>NEXUS</h1>
        <p style={styles.subtitle}>Command Center</p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha Mestra</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Introduza a senha de acesso"
                style={{
                  ...styles.input,
                  borderColor: error ? '#ef4444' : 'rgba(129, 140, 248, 0.3)',
                }}
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: '6px' }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Botão de Login */}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              ...styles.loginButton,
              opacity: loading || !password ? 0.6 : 1,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={styles.spinner}>
                <span style={styles.spinnerDot} />
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Aceder ao Sistema
              </>
            )}
          </button>
        </form>

        {/* Rodapé */}
        <div style={styles.footer}>
          <span style={styles.footerDot} />
          Sistema Protegido • Acesso Restrito
        </div>
      </div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 30%, #16213e 60%, #0f0f1a 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  particlesContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #818cf8, transparent)',
    animation: 'nexusFloat 10s ease-in-out infinite',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(129, 140, 248, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(129, 140, 248, 0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  loginCard: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '420px',
    padding: '48px 40px',
    background: 'rgba(15, 15, 26, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(129, 140, 248, 0.15)',
    boxShadow: '0 0 60px rgba(129, 140, 248, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: '24px',
  },
  logoRing: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '2px solid rgba(129, 140, 248, 0.3)',
    background: 'rgba(129, 140, 248, 0.05)',
    animation: 'nexusPulse 3s ease-in-out infinite',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '0.2em',
    color: '#e0e7ff',
    margin: 0,
    lineHeight: 1,
  },
  subtitle: {
    fontSize: '0.85rem',
    fontWeight: 400,
    letterSpacing: '0.3em',
    color: '#818cf8',
    marginTop: '4px',
    marginBottom: '36px',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#94a3b8',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 16px',
    background: 'rgba(15, 15, 26, 0.6)',
    border: '1px solid rgba(129, 140, 248, 0.3)',
    borderRadius: '12px',
    color: '#e0e7ff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '4px',
  },
  errorBox: {
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#fca5a5',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
  },
  loginButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'nexusSpin 0.8s linear infinite',
  },
  spinnerDot: {
    display: 'none',
  },
  footer: {
    marginTop: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.7rem',
    color: '#475569',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  footerDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
  },
};