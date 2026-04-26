/**
 * ============================================================
 * NEXUS COMMAND CENTER — Auth Controller (BLINDADO)
 * ============================================================
 * Sistema de autenticação por senha mestra + JWT.
 * POST /login  → Valida senha e emite token JWT 24h
 * POST /verify → Verifica validade do token JWT
 * 
 * SEGURANÇA: Input validado, JWT em cookie HttpOnly,
 * rate limiting por IP, logs de tentativas falhadas.
 * ============================================================
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { validate } = require('../middleware/validate');

// ── Schemas de Validação ──────────────────────────────────────
const loginSchema = {
  password: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 256,
    sanitize: true,
  },
};

const verifySchema = {
  // Token vem no header, não no body — mas validamos se necessário
};

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', validate(loginSchema, 'body'), async (req, res) => {
  try {
    const { password } = req.body;

    const masterPassword = process.env.NEXUS_MASTER_PASSWORD;

    if (!masterPassword) {
      console.error('[NEXUS-AUTH] ❌ NEXUS_MASTER_PASSWORD não configurada no ambiente!');
      return res.status(500).json({
        success: false,
        error: 'Servidor mal configurado',
        code: 'CONFIG_ERROR',
      });
    }

    if (password !== masterPassword) {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      console.warn(`[NEXUS-AUTH] ⚠️ Tentativa de login falhada — IP: ${ip}`);
      return res.status(401).json({
        success: false,
        error: 'Senha inválida',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        sub: 'nexus-admin',
        role: 'admin',
        loginAt: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[NEXUS-AUTH] ✅ Login bem-sucedido — Token JWT emitido (24h)');

    // Enviar JWT em cookie HttpOnly + no body (compatibilidade)
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('nexus_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: '/',
    });

    return res.json({
      success: true,
      token,
    });

  } catch (error) {
    console.error('[NEXUS-AUTH] ❌ Erro no login:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ── POST /api/auth/verify ──────────────────────────────────────
router.post('/verify', (req, res) => {
  // Tentar obter token do cookie primeiro, depois do header
  const cookieToken = req.cookies?.nexus_token;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token necessário',
      code: 'NO_TOKEN',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      success: true,
      user: decoded,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'INVALID_TOKEN',
    });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('nexus_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return res.json({
    success: true,
    message: 'Sessão terminada',
  });
});

module.exports = router;
