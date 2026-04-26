/**
 * ============================================================
 * NEXUS COMMAND CENTER — Testes de Autenticação
 * ============================================================
 * Testa: Login, Verify, Logout, Tokens expirados, RBAC
 * ============================================================
 */

// Mock das dependências
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue({ ok: true, latency: 1 }),
  getPoolMetrics: jest.fn().mockReturnValue({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
  closePool: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const { validate } = require('../middleware/validate');
const { requireRole, requireAdmin, requireOperator, requireViewer } = require('../middleware/rbac');

// ── Testes do Middleware de Validação ──────────────────────────

describe('Middleware de Validação', () => {
  
  test('deve rejeitar campo obrigatório em falta', () => {
    const schema = { password: { type: 'string', required: true } };
    const middleware = validate(schema, 'body');
    
    const req = { body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'VALIDATION_ERROR',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('deve aceitar campo válido', () => {
    const schema = { password: { type: 'string', required: true, minLength: 1 } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { password: 'minha-senha-segura' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('deve rejeitar string demasiado curta', () => {
    const schema = { name: { type: 'string', required: true, minLength: 3 } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { name: 'ab' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deve rejeitar string demasiado longa', () => {
    const schema = { name: { type: 'string', required: true, maxLength: 10 } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { name: 'a'.repeat(11) } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deve rejeitar valor fora do enum', () => {
    const schema = { priority: { type: 'string', enum: ['low', 'medium', 'high'] } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { priority: 'extreme' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deve aceitar valor dentro do enum', () => {
    const schema = { priority: { type: 'string', enum: ['low', 'medium', 'high'] } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { priority: 'high' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  test('deve rejeitar número fora do intervalo', () => {
    const schema = { rating: { type: 'number', min: 0, max: 5 } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { rating: 10 } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deve sanitizar tags HTML do input', () => {
    const schema = { name: { type: 'string', required: true, sanitize: true } };
    const middleware = validate(schema, 'body');
    
    const req = { body: { name: '<script>alert("xss")</script>Test' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.body.name).not.toContain('<script>');
  });
});

// ── Testes do Middleware RBAC ──────────────────────────────────

describe('Middleware RBAC', () => {
  
  test('requireAdmin deve bloquear utilizador não-admin', () => {
    const middleware = requireAdmin;
    
    const req = { user: { role: 'viewer', sub: 'user1' }, ip: '127.0.0.1', originalUrl: '/api/test', method: 'DELETE' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('requireAdmin deve permitir admin', () => {
    const middleware = requireAdmin;
    
    const req = { user: { role: 'admin', sub: 'admin1' }, ip: '127.0.0.1', originalUrl: '/api/test', method: 'DELETE' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  test('requireOperator deve bloquear viewer', () => {
    const middleware = requireOperator;
    
    const req = { user: { role: 'viewer', sub: 'user1' }, ip: '127.0.0.1', originalUrl: '/api/test', method: 'POST' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('requireOperator deve permitir operator', () => {
    const middleware = requireOperator;
    
    const req = { user: { role: 'operator', sub: 'op1' }, ip: '127.0.0.1', originalUrl: '/api/test', method: 'POST' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  test('requireViewer deve permitir todos os roles', () => {
    const middleware = requireViewer;
    
    for (const role of ['admin', 'operator', 'viewer']) {
      const req = { user: { role, sub: 'user1' }, ip: '127.0.0.1', originalUrl: '/api/test', method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();
      
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  test('deve bloquear utilizador sem autenticação', () => {
    const middleware = requireAdmin;
    
    const req = { ip: '127.0.0.1', originalUrl: '/api/test', method: 'DELETE' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ── Testes do Auth Middleware JWT ──────────────────────────────

describe('Auth Middleware JWT', () => {
  const authMiddleware = require('../middleware/auth');

  test('deve rejeitar pedido sem token', () => {
    const req = {
      path: '/api/test',
      headers: {},
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NO_TOKEN' })
    );
  });

  test('deve aceitar token válido', () => {
    const decoded = { sub: 'admin1', role: 'admin' };
    jwt.verify.mockReturnValue(decoded);
    
    const req = {
      path: '/api/test',
      headers: { authorization: 'Bearer valid-token' },
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(decoded);
  });

  test('deve rejeitar token expirado', () => {
    const error = new Error('Token expired');
    error.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => { throw error; });
    
    const req = {
      path: '/api/test',
      headers: { authorization: 'Bearer expired-token' },
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' })
    );
  });

  test('deve rejeitar token inválido', () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
    
    const req = {
      path: '/api/test',
      headers: { authorization: 'Bearer invalid-token' },
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
  });

  test('deve permitir rotas públicas sem token', () => {
    const req = {
      path: '/api/auth/login',
      headers: {},
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });
});
