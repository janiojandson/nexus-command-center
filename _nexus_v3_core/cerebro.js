/**
 * ============================================================
 * NEXUS V3 CORE — Cérebro Autónomo (BLINDADO)
 * ============================================================
 * Ciclo de autonomia do Nexus com proteções:
 *   - Limite de tokens por iteração (evita overflow)
 *   - Limite de iterações por sessão (evita loop infinito)
 *   - Timeout por operação (evita bloqueios)
 *   - Arsenal cirúrgico: githubScraper, githubEditor, memoryRetriever
 *   - Integração com keyRotator (MoE pipeline)
 *   - Comunicação com Nexus Command Center (backend web)
 *   - Logging estruturado de todas as decisões
 * ============================================================
 */

'use strict';

const keyRotator = require('./keyRotator');

// ═══════════════════════════════════════════════════════════════
// CONSTANTES DE PROTEÇÃO — BLINDAGEM CONTRA LOOPS
// ═══════════════════════════════════════════════════════════════

const MAX_ITERATIONS_PER_SESSION = 15;       // Máximo de iterações do cérebro por sessão
const MAX_TOKENS_PER_ITERATION = 8000;       // Limite de tokens por chamada ao LLM
const MAX_CONTEXT_TOKENS = 60000;            // Limite total de tokens no contexto
const OPERATION_TIMEOUT_MS = 45000;          // Timeout por operação (45s)
const COOLDOWN_BETWEEN_ITERATIONS_MS = 2000; // Cooldown entre iterações (2s)
const MAX_CONSECUTIVE_ERRORS = 5;           // Erros consecutivos antes de abortar
const MAX_MEMORY_ENTRIES_PER_SESSION = 50;  // Limite de memórias por sessão

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE ARSENAL — Ferramentas do Cérebro
// ═══════════════════════════════════════════════════════════════

const ARSENAL = {
  githubScraper: {
    name: 'githubScraper',
    description: 'Lê conteúdo de ficheiros e pastas num repositório GitHub. Útil para auditar código, ler documentação e analisar estruturas.',
    parameters: ['owner', 'repo', 'path'],
    execute: async (params) => {
      if (typeof ARSENAL._injected?.githubScraper === 'function') {
        return ARSENAL._injected.githubScraper(params);
      }
      return { error: 'githubScraper não injetado. Configure a injeção no index.js.' };
    },
  },
  githubEditor: {
    name: 'githubEditor',
    description: 'Cria ou edita ficheiros diretamente num repositório GitHub. Útil para corrigir bugs, adicionar features e refatorar código.',
    parameters: ['repo', 'filePath', 'content', 'commitMessage'],
    execute: async (params) => {
      if (typeof ARSENAL._injected?.githubEditor === 'function') {
        return ARSENAL._injected.githubEditor(params);
      }
      return { error: 'githubEditor não injetado. Configure a injeção no index.js.' };
    },
  },
  memoryRetriever: {
    name: 'memoryRetriever',
    description: 'Consulta o banco de dados de memória vetorial para buscar conhecimentos passados. Útil para lembrar contexto de sessões anteriores.',
    parameters: ['query'],
    execute: async (params) => {
      if (typeof ARSENAL._injected?.memoryRetriever === 'function') {
        return ARSENAL._injected.memoryRetriever(params);
      }
      return { error: 'memoryRetriever não injetado. Configure a injeção no index.js.' };
    },
  },
  memoryStore: {
    name: 'memoryStore',
    description: 'Armazena um conhecimento na memória vetorial para uso futuro. Útil para persistir aprendizados e decisões.',
    parameters: ['agentName', 'query', 'response', 'metadata'],
    execute: async (params) => {
      if (typeof ARSENAL._injected?.memoryStore === 'function') {
        return ARSENAL._injected.memoryStore(params);
      }
      return { error: 'memoryStore não injetado. Configure a injeção no index.js.' };
    },
  },
  commandCenterAPI: {
    name: 'commandCenterAPI',
    description: 'Faz chamadas à API do Nexus Command Center (backend web). Útil para criar missões, registar agentes e consultar métricas.',
    parameters: ['endpoint', 'method', 'body', 'token'],
    execute: async (params) => {
      if (typeof ARSENAL._injected?.commandCenterAPI === 'function') {
        return ARSENAL._injected.commandCenterAPI(params);
      }
      return { error: 'commandCenterAPI não injetado. Configure a injeção no index.js.' };
    },
  },
};

