/**
 * ============================================================
 * NEXUS COMMAND CENTER — Auth Controller
 * ============================================================
 * Sistema de autenticação por senha mestra + JWT.
 * POST /login  → Valida senha e emite token JWT 24h
 * POST /verify → Verifica validade do token JWT
 * ============================================================
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Senha é obrigatória'
      });
    }

    const masterPassword = process.env.NEXUS_MASTER_PASSWORD;

    if (!masterPassword) {
      console.error('[NEXUS-AUTH] ❌ NEXUS_MASTER_PASSWORD não configurada no ambiente!');
      return res.status(500).json({
        success: false,
        error: 'Servidor mal configurado'
      });
    }

    if (password !== masterPassword) {
      // Log de tentativa falhada (sem revelar a senha)
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      console.warn(`[NEXUS-AUTH] ⚠️ Tentativa de login falhada — IP: ${ip}`);
      return res.status(401).json({
        success: false,
        error: 'Senha inválida'
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        role: 'admin',
        loginAt: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[NEXUS-AUTH] ✅ Login bem-sucedido — Token JWT emitido (24h)');

    return res.json({
      success: true,
      token
    });

  } catch (error) {
    console.error('[NEXUS-AUTH] ❌ Erro no login:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ── POST /api/auth/verify ──────────────────────────────────────
router.post('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token necessário'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      success: true,
      user: decoded
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
});

module.exports = router;