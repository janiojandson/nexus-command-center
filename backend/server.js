/**
 * ============================================================
 * NEXUS COMMAND CENTER — Servidor Principal (BLINDADO)
 * ============================================================
 * Entry point de produção. Stack de segurança completa:
 *   - Helmet (headers de segurança)
 *   - CORS restrito por whitelist
 *   - Rate Limiting
 *   - HTTPS Redirect (produção)
 *   - Cookie Parser (HttpOnly cookies)
 *   - Logger estruturado
 *   - Auth JWT + RBAC
 *   - Erro handler sem stack trace
 * ============================================================
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const httpsRedirect = require('./middleware/httpsRedirect');
const logger = require('./config/logger');
const routes = require('./routes');

dotenv.config();

const app = express();

// ── Trust Proxy (Railway/Heroku) ──────────────────────────────
app.set('trust proxy', 1);

// ── HTTPS Redirect (produção) ─────────────────────────────────
app.use(httpsRedirect);

// ── Helmet — Headers de Segurança ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 pedidos por janela por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── CORS Restrito ─────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  'https://nexus-command-center-production-0619.up.railway.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) return callback(null, true);
      logger.security('CORS_BLOCKED_NO_ORIGIN', { origin: 'none' });
      return callback(new Error('Origem não permitida'), false);
    }
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.security('CORS_BLOCKED', { origin });
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Middleware ──────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(limiter);

// ── Request Logger ─────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });
  next();
});

// ── Rotas da API ──────────────────────────────────────────────
app.use('/', routes);

// Rota de saúde (pública)
app.get('/health', async (req, res) => {
  const db = require('./config/database');
  const dbHealth = await db.healthCheck();
  
  res.json({
    status: dbHealth.ok ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'nexus-command-center',
    version: '2.1.0-secured',
    auth: 'JWT-enabled',
    rbac: 'role-based',
    database: dbHealth.ok ? 'connected' : 'disconnected',
    dbLatency: `${dbHealth.latency}ms`,
    poolMetrics: dbHealth.metrics,
  });
});

// ── Tratamento de erros global (SEM stack trace) ──────────────
app.use((err, req, res, next) => {
  const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log estruturado do erro (interno)
  logger.error('Unhandled error', {
    errorId,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.sub || 'anonymous',
    ip: req.ip,
  });

  // Resposta genérica ao cliente — ZERO stack trace
  res.status(err.status || 500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    errorId,
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────
const db = require('./config/database');

async function gracefulShutdown(signal) {
  logger.info(`Recebido ${signal}. Iniciando graceful shutdown...`);
  await db.closePool();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Iniciar Servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info('Nexus Command Center iniciado', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '2.1.0-secured',
  });
});

module.exports = app;