// Slot para injeção de dependências
ARSENAL._injected = {};

/**
 * Injeta as implementações reais das ferramentas do arsenal.
 * Deve ser chamado pelo index.js durante a inicialização.
 * @param {Object} implementations - { githubScraper, githubEditor, memoryRetriever, memoryStore, commandCenterAPI }
 */
function injectArsenal(implementations) {
  Object.assign(ARSENAL._injected, implementations);
  console.log('[CEREBRO] 🔧 Arsenal injetado:', Object.keys(implementations).join(', '));
}

// ═══════════════════════════════════════════════════════════════
// GESTÃO DE SESSÃO — Estado por conversa
// ═══════════════════════════════════════════════════════════════

const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      iterations: 0,
      consecutiveErrors: 0,
      totalTokensUsed: 0,
      memoryWrites: 0,
      history: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

function resetSession(sessionId) {
  sessions.delete(sessionId);
}

function cleanupStaleSessions(maxAgeMs = 3600000) {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > maxAgeMs) {
      sessions.delete(id);
    }
  }
}

// Limpeza automática a cada 30 minutos
setInterval(() => cleanupStaleSessions(), 30 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// ESTIMATIVA DE TOKENS — Heurística simples
// ═══════════════════════════════════════════════════════════════

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}

function truncateToTokenLimit(text, maxTokens) {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;
  const maxChars = Math.floor(maxTokens * 3.5);
  return text.slice(0, maxChars) + '\n[... TRUNCADO — limite de tokens atingido]';
}

// ═══════════════════════════════════════════════════════════════
// PARSER DE AÇÕES — Extrai ações do arsenal da resposta do LLM
// ═══════════════════════════════════════════════════════════════

/**
 * Parseia a resposta do LLM para extrair ações do arsenal.
 * Formato esperado:
 *   [ACTION:toolName|param1=val1|param2=val2]
 * ou JSON:
 *   ```json
 *   {"action": "toolName", "params": {...}}
 *   ```
 */
function parseActions(response) {
  const actions = [];

  // Formato [ACTION:toolName|param1=val1|param2=val2]
  const actionRegex = /\[ACTION:([a-zA-Z_]+)\|([^\]]+)\]/g;
  let match;
  while ((match = actionRegex.exec(response)) !== null) {
    const toolName = match[1];
    const paramsStr = match[2];
    const params = {};
    paramsStr.split('|').forEach(pair => {
      const [key, ...valueParts] = pair.split('=');
      if (key) params[key.trim()] = valueParts.join('=').trim();
    });
    actions.push({ tool: toolName, params });
  }

  // Formato JSON
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
  while ((match = jsonBlockRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action && ARSENAL[parsed.action]) {
        actions.push({ tool: parsed.action, params: parsed.params || {} });
      }
      if (Array.isArray(parsed.actions)) {
        parsed.actions.forEach(a => {
          if (a.action && ARSENAL[a.action]) {
            actions.push({ tool: a.action, params: a.params || {} });
          }
        });
      }
    } catch {
      // Ignorar JSON malformado
    }
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════════
// EXECUÇÃO DE AÇÕES — Com timeout e validação
// ═══════════════════════════════════════════════════════════════

