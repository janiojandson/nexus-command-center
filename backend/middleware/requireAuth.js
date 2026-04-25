/**
 * ============================================================
 * NEXUS COMMAND CENTER — Middleware de Autenticação Secundário
 * ============================================================
 * Versão standalone do middleware JWT para uso em rotas
 * que exigem autenticação explícita fora do router principal.
 * ============================================================
 */

const jwt = require('jsonwebtoken');
const { authMiddleware } = require('./auth');

/**
 * Middleware requireAuth — Verifica token JWT em rotas protegidas.
 * Diferença do authMiddleware: não tem lista de rotas públicas.
 * Sempre exige token, sem exceções.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token necessário para acesso protegido',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = { requireAuth, authMiddleware };