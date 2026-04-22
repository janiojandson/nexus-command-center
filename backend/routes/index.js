/**
 * ============================================================
 *  NEXUS COMMAND CENTER — Rotas da API Express
 * ============================================================
 * 
 *  12 Endpoints REST que expõem os 3 módulos centrais:
 *    → Headhunter         (Busca e Recrutamento de Agentes)
 *    → Hipocampo          (Memória Vetorial)
 *    → Lançador de Missões Pesadas
 *
 *  Todos os endpoints protegidos por middleware de autenticação.
 *  Prefixo base: /api
 * ============================================================
 */

const express = require('express');
const router = express.Router();

// ── Middlewares ──────────────────────────────────────────────
const { authenticate } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

// ── Controladores ────────────────────────────────────────────
const HeadhunterController = require('../controllers/headhunterController');
const HipocampoController = require('../controllers/hipocampoController');
const MissionController = require('../controllers/missionController');

// ── Aplicar middlewares globais a todas as rotas ─────────────
router.use(authenticate);
router.use(rateLimiter);


/* =============================================================
 *  HEADHUNTER — Busca e Recrutamento de Agentes/Ferramentas
 *  Prefixo: /api/headhunter
 * ============================================================= */

/**
 * [1] GET /api/headhunter/status
 * Retorna o estado operacional do módulo Headhunter:
 * agentes ativos, capacidade disponível, última varredura.
 */
router.get('/headhunter/status', HeadhunterController.getStatus);

/**
 * [2] POST /api/headhunter/search
 * Pesquisa global por agentes, ferramentas ou integrações.
 * Body: { query: string, filters?: { type?, tags? } }
 */
router.post('/headhunter/search', HeadhunterController.search);

/**
 * [3] GET /api/headhunter/agents
 * Lista todos os agentes disponíveis no arsenal Nexus,
 * com metadados de capacidade e status de deploy.
 */
router.get('/headhunter/agents', HeadhunterController.listAgents);

/**
 * [4] POST /api/headhunter/deploy
 * Recruta e ativa um agente específico para uma missão.
 * Body: { agentId: string, config?: object }
 */
router.post('/headhunter/deploy', HeadhunterController.deployAgent);


/* =============================================================
 *  HIPOCAMPO — Memória Vetorial
 *  Prefixo: /api/hipocampo
 * ============================================================= */

/**
 * [5] GET /api/hipocampo/status
 * Retorna o estado do módulo de memória vetorial:
 * dimensão dos embeddings, total de entradas, índice ativo.
 */
router.get('/hipocampo/status', HipocampoController.getStatus);

/**
 * [6] POST /api/hipocampo/query
 * Consulta a memória vetorial com busca semântica.
 * Body: { query: string, topK?: number, threshold?: number }
 */
router.post('/hipocampo/query', HipocampoController.query);

/**
 * [7] POST /api/hipocampo/store
 * Armazena um novo conhecimento na memória vetorial.
 * Body: { content: string, metadata?: { source?, tags?, timestamp? } }
 */
router.post('/hipocampo/store', HipocampoController.store);

/**
 * [8] DELETE /api/hipocampo/entries/:id
 * Remove uma entrada específica da memória vetorial.
 * Params: { id: string } — identificador único da entrada.
 */
router.delete('/hipocampo/entries/:id', HipocampoController.deleteEntry);


/* =============================================================
 *  LANÇADOR DE MISSÕES PESADAS
 *  Prefixo: /api/missions
 * ============================================================= */

/**
 * [9] GET /api/missions
 * Lista todas as missões (ativas, concluídas, falhadas),
 * com paginação e filtros por estado.
 * Query: ?status=active|completed|failed&page=1&limit=20
 */
router.get('/missions', MissionController.listMissions);

/**
 * [10] POST /api/missions/launch
 * Lança uma nova missão pesada (deploy, análise, pesquisa).
 * Body: { type: string, payload: object, priority?: 'low'|'medium'|'high' }
 */
router.post('/missions/launch', MissionController.launch);

/**
 * [11] GET /api/missions/:id
 * Obtém os detalhes completos de uma missão específica:
 * progresso, logs, resultados parciais, timestamps.
 * Params: { id: string }
 */
router.get('/missions/:id', MissionController.getDetails);

/**
 * [12] POST /api/missions/:id/cancel
 * Cancela uma missão em execução.
 * Body: { reason?: string }
 * Params: { id: string }
 */
router.post('/missions/:id/cancel', MissionController.cancel);


/* =============================================================
 *  HEALTH CHECK (não protegido — para monitorização externa)
 * ============================================================= */

router.get('/health', (req, res) => {
  res.json({
    status: 'OPERATIONAL',
    service: 'Nexus Command Center',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    modules: {
      headhunter: 'online',
      hipocampo: 'online',
      missions: 'online'
    }
  });
});


module.exports = router;