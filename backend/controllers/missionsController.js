/**
 * ============================================================
 * NEXUS COMMAND CENTER — Missions Controller
 * ============================================================
 * MIGRAÇÃO COMPLETA: new Map() → PostgreSQL (pg)
 * Tabela: missions
 * Queries 100% parametrizadas ($1, $2, ...) — ZERO concatenação.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');

// ── CRUD: Missões ──────────────────────────────────────────────

/**
 * Cria uma nova missão.
 * POST /api/missions
 */
const createMission = async (title, description, priority = 'medium') => {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  const safePriority = validPriorities.includes(priority) ? priority : 'medium';

  const result = await query(
    `INSERT INTO missions (title, description, priority, status, assigned_agents, result, created_at, updated_at)
     VALUES ($1, $2, $3, 'pending', '[]', '{}', NOW(), NOW())
     RETURNING *`,
    [title, description, safePriority]
  );
  return result.rows[0];
};

/**
 * Obtém uma missão pelo ID.
 * GET /api/missions/:id
 */
const getMission = async (id) => {
  const result = await query(
    `SELECT * FROM missions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Lista missões com filtros dinâmicos e paginação.
 * GET /api/missions?status=...&priority=...&limit=...&offset=...
 */
const listMissions = async (filters = {}, limit = 50, offset = 0) => {
  let sql = `SELECT * FROM missions WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters.priority) {
    sql += ` AND priority = $${paramIndex++}`;
    params.push(filters.priority);
  }

  // Ordenação: critical primeiro, depois high, medium, low
  sql += ` ORDER BY 
    CASE priority 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
      ELSE 5 
    END ASC, created_at DESC`;

  sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Actualiza uma missão existente (campos dinâmicos).
 * PUT /api/missions/:id
 */
const updateMission = async (id, updates = {}) => {
  const allowedFields = ['title', 'description', 'priority', 'status'];
  const fields = [];
  const params = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = $${paramIndex++}`);
      params.push(updates[field]);
    }
  }

  if (fields.length === 0) {
    return getMission(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE missions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);
  return result.rows[0] || null;
};

/**
 * Atribui agentes a uma missão.
 * PATCH /api/missions/:id/assign
 */
const assignAgents = async (missionId, agentIds = []) => {
  const result = await query(
    `UPDATE missions SET assigned_agents = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(agentIds), missionId]
  );
  return result.rows[0] || null;
};

/**
 * Completa uma missão com resultado.
 * PATCH /api/missions/:id/complete
 */
const completeMission = async (id, resultData = {}) => {
  const result = await query(
    `UPDATE missions 
     SET status = 'completed', result = $1, completed_at = NOW(), updated_at = NOW() 
     WHERE id = $2 
     RETURNING *`,
    [JSON.stringify(resultData), id]
  );
  return result.rows[0] || null;
};

/**
 * Elimina uma missão pelo ID.
 * DELETE /api/missions/:id
 */
const deleteMission = async (id) => {
  const result = await query(
    `DELETE FROM missions WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Conta o total de missões (opcionalmente filtrado).
 */
const countMissions = async (filters = {}) => {
  let sql = `SELECT COUNT(*) as total FROM missions WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters.priority) {
    sql += ` AND priority = $${paramIndex++}`;
    params.push(filters.priority);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].total, 10);
};

/**
 * Obtém o painel (dashboard) de missões.
 */
const getDashboard = async () => {
  const byStatus = await query(
    `SELECT status, COUNT(*) as count FROM missions GROUP BY status ORDER BY count DESC`
  );

  const byPriority = await query(
    `SELECT priority, COUNT(*) as count FROM missions GROUP BY priority ORDER BY count DESC`
  );

  const recent = await query(
    `SELECT id, title, status, priority, created_at FROM missions ORDER BY created_at DESC LIMIT 10`
  );

  const overdue = await query(
    `SELECT id, title, status, priority, created_at FROM missions 
     WHERE status NOT IN ('completed', 'cancelled') 
     AND created_at < NOW() - INTERVAL '7 days'
     ORDER BY created_at ASC`
  );

  return {
    byStatus: byStatus.rows,
    byPriority: byPriority.rows,
    recent: recent.rows,
    overdue: overdue.rows
  };
};

// ── Rotas Express ─────────────────────────────────────────────

// POST /api/missions — Criar missão
router.post('/', async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Campo obrigatório: title'
      });
    }

    const mission = await createMission(title, description, priority);
    res.status(201).json({ success: true, data: mission });
  } catch (error) {
    console.error('[MISSIONS] Erro ao criar missão:', error.message);
    res.status(500).json({ error: 'Falha ao criar missão', details: error.message });
  }
});

// GET /api/missions/:id — Obter missão por ID
router.get('/:id', async (req, res) => {
  try {
    const mission = await getMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[MISSIONS] Erro ao obter missão:', error.message);
    res.status(500).json({ error: 'Falha ao obter missão', details: error.message });
  }
});

// GET /api/missions — Listar missões com filtros
router.get('/', async (req, res) => {
  try {
    const { status, priority, limit = '50', offset = '0' } = req.query;
    const filters = { status, priority };
    const missions = await listMissions(filters, parseInt(limit, 10), parseInt(offset, 10));
    const total = await countMissions(filters);
    res.json({ success: true, data: missions, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (error) {
    console.error('[MISSIONS] Erro ao listar missões:', error.message);
    res.status(500).json({ error: 'Falha ao listar missões', details: error.message });
  }
});

// PUT /api/missions/:id — Actualizar missão
router.put('/:id', async (req, res) => {
  try {
    const mission = await updateMission(req.params.id, req.body);
    if (!mission) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[MISSIONS] Erro ao actualizar missão:', error.message);
    res.status(500).json({ error: 'Falha ao actualizar missão', details: error.message });
  }
});

// PATCH /api/missions/:id/assign — Atribuir agentes
router.patch('/:id/assign', async (req, res) => {
  try {
    const { agentIds } = req.body;
    if (!Array.isArray(agentIds)) {
      return res.status(400).json({ error: 'Campo obrigatório: agentIds (array)' });
    }
    const mission = await assignAgents(req.params.id, agentIds);
    if (!mission) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[MISSIONS] Erro ao atribuir agentes:', error.message);
    res.status(500).json({ error: 'Falha ao atribuir agentes', details: error.message });
  }
});

// PATCH /api/missions/:id/complete — Completar missão
router.patch('/:id/complete', async (req, res) => {
  try {
    const { result: resultData } = req.body;
    const mission = await completeMission(req.params.id, resultData);
    if (!mission) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[MISSIONS] Erro ao completar missão:', error.message);
    res.status(500).json({ error: 'Falha ao completar missão', details: error.message });
  }
});

// DELETE /api/missions/:id — Eliminar missão
router.delete('/:id', async (req, res) => {
  try {
    const mission = await deleteMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[MISSIONS] Erro ao eliminar missão:', error.message);
    res.status(500).json({ error: 'Falha ao eliminar missão', details: error.message });
  }
});

// GET /api/missions/dashboard/overview — Dashboard
router.get('/dashboard/overview', async (req, res) => {
  try {
    const dashboard = await getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[MISSIONS] Erro ao obter dashboard:', error.message);
    res.status(500).json({ error: 'Falha ao obter dashboard', details: error.message });
  }
});

module.exports = {
  router,
  createMission,
  getMission,
  listMissions,
  updateMission,
  assignAgents,
  completeMission,
  deleteMission,
  countMissions,
  getDashboard
};