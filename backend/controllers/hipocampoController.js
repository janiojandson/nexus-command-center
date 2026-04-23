/**
 * ============================================================
 * NEXUS COMMAND CENTER — Hipocampo Controller
 * ============================================================
 * MIGRAÇÃO COMPLETA: new Map() → PostgreSQL (pg)
 * Tabela: hipocampo_memories
 * Queries 100% parametrizadas ($1, $2, ...) — ZERO concatenação.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');

// ── CRUD: Memórias do Hipocampo ───────────────────────────────

/**
 * Armazena uma nova memória no Hipocampo.
 * POST /api/hipocampo/memories
 */
const storeMemory = async (agentName, queryText, response, metadata = {}) => {
  const result = await query(
    `INSERT INTO hipocampo_memories (agent_name, query, response, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [agentName, queryText, response, JSON.stringify(metadata)]
  );
  return result.rows[0];
};

/**
 * Obtém uma memória pelo ID.
 * GET /api/hipocampo/memories/:id
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
 * GET /api/hipocampo/memories?agent=...&search=...&limit=...&offset=...
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

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Actualiza uma memória existente.
 * PUT /api/hipocampo/memories/:id
 */
const updateMemory = async (id, response, metadata) => {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  if (response !== undefined) {
    fields.push(`response = $${paramIndex++}`);
    params.push(response);
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
 * DELETE /api/hipocampo/memories/:id
 */
const deleteMemory = async (id) => {
  const result = await query(
    `DELETE FROM hipocampo_memories WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Conta o total de memórias (opcionalmente filtrado por agente).
 */
const countMemories = async (agentName) => {
  let sql = `SELECT COUNT(*) as total FROM hipocampo_memories`;
  const params = [];

  if (agentName) {
    sql += ` WHERE agent_name = $1`;
    params.push(agentName);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].total, 10);
};

// ── Rotas Express ─────────────────────────────────────────────

// POST /api/hipocampo/memories — Criar memória
router.post('/memories', async (req, res) => {
  try {
    const { agentName, query: queryText, response, metadata } = req.body;

    if (!agentName || !queryText || !response) {
      return res.status(400).json({
        error: 'Campos obrigatórios: agentName, query, response'
      });
    }

    const memory = await storeMemory(agentName, queryText, response, metadata);
    res.status(201).json({ success: true, data: memory });
  } catch (error) {
    console.error('[HIPOCAMPO] Erro ao armazenar memória:', error.message);
    res.status(500).json({ error: 'Falha ao armazenar memória', details: error.message });
  }
});

// GET /api/hipocampo/memories/:id — Obter memória por ID
router.get('/memories/:id', async (req, res) => {
  try {
    const memory = await getMemory(req.params.id);
    if (!memory) {
      return res.status(404).json({ error: 'Memória não encontrada' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[HIPOCAMPO] Erro ao obter memória:', error.message);
    res.status(500).json({ error: 'Falha ao obter memória', details: error.message });
  }
});

// GET /api/hipocampo/memories — Pesquisar memórias
router.get('/memories', async (req, res) => {
  try {
    const { agent: agentName, search: searchTerm, limit = '50', offset = '0' } = req.query;
    const memories = await searchMemories(
      agentName,
      searchTerm,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );
    const total = await countMemories(agentName);
    res.json({ success: true, data: memories, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (error) {
    console.error('[HIPOCAMPO] Erro ao pesquisar memórias:', error.message);
    res.status(500).json({ error: 'Falha ao pesquisar memórias', details: error.message });
  }
});

// PUT /api/hipocampo/memories/:id — Actualizar memória
router.put('/memories/:id', async (req, res) => {
  try {
    const { response, metadata } = req.body;
    const memory = await updateMemory(req.params.id, response, metadata);
    if (!memory) {
      return res.status(404).json({ error: 'Memória não encontrada' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[HIPOCAMPO] Erro ao actualizar memória:', error.message);
    res.status(500).json({ error: 'Falha ao actualizar memória', details: error.message });
  }
});

// DELETE /api/hipocampo/memories/:id — Eliminar memória
router.delete('/memories/:id', async (req, res) => {
  try {
    const memory = await deleteMemory(req.params.id);
    if (!memory) {
      return res.status(404).json({ error: 'Memória não encontrada' });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('[HIPOCAMPO] Erro ao eliminar memória:', error.message);
    res.status(500).json({ error: 'Falha ao eliminar memória', details: error.message });
  }
});

// GET /api/hipocampo/stats — Estatísticas do Hipocampo
router.get('/stats', async (req, res) => {
  try {
    const total = await countMemories();
    const byAgent = await query(
      `SELECT agent_name, COUNT(*) as count FROM hipocampo_memories GROUP BY agent_name ORDER BY count DESC`
    );
    res.json({ success: true, data: { total, byAgent: byAgent.rows } });
  } catch (error) {
    console.error('[HIPOCAMPO] Erro ao obter estatísticas:', error.message);
    res.status(500).json({ error: 'Falha ao obter estatísticas', details: error.message });
  }
});

module.exports = {
  router,
  storeMemory,
  getMemory,
  searchMemories,
  updateMemory,
  deleteMemory,
  countMemories
};