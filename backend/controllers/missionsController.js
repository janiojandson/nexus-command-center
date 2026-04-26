/**
 * ============================================================
 * NEXUS COMMAND CENTER — Missions Controller (BLINDADO)
 * ============================================================
 * MIGRAÇÃO COMPLETA: new Map() → PostgreSQL (pg)
 * Tabela: missions
 * Queries 100% parametrizadas ($1, $2, ...) — ZERO concatenação.
 * INPUT VALIDADO: Todos os campos verificados e sanitizados.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { validate, sanitizeString } = require('../middleware/validate');

// ── Schemas de Validação ──────────────────────────────────────
const createMissionSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 200, sanitize: true },
  description: { type: 'string', required: true, minLength: 1, maxLength: 10000, sanitize: true },
  priority: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
};

const updateMissionSchema = {
  title: { type: 'string', required: false, minLength: 1, maxLength: 200, sanitize: true },
  description: { type: 'string', required: false, minLength: 1, maxLength: 10000, sanitize: true },
  priority: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
  status: { type: 'string', required: false, enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'] },
};

const assignAgentsSchema = {
  agent_ids: { type: 'array', required: true },
};

const addResultSchema = {
  key: { type: 'string', required: true, minLength: 1, maxLength: 100, sanitize: true },
  value: { type: 'string', required: true, minLength: 1, maxLength: 50000, sanitize: true },
};

// ── CRUD: Missões ──────────────────────────────────────────────

/**
 * Cria uma nova missão.
 */
const createMission = async (title, description, priority = 'medium') => {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  const safePriority = validPriorities.includes(priority) ? priority : 'medium';

  const result = await query(
    `INSERT INTO missions (title, description, priority, status, assigned_agents, result, created_at, updated_at)
     VALUES ($1, $2, $3, 'pending', '[]', '{}', NOW(), NOW())
     RETURNING *`,
    [sanitizeString(title), sanitizeString(description), safePriority]
  );
  return result.rows[0];
};

/**
 * Obtém uma missão pelo ID.
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

  // Ordenação: critical primeiro
  sql += ` ORDER BY 
    CASE priority 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
      ELSE 5 
    END ASC, created_at DESC`;

  // Limitar paginação
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);
  const safeOffset = Math.max(0, parseInt(offset) || 0);

  sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(safeLimit, safeOffset);

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Actualiza uma missão existente.
 */
const updateMission = async (id, updates = {}) => {
  const allowedFields = ['title', 'description', 'priority', 'status'];
  const fields = [];
  const params = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = $${paramIndex++}`);
      params.push(sanitizeString(updates[field]));
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
 */
const assignAgentsToMission = async (id, agentIds) => {
  const result = await query(
    `UPDATE missions SET assigned_agents = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(agentIds), id]
  );
  return result.rows[0] || null;
};

/**
 * Adiciona resultado a uma missão.
 */
const addMissionResult = async (id, key, value) => {
  const result = await query(
    `UPDATE missions SET result = jsonb_set(COALESCE(result, '{}'), $1, $2), updated_at = NOW() WHERE id = $3 RETURNING *`,
    [`{${sanitizeString(key)}}`, JSON.stringify(sanitizeString(value)), id]
  );
  return result.rows[0] || null;
};

/**
 * Cancela uma missão.
 */
const cancelMission = async (id) => {
  const result = await query(
    `UPDATE missions SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Obtém estatísticas das missões.
 */
const getMissionStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total_missions,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE priority = 'critical') as critical
    FROM missions
  `);
  return result.rows[0];
};

// ── Rotas Express ──────────────────────────────────────────────

// Listar missões
router.get('/', async (req, res) => {
  try {
    const { status, priority, limit, offset } = req.query;
    const missions = await listMissions({ status, priority }, limit, offset);
    res.json({ success: true, data: missions });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao listar missões:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Estatísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await getMissionStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao obter estatísticas:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Obter missão por ID
router.get('/:id', async (req, res) => {
  try {
    const mission = await getMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Missão não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao obter missão:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Criar missão
router.post('/', validate(createMissionSchema, 'body'), async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const mission = await createMission(title, description, priority);
    res.status(201).json({ success: true, data: mission });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao criar missão:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Actualizar missão
router.put('/:id', validate(updateMissionSchema, 'body'), async (req, res) => {
  try {
    const mission = await updateMission(req.params.id, req.body);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Missão não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao actualizar missão:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Atribuir agentes
router.post('/:id/assign', validate(assignAgentsSchema, 'body'), async (req, res) => {
  try {
    const { agent_ids } = req.body;
    const mission = await assignAgentsToMission(req.params.id, agent_ids);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Missão não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao atribuir agentes:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Adicionar resultado
router.post('/:id/result', validate(addResultSchema, 'body'), async (req, res) => {
  try {
    const { key, value } = req.body;
    const mission = await addMissionResult(req.params.id, key, value);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Missão não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao adicionar resultado:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Cancelar missão
router.delete('/:id', async (req, res) => {
  try {
    const mission = await cancelMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Missão não encontrada', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: mission });
  } catch (error) {
    console.error('[NEXUS-MISSIONS] ❌ Erro ao cancelar missão:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

module.exports = { router, createMission, getMission, listMissions, updateMission, assignAgentsToMission, addMissionResult, cancelMission, getMissionStats };
