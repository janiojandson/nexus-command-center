/**
 * ============================================================
 * NEXUS V3 CORE — Key Rotator & MoE Router (BLINDADO)
 * ============================================================
 * Sistema de roteamento Mixture-of-Experts com:
 *   - Workers gratuitos (OpenRouter, NVIDIA NIM, Routeway)
 *   - Tribunal de Juízes VIP (Nemotron 3, DeepSeek v3.2)
 *   - Mestre Supremo (Claude 3.5 Sonnet → fallback GLM 5.1)
 *   - Rodízio de 5 chaves por provider
 *   - Tolerância a falhas: 429/404 → próximo do array
 *   - Circuit breaker por provider
 *   - Métricas de uso e latência
 * ============================================================
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE CHAVES (5 por provider, rodízio round-robin)
// ═══════════════════════════════════════════════════════════════

const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY_1 || '',
  process.env.OPENROUTER_KEY_2 || '',
  process.env.OPENROUTER_KEY_3 || '',
  process.env.OPENROUTER_KEY_4 || '',
  process.env.OPENROUTER_KEY_5 || '',
].filter(Boolean);

const NVIDIA_NIM_KEYS = [
  process.env.NVIDIA_NIM_KEY_1 || '',
  process.env.NVIDIA_NIM_KEY_2 || '',
  process.env.NVIDIA_NIM_KEY_3 || '',
  process.env.NVIDIA_NIM_KEY_4 || '',
  process.env.NVIDIA_NIM_KEY_5 || '',
].filter(Boolean);

const ROUTEWAY_KEYS = [
  process.env.ROUTEWAY_KEY_1 || '',
  process.env.ROUTEWAY_KEY_2 || '',
  process.env.ROUTEWAY_KEY_3 || '',
  process.env.ROUTEWAY_KEY_4 || '',
  process.env.ROUTEWAY_KEY_5 || '',
].filter(Boolean);

// Chaves VIP (com saldo) para Tribunal e Mestre
const VIP_OPENROUTER_KEYS = [
  process.env.VIP_OPENROUTER_KEY_1 || '',
  process.env.VIP_OPENROUTER_KEY_2 || '',
].filter(Boolean);

const VIP_NVIDIA_NIM_KEYS = [
  process.env.VIP_NVIDIA_NIM_KEY_1 || '',
  process.env.VIP_NVIDIA_NIM_KEY_2 || '',
].filter(Boolean);

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE MODELOS — WORKERS GRATUITOS
// ═══════════════════════════════════════════════════════════════

const WORKER_MODELS = {
  openrouter: [
    { id: 'z-ai/glm-4.5-air', name: 'GLM 4.5 Air', provider: 'openrouter' },
    { id: 'minimax/m2.5', name: 'MiniMax M2.5', provider: 'openrouter' },
    { id: 'qwen/qwen3-coder-480b-a35b', name: 'Qwen3 Coder 480B A35B', provider: 'openrouter' },
    { id: 'nvidia/nemotron-3-super', name: 'NVIDIA Nemotron 3 Super', provider: 'openrouter' },
  ],
  nvidia_nim: [
    { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek v3.2', provider: 'nvidia_nim' },
    { id: 'qwen/qwen3-coder-480b', name: 'Qwen3 Coder 480B', provider: 'nvidia_nim' },
    { id: 'mistralai/devstral-2-123b', name: 'Devstral 2 123B', provider: 'nvidia_nim' },
    { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', provider: 'nvidia_nim' },
    { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek v3.1 Terminus', provider: 'nvidia_nim' },
    { id: 'z-ai/glm-4.7', name: 'GLM 4.7', provider: 'nvidia_nim' },
    { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek v4 Flash', provider: 'nvidia_nim' },
    { id: 'deepseek-ai/deepseek-v4-pro', name: 'DeepSeek v4 Pro', provider: 'nvidia_nim' },
  ],
  routeway: [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'routeway' },
    { id: 'mistralai/devstral-2', name: 'Devstral 2', provider: 'routeway' },
    { id: 'moonshotai/kimi-k2-0905', name: 'Kimi K2 0905', provider: 'routeway' },
    { id: 'nvidia/nemotron-3-nano-30b', name: 'Nemotron 3 Nano 30B', provider: 'routeway' },
    { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash', provider: 'routeway' },
    { id: 'z-ai/glm-4.5-air', name: 'GLM 4.5 Air', provider: 'routeway' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE MODELOS — TRIBUNAL VIP
// ═══════════════════════════════════════════════════════════════

const TRIBUNAL_MODELS = {
  judge1: {
    id: 'nvidia/nemotron-3-super',
    name: 'Nemotron 3 Super (Juiz 1)',
    provider: 'openrouter',
    vip: true,
  },
  judge2: {
    id: 'deepseek-ai/deepseek-v3.2',
    name: 'DeepSeek v3.2 (Juiz 2)',
    provider: 'nvidia_nim',
    vip: true,
  },
};

const MESTRE_MODELS = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (Mestre)',
    provider: 'openrouter',
    vip: true,
    priority: 1,
  },
  {
    id: 'z-ai/glm-5.1',
    name: 'GLM 5.1 (Fallback Mestre)',
    provider: 'openrouter',
    vip: true,
    priority: 2,
  },
];

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER — Proteção contra providers em falha
// ═══════════════════════════════════════════════════════════════

const CIRCUIT_BREAKER = {
  openrouter: { failures: 0, lastFailure: 0, open: false, cooldownMs: 60000 },
  nvidia_nim: { failures: 0, lastFailure: 0, open: false, cooldownMs: 60000 },
  routeway: { failures: 0, lastFailure: 0, open: false, cooldownMs: 60000 },
};

const MAX_FAILURES_BEFORE_OPEN = 5;

function isCircuitOpen(provider) {
  const cb = CIRCUIT_BREAKER[provider];
  if (!cb) return false;
  if (!cb.open) return false;
  // Verificar se o cooldown passou
  if (Date.now() - cb.lastFailure > cb.cooldownMs) {
    cb.open = false;
    cb.failures = 0;
    return false;
  }
  return true;
}

function recordFailure(provider) {
  const cb = CIRCUIT_BREAKER[provider];
  if (!cb) return;
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.failures >= MAX_FAILURES_BEFORE_OPEN) {
    cb.open = true;
    console.warn(`[KEY-ROTATOR] ⚡ Circuit breaker ABERTO para ${provider} (${cb.failures} falhas)`);
  }
}

function recordSuccess(provider) {
  const cb = CIRCUIT_BREAKER[provider];
  if (!cb) return;
  cb.failures = Math.max(0, cb.failures - 1);
  if (cb.failures === 0) cb.open = false;
}

// ═══════════════════════════════════════════════════════════════
// RODÍZIO DE CHAVES — Round-robin com fallback
// ═══════════════════════════════════════════════════════════════

const keyIndex = { openrouter: 0, nvidia_nim: 0, routeway: 0, vip_openrouter: 0, vip_nvidia_nim: 0 };

function getNextKey(provider) {
  let keys;
  let indexKey;

  switch (provider) {
    case 'openrouter':
      keys = OPENROUTER_KEYS;
      indexKey = 'openrouter';
      break;
    case 'nvidia_nim':
      keys = NVIDIA_NIM_KEYS;
      indexKey = 'nvidia_nim';
      break;
    case 'routeway':
      keys = ROUTEWAY_KEYS;
      indexKey = 'routeway';
      break;
    case 'vip_openrouter':
      keys = VIP_OPENROUTER_KEYS;
      indexKey = 'vip_openrouter';
      break;
    case 'vip_nvidia_nim':
      keys = VIP_NVIDIA_NIM_KEYS;
      indexKey = 'vip_nvidia_nim';
      break;
    default:
      return null;
  }

  if (keys.length === 0) return null;

  const idx = keyIndex[indexKey] % keys.length;
  keyIndex[indexKey]++;
  return keys[idx];
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUÇÃO DE PEDIDOS HTTP POR PROVIDER
// ═══════════════════════════════════════════════════════════════

function buildOpenRouterRequest(model, messages, key, options = {}) {
  return {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nexus-command-center.up.railway.app',
      'X-Title': 'Nexus Command Center',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
    }),
  };
}

function buildNvidiaNIMRequest(model, messages, key, options = {}) {
  return {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
    }),
  };
}

function buildRoutewayRequest(model, messages, key, options = {}) {
  return {
    url: 'https://api.routeway.ai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
    }),
  };
}

function buildRequest(modelConfig, messages, key, options = {}) {
  const provider = modelConfig.provider;
  switch (provider) {
    case 'openrouter':
    case 'vip_openrouter':
      return buildOpenRouterRequest(modelConfig.id, messages, key, options);
    case 'nvidia_nim':
    case 'vip_nvidia_nim':
      return buildNvidiaNIMRequest(modelConfig.id, messages, key, options);
    case 'routeway':
      return buildRoutewayRequest(modelConfig.id, messages, key, options);
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}

function getKeyForModel(modelConfig) {
  const provider = modelConfig.provider;
  const isVip = modelConfig.vip === true;

  if (isVip) {
    if (provider === 'openrouter') return getNextKey('vip_openrouter');
    if (provider === 'nvidia_nim') return getNextKey('vip_nvidia_nim');
  }

  return getNextKey(provider);
}

// ═══════════════════════════════════════════════════════════════
// EXECUÇÃO DE PEDIDO COM RETRY E TOLERÂNCIA A FALHAS
// ═══════════════════════════════════════════════════════════════

const RETRYABLE_ERRORS = [429, 404, 500, 502, 503, 504];

async function executeRequest(reqConfig) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(reqConfig.url, {
      method: reqConfig.method,
      headers: reqConfig.headers,
      body: reqConfig.body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return {
        success: false,
        status: response.status,
        error: errorBody,
        retryable: RETRYABLE_ERRORS.includes(response.status),
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { success: false, status: 0, error: 'Timeout (30s)', retryable: true };
    }
    return { success: false, status: 0, error: err.message, retryable: true };
  }
}

/**
 * Tenta executar um pedido num modelo específico, rodando chaves em caso de 429/404.
 * @param {Object} modelConfig - Configuração do modelo
 * @param {Array} messages - Mensagens para o LLM
 * @param {Object} options - Opções adicionais
 * @param {number} maxKeyRetries - Máximo de chaves a tentar (default: 5)
 * @returns {Object} Resultado da chamada
 */
async function callModelWithRetry(modelConfig, messages, options = {}, maxKeyRetries = 5) {
  const provider = modelConfig.provider;

  // Verificar circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      success: false,
      error: `Circuit breaker aberto para ${provider}`,
      retryable: false,
      circuitOpen: true,
    };
  }

  for (let attempt = 0; attempt < maxKeyRetries; attempt++) {
    const key = getKeyForModel(modelConfig);
    if (!key) {
      return {
        success: false,
        error: `Sem chaves disponíveis para ${provider}`,
        retryable: false,
      };
    }

    const reqConfig = buildRequest(modelConfig, messages, key, options);
    const result = await executeRequest(reqConfig);

    if (result.success) {
      recordSuccess(provider);
      return result;
    }

    // Se o erro for retryable (429, 404), tentar próxima chave
    if (result.retryable) {
      recordFailure(provider);
      console.warn(
        `[KEY-ROTATOR] ⚠️ ${modelConfig.name} falhou (status ${result.status}) — tentativa ${attempt + 1}/${maxKeyRetries}, rodando chave...`
      );
      continue;
    }

    // Erro não retryable (ex: 401, 400) — não adianta tentar outra chave
    recordFailure(provider);
    return result;
  }

  return {
    success: false,
    error: `Todas as ${maxKeyRetries} chaves falharam para ${modelConfig.name}`,
    retryable: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// WORKER DISPATCH — Roteamento round-robin entre workers
// ═══════════════════════════════════════════════════════════════

let workerRoundRobin = { openrouter: 0, nvidia_nim: 0, routeway: 0 };

/**
 * Despacha um pedido para um worker gratuito.
 * Estratégia: Round-robin entre providers, fallback dentro do mesmo provider.
 * Se todos os workers de um provider falharem, tenta o próximo provider.
 */
async function dispatchToWorker(messages, options = {}) {
  const providerOrder = ['openrouter', 'nvidia_nim', 'routeway'];

  // Começar pelo provider do round-robin atual
  const startIndex = workerRoundRobin[providerOrder[0]] % providerOrder.length;

  for (let p = 0; p < providerOrder.length; p++) {
    const providerIdx = (startIndex + p) % providerOrder.length;
    const provider = providerOrder[providerIdx];

    if (isCircuitOpen(provider)) continue;

    const models = WORKER_MODELS[provider];
    if (!models || models.length === 0) continue;

    // Tentar cada modelo do provider
    for (let m = 0; m < models.length; m++) {
      const modelIdx = (workerRoundRobin[provider] + m) % models.length;
      const model = models[modelIdx];

      const result = await callModelWithRetry(model, messages, options, 3);

      if (result.success) {
        // Avançar round-robin
        workerRoundRobin[provider] = (modelIdx + 1) % models.length;
        console.log(`[KEY-ROTATOR] ✅ Worker ${model.name} (${provider}) respondeu com sucesso`);
        return {
          ...result,
          model: model.name,
          provider,
          tier: 'worker',
        };
      }

      if (result.circuitOpen) break; // Provider inteiro em falha
    }
  }

  // Avançar round-robin global
  workerRoundRobin[providerOrder[0]]++;

  return {
    success: false,
    error: 'Todos os workers gratuitos falharam',
    tier: 'worker',
  };
}

// ═══════════════════════════════════════════════════════════════
// TRIBUNAL — Juízes VIP para validação de respostas
// ═══════════════════════════════════════════════════════════════

/**
 * Submete uma resposta ao Tribunal para validação.
 * Cada juiz avalia independentemente. Se ambos aprovarem, a resposta é validada.
 * Se discordarem, o Mestre desempata.
 * @param {string} originalQuery - A pergunta original
 * @param {string} workerResponse - A resposta do worker a validar
 * @param {Object} options - Opções adicionais
 * @returns {Object} { approved: boolean, verdict: string, scores: { judge1, judge2 } }
 */
async function submitToTribunal(originalQuery, workerResponse, options = {}) {
  const tribunalPrompt = (judgeName) => [
    {
      role: 'system',
      content: `Você é o ${judgeName} do Tribunal de Qualidade do Nexus. Sua função é avaliar respostas de IA de forma rigorosa e imparcial. Analise a resposta do worker e dê um veredito: APROVADO ou REPROVADO, com uma pontuação de 0 a 10 e justificativa breve. Responda EXATAMENTE no formato JSON: {"verdict": "APROVADO"|"REPROVADO", "score": 0-10, "reason": "..."}`,
    },
    {
      role: 'user',
      content: `PERGUNTA ORIGINAL:\n${originalQuery}\n\nRESPOSTA DO WORKER:\n${workerResponse}\n\nAvalie esta resposta.`,
    },
  ];

  // Executar juízes em paralelo
  const [judge1Result, judge2Result] = await Promise.allSettled([
    callModelWithRetry(TRIBUNAL_MODELS.judge1, tribunalPrompt('Juiz 1 (Nemotron 3)'), { ...options, maxTokens: 512, temperature: 0.3 }, 3),
    callModelWithRetry(TRIBUNAL_MODELS.judge2, tribunalPrompt('Juiz 2 (DeepSeek v3.2)'), { ...options, maxTokens: 512, temperature: 0.3 }, 3),
  ]);

  const parseVerdict = (result) => {
    if (result.status === 'rejected' || !result.value?.success) {
      return { verdict: 'ERRO', score: 0, reason: 'Juiz indisponível' };
    }
    try {
      const content = result.value.data?.choices?.[0]?.message?.content || '';
      // Tentar extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Fallback: detectar APROVADO/REPROVADO no texto
      const approved = content.toUpperCase().includes('APROVADO');
      return { verdict: approved ? 'APROVADO' : 'REPROVADO', score: approved ? 7 : 3, reason: content.slice(0, 200) };
    } catch {
      return { verdict: 'INCONCLUSIVO', score: 5, reason: 'Falha ao parsear veredito' };
    }
  };

  const v1 = parseVerdict(judge1Result);
  const v2 = parseVerdict(judge2Result);

  const bothApproved = v1.verdict === 'APROVADO' && v2.verdict === 'APROVADO';
  const bothRejected = v1.verdict === 'REPROVADO' && v2.verdict === 'REPROVADO';
  const needsTiebreak = !bothApproved && !bothRejected;

  let finalVerdict = bothApproved ? 'APROVADO' : bothRejected ? 'REPROVADO' : null;
  let tiebreaker = null;

  // Se houver empate, chamar o Mestre
  if (needsTiebreak) {
    tiebreaker = await callMestre(
      `O Tribunal está empatado. Juiz 1 disse "${v1.verdict}" (score: ${v1.score}). Juiz 2 disse "${v2.verdict}" (score: ${v2.score}).\n\nPergunta original: ${originalQuery}\nResposta do worker: ${workerResponse}\n\nDesempate: A resposta é APROVADA ou REPROVADA? Responda apenas APROVADO ou REPROVADO.`,
      { maxTokens: 64, temperature: 0.1 }
    );

    if (tiebreaker.success) {
      const content = tiebreaker.data?.choices?.[0]?.message?.content || '';
      finalVerdict = content.toUpperCase().includes('REPROVADO') ? 'REPROVADO' : 'APROVADO';
    } else {
      // Se o Mestre falhar, aprovar por precaução (evitar loop infinito)
      finalVerdict = 'APROVADO';
    }
  }

  return {
    approved: finalVerdict === 'APROVADO',
    verdict: finalVerdict,
    scores: { judge1: v1, judge2: v2 },
    tiebreaker: tiebreaker ? { used: true } : { used: false },
  };
}

// ═══════════════════════════════════════════════════════════════
// MESTRE — Claude 3.5 Sonnet com fallback GLM 5.1
// ═══════════════════════════════════════════════════════════════

/**
 * Chama o Mestre (Claude 3.5 Sonnet). Se falhar, tenta o fallback (GLM 5.1).
 * Usado para decisões críticas, desempate do Tribunal e tarefas complexas.
 */
async function callMestre(prompt, options = {}) {
  const messages = [
    {
      role: 'system',
      content: 'Você é o Mestre Supremo do Nexus Command Center. Sua palavra é final. Seja preciso, decisivo e cirúrgico nas suas respostas.',
    },
    { role: 'user', content: prompt },
  ];

  // Tentar Claude 3.5 Sonnet primeiro
  const mestrePrimary = MESTRE_MODELS[0]; // Claude 3.5 Sonnet
  const result = await callModelWithRetry(mestrePrimary, messages, options, 3);

  if (result.success) {
    return { ...result, model: mestrePrimary.name, tier: 'mestre' };
  }

  // Fallback para GLM 5.1
  console.warn('[KEY-ROTATOR] ⚡ Mestre primário falhou, ativando fallback GLM 5.1');
  const mestreFallback = MESTRE_MODELS[1]; // GLM 5.1
  const fallbackResult = await callModelWithRetry(mestreFallback, messages, options, 3);

  if (fallbackResult.success) {
    return { ...fallbackResult, model: mestreFallback.name, tier: 'mestre_fallback' };
  }

  return {
    success: false,
    error: 'Mestre e fallback falharam',
    tier: 'mestre',
  };
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE COMPLETO — Worker → Tribunal → Mestre
// ═══════════════════════════════════════════════════════════════

const MAX_PIPELINE_RETRIES = 3;

/**
 * Pipeline completo de processamento de mensagens:
 * 1. Despacha para um worker gratuito
 * 2. Submete ao Tribunal para validação
 * 3. Se reprovado, o Mestre reescreve a resposta
 * 4. Retry limitado para evitar loops infinitos
 * 
 * @param {string} userMessage - Mensagem do utilizador
 * @param {Object} context - Contexto adicional (histórico, memórias, etc.)
 * @param {Object} options - Opções (skipTribunal, maxRetries, etc.)
 * @returns {Object} { success, response, model, tier, tribunal, retries }
 */
async function processMessage(userMessage, context = {}, options = {}) {
  const maxRetries = options.maxRetries || MAX_PIPELINE_RETRIES;
  const skipTribunal = options.skipTribunal || false;

  // Montar mensagens com contexto
  const messages = [];

  if (context.systemPrompt) {
    messages.push({ role: 'system', content: context.systemPrompt });
  }

  if (context.history && Array.isArray(context.history)) {
    messages.push(...context.history.slice(-20)); // Últimas 20 mensagens
  }

  messages.push({ role: 'user', content: userMessage });

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // PASSO 1: Despachar para worker
    const workerResult = await dispatchToWorker(messages, options);

    if (!workerResult.success) {
      lastError = workerResult.error;
      console.warn(`[KEY-ROTATOR] ⚠️ Pipeline tentativa ${attempt + 1}: Worker falhou — ${workerResult.error}`);
      continue;
    }

    const workerResponse = workerResult.data?.choices?.[0]?.message?.content || '';

    if (!workerResponse.trim()) {
      lastError = 'Worker retornou resposta vazia';
      console.warn(`[KEY-ROTATOR] ⚠️ Pipeline tentativa ${attempt + 1}: Resposta vazia`);
      continue;
    }

    // PASSO 2: Tribunal (se não skipado)
    if (!skipTribunal) {
      const tribunalResult = await submitToTribunal(userMessage, workerResponse, options);

      if (tribunalResult.approved) {
        return {
          success: true,
          response: workerResponse,
          model: workerResult.model,
          provider: workerResult.provider,
          tier: 'worker_approved',
          tribunal: tribunalResult,
          retries: attempt,
        };
      }

      // Reprovado pelo Tribunal — Mestre reescreve
      console.warn(`[KEY-ROTATOR] ⚠️ Tribunal REPROVOU (tentativa ${attempt + 1}) — Mestre vai reescrever`);

      const mestreResult = await callMestre(
        `O Tribunal reprovou a seguinte resposta para a pergunta do utilizador.\n\nPERGUNTA: ${userMessage}\n\nRESPOSTA REPROVADA: ${workerResponse}\n\nRazão da reprovação: Juiz 1: ${tribunalResult.scores.judge1.reason} | Juiz 2: ${tribunalResult.scores.judge2.reason}\n\nEscreva uma resposta melhor e mais precisa.`,
        options
      );

      if (mestreResult.success) {
        const mestreResponse = mestreResult.data?.choices?.[0]?.message?.content || '';
        return {
          success: true,
          response: mestreResponse,
          model: mestreResult.model,
          tier: 'mestre_rewrite',
          tribunal: tribunalResult,
          retries: attempt,
        };
      }

      lastError = 'Mestre falhou ao reescrever';
      continue;
    }

    // Sem Tribunal — aceitar resposta do worker diretamente
    return {
      success: true,
      response: workerResponse,
      model: workerResult.model,
      provider: workerResult.provider,
      tier: 'worker_direct',
      tribunal: null,
      retries: attempt,
    };
  }

  return {
    success: false,
    error: `Pipeline falhou após ${maxRetries} tentativas: ${lastError}`,
    tier: 'failed',
    retries: maxRetries,
  };
}

// ═══════════════════════════════════════════════════════════════
// MÉTRICAS E DIAGNÓSTICO
// ═══════════════════════════════════════════════════════════════

function getMetrics() {
  return {
    circuitBreakers: { ...CIRCUIT_BREAKER },
    keyAvailability: {
      openrouter: OPENROUTER_KEYS.length,
      nvidia_nim: NVIDIA_NIM_KEYS.length,
      routeway: ROUTEWAY_KEYS.length,
      vip_openrouter: VIP_OPENROUTER_KEYS.length,
      vip_nvidia_nim: VIP_NVIDIA_NIM_KEYS.length,
    },
    workerModels: {
      openrouter: WORKER_MODELS.openrouter.length,
      nvidia_nim: WORKER_MODELS.nvidia_nim.length,
      routeway: WORKER_MODELS.routeway.length,
    },
    roundRobinState: { ...workerRoundRobin },
    keyIndexState: { ...keyIndex },
  };
}

function getHealthStatus() {
  const metrics = getMetrics();
  const totalKeys = Object.values(metrics.keyAvailability).reduce((a, b) => a + b, 0);
  const openCircuits = Object.values(metrics.circuitBreakers).filter(cb => cb.open).length;

  return {
    status: totalKeys === 0 ? 'CRITICAL' : openCircuits >= 2 ? 'DEGRADED' : 'HEALTHY',
    totalKeys,
    openCircuits,
    providers: Object.keys(CIRCUIT_BREAKER).map(p => ({
      provider: p,
      circuitOpen: CIRCUIT_BREAKER[p].open,
      failures: CIRCUIT_BREAKER[p].failures,
      keys: metrics.keyAvailability[p] || 0,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Pipeline principal
  processMessage,
  dispatchToWorker,
  submitToTribunal,
  callMestre,
  callModelWithRetry,

  // Diagnóstico
  getMetrics,
  getHealthStatus,

  // Circuit breaker (para uso externo)
  isCircuitOpen,
  recordFailure,
  recordSuccess,

  // Catálogos (para referência)
  WORKER_MODELS,
  TRIBUNAL_MODELS,
  MESTRE_MODELS,
};
