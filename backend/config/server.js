/**
 * ============================================================
 * NEXUS COMMAND CENTER — Configuração do Servidor Express
 * ============================================================
 * VERSÃO BLINDADA: CORS restrito, Helmet, Rate Limiting,
 * Auth Middleware, logs estruturados, erro sem stack trace.
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('../routes');
const authMiddleware = require('../middleware/auth');

const app = express();

// ── Trust Proxy (necessário para Railway/Heroku) ──────────────
app.set('trust proxy', 1);

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

// ── CORS Restrito por Whitelist ───────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Fallback para desenvolvimento local
const defaultOrigins = [
  'https://nexus-command-center-production-0619.up.railway.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

const corsOptions = {
  origin: function (origin, callback) {
    // Bloquear requests sem origin de fontes desconhecidas
    // (Postman/curl não enviam origin — permitimos apenas em dev)
    if (!origin) {
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) return callback(null, true);
      console.warn(`[NEXUS-CORS] ⚠️ Origem ausente bloqueada em produção — IP: ${origin}`);
      return callback(new Error('Origem não permitida'), false);
    }
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[NEXUS-CORS] ⚠️ Origem bloqueada: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

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

app.use(limiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Logs ──────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Auth Middleware — Rotas protegidas ─────────────────────────
// Rotas públicas primeiro
app.use('/api/auth', require('../controllers/authController'));

// Tudo abaixo de /api exige JWT
app.use('/api', authMiddleware);

// Rotas da API
app.use('/api', routes);

// ── Rota de Saúde (pública) ───────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    service: 'nexus-command-center',
    version: '2.0.0-secured',
  });
});

// ── Tratamento de Erros Global (SEM stack trace) ──────────────
app.use((err, req, res, next) => {
  // Log interno seguro (sem expor ao cliente)
  const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.error(`[NEXUS-ERROR] ID: ${errorId} | ${err.message}`);

  // Resposta genérica ao cliente — ZERO stack trace
  res.status(err.status || 500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    errorId,
  });
});

module.exports = app;
