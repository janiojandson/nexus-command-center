# 🔴 CHECKPOINT DE AUDITORIA — Nexus Command Center
> Última atualização: Operação de Retoma
> Regra: Nenhum item [PENDENTE] pode existir ao final da operação.

---

## LISTA DE VULNERABILIDADES CRÍTICAS

### Erro 1 — O FANTASMA DO MAP [PENDENTE]
- **Ficheiro:** `backend/services/memory.js`
- **Problema:** Usa `new Map()` para persistência de vetores. Dados são voláteis — perdidos a cada restart. O módulo `config/database.js` já tem o pool PostgreSQL configurado, mas `memory.js` ignora-o completamente.
- **Impacto:** Perda total de dados em memória vetorial. Impossível escalar.

### Erro 2 — A PORTA GIRATÓRIA JWT [PENDENTE]
- **Ficheiro:** `backend/middleware/requireAuth.js`
- **Problema:** Referencia `jwt.verify()` sem importar o módulo `jsonwebtoken`. Vai crashar em runtime. Além disso, importa `{ authenticate }` de `./auth`, mas `auth.js` exporta `authMiddleware`, não `authenticate`.
- **Impacto:** Middleware de autenticação secundário inoperante. Rotas que usem `requireAuth` vão crashar.

### Erro 3 — O PORTÃO ABERTO DE CORS [PENDENTE]
- **Ficheiro:** `backend/config/server.js`
- **Problema:** Usa `app.use(cors())` sem whitelist. Qualquer domínio pode fazer requisições à API. O `server.js` principal tem CORS restrito, mas este ficheiro alternativo está completamente aberto.
- **Impacto:** Bypass total de CORS se este ficheiro for carregado em vez do principal.

### Erro 4 — RATE LIMITING AUSENTE NO CONFIG/SERVER [PENDENTE]
- **Ficheiro:** `backend/config/server.js`
- **Problema:** Não aplica `express-rate-limit`. O `server.js` principal tem, mas este ficheiro alternativo não.
- **Impacto:** Ataques de força bruta e DDoS sem travão se este config for usado.

### Erro 5 — AUTH MIDDLEWARE NÃO APLICADO NO CONFIG/SERVER [PENDENTE]
- **Ficheiro:** `backend/config/server.js`
- **Problema:** Importa `{ authenticate }` de `../middleware/auth` mas nunca o aplica como middleware nas rotas. Todas as rotas ficam públicas.
- **Impacto:** Qualquer request sem token acede a toda a API.

### Erro 6 — IDs NÃO-SEGUROS NO MEMORY SERVICE [PENDENTE]
- **Ficheiro:** `backend/services/memory.js`
- **Problema:** Usa `Date.now().toString()` como ID. Colisões em requisições concorrentes. Não é criptograficamente seguro.
- **Impacto:** Sobrescrita de dados, corrupção de memória vetorial.

### Erro 7 — VALIDAÇÃO DE INPUT AUSENTE NO MEMORY SERVICE [PENDENTE]
- **Ficheiro:** `backend/services/memory.js`
- **Problema:** O método `store()` aceita qualquer `vectorData` sem validação de schema, tipo ou tamanho.
- **Impacto:** Injeção de dados malformados, potencial DoS por payloads gigantes.

### Erro 8 — CORS PERMITE REQUESTS SEM ORIGIN [PENDENTE]
- **Ficheiro:** `backend/server.js`
- **Problema:** A callback do CORS retorna `callback(null, true)` para requests sem origin (`if (!origin)`). Postman, curl e scripts maliciosos bypassam a whitelist.
- **Impacto:** A whitelist de CORS é ineficaz contra ferramentas automatizadas.

### Erro 9 — DUPLICAÇÃO DE CONFIGURAÇÃO DE SERVIDOR [PENDENTE]
- **Ficheiro:** `backend/server.js` vs `backend/config/server.js`
- **Problema:** Existem dois ficheiros de configuração do servidor com configurações contraditórias. O principal é seguro, o alternativo é vulnerável.
- **Impacto:** Confusão arquitetural, risco de deploy do ficheiro errado.

### Erro 10 — SEM PROTEÇÃO CSRF [PENDENTE]
- **Ficheiro:** `backend/server.js`
- **Problema:** Nenhum token CSRF ou validação de SameSite em cookies.
- **Impacto:** Ataques de Cross-Site Request Forgery em rotas autenticadas.

### Erro 11 — SEM LIMITE DE TAMANHO DE REQUEST BODY [PENDENTE]
- **Ficheiro:** `backend/server.js`
- **Problema:** `bodyParser` e `express.json()` sem limite explícito de payload.
- **Impacto:** DoS por payloads gigantes (body bomb).

### Erro 12 — VAZAMENTO DE STACK TRACE EM PRODUÇÃO [PENDENTE]
- **Ficheiro:** `backend/server.js`
- **Problema:** O handler de erro global faz `console.error(err.stack)` mas não sanitiza a resposta. Em ambientes mal configurados, o stack pode vazar para o cliente.
- **Impacto:** Exposição de internals do sistema.

### Erro 13 — SEM LOG DE FALHAS DE AUTENTICAÇÃO [PENDENTE]
- **Ficheiro:** `backend/middleware/auth.js`
- **Problema:** Tokens inválidos ou expirados são rejeitados mas não há log de segurança para detectar ataques.
- **Impacto:** Impossível detectar força bruta ou tokens roubados em tempo real.

### Erro 14 — SEM HEALTH CHECK DO BANCO DE DADOS [PENDENTE]
- **Ficheiro:** `backend/config/database.js`
- **Problema:** Não existe endpoint ou mecanismo para verificar se o PostgreSQL está acessível.
- **Impacto:** Falhas silenciosas de conexão, debug impossível em produção.

### Erro 15 — EXPORTAÇÃO INCONSISTENTE DO MIDDLEWARE DE AUTH [PENDENTE]
- **Ficheiro:** `backend/middleware/auth.js` vs `backend/middleware/requireAuth.js`
- **Problema:** `auth.js` exporta `module.exports = authMiddleware` (default), mas `requireAuth.js` tenta importar `{ authenticate }` (named). Incompatibilidade de exportação.
- **Impacto:** `requireAuth.js` recebe `undefined`, middleware nunca é aplicado.

---

## PROGRESSO
- [PENDENTE]: 15/15
- [RESOLVIDO]: 0/15