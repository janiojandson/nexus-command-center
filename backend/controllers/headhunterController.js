/**
 * ============================================================
 * NEXUS COMMAND CENTER — Headhunter Controller
 * ============================================================
 * MIGRAÇÃO COMPLETA: new Map() → PostgreSQL (pg)
 * Tabela: headhunter_agents
 * Queries 100% parametrizadas ($1, $2, ...) — ZERO concatenação.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// ── CRUD: Agentes do Headhunter ────────────────────────────────

/**
 * Regista um novo agente no Headhunter.
 * POST /api/headhunter/agents
 */
const registerAgent = async (name, specialty, capabilities = []) => {
  const result = await query(
    `INSERT INTO headhunter_agents (name, specialty, capabilities, status, rating, created_at, updated_at)
     VALUES ($1, $2, $3, 'available', 0.00, NOW(), NOW())
     RETURNING *`,
    [name, specialty, JSON.stringify(capabilities)]
  );
  return result.rows[0];
};

/**
 * Obtém um agente pelo ID.
 * GET /api/headhunter/agents/:id
 */
const getAgent = async (id) => {
  const result = await query(
    `SELECT * FROM headhunter_agents WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Lista agentes com filtros dinâmicos e paginação.
 * GET /api/headhunter/agents?specialty=...&status=...&limit=...&offset=...
 */
const listAgents = async (filters = {}, limit = 50, offset = 0) => {
  let sql = `SELECT * FROM headhunter_agents WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (filters.specialty) {
    sql += ` AND specialty = $${paramIndex++}`;
    params.push(filters.specialty);
  }

  if (filters.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters.minRating) {
    sql += ` AND rating >= $${paramIndex++}`;
    params.push(parseFloat(filters.minRating));
  }

  sql += ` ORDER BY rating DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Actualiza um agente existente (campos dinâmicos).
 * PUT /api/headhunter/agents/:id
 */
const updateAgent = async (id, updates = {}) => {
  const allowedFields = ['name', 'specialty', 'capabilities', 'status'];
  const fields = [];
  const params = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'capabilities') {
        fields.push(`capabilities = $${paramIndex++}`);
        params.push(JSON.stringify(updates[field]));
      } else {
        fields.push(`${field} = $${paramIndex++}`);
        params.push(updates[field]);
      }
    }
  }

  if (fields.length === 0) {
    return getAgent(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE headhunter_agents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);
  return result.rows[0] || null;
};

/**
 * Desactiva um agente (status = 'inactive').
 * PATCH /api/headhunter/agents/:id/deactivate
 */
const deactivateAgent = async (id) => {
  const result = await query(
    `UPDATE headhunter_agents SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Atribui uma classificação a um agente.
 * PATCH /api/headhunter/agents/:id/rate
 */
const rateAgent = async (id, rating) => {
  const clampedRating = Math.max(0, Math.min(5, parseFloat(rating)));
  const result = await query(
    `UPDATE headhunter_agents SET rating = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [clampedRating, id]
  );
  return result.rows[0] || null;
};

/**
 * Conta o total de agentes (opcionalmente filtrado).
 */
const countAgents = async (filters = {}) => {
  let sql = `SELECT COUNT(*) as total FROM headhunter_agents WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (filters.specialty) {
    sql += ` AND specialty = $${paramIndex++}`;
    params.push(filters.specialty);
  }

  if (filters.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].total, 10);
};

/**
 * Lista todas as especialidades disponíveis.
 */
const listSpecialties = async () => {
  const result = await query(
    `SELECT DISTINCT specialty, COUNT(*) as count FROM headhunter_agents GROUP BY specialty ORDER BY count DESC`
  );
  return result.rows;
};

// ── Rotas Express ─────────────────────────────────────────────

// POST /api/headhunter/agents — Registar agente
router.post('/agents', async (req, res) => {
  try {
    const { name, specialty, capabilities } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({
        error: 'Campos obrigatórios: name, specialty'
      });
    }

    const agent = await registerAgent(name, specialty, capabilities);
    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao registar agente:', error.message);
    res.status(500).json({ error: 'Falha ao registar agente', details: error.message });
  }
});

// GET /api/headhunter/agents/:id — Obter agente por ID
router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao obter agente:', error.message);
    res.status(500).json({ error: 'Falha ao obter agente', details: error.message });
  }
});

// GET /api/headhunter/agents — Listar agentes com filtros
router.get('/agents', async (req, res) => {
  try {
    const { specialty, status, minRating, limit = '50', offset = '0' } = req.query;
    const filters = { specialty, status, minRating };
    const agents = await listAgents(filters, parseInt(limit, 10), parseInt(offset, 10));
    const total = await countAgents(filters);
    res.json({ success: true, data: agents, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao listar agentes:', error.message);
    res.status(500).json({ error: 'Falha ao listar agentes', details: error.message });
  }
});

// PUT /api/headhunter/agents/:id — Actualizar agente
router.put('/agents/:id', async (req, res) => {
  try {
    const agent = await updateAgent(req.params.id, req.body);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao actualizar agente:', error.message);
    res.status(500).json({ error: 'Falha ao actualizar agente', details: error.message });
  }
});

// PATCH /api/headhunter/agents/:id/deactivate — Desactivar agente
router.patch('/agents/:id/deactivate', async (req, res) => {
  try {
    const agent = await deactivateAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao desactivar agente:', error.message);
    res.status(500).json({ error: 'Falha ao desactivar agente', details: error.message });
  }
});

// PATCH /api/headhunter/agents/:id/rate — Classificar agente
router.patch('/agents/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (rating === undefined || isNaN(parseFloat(rating))) {
      return res.status(400).json({ error: 'Campo obrigatório: rating (0-5)' });
    }
    const agent = await rateAgent(req.params.id, rating);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao classificar agente:', error.message);
    res.status(500).json({ error: 'Falha ao classificar agente', details: error.message });
  }
});

// GET /api/headhunter/specialties — Listar especialidades
router.get('/specialties', async (req, res) => {
  try {
    const specialties = await listSpecialties();
    res.json({ success: true, data: specialties });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao listar especialidades:', error.message);
    res.status(500).json({ error: 'Falha ao listar especialidades', details: error.message });
  }
});

// GET /api/headhunter/stats — Estatísticas do Headhunter
router.get('/stats', async (req, res) => {
  try {
    const total = await countAgents();
    const available = await countAgents({ status: 'available' });
    const inactive = await countAgents({ status: 'inactive' });
    const specialties = await listSpecialties();
    res.json({ success: true, data: { total, available, inactive, specialties } });
  } catch (error) {
    console.error('[HEADHUNTER] Erro ao obter estatísticas:', error.message);
    res.status(500).json({ error: 'Falha ao obter estatísticas', details: error.message });
  }
});

module.exports = {
  router,
  registerAgent,
  getAgent,
  listAgents,
  updateAgent,
  deactivateAgent,
  rateAgent,
  countAgents,
  listSpecialties
};