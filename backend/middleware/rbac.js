/**
 * ============================================================
 * NEXUS COMMAND CENTER — Role-Based Access Control (RBAC)
 * ============================================================
 * Middleware de autorização baseada em roles.
 * Deve ser aplicado DEPOIS do authMiddleware (que define req.user).
 * 
 * Roles definidas:
 *   - admin: Acesso total (gestão de utilizadores, configuração)
 *   - operator: Operações de missões e agentes
 *   - viewer: Apenas leitura
 * 
 * Uso:
 *   router.delete('/:id', requireRole('admin'), controller);
 *   router.post('/', requireRole('admin', 'operator'), controller);
 * ============================================================
 */

const logger = require('../config/logger');

/**
 * Definição de roles e suas permissões.
 */
const ROLES = {
  admin: {
    level: 3,
    description: 'Acesso total ao sistema',
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_config'],
  },
  operator: {
    level: 2,
    description: 'Operações de missões e agentes',
    permissions: ['read', 'write', 'delete'],
  },
  viewer: {
    level: 1,
    description: 'Apenas leitura',
    permissions: ['read'],
  },
};

/**
 * Middleware que verifica se o utilizador autenticado tem uma das roles exigidas.
 * @param {...string} allowedRoles - Roles que têm acesso à rota
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Verificar se o utilizador está autenticado (authMiddleware já correu)
    if (!req.user) {
      logger.security('RBAC_FAIL_NO_USER', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Autenticação necessária',
        code: 'NO_AUTH',
      });
    }

    const userRole = req.user.role || 'viewer';
    const roleDefinition = ROLES[userRole];

    // Verificar se a role do utilizador existe
    if (!roleDefinition) {
      logger.security('RBAC_FAIL_INVALID_ROLE', {
        path: req.originalUrl,
        method: req.method,
        userRole,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        error: 'Role inválida',
        code: 'INVALID_ROLE',
      });
    }

    // Verificar se a role do utilizador está na lista de roles permitidas
    if (!allowedRoles.includes(userRole)) {
      logger.security('RBAC_FAIL_ACCESS_DENIED', {
        path: req.originalUrl,
        method: req.method,
        userRole,
        requiredRoles: allowedRoles,
        ip: req.ip,
        userId: req.user.sub || 'unknown',
      });
      return res.status(403).json({
        success: false,
        error: 'Acesso negado — permissões insuficientes',
        code: 'FORBIDDEN',
      });
    }

    // Acesso permitido
    logger.audit('RBAC_ACCESS_GRANTED', {
      path: req.originalUrl,
      method: req.method,
      userRole,
      userId: req.user.sub || 'unknown',
    });

    next();
  };
}

/**
 * Middleware que verifica se o utilizador tem uma permissão específica.
 * @param {string} permission - Permissão exigida
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticação necessária',
        code: 'NO_AUTH',
      });
    }

    const userRole = req.user.role || 'viewer';
    const roleDefinition = ROLES[userRole];

    if (!roleDefinition || !roleDefinition.permissions.includes(permission)) {
      logger.security('RBAC_FAIL_NO_PERMISSION', {
        path: req.originalUrl,
        method: req.method,
        userRole,
        requiredPermission: permission,
        userId: req.user.sub || 'unknown',
      });
      return res.status(403).json({
        success: false,
        error: 'Permissão insuficiente',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Middleware para rotas de apenas leitura (viewer+).
 */
const requireViewer = requireRole('admin', 'operator', 'viewer');

/**
 * Middleware para rotas de escrita (operator+).
 */
const requireOperator = requireRole('admin', 'operator');

/**
 * Middleware para rotas de administração (admin only).
 */
const requireAdmin = requireRole('admin');

module.exports = {
  requireRole,
  requirePermission,
  requireViewer,
  requireOperator,
  requireAdmin,
  ROLES,
};
