/**
 * ============================================================
 * NEXUS V3 CORE — Entry Point Híbrido (BLINDADO)
 * ============================================================
 * Arquitectura dual:
 *   - WhatsApp (Baileys): Recebe mensagens do chat
 *   - Web (Express): Endpoints REST + Webhooks do Command Center
 *
 * O cérebro do Nexus é ACIONADO por ambos os canais,
 * desacoplando a lógica do transporte.
 *
 * INTEGRAÇÃO COM NEXUS COMMAND CENTER:
 *   - POST /nexus/v1/chat      → Processa mensagem via cérebro
 *   - POST /nexus/v1/webhook   → Recebe eventos do Command Center
 *   - GET  /nexus/v1/health    → Health check do core
 *   - GET  /nexus/v1/metrics   → Métricas do keyRotator + cérebro
 *   - GET  /nexus/v1/sessions  → Sessões activas
 *   - DELETE /nexus/v1/session/:id → Reset de sessão
 *
 * VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
 *   - NEXUS_CC_URL       → URL do Nexus Command Center (ex: https://nexus-command-center.up.railway.app)
 *   - NEXUS_CC_JWT       → Token JWT para autenticar no Command Center
 *   - NEXUS_CORE_PORT    → Porta do servidor Express do core (default: 3100)
 *   - NEXUS_MASTER_PASSWORD → Senha mestra para autenticação local
 *   - OPENROUTER_KEY_1..5   → Chaves OpenRouter
 *   - NVIDIA_NIM_KEY_1..5   → Chaves NVIDIA NIM
 *   - ROUTEWAY_KEY_1..5     → Chaves Routeway
 *   - VIP_OPENROUTER_KEY_1..2 → Chaves VIP OpenRouter
 *   - VIP_NVIDIA_NIM_KEY_1..2 → Chaves VIP NVIDIA NIM
 * ============================================================
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const keyRotator = require('./keyRotator');
const cerebro = require('./cerebro');

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  port: parseInt(process.env.NEXUS_CORE_PORT) || 3100,
  ccUrl: process.env.NEXUS_CC_URL || 'https://nexus-command-center.up.railway.app',
  ccJwt: process.env.NEXUS_CC_JWT || '',
  masterPassword: process.env.NEXUS_MASTER_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || 'nexus-v3-core-secret-change-me',
  nodeEnv: process.env.NODE_ENV || 'development',
  maxRequestSize: '1mb',
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMax: 200,
};

// ═══════════════════════════════════════════════════════════════
// INJEÇÃO DO ARSENAL — Ligar ferramentas reais ao cérebro
// ═══════════════════════════════════════════════════════════════

function initializeArsenal() {
  cerebro.injectArsenal({
    /**
     * githubScraper — Lê ficheiros de repositórios GitHub
     * Usa a API pública do GitHub (sem token para públicos, com token para privados)
     */
    githubScraper: async (params) => {
      const { owner, repo, path } = params;
      if (!owner || !repo) {
        return { error: 'Parâmetros obrigatórios: owner, repo' };
      }

      const githubToken = process.env.GITHUB_TOKEN;
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-V3-Core',
      };
      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
      }

      const url = path
        ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
        : `https://api.github.com/repos/${owner}/${repo}/contents`;

      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return { error: `GitHub API ${response.status}: ${errorText}`, status: response.status };
        }
        const data = await response.json();

        // Se for um ficheiro, decodificar conteúdo
        if (data.type === 'file' && data.content) {
          return {
            type: 'file',
            name: data.name,
            path: data.path,
            content: Buffer.from(data.content, 'base64').toString('utf-8'),
            size: data.size,
          };
        }

        // Se for um diretório, listar entradas
        if (Array.isArray(data)) {
          return {
            type: 'directory',
            entries: data.map(entry => ({
              name: entry.name,
              path: entry.path,
              type: entry.type,
              size: entry.size,
            })),
          };
        }

        return data;
      } catch (err) {
        return { error: `Falha ao raspar GitHub: ${err.message}` };
      }
    },

    /**
     * githubEditor — Cria ou edita ficheiros num repositório GitHub
     * Requer GITHUB_TOKEN com permissões de escrita
     */
    githubEditor: async (params) => {
      const { repo, filePath, content, commitMessage } = params;
      if (!repo || !filePath || !content) {
        return { error: 'Parâmetros obrigatórios: repo, filePath, content' };
      }

      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        return { error: 'GITHUB_TOKEN não configurado — edição impossível' };
      }

      const owner = process.env.GITHUB_OWNER || 'janiojandson';
      const message = commitMessage || `nexus-core: update ${filePath}`;
      const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      try {
        // Verificar se o ficheiro já existe (para obter o SHA)
        let sha = null;
        const checkResponse = await fetch(apiBase, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Nexus-V3-Core',
          },
        });

        if (checkResponse.ok) {
          const existingFile = await checkResponse.json();
          sha = existingFile.sha;
        }

        // Criar ou atualizar ficheiro
        const body = {
          message,
          content: Buffer.from(content).toString('base64'),
          ...(sha ? { sha } : {}),
        };

        const method = sha ? 'PUT' : 'PUT'; // GitHub usa PUT para ambos
        const response = await fetch(apiBase, {
          method,
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Nexus-V3-Core',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return { error: `GitHub API ${response.status}: ${errorText}`, status: response.status };
        }

        const result = await response.json();
        return {
          success: true,
          action: sha ? 'updated' : 'created',
          path: result.content?.path || filePath,
          sha: result.content?.sha,
          url: result.content?.html_url,
        };
      } catch (err) {
        return { error: `Falha ao editar GitHub: ${err.message}` };
      }
    },

    /**
     * memoryRetriever — Consulta a memória vetorial do Command Center
     * Faz chamada à API /api/hipocampo/memories do backend web
     */
    memoryRetriever: async (params) => {
      const { query: searchQuery } = params;
      if (!searchQuery) {
        return { error: 'Parâmetro obrigatório: query' };
      }

      try {
        const url = `${CONFIG.ccUrl}/api/hipocampo/memories?search=${encodeURIComponent(searchQuery)}&limit=5`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${CONFIG.ccJwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return { error: `Command Center API ${response.status}`, memories: [] };
        }

        const data = await response.json();
        return data.memories || data.data || data || [];
      } catch (err) {
        return { error: `Falha ao recuperar memórias: ${err.message}`, memories: [] };
      }
    },

    /**
     * memoryStore — Armazena conhecimento na memória vetorial do Command Center
     * Faz chamada POST à API /api/hipocampo/memories do backend web
     */
    memoryStore: async (params) => {
      const { agentName, query: queryText, response: responseText, metadata } = params;
      if (!agentName || !queryText || !responseText) {
        return { error: 'Parâmetros obrigatórios: agentName, query, response' };
      }

      try {
        const url = `${CONFIG.ccUrl}/api/hipocampo/memories`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CONFIG.ccJwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_name: agentName,
            query: queryText,
            response: responseText,
            metadata: metadata || {},
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return { error: `Command Center API ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        return { success: true, id: data.data?.id || data.id };
      } catch (err) {
        return { error: `Falha ao armazenar memória: ${err.message}` };
      }
    },

    /**
     * commandCenterAPI — Chamadas genéricas à API do Command Center
     * Permite ao cérebro interagir com missões, agentes e métricas
     */
    commandCenterAPI: async (params) => {
      const { endpoint, method, body, token } = params;
      if (!endpoint) {
        return { error: 'Parâmetro obrigatório: endpoint' };
      }

      const authToken = token || CONFIG.ccJwt;
      const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.ccUrl}${endpoint}`;

      try {
        const fetchOptions = {
          method: method || 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        };

        if (body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return { error: `API ${response.status}: ${errorText}`, status: response.status };
        }

        const data = await response.json();
        return data;
      } catch (err) {
        return { error: `Falha na chamada ao Command Center: ${err.message}` };
      }
    },
  });

  console.log('[NEXUS-CORE] ✅ Arsenal inicializado e injetado no cérebro');
}