async function executeAction(action, sessionId) {
  const tool = ARSENAL[action.tool];
  if (!tool) {
    return { success: false, error: `Ferramenta "${action.tool}" não existe no arsenal` };
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout (${OPERATION_TIMEOUT_MS}ms) na ferramenta ${action.tool}`)), OPERATION_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      tool.execute(action.params),
      timeoutPromise,
    ]);

    console.log(`[CEREBRO] 🔧 Ação executada: ${action.tool} (sessão ${sessionId})`);
    return { success: true, data: result };
  } catch (err) {
    console.error(`[CEREBRO] ❌ Ação falhou: ${action.tool} — ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Instruções base do Cérebro
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(sessionContext = {}) {
  const toolDescriptions = Object.values(ARSENAL)
    .filter(t => t.name && t.description)
    .map(t => `  - ${t.name}: ${t.description} (params: ${t.parameters.join(', ')})`)
    .join('\n');

  return `Você é o Cérebro do Nexus Command Center — uma IA autónoma de elite com acesso a um arsenal de ferramentas.

REGRAS ABSOLUTAS:
1. NUNCA invente dados. Se não sabe, diga que não sabe.
2. Use o arsenal de forma CIRÚRGICA — apenas quando necessário.
3. Para usar uma ferramenta, inclua na resposta: [ACTION:toolName|param1=val1|param2=val2]
4. Pode usar múltiplas ações numa mesma resposta.
5. Se uma ação falhar, NÃO insista — reporte o erro e sugira alternativas.
6. Mantenha respostas concisas e precisas.
7. Priorize a segurança: nunca delete ficheiros críticos sem confirmação.
8. Sempre que aprender algo novo, armazene na memória: [ACTION:memoryStore|agentName=cerebro|query=...|response=...]

ARSENAL DISPONÍVEL:
${toolDescriptions}

CONTEXTO DA SESSÃO:
- Iterações restantes: ${sessionContext.remainingIterations || 'N/A'}
- Tokens usados: ${sessionContext.tokensUsed || 0}/${MAX_CONTEXT_TOKENS}
- Memórias registadas: ${sessionContext.memoryWrites || 0}/${MAX_MEMORY_ENTRIES_PER_SESSION}

Responda em português. Seja pragmático e direto.`;
}

// ═══════════════════════════════════════════════════════════════
// LOOP PRINCIPAL DO CÉREBRO — Blindado contra loops infinitos
// ═══════════════════════════════════════════════════════════════

/**
 * Processa uma mensagem do utilizador através do loop do cérebro.
 * 
 * Fluxo:
 * 1. Recuperar contexto da sessão
 * 2. Verificar limites (iterações, tokens, erros)
 * 3. Recuperar memórias relevantes
 * 4. Montar prompt com contexto
 * 5. Enviar para o pipeline MoE (keyRotator)
 * 6. Parsear ações da resposta
 * 7. Executar ações
 * 8. Armazenar aprendizados na memória
 * 9. Retornar resposta final
 * 
 * @param {string} sessionId - ID da sessão (número WhatsApp ou ID web)
 * @param {string} userMessage - Mensagem do utilizador
 * @param {Object} options - Opções adicionais
 * @returns {Object} { success, response, actions, metrics }
 */
async function processCerebroLoop(sessionId, userMessage, options = {}) {
  const session = getSession(sessionId);
  session.lastActivity = Date.now();

  // ══ VERIFICAÇÃO DE LIMITES ══

  if (session.iterations >= MAX_ITERATIONS_PER_SESSION) {
    return {
      success: false,
      response: '⚠️ Limite de iterações atingido para esta sessão. Inicie uma nova conversa.',
      error: 'MAX_ITERATIONS_EXCEEDED',
      metrics: getSessionMetrics(session),
    };
  }

  if (session.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    resetSession(sessionId);
    return {
      success: false,
      response: '🔴 Muitos erros consecutivos. Sessão reiniciada por segurança. Tente novamente.',
      error: 'MAX_CONSECUTIVE_ERRORS',
      metrics: getSessionMetrics(session),
    };
  }

  if (session.totalTokensUsed >= MAX_CONTEXT_TOKENS) {
    const truncated = truncateHistory(session);
    if (!truncated) {
      return {
        success: false,
        response: '⚠️ Limite de contexto atingido. Sessão reiniciada.',
        error: 'MAX_CONTEXT_TOKENS',
        metrics: getSessionMetrics(session),
      };
    }
  }

  session.iterations++;

  // ══ RECUPERAR MEMÓRIAS RELEVANTES ══

  let relevantMemories = [];
  try {
    const memoryResult = await ARSENAL.memoryRetriever.execute({ query: userMessage });
    if (memoryResult && !memoryResult.error) {
      relevantMemories = Array.isArray(memoryResult) ? memoryResult.slice(0, 5) : [];
    }
  } catch (err) {
    console.warn(`[CEREBRO] ⚠️ Falha ao recuperar memórias: ${err.message}`);
  }

  // ══ MONTAR CONTEXTO ══

  const memoryContext = relevantMemories.length > 0
    ? relevantMemories.map(m => `[Memória: ${m.query || m.agent_name} → ${typeof m.response === 'string' ? m.response.slice(0, 200) : JSON.stringify(m.response).slice(0, 200)}]`).join('\n')
    : '';

  const systemPrompt = buildSystemPrompt({
    remainingIterations: MAX_ITERATIONS_PER_SESSION - session.iterations,
    tokensUsed: session.totalTokensUsed,
    memoryWrites: session.memoryWrites,
  });

  const contextMessages = [];

  // Adicionar histórico da sessão (últimas 10 interações)
  const recentHistory = session.history.slice(-10);
  for (const entry of recentHistory) {
    contextMessages.push({ role: 'user', content: entry.user });
    contextMessages.push({ role: 'assistant', content: entry.assistant });
  }

  // Adicionar memórias relevantes como contexto
  if (memoryContext) {
    contextMessages.push({
      role: 'system',
      content: `Memórias relevantes recuperadas:\n${memoryContext}`,
    });
  }

  // Adicionar mensagem actual
  contextMessages.push({ role: 'user', content: userMessage });

  // ══ ENVIAR PARA PIPELINE MoE ══

  const pipelineOptions = {
    maxTokens: Math.min(MAX_TOKENS_PER_ITERATION, MAX_CONTEXT_TOKENS - session.totalTokensUsed),
    temperature: options.temperature || 0.7,
    skipTribunal: options.skipTribunal || false,
    maxRetries: 2,
  };

  const pipelineResult = await keyRotator.processMessage(userMessage, {
    systemPrompt,
    history: contextMessages,
  }, pipelineOptions);

  // ══ PROCESSAR RESULTADO ══

  if (!pipelineResult.success) {
    session.consecutiveErrors++;
    console.error(`[CEREBRO] ❌ Pipeline falhou (sessão ${sessionId}): ${pipelineResult.error}`);

    return {
      success: false,
      response: `Erro no processamento: ${pipelineResult.error}. Tente novamente.`,
      error: pipelineResult.error,
      metrics: getSessionMetrics(session),
    };
  }

  // Resetar erros consecutivos
  session.consecutiveErrors = 0;

  const assistantResponse = pipelineResult.response;

  // Estimar tokens usados
  const tokensUsed = estimateTokens(userMessage) + estimateTokens(assistantResponse);
  session.totalTokensUsed += tokensUsed;

  // ══ PARSEAR E EXECUTAR AÇÕES ══

  const actions = parseActions(assistantResponse);
  const actionResults = [];

  for (const action of actions) {
    // Verificar se memoryStore não excedeu limite
    if (action.tool === 'memoryStore' && session.memoryWrites >= MAX_MEMORY_ENTRIES_PER_SESSION) {
      actionResults.push({
        tool: action.tool,
        success: false,
        error: 'Limite de memórias por sessão atingido',
      });
      continue;
    }

    const result = await executeAction(action, sessionId);
    actionResults.push({ tool: action.tool, ...result });

    if (action.tool === 'memoryStore' && result.success) {
      session.memoryWrites++;
    }

    // Cooldown entre ações
    await sleep(COOLDOWN_BETWEEN_ITERATIONS_MS);
  }

  // ══ ARMAZENAR NA HISTÓRIA DA SESSÃO ══

  session.history.push({
    user: userMessage,
    assistant: assistantResponse,
    timestamp: Date.now(),
    tokens: tokensUsed,
    model: pipelineResult.model,
    tier: pipelineResult.tier,
  });

  // ══ RETORNAR RESULTADO ══

  return {
    success: true,
    response: assistantResponse,
    model: pipelineResult.model,
    tier: pipelineResult.tier,
    tribunal: pipelineResult.tribunal,
    actions: actionResults,
    retries: pipelineResult.retries,
    metrics: getSessionMetrics(session),
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncateHistory(session) {
  if (session.history.length <= 2) return false;
  const removeCount = Math.ceil(session.history.length * 0.3);
  session.history = session.history.slice(removeCount);
  session.totalTokensUsed = session.history.reduce((sum, entry) => {
    return sum + estimateTokens(entry.user) + estimateTokens(entry.assistant);
  }, 0);
  console.log(`[CEREBRO] 📉 Histórico truncado (${removeCount} entradas removidas)`);
  return true;
}

function getSessionMetrics(session) {
  return {
    sessionId: session.id,
    iterations: session.iterations,
    maxIterations: MAX_ITERATIONS_PER_SESSION,
    remainingIterations: MAX_ITERATIONS_PER_SESSION - session.iterations,
    consecutiveErrors: session.consecutiveErrors,
    totalTokensUsed: session.totalTokensUsed,
    maxContextTokens: MAX_CONTEXT_TOKENS,
    memoryWrites: session.memoryWrites,
    historyLength: session.history.length,
    sessionAgeMs: Date.now() - session.createdAt,
  };
}

/**
 * Processa um webhook recebido do Nexus Command Center.
 * Usado quando o backend web precisa de acionar o cérebro.
 * @param {Object} payload - { type, data, missionId }
 * @returns {Object} Resultado do processamento
 */
async function processWebhook(payload) {
  if (!payload || !payload.type) {
    return { success: false, error: 'Payload inválido — tipo ausente' };
  }

  const sessionId = `webhook_${payload.missionId || Date.now()}`;

  switch (payload.type) {
    case 'mission_created':
      return processCerebroLoop(sessionId, `Nova missão criada: ${JSON.stringify(payload.data)}. Analise e proponha um plano de execução.`, { skipTribunal: true });

    case 'mission_update':
      return processCerebroLoop(sessionId, `Missão atualizada: ${JSON.stringify(payload.data)}. Avalie o progresso e sugira próximos passos.`, { skipTribunal: true });

    case 'agent_registered':
      return processCerebroLoop(sessionId, `Novo agente registado: ${JSON.stringify(payload.data)}. Avalie capacidades e atribua missões adequadas.`, { skipTribunal: true });

    case 'memory_query':
      return processCerebroLoop(sessionId, `Consulta de memória: ${payload.data.query}`, { skipTribunal: true });

    default:
      return processCerebroLoop(sessionId, `Evento externo: ${payload.type} — ${JSON.stringify(payload.data)}`, { skipTribunal: true });
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  processCerebroLoop,
  processWebhook,
  ARSENAL,
  injectArsenal,
  getSession,
  resetSession,
  getSessionMetrics,
  estimateTokens,
  truncateToTokenLimit,
  parseActions,
  MAX_ITERATIONS_PER_SESSION,
  MAX_TOKENS_PER_ITERATION,
  MAX_CONTEXT_TOKENS,
  MAX_CONSECUTIVE_ERRORS,
};
