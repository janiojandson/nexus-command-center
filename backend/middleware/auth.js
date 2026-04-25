/**
 * ============================================================
 * NEXUS COMMAND CENTER — Middleware de Autenticação JWT
 * ============================================================
 * Verifica o token JWT no header Authorization: Bearer <token>
 * Aplica-se antes das rotas protegidas da API.
 * Rotas públicas: /api/auth/*, /health
 * ============================================================
 */

const jwt = require('jsonwebtoken');

// Rotas que NÃO exigem autenticação
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/verify',
  '/health',
];

function authMiddleware(req, res, next) {
  // Verificar se a rota é pública
  if (PUBLIC_ROUTES.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Verificar se a rota é de API (apenas APIs precisam de JWT)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Extrair token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.warn(`[NEXUS-AUTH] ⚠️ Token rejeitado: Token ausente — IP: ${req.ip}, Path: ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação necessário',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const userId = req.user.sub || req.user.id || 'desconhecido';
    console.log(`[NEXUS-AUTH] ✅ Token válido para user: ${userId} — IP: ${req.ip}, Path: ${req.path}`);

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn(`[NEXUS-AUTH] ⚠️ Token rejeitado: EXPIRADO — IP: ${req.ip}, Path: ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'Token expirado — faça login novamente',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.warn(`[NEXUS-AUTH] ⚠️ Token rejeitado: INVÁLIDO — IP: ${req.ip}, Path: ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
}

// Default export (compatibilidade com código existente)
module.exports = authMiddleware;
// Named export (para importação desestruturada)
module.exports.authMiddleware = authMiddleware;