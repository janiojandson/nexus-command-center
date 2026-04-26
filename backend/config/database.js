/**
 * ============================================================
 * NEXUS COMMAND CENTER — Módulo de Conexão PostgreSQL (BLINDADO)
 * ============================================================
 * Substitui toda a lógica de new Map() por persistência real.
 * Pool de conexão com queries parametrizadas ($1, $2, ...).
 * ZERO concatenação de strings em SQL. ZERO armazenamento volátil.
 * 
 * SEGURANÇA: ZERO fallbacks hardcoded. Env vars obrigatórias.
 * MONITORIZAÇÃO: Pool metrics expostos para diagnóstico.
 * ============================================================
 */

const { Pool } = require('pg');

// ── Validação de Variáveis de Ambiente Obrigatórias ────────────
const REQUIRED_ENV_VARS = ['JWT_SECRET'];
const DB_ENV_VARS = ['PG_USER', 'PG_HOST', 'PG_DATABASE', 'PG_PASSWORD'];

function validateEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[NEXUS-DB] ❌ Variáveis de ambiente obrigatórias em falta: ${missing.join(', ')}`);
    // Não fazemos process.exit() — deixamos o servidor arrancar mas as rotas vão falhar
  }
}

validateEnvVars();

// ── Configuração do Pool ──────────────────────────────────────
const poolConfig = {
  // SEM fallbacks hardcoded — env vars são obrigatórias
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,    // 30s antes de fechar conexão inactiva
  connectionTimeoutMillis: 5000, // 5s de timeout para nova conexão
};

// Se DATABASE_URL existir (Railway/Heroku), ela tem prioridade
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  poolConfig.ssl = {
    rejectUnauthorized: false  // necessário para Railway/Supabase
  };
}

// Validar que temos configuração mínima
if (!process.env.DATABASE_URL && !process.env.PG_HOST) {
  console.error('[NEXUS-DB] ❌ Nenhuma configuração de base de dados encontrada! Defina DATABASE_URL ou PG_HOST/PG_USER/PG_DATABASE/PG_PASSWORD');
}

const pool = new Pool(poolConfig);

// ── Eventos do Pool ───────────────────────────────────────────
pool.on('connect', () => {
  console.log('[NEXUS-DB] ✅ Nova conexão estabelecida com PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[NEXUS-DB] ❌ Erro inesperado no cliente idle:', err.message);
  // Não fazemos process.exit() em produção — deixamos o pool recuperar
});

pool.on('remove', () => {
  // Cliente removido do pool (normal durante idle timeout)
});

// ── Monitorização do Pool ─────────────────────────────────────
/**
 * Retorna métricas actuais do pool de conexões.
 * Útil para diagnóstico de pool leaks.
 */
function getPoolMetrics() {
  return {
    totalCount: pool.totalCount,     // Total de clientes no pool
    idleCount: pool.idleCount,       // Clientes inactivos disponíveis
    waitingCount: pool.waitingCount, // Requisições à espera de cliente
    maxConnections: poolConfig.max,
    utilizationPercent: pool.totalCount > 0 
      ? ((pool.totalCount - pool.idleCount) / poolConfig.max * 100).toFixed(1) 
      : '0.0',
  };
}

// Log de métricas do pool a cada 60 segundos
setInterval(() => {
  const metrics = getPoolMetrics();
  if (metrics.waitingCount > 0 || metrics.totalCount > metrics.maxConnections * 0.8) {
    console.warn(`[NEXUS-DB] ⚠️ Pool sob pressão: ${JSON.stringify(metrics)}`);
  } else {
    console.log(`[NEXUS-DB] 📊 Pool: ${metrics.idleCount}/${metrics.totalCount} idle | ${metrics.waitingCount} waiting | ${metrics.utilizationPercent}% utilização`);
  }
}, 60000);

// ── Função de Query Parametrizada ─────────────────────────────
/**
 * Executa uma query SQL parametrizada de forma segura.
 * @param {string} text  — A query SQL com placeholders $1, $2, ...
 * @param {Array}  params — Os parâmetros para substituir os placeholders
 * @returns {Promise<object>} — Resultado do pg (rows, rowCount, etc.)
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[NEXUS-DB] 📊 Query executada em ${duration}ms | ${text.split(' ')[0].toUpperCase()} | ${result.rowCount} linhas`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[NEXUS-DB] ❌ Query falhou em ${duration}ms:`, error.message);
    // NÃO logar params em produção (podem conter dados sensíveis)
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[NEXUS-DB]   SQL: ${text}`);
      console.error(`[NEXUS-DB]   Params: ${JSON.stringify(params)}`);
    }
    throw error;
  }
}

// ── Função de Transacção ──────────────────────────────────────
/**
 * Executa múltiplas queries dentro de uma transacção.
 * Garante que o client é SEMPRE libertado, mesmo em caso de erro.
 * @param {Function} callback — Função async que recebe o client e executa queries
 * @returns {Promise<any>} — Resultado do callback
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(rollbackErr => {
      console.error('[NEXUS-DB] ❌ ROLLBACK falhou:', rollbackErr.message);
    });
    throw error;
  } finally {
    // GARANTIA: Client é sempre libertado
    client.release();
  }
}

// ── Health Check da Base de Dados ─────────────────────────────
/**
 * Verifica se a conexão ao PostgreSQL está funcional.
 * @returns {Promise<{ok: boolean, latency: number, metrics: object}>}
 */
async function healthCheck() {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return {
      ok: true,
      latency: Date.now() - start,
      metrics: getPoolMetrics(),
    };
  } catch (error) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: error.message,
      metrics: getPoolMetrics(),
    };
  }
}

// ── Graceful Shutdown ─────────────────────────────────────────
/**
 * Fecha o pool de conexões de forma graciosa.
 * Deve ser chamado no shutdown do servidor.
 */
async function closePool() {
  console.log('[NEXUS-DB] 🔒 Fechando pool de conexões...');
  try {
    await pool.end();
    console.log('[NEXUS-DB] ✅ Pool fechado com sucesso');
  } catch (error) {
    console.error('[NEXUS-DB] ❌ Erro ao fechar pool:', error.message);
  }
}

module.exports = { query, transaction, healthCheck, getPoolMetrics, closePool, pool };