// ═══════════════════════════════════════════════════════════════
// SERVIDOR EXPRESS — Bridge Web para o Cérebro
// ═══════════════════════════════════════════════════════════════

const app = express();

// ── Segurança ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    CONFIG.ccUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3100',
  ],
  credentials: true,
}));
app.use(express.json({ limit: CONFIG.maxRequestSize }));

// ── Rate Limiting simples (em memória) ─────────────────────────
const requestCounts = new Map();
setInterval(() => requestCounts.clear(), CONFIG.rateLimitWindowMs);

function simpleRateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > CONFIG.rateLimitMax) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit excedido',
      code: 'RATE_LIMITED',
    });
  }
  next();
}

app.use(simpleRateLimit);

// ═══════════════════════════════════════════════════════════════
// AUTENTICAÇÃO LOCAL — JWT ou Senha Mestra
// ═══════════════════════════════════════════════════════════════

function authenticateCore(req, res, next) {
  // Health check é público
  if (req.path === '/nexus/v1/health') return next();

  // Verificar JWT no header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, CONFIG.jwtSecret);
      req.user = decoded;
      return next();
    } catch {
      // Token inválido, tentar senha mestra
    }
  }

  // Verificar senha mestra no header X-Nexus-Key
  const nexusKey = req.headers['x-nexus-key'];
  if (nexusKey && nexusKey === CONFIG.masterPassword) {
    req.user = { sub: 'nexus-master', role: 'admin' };
    return next();
  }

  // Verificar senha no body (para webhooks do Command Center)
  if (req.body?._nexusKey && req.body._nexusKey === CONFIG.masterPassword) {
    req.user = { sub: 'nexus-cc', role: 'operator' };
    delete req.body._nexusKey;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Autenticação necessária (JWT, X-Nexus-Key ou _nexusKey)',
    code: 'NO_AUTH',
  });
}

app.use(authenticateCore);

// ═══════════════════════════════════════════════════════════════
// ROTAS DA API — Core V3
// ═══════════════════════════════════════════════════════════════

// ── Health Check ───────────────────────────────────────────────
app.get('/nexus/v1/health', (req, res) => {
  const rotatorHealth = keyRotator.getHealthStatus();
  const uptime = process.uptime();

  res.json({
    status: rotatorHealth.status === 'HEALTHY' ? 'NEXUS_ONLINE' : 'NEXUS_DEGRADED',
    version: '3.0.0',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    timestamp: new Date().toISOString(),
    rotator: rotatorHealth,
    memory: process.memoryUsage ? {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    } : null,
  });
});

// ── Chat — Processar mensagem via cérebro ──────────────────────
app.post('/nexus/v1/chat', async (req, res) => {
  try {
    const { sessionId, message, options } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Campo "message" é obrigatório',
        code: 'MISSING_MESSAGE',
      });
    }

    // Se não houver sessionId, gerar um baseado no IP + timestamp
    const sid = sessionId || `web_${req.ip}_${Date.now()}`;

    const result = await cerebro.processCerebroLoop(sid, message, options || {});

    return res.json({
      success: result.success,
      response: result.response,
      model: result.model,
      tier: result.tier,
      actions: result.actions?.map(a => ({ tool: a.tool, success: a.success })),
      metrics: result.metrics,
    });
  } catch (err) {
    console.error('[NEXUS-CORE] ❌ Erro no /chat:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do processamento',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ── Webhook — Receber eventos do Command Center ────────────────
app.post('/nexus/v1/webhook', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.type) {
      return res.status(400).json({
        success: false,
        error: 'Payload deve conter campo "type"',
        code: 'INVALID_PAYLOAD',
      });
    }

    // Processar webhook de forma assíncrona (não bloquear resposta)
    const result = await cerebro.processWebhook(payload);

    return res.json({
      success: result.success,
      response: result.response?.slice(0, 500), // Truncar para não sobrecarregar
      model: result.model,
      tier: result.tier,
      metrics: result.metrics,
    });
  } catch (err) {
    console.error('[NEXUS-CORE] ❌ Erro no /webhook:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no processamento do webhook',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ── Métricas ──────────────────────────────────────────────────
app.get('/nexus/v1/metrics', (req, res) => {
  const rotatorMetrics = keyRotator.getMetrics();
  const rotatorHealth = keyRotator.getHealthStatus();

  res.json({
    success: true,
    keyRotator: rotatorMetrics,
    health: rotatorHealth,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Sessões Activas ────────────────────────────────────────────
app.get('/nexus/v1/sessions', (req, res) => {
  // O cérebro não expõe o Map directamente, mas podemos fornecer métricas gerais
  res.json({
    success: true,
    message: 'Use /nexus/v1/session/:id para detalhes de uma sessão específica',
    note: 'O gestão de sessões é interna ao cérebro. Endpoints de gestão disponíveis abaixo.',
  });
});

// ── Reset de Sessão ────────────────────────────────────────────
app.delete('/nexus/v1/session/:id', (req, res) => {
  const { id } = req.params;
  cerebro.resetSession(id);
  res.json({
    success: true,
    message: `Sessão ${id} reiniciada`,
  });
});

// ── Login — Gerar JWT para o Core ──────────────────────────────
app.post('/nexus/v1/auth/login', (req, res) => {
  const { password } = req.body;

  if (!CONFIG.masterPassword) {
    return res.status(500).json({
      success: false,
      error: 'NEXUS_MASTER_PASSWORD não configurada',
      code: 'CONFIG_ERROR',
    });
  }

  if (password !== CONFIG.masterPassword) {
    return res.status(401).json({
      success: false,
      error: 'Senha inválida',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const token = jwt.sign(
    { sub: 'nexus-core-user', role: 'admin', loginAt: Date.now() },
    CONFIG.jwtSecret,
    { expiresIn: '24h' }
  );

  return res.json({ success: true, token });
});

// ── Catch-all 404 ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    availableEndpoints: [
      'GET    /nexus/v1/health',
      'POST   /nexus/v1/auth/login',
      'POST   /nexus/v1/chat',
      'POST   /nexus/v1/webhook',
      'GET    /nexus/v1/metrics',
      'GET    /nexus/v1/sessions',
      'DELETE /nexus/v1/session/:id',
    ],
  });
});

// ── Error Handler ──────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[NEXUS-CORE] ❌ Erro não tratado:', err.message);
  res.status(500).json({
    success: false,
    error: CONFIG.nodeEnv === 'production' ? 'Erro interno' : err.message,
    code: 'UNHANDLED_ERROR',
  });
});

// ═══════════════════════════════════════════════════════════════
// WHATSAPP HANDLER — Interface para o Baileys
// ═══════════════════════════════════════════════════════════════

/**
 * Processa uma mensagem recebida via WhatsApp (Baileys).
 * Esta função deve ser chamada pelo handler de mensagens do Baileys.
 * 
 * @param {Object} msg - Mensagem do Baileys
 * @param {string} msg.from - Número do remetente (ex: '5511999999999@s.whatsapp.net')
 * @param {string} msg.text - Texto da mensagem
 * @param {Object} msg.msgInfo - Informações adicionais da mensagem Baileys
 * @returns {Object} { success, response, sendToWhatsApp }
 */
async function handleWhatsAppMessage(msg) {
  const { from, text } = msg;

  if (!text || !text.trim()) {
    return { success: false, response: null, sendToWhatsApp: false };
  }

  // Usar o número do WhatsApp como sessionId
  const sessionId = `wa_${from.replace(/[^a-zA-Z0-9]/g, '_')}`;

  console.log(`[NEXUS-WA] 📨 Mensagem de ${from}: ${text.slice(0, 100)}...`);

  try {
    const result = await cerebro.processCerebroLoop(sessionId, text, {
      skipTribunal: false,
    });

    if (result.success) {
      return {
        success: true,
        response: result.response,
        model: result.model,
        tier: result.tier,
        sendToWhatsApp: true,
        sessionId,
      };
    }

    return {
      success: false,
      response: result.response || 'Erro ao processar mensagem.',
      sendToWhatsApp: true,
      sessionId,
    };
  } catch (err) {
    console.error(`[NEXUS-WA] ❌ Erro ao processar mensagem de ${from}:`, err.message);
    return {
      success: false,
      response: 'Erro interno. Tente novamente em alguns segundos.',
      sendToWhatsApp: true,
      sessionId,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// REGISTO NO COMMAND CENTER — Auto-registo do Core
// ═══════════════════════════════════════════════════════════════

async function registerWithCommandCenter() {
  if (!CONFIG.ccJwt) {
    console.warn('[NEXUS-CORE] ⚠️ NEXUS_CC_JWT não configurado — registo no Command Center ignorado');
    return;
  }

  try {
    const coreUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${CONFIG.port}`;

    const response = await fetch(`${CONFIG.ccUrl}/api/headhunter/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.ccJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Nexus V3 Core',
        specialty: 'AI Brain & MoE Router',
        capabilities: [
          'chat',
          'webhook_processing',
          'github_operations',
          'memory_management',
          'mission_analysis',
          'moe_routing',
          'tribunal_validation',
        ],
        status: 'available',
        metadata: {
          version: '3.0.0',
          url: coreUrl,
          endpoints: [
            'POST /nexus/v1/chat',
            'POST /nexus/v1/webhook',
            'GET  /nexus/v1/health',
            'GET  /nexus/v1/metrics',
          ],
        },
      }),
    });

    if (response.ok) {
      console.log('[NEXUS-CORE] ✅ Registado no Command Center com sucesso');
    } else {
      console.warn(`[NEXUS-CORE] ⚠️ Falha ao registar no Command Center: ${response.status}`);
    }
  } catch (err) {
    console.warn(`[NEXUS-CORE] ⚠️ Erro ao registar no Command Center: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// STARTUP — Inicialização do servidor
// ═══════════════════════════════════════════════════════════════

async function startServer() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  🧠 NEXUS V3 CORE — Inicializando...');
  console.log('════════════════════════════════════════════════════════════');

  // 1. Injetar arsenal no cérebro
  initializeArsenal();

  // 2. Verificar chaves configuradas
  const health = keyRotator.getHealthStatus();
  console.log(`[NEXUS-CORE] 🔑 Chaves disponíveis: ${health.totalKeys}`);
  console.log(`[NEXUS-CORE] 🏥 Status: ${health.status}`);

  if (health.totalKeys === 0) {
    console.error('[NEXUS-CORE] ❌ NENHUMA chave API configurada! O sistema não funcionará.');
    console.error('[NEXUS-CORE] ❌ Configure pelo menos OPENROUTER_KEY_1 ou NVIDIA_NIM_KEY_1 ou ROUTEWAY_KEY_1');
  }

  // 3. Iniciar servidor Express
  const server = app.listen(CONFIG.port, '0.0.0.0', () => {
    console.log(`[NEXUS-CORE] 🌐 Servidor Express ouvindo na porta ${CONFIG.port}`);
    console.log(`[NEXUS-CORE] 📡 Command Center URL: ${CONFIG.ccUrl}`);
    console.log(`[NEXUS-CORE] 🔧 Ambiente: ${CONFIG.nodeEnv}`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅ NEXUS V3 CORE — OPERACIONAL');
    console.log('════════════════════════════════════════════════════════════');
  });

  // 4. Registar no Command Center (assíncrono, não bloqueia startup)
  setTimeout(() => registerWithCommandCenter(), 5000);

  // 5. Graceful shutdown
  const shutdown = (signal) => {
    console.log(`[NEXUS-CORE] 🛑 ${signal} recebido — encerrando graciosamente...`);
    server.close(() => {
      console.log('[NEXUS-CORE] 👋 Servidor encerrado.');
      process.exit(0);
    });
    // Forçar saída após 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS — Para uso como módulo ou standalone
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Servidor Express (para uso standalone)
  app,
  startServer,

  // Handler WhatsApp (para integração com Baileys)
  handleWhatsAppMessage,

  // Acesso directo aos módulos core
  keyRotator,
  cerebro,

  // Configuração
  CONFIG,
};
