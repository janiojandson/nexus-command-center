/**
 * ============================================================
 * NEXUS COMMAND CENTER — Hipocampo Controller (BLINDADO)
 * ============================================================
 * MIGRAÇÃO COMPLETA: new Map() → PostgreSQL (pg)
 * Tabela: hipocampo_memories
 * Queries 100% parametrizadas ($1, $2, ...) — ZERO concatenação.
 * INPUT VALIDADO: Todos os campos verificados e sanitizados.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { validate, sanitizeString } = require('../middleware/validate');

// ── Schemas de Validação ──────────────────────────────────────
const storeMemorySchema = {
  agent_name: { type: 'string', required: true, minLength: 1, maxLength: 100, sanitize: true },
  query: { type: 'string', required: true, minLength: 1, maxLength: 5000, sanitize: true },
  response: { type: 'string', required: true, minLength: 1, maxLength: 50000, sanitize: true },
  metadata: { type: 'object', required: false },
};

const updateMemorySchema = {
  response: { type: 'string', required: false, minLength: 1, maxLength: 50000, sanitize: true },
  metadata: { type: 'object', required: false },
};

// ── CRUD: Memórias do Hipocampo ───────────────────────────────

/**
 * Armazena uma nova memória no Hipocampo.
 */
const storeMemory = async (agentName, queryText, response, metadata = {}) => {
  const result = await query(
    `INSERT INTO hipocampo_memories (agent_name, query, response, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [sanitizeString(agentName), sanitizeString(queryText), sanitizeString(response), JSON.stringify(metadata)]
  );
  return result.rows[0];
};

/**
 * Obtém uma memória pelo ID.
 */
const getMemory = async (id) => {
  const result = await query(
    `SELECT * FROM hipocampo_memories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Pesquisa memórias por agente e/ou termo de busca.
 */
const searchMemories = async (agentName, searchTerm, limit = 50, offset = 0) => {
  let sql = `SELECT * FROM hipocampo_memories WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (agentName) {
    sql += ` AND agent_name = $${paramIndex++}`;
    params.push(agentName);
  }

  if (searchTerm) {
    sql += ` AND (query ILIKE $${paramIndex} OR response ILIKE $${paramIndex})`;
    params.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Limitar paginação
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);
  const safeOffset = Math.max(0, parseInt(offset) || 0);

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(safeLimit, safeOffset);

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Actualiza uma memória existente.
 */
const updateMemory = async (id, response, metadata) => {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  if (response !== undefined) {
    fields.push(`response = $${paramIndex++}`);
    params.push(sanitizeString(response));
  }

  if (metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    params.push(JSON.stringify(metadata));
  }

  if (fields.length === 0) {
    return getMemory(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE hipocampo_memories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);
  return result.rows[0] || null;
};

/**
 * Elimina uma memória pelo ID.
 */
const deleteMemory = async (id) => {
  const result = await query(
    `DELETE FROM hipocampo_memories WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Obtém estatísticas das memórias.
 */
const getMemoryStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_memories,
      COUNT(DISTINCT agent_name) as unique_agents,
      MAX(created_at) as last_memory
    FROM hipocampo_memories
  `);
  return result.rows[0];
};

// ── Rotas Express ──────────────────────────────────────────────

// Pesquisar memórias
router.get('/', async (req, res) => {
  try {
    const { agent, search, limit, offset } = req.query;
    const memories = await searchMemories(agent, search, limit, offset);
    res.json({ success: true, data: memories });
  } catch (error) {
    console.error('[NEXUS-HIPO] ❌ Erro ao pesquisar memórias:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Estatísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await getMemoryStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[NEXUS-HIPO] ❌ Erro ao obter estatísticas:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Obter memória por ID
router.get('/:id', async (req, res) => {
  try {
    const memory = await getMemory(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memória não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[NEXUS-HIPO] ❌ Erro ao obter memória:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Criar memória
router.post('/', validate(storeMemorySchema, 'body'), async (req, res) => {
  try {
    const { agent_name, query, response, metadata } = req.body;
    const memory = await storeMemory(agent_name, query, response, metadata);
    res.status(201).json({ success: true, data: memory });
  } catch (error) {
    console.error('[NEXUS-HIPO] ❌ Erro ao criar memória:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Actualizar memória
router.put('/:id', validate(updateMemorySchema, 'body'), async (req, res) => {
  try {
    const { response, metadata } = req.body;
    const memory = await updateMemory(req.params.id, response, metadata);
    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memória não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[NEXUS-HIPO] ❌ Erro ao actualizar memória:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Eliminar memória
router.delete('/:id', async (req, res) => {
  try {
    const memory = await deleteMemory(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memória não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[NEXUS-HIPO] ❌ Erro ao eliminar memória:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

module.exports = { router, storeMemory, getMemory, searchMemories, updateMemory, deleteMemory, getMemoryStats };
