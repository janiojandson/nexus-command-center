# 🧠 NEXUS V3 CORE — Guia de Migração

## 📋 Visão Geral

O `_nexus_v3_core/` é a refatoração completa do núcleo do Nexus. Este documento detalha **o que mudou**, **porquê** (quais eram as falhas), e **como plugar tudo ao Nexus Command Center**.

---

## 🔴 Falhas Identificadas no Sistema Anterior

### 1. `src/index.js` — Entry Point Fantasma
**Problema:** O ficheiro era um esqueleto comentado. Nenhuma lógica real, nenhum servidor, nenhum controlador montado. Todo o código estava em blocos `// Example:` comentados.
```
// const app = require('express')();
// app.use('/headhunter', headhunterController);
```
**Impacto:** O bot não tinha ponto de entrada funcional. Era impossível iniciar o sistema.

### 2. Acoplamento Total ao WhatsApp (Baileys)
**Problema:** A lógica do cérebro estava hardcoded ao handler do Baileys. Não existia separação entre "receber mensagem" e "processar mensagem". Se o WhatsApp caísse, o cérebro morria.
**Impacto:** Zero redundância. Sem acesso web, sem API, sem webhooks.

### 3. Sem Roteamento MoE (Mixture of Experts)
**Problema:** Não existia `keyRotator.js`. As chamadas a LLMs usavam uma única chave hardcoded. Se a chave falhasse (429, 404), o sistema abortava sem fallback.
**Impacto:** Falhas catastróficas em produção. Sem rodízio, sem tolerância, sem circuit breaker.

### 4. Sem Tribunal de Qualidade
**Problema:** As respostas dos workers eram aceites directamente, sem validação. Um modelo gratuito podia retornar lixo e esse lixo ia directo ao utilizador.
**Impacto:** Qualidade imprevisível. Sem mecanismo de correção.

### 5. Sem Protecção contra Loops Infinitos
**Problema:** O cérebro não tinha limites de iteração, tokens ou erros consecutivos. Um loop de auto-correcção podia correr para sempre, consumindo tokens e tempo.
**Impacto:** Custos explosivos e bloqueios do sistema.

### 6. Sem Integração com o Command Center
**Problema:** O bot WhatsApp e o dashboard web eram dois mundos isolados. Não havia comunicação entre eles.
**Impacto:** Missões criadas no web não chegavam ao bot. Agentes registados no bot não apareciam no dashboard.

### 7. `backend/routes/routes.js` — Rotas Quebradas
**Problema:** Este ficheiro referenciava métodos que não existiam nos controladores (`getJobs`, `createJob`, `getStatus`, `updateStatusById`). O `routes/index.js` correcto usava `router.use()` com os controladores como sub-routers, mas o `routes.js` tentava montar rotas com métodos inexistentes.
**Impacto:** Rotas duplicadas e inconsistentes.

---

## 🟢 O Que Mudou — Ficheiro a Ficheiro

### `_nexus_v3_core/keyRotator.js`

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Chaves API | 1 chave hardcoded | 5 chaves por provider, rodízio round-robin |
| Providers | 1 (OpenRouter) | 3 (OpenRouter, NVIDIA NIM, Routeway) |
| Modelos gratuitos | 0 | 18 modelos distribuídos por 3 providers |
| Tribunal | Não existia | 2 juízes VIP (Nemotron 3 + DeepSeek v3.2) |
| Mestre | Não existia | Claude 3.5 Sonnet + fallback GLM 5.1 |
| Tolerância a falhas | Nenhuma | Retry em 429/404, próxima chave, próximo modelo |
| Circuit breaker | Não existia | 5 falhas → abre circuito, 60s cooldown |
| Métricas | Nenhuma | Chaves disponíveis, circuitos abertos, round-robin state |

**Modelos Gratuitos Configurados:**

| Provider | Modelos |
|----------|---------|
| **OpenRouter** | GLM 4.5 Air, MiniMax M2.5, Qwen3 Coder 480B A35B, Nemotron 3 Super |
| **NVIDIA NIM** | DeepSeek v3.2, Qwen3 Coder 480B, Devstral 2 123B, Kimi K2 Instruct, DeepSeek v3.1 Terminus, GLM 4.7, DeepSeek v4 Flash, DeepSeek v4 Pro |
| **Routeway** | GPT OSS 120B, Devstral 2, Kimi K2 0905, Nemotron 3 Nano 30B, Step 3.5 Flash, GLM 4.5 Air |

**Pipeline de Processamento:**
```
Mensagem → Worker (gratuito) → Tribunal (2 juízes VIP)
                                      ├─ Ambos aprovam → ✅ Resposta aceite
                                      ├─ Ambos reprovam → ❌ Mestre reescreve
                                      └─ Discordam → ⚖️ Mestre desempata
```

---

### `_nexus_v3_core/cerebro.js`

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Limite de iterações | Nenhum | 15 por sessão |
| Limite de tokens | Nenhum | 60.000 tokens de contexto, 8.000 por iteração |
| Erros consecutivos | Sem limite | 5 erros → abortar e reiniciar sessão |
| Timeout por operação | Nenhum | 45 segundos |
| Arsenal | Hardcoded | Injecção de dependências (testável, modular) |
| Memória | Sem persistência | memoryRetriever + memoryStore via Command Center |
| Parser de acções | Não existia | Suporta `[ACTION:tool\|params]` e JSON |
| Cooldown | Nenhum | 2s entre acções do arsenal |
| Webhooks | Não suportado | `processWebhook()` para eventos do Command Center |
| Sessões | Não existia | Map com métricas, cleanup automático (30min) |

**Arsenal Disponível:**
- `githubScraper` — Lê ficheiros/pastas do GitHub
- `githubEditor` — Cria/edita ficheiros no GitHub
- `memoryRetriever` — Consulta memória vetorial
- `memoryStore` — Armazena conhecimento na memória
- `commandCenterAPI` — Chamadas genéricas ao Command Center

**Protecções contra Loop Infinito:**
1. MAX_ITERATIONS_PER_SESSION = 15
2. MAX_CONTEXT_TOKENS = 60.000
3. MAX_CONSECUTIVE_ERRORS = 5
4. OPERATION_TIMEOUT_MS = 45.000
5. COOLDOWN_BETWEEN_ITERATIONS_MS = 2.000
6. MAX_MEMORY_ENTRIES_PER_SESSION = 50
7. Truncagem automática do histórico (30% quando atinge o limite)

---

### `_nexus_v3_core/index.js`

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Entry point | Comentado, sem funcionalidade | Servidor Express completo + handler WhatsApp |
| Canais de entrada | Apenas WhatsApp | WhatsApp + REST API + Webhooks |
| Autenticação | Nenhuma | JWT + Senha Mestra + X-Nexus-Key |
| Segurança | Nenhuma | Helmet, CORS, Rate Limiting |
| Integração CC | Não existia | Auto-registo, chamadas API, webhooks bidireccionais |
| Graceful shutdown | Não existia | SIGTERM + SIGINT com timeout de 10s |

**Endpoints do Core:**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/nexus/v1/health` | Health check (público) |
| POST | `/nexus/v1/auth/login` | Gerar JWT para o Core |
| POST | `/nexus/v1/chat` | Processar mensagem via cérebro |
| POST | `/nexus/v1/webhook` | Receber eventos do Command Center |
| GET | `/nexus/v1/metrics` | Métricas do keyRotator + sistema |
| GET | `/nexus/v1/sessions` | Listar sessões activas |
| DELETE | `/nexus/v1/session/:id` | Reiniciar sessão específica |

---

## 🔌 Como Plugar ao Nexus Command Center

### Diagrama de Integração

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXUS COMMAND CENTER                      │
│                   (Backend Web - Express)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Headhunter   │  │  Hipocampo   │  │   Missions   │      │
│  │  Controller   │  │  Controller  │  │  Controller  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────┴───────┐                         │
│                    │  Routes/API   │                         │
│                    └───────┬───────┘                         │
│                            │                                 │
│              ┌─────────────┼─────────────┐                   │
│              │             │             │                    │
│         POST /webhook   GET /metrics  POST /agents          │
└──────────────┼────────────┼────────────┼────────────────────┘
               │            │            │
               ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                     NEXUS V3 CORE                            │
│                  (Este directório)                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ keyRotator.js │  │  cerebro.js  │  │  index.js    │      │
│  │ (MoE Router)  │  │ (Autonomous  │  │ (Express +   │      │
│  │               │  │  Loop)       │  │  WhatsApp)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    ARSENAL                           │    │
│  │  githubScraper │ githubEditor │ memoryRetriever     │    │
│  │  memoryStore   │ commandCenterAPI                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    WHATSAPP (Baileys)                        │
│              handleWhatsAppMessage()                         │
└─────────────────────────────────────────────────────────────┘
```

### Passo 1: Configurar Variáveis de Ambiente

No Railway (ou onde o Core V3 for deployado), adicione:

```env
# === CHAVES OPENROUTER (Workers gratuitos) ===
OPENROUTER_KEY_1=sk-or-v1-xxxxx
OPENROUTER_KEY_2=sk-or-v1-xxxxx
OPENROUTER_KEY_3=sk-or-v1-xxxxx
OPENROUTER_KEY_4=sk-or-v1-xxxxx
OPENROUTER_KEY_5=sk-or-v1-xxxxx

# === CHAVES NVIDIA NIM (Workers gratuitos) ===
NVIDIA_NIM_KEY_1=nvapi-xxxxx
NVIDIA_NIM_KEY_2=nvapi-xxxxx
NVIDIA_NIM_KEY_3=nvapi-xxxxx
NVIDIA_NIM_KEY_4=nvapi-xxxxx
NVIDIA_NIM_KEY_5=nvapi-xxxxx

# === CHAVES ROUTEWAY (Workers gratuitos) ===
ROUTEWAY_KEY_1=rw-xxxxx
ROUTEWAY_KEY_2=rw-xxxxx
ROUTEWAY_KEY_3=rw-xxxxx
ROUTEWAY_KEY_4=rw-xxxxx
ROUTEWAY_KEY_5=rw-xxxxx

# === CHAVES VIP (Tribunal + Mestre) ===
VIP_OPENROUTER_KEY_1=sk-or-vip-xxxxx
VIP_OPENROUTER_KEY_2=sk-or-vip-xxxxx
VIP_NVIDIA_NIM_KEY_1=nvapi-vip-xxxxx
VIP_NVIDIA_NIM_KEY_2=nvapi-vip-xxxxx

# === INTEGRAÇÃO COM COMMAND CENTER ===
NEXUS_CC_URL=https://nexus-command-center-production-xxxx.up.railway.app
NEXUS_CC_JWT=<token_jwt_do_command_center>
JWT_SECRET=<segredo_jwt_do_core>

# === CONFIGURAÇÃO DO CORE ===
NEXUS_CORE_PORT=3100
NEXUS_MASTER_PASSWORD=<senha_mestra>
NODE_ENV=production

# === GITHUB (para arsenal) ===
GITHUB_TOKEN=ghp_xxxxx
GITHUB_OWNER=janiojandson
```

### Passo 2: Adicionar Webhook no Command Center

No `backend/routes/index.js` do Command Center, adicionar uma rota de webhook que notifica o Core V3 quando eventos importantes acontecem:

```javascript
// No backend/routes/index.js do Command Center
const NEXUS_CORE_URL = process.env.NEXUS_CORE_URL || 'http://localhost:3100';
const NEXUS_CORE_KEY = process.env.NEXUS_MASTER_PASSWORD;

// Notificar o Core V3 quando uma missão é criada
router.post('/api/missions', async (req, res, next) => {
  // ... lógica existente do controlador ...
  
  // Notificar o Core V3 (fire-and-forget)
  fetch(`${NEXUS_CORE_URL}/nexus/v1/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nexus-Key': NEXUS_CORE_KEY,
    },
    body: JSON.stringify({
      type: 'mission_created',
      missionId: mission.id,
      data: mission,
    }),
  }).catch(err => console.warn('Falha ao notificar Core V3:', err.message));
  
  // ... resposta normal ...
});
```

### Passo 3: Integrar com o Baileys (WhatsApp)

No ficheiro principal do bot WhatsApp, substituir a lógica de processamento:

```javascript
// Antes (acoplado):
// const response = await someHardcodedLogic(message);

// Depois (desacoplado):
const { handleWhatsAppMessage } = require('./_nexus_v3_core/index');

// No handler de mensagens do Baileys:
sock.ev.on('messages.upsert', async ({ messages }) => {
  for (const msg of messages) {
    if (msg.key.fromMe) continue;
    
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    const from = msg.key.remoteJid;
    
    const result = await handleWhatsAppMessage({ from, text });
    
    if (result.sendToWhatsApp && result.response) {
      await sock.sendMessage(from, { text: result.response });
    }
  }
});
```

### Passo 4: Deploy no Railway

1. Criar um novo serviço no Railway para o Core V3
2. Apontar para o mesmo repositório, mas com start command:
   ```
   node _nexus_v3_core/index.js
   ```
   Ou adicionar ao `package.json`:
   ```json
   {
     "scripts": {
       "start:core": "node _nexus_v3_core/index.js"
     }
   }
   ```
3. Configurar as variáveis de ambiente listadas no Passo 1
4. O Core V3 vai auto-registar-se no Command Center na inicialização

### Passo 5: Verificar Integração

```bash
# Health check
curl https://seu-core-v3.up.railway.app/nexus/v1/health

# Login
curl -X POST https://seu-core-v3.up.railway.app/nexus/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"SUA_SENHA_MESTRA"}'

# Chat
curl -X POST https://seu-core-v3.up.railway.app/nexus/v1/chat \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message":"Olá, Nexus!","sessionId":"test_001"}'

# Métricas
curl https://seu-core-v3.up.railway.app/nexus/v1/metrics \
  -H "Authorization: Bearer SEU_JWT"
