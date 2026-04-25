const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');

dotenv.config();

const app = express();

// ── Rate Limiting ─────────────────────────────────────────────
// Limitar a 100 pedidos por 15 minutos por IP
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 pedidos por janela
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── CORS Restrito ─────────────────────────────────────────────
const allowedOrigins = [
  'https://nexus-command-center-production-0619.up.railway.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sem origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[NEXUS-CORS] ⚠️ Origem bloqueada: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Middleware ──────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(limiter);

// Headers de segurança adicionais
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Log de requisições
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const emoji = status < 400 ? '✅' : '❌';
    console.log(`[NEXUS] ${emoji} ${req.method} ${req.originalUrl} → ${status} (${duration}ms)`);
  });
  next();
});

// ── Rotas da API ──────────────────────────────────────────────
app.use('/', routes);

// Rota de saúde (pública)
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    service: 'nexus-command-center',
    version: '2.0.0-secured',
    auth: 'JWT-enabled',
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('[NEXUS] ❌ Erro não tratado:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR'
  });
});

// ── Iniciar Servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus Command Center operacional na porta ${PORT}`);
  console.log(`📋 12 endpoints ativos: Headhunter (4) | Hipocampo (4) | Missões (4)`);
  console.log(`🔐 Autenticação JWT ativa nas rotas /api/*`);
  console.log(`🛡️ CORS restrito | Rate limiting: 100 req/15min`);
});

module.exports = app;