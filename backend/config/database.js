/**
 * ============================================================
 * NEXUS COMMAND CENTER — Módulo de Conexão PostgreSQL
 * ============================================================
 * Substitui toda a lógica de new Map() por persistência real.
 * Pool de conexão com queries parametrizadas ($1, $2, ...).
 * ZERO concatenação de strings em SQL. ZERO armazenamento volátil.
 * ============================================================
 */

const { Pool } = require('pg');

// ── Configuração do Pool ──────────────────────────────────────
const poolConfig = {
  user: process.env.PG_USER || 'nexus',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'nexus_command_center',
  password: process.env.PG_PASSWORD || '',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  max: 20,                     // máximo de clientes no pool
  idleTimeoutMillis: 30000,    // 30s antes de fechar conexão inactiva
  connectionTimeoutMillis: 5000 // 5s de timeout para nova conexão
};

// Se DATABASE_URL existir (Railway/Heroku), ela tem prioridade
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  poolConfig.ssl = {
    rejectUnauthorized: false  // necessário para Railway/Supabase
  };
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
    console.error(`[NEXUS-DB]   SQL: ${text}`);
    console.error(`[NEXUS-DB]   Params: ${JSON.stringify(params)}`);
    throw error;
  }
}

// ── Função de Transacção ──────────────────────────────────────
/**
 * Executa múltiplas queries dentro de uma transacção.
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
    await client.query('ROLLBACK');
    console.error('[NEXUS-DB] ❌ Transacção revertida:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// ── Inicialização das Tabelas ─────────────────────────────────
/**
 * Cria as tabelas necessárias se não existirem.
 * Executado uma vez no arranque do servidor.
 */
async function initializeTables() {
  console.log('[NEXUS-DB] 🔧 A inicializar tabelas...');

  await query(`
    CREATE TABLE IF NOT EXISTS hipocampo_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_name VARCHAR(255) NOT NULL,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hipocampo_agent ON hipocampo_memories(agent_name);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hipocampo_search ON hipocampo_memories USING gin(to_tsvector('portuguese', query));
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS headhunter_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      specialty VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'available',
      capabilities JSONB DEFAULT '[]',
      rating NUMERIC(3,2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_headhunter_specialty ON headhunter_agents(specialty);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_headhunter_status ON headhunter_agents(status);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium',
      assigned_agents JSONB DEFAULT '[]',
      result JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_missions_priority ON missions(priority);
  `);

  console.log('[NEXUS-DB] ✅ Todas as tabelas inicializadas com sucesso');
}

// ── Shutdown gracioso ─────────────────────────────────────────
async function closePool() {
  console.log('[NEXUS-DB] 🔒 A fechar pool de conexões...');
  await pool.end();
  console.log('[NEXUS-DB] ✅ Pool fechado com sucesso');
}

module.exports = {
  pool,
  query,
  transaction,
  initializeTables,
  closePool
};