```

---

## 🏗️ Decisões Arquiteturais

### 1. Injecção de Dependências no Arsenal
**Decisão:** O arsenal usa `_injected` como slot para implementações reais.
**Razão:** Permite testar o cérebro com mocks, trocar implementações sem alterar o código do cérebro, e manter o cerebro.js agnóstico em relação a APIs externas.

### 2. Circuit Breaker por Provider
**Decisão:** Cada provider (OpenRouter, NVIDIA NIM, Routeway) tem o seu próprio circuit breaker.
**Razão:** Se a OpenRouter cai, não faz sentido parar de tentar a NVIDIA NIM. Circuit breakers isolados permitem degradação graciosa.

### 3. Tribunal Assíncrono com Promise.allSettled
**Decisão:** Os dois juízes correm em paralelo, não em série.
**Razão:** Reduz a latência do Tribunal de ~4s (série) para ~2s (paralelo). Se um juiz falhar, o outro ainda pode dar veredito.

### 4. Sessões em Memória (Map)
**Decisão:** Sessões guardadas num `Map` em memória, com cleanup automático.
**Razão:** Para o MVP, Redis seria overengineering. O Map é suficiente para ~1000 sessões simultâneas. Se escalar, migrar para Redis é trivial (a interface não muda).

### 5. Directório `_nexus_v3_core/` Separado
**Decisão:** Todo o código novo fica em `_nexus_v3_core/`, sem tocar em `src/` ou `backend/`.
**Razão:** Regra de segurança do Sócio — evitar que o auto-deploy do Railway mate o processo existente. O novo core pode ser activado independentemente.

### 6. Rate Limiting em Memória
**Decisão:** Rate limiting simples com `Map` e `setInterval`.
**Razão:** Para o Core V3, o `express-rate-limit` seria uma dependência extra. O Map com cleanup a cada 15 minutos é suficiente para proteger contra abuso básico.

### 7. Webhook Fire-and-Forget
**Decisão:** O Command Center notifica o Core V3 via webhook sem esperar resposta.
**Razão:** A criação de uma missão não deve ser bloqueada pela análise do cérebro. O Core processa o evento de forma assíncrona.

---

## 📊 Comparação de Performance Estimada

| Métrica | Sistema Anterior | V3 Core |
|---------|-----------------|---------|
| Disponibilidade | ~60% (1 chave) | ~99% (5 chaves × 3 providers) |
| Latência média | N/A (sem fallback) | ~3s (worker) + ~2s (tribunal) |
| Qualidade da resposta | Variável | Validada por 2 juízes + mestre |
| Tolerância a falhas | 0% | 429/404 → retry automático |
| Tempo até abortar loop | ∞ (sem limite) | <30s (5 erros consecutivos) |
| Canais de entrada | 1 (WhatsApp) | 3 (WhatsApp + REST + Webhook) |
| Observabilidade | 0 | Health + Métricas + Sessões |

---

## ⚠️ Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Chaves gratuitas podem ser descontinuadas | Circuit breaker + 3 providers independentes |
| Tribunal pode adicionar latência | `skipTribunal: true` para mensagens simples |
| Sessões em memória perdidas no restart | Histórico persistido no Command Center via memoryStore |
| Core V3 e Command Center em ciclos de webhook | Webhooks são fire-and-forget, sem recursão |
| Rate limiting em memória não funciona com múltiplas instâncias | Migrar para Redis quando escalar |

---

## 📁 Estrutura Final do `_nexus_v3_core/`

```
_nexus_v3_core/
├── keyRotator.js      # MoE Router: workers + tribunal + mestre + circuit breaker
├── cerebro.js         # Loop autónomo: sessões + arsenal + protecções
├── index.js           # Entry point: Express + WhatsApp + integração CC
└── README_MIGRACAO.md # Este ficheiro
```

---

## 🚀 Próximos Passos (Pós-Migração)

1. **Activar o Core V3** — Configurar variáveis de ambiente e fazer deploy
2. **Testar pipeline completo** — Enviar mensagem via WhatsApp e verificar Worker → Tribunal → Resposta
3. **Configurar webhooks bidireccionais** — Command Center → Core V3 e vice-versa
4. **Migrar sessões para Redis** — Quando houver mais de 100 utilizadores simultâneos
5. **Adicionar mais modelos** — Expandir WORKER_MODELS conforme novos modelos gratuitos surgem
6. **Implementar assinatura de webhooks** — HMAC para validar que webhooks vêm realmente do Command Center
7. **Dashboard de métricas** — Frontend no Command Center para visualizar métricas do Core V3

---

*Documento gerado pela Operação Omega — Nexus V3 Core*
*Data: 2025-01*
*Versão: 3.0.0*
