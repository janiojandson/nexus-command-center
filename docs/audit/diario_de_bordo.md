# 📓 Diário de Bordo — Nexus Command Center

---

## Entrada #1 — Auditoria Inicial

**Data:** Sessão anterior
**Operação:** Auditoria arquitectural do repositório
**Resultado:** Identificada Pendência Crítica 1 — Controladores usam `new Map()` para armazenamento em memória RAM volátil. Dados perdidos a cada restart. Necessária migração para PostgreSQL.

---

## Entrada #2 — Migração Map → PostgreSQL (Pendência Crítica 1 Resolvida)

**Data:** Sessão actual
**Operação:** OPERAÇÃO INTEGRAÇÃO PROFUNDA
**Status:** ✅ CONCLUÍDA COM SUCESSO

### Resumo da Execução

Migração completa do armazenamento volátil (`new Map()`) para persistência relacional (PostgreSQL via pacote `pg`). Todos os 3 controladores foram reescritos de raiz.

### Ficheiros Criados / Modificados

| Ficheiro | Acção | Descrição |
|---|---|---|
| `backend/config/database.js` | **CRIADO** | Módulo de pool PostgreSQL com `query()` parametrizada, `transaction()`, `initializeTables()`, e shutdown gracioso |
| `backend/controllers/hipocampoController.js` | **REESCRITO** | CRUD completo de memórias com tabela `hipocampo_memories`, 6 endpoints REST, pesquisa ILIKE |
| `backend/controllers/headhunterController.js` | **REESCRITO** | CRUD completo de agentes com tabela `headhunter_agents`, 8 endpoints REST, filtros dinâmicos |
| `backend/controllers/missionsController.js` | **REESCRITO** | CRUD completo de missões com tabela `missions`, 8 endpoints REST, dashboard com overview |

### Decisões Técnicas

1. **Pool de Conexão** — Usado `pg.Pool` com suporte a `DATABASE_URL` (Railway/Supabase) e configuração por variáveis de ambiente individuais. SSL automático quando `DATABASE_URL` está presente.

2. **Queries Parametrizadas** — TODAS as queries usam placeholders `$1, $2, ...`. ZERO concatenação de strings SQL. Isto elimina completamente SQL injection.

3. **Índices** — Criados índices para campos de busca frequente: `agent_name`, `specialty`, `status`, `priority`, e índice GIN para busca full-text no Hipocampo.

4. **UUIDs** — Gerados via `gen_random_uuid()` no PostgreSQL (mais seguro e consistente que `crypto.randomUUID()` no Node).

5. **JSONB** — Campos de dados flexíveis (`metadata`, `capabilities`, `assigned_agents`, `result`) usam `JSONB` para queries eficientes e validação automática.

6. **Transacções** — Disponibilizada função `transaction()` no módulo de base de dados para operações atómicas multi-tabela.

7. **Paginação** — Todos os endpoints de listagem suportam `limit` e `offset` com valores por defeito (50/0).

8. **Ordenação de Missões** — Ordenação por prioridade (critical → high → medium → low) antes de data, garantindo que missões urgentes aparecem primeiro.

### Endpoints Disponíveis (22 rotas)

**Hipocampo (6 rotas):**
- `POST   /api/hipocampo/memories` — Criar memória
- `GET    /api/hipocampo/memories` — Pesquisar memórias
- `GET    /api/hipocampo/memories/:id` — Obter memória
- `PUT    /api/hipocampo/memories/:id` — Actualizar memória
- `DELETE /api/hipocampo/memories/:id` — Eliminar memória
- `GET    /api/hipocampo/stats` — Estatísticas

**Headhunter (8 rotas):**
- `POST   /api/headhunter/agents` — Registar agente
- `GET    /api/headhunter/agents` — Listar agentes
- `GET    /api/headhunter/agents/:id` — Obter agente
- `PUT    /api/headhunter/agents/:id` — Actualizar agente
- `PATCH  /api/headhunter/agents/:id/deactivate` — Desactivar agente
- `PATCH  /api/headhunter/agents/:id/rate` — Classificar agente
- `GET    /api/headhunter/specialties` — Listar especialidades
- `GET    /api/headhunter/stats` — Estatísticas

**Missions (8 rotas):**
- `POST   /api/missions` — Criar missão
- `GET    /api/missions` — Listar missões
- `GET    /api/missions/:id` — Obter missão
- `PUT    /api/missions/:id` — Actualizar missão
- `PATCH  /api/missions/:id/assign` — Atribuir agentes
- `PATCH  /api/missions/:id/complete` — Completar missão
- `DELETE /api/missions/:id` — Eliminar missão
- `GET    /api/missions/dashboard/overview` — Dashboard

### Pendências Restantes

- [ ] Configurar variáveis de ambiente no Railway (DATABASE_URL, PG_USER, etc.)
- [ ] Executar `initializeTables()` no arranque do servidor (server.js)
- [ ] Actualizar `backend/routes/index.js` para montar os novos routers
- [ ] Testes de integração com banco real
- [ ] Limpar ficheiro de teste `docs/audit/teste_acesso.md`

---

*Próxima entrada será registada aqui.*