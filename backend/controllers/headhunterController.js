/**
 * ============================================================
 * NEXUS COMMAND CENTER — Headhunter Controller (BLINDADO)
 * ============================================================
 * MIGRAÇÃO COMPLETA: new Map() → PostgreSQL (pg)
 * Tabela: headhunter_agents
 * Queries 100% parametrizadas ($1, $2, ...) — ZERO concatenação.
 * INPUT VALIDADO: Todos os campos verificados e sanitizados.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { validate, sanitizeString } = require('../middleware/validate');

// ── Schemas de Validação ──────────────────────────────────────
const createAgentSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 100, sanitize: true },
  specialty: { type: 'string', required: true, minLength: 1, maxLength: 100, sanitize: true },
  capabilities: { type: 'array', required: false },
};

const updateAgentSchema = {
  name: { type: 'string', required: false, minLength: 1, maxLength: 100, sanitize: true },
  specialty: { type: 'string', required: false, minLength: 1, maxLength: 100, sanitize: true },
  capabilities: { type: 'array', required: false },
  status: { type: 'string', required: false, enum: ['available', 'busy', 'inactive'] },
};

const rateAgentSchema = {
  rating: { type: 'number', required: true, min: 0, max: 5 },
};

// ── CRUD: Agentes do Headhunter ────────────────────────────────

const registerAgent = async (name, specialty, capabilities = []) => {
  const result = await query(
    `INSERT INTO headhunter_agents (name, specialty, capabilities, status, rating, created_at, updated_at)
     VALUES ($1, $2, $3, 'available', 0.00, NOW(), NOW())
     RETURNING *`,
    [sanitizeString(name), sanitizeString(specialty), JSON.stringify(capabilities)]
  );
  return result.rows[0];
};

const getAgent = async (id) => {
  const result = await query(
    `SELECT * FROM headhunter_agents WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

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

  // Limitar paginação para evitar abuso
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);
  const safeOffset = Math.max(0, parseInt(offset) || 0);

  sql += ` ORDER BY rating DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(safeLimit, safeOffset);

  const result = await query(sql, params);
  return result.rows;
};

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
        params.push(sanitizeString(updates[field]));
      }
    }
  }

  if (fields.length === 0) return getAgent(id);

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE headhunter_agents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);
  return result.rows[0] || null;
};

const deactivateAgent = async (id) => {
  const result = await query(
    `UPDATE headhunter_agents SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

const rateAgent = async (id, rating) => {
  const clampedRating = Math.max(0, Math.min(5, parseFloat(rating)));
  const result = await query(
    `UPDATE headhunter_agents SET rating = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [clampedRating, id]
  );
  return result.rows[0] || null;
};

// ── Rotas Express ──────────────────────────────────────────────

// Listar agentes (com filtros via query string)
router.get('/', async (req, res) => {
  try {
    const { specialty, status, minRating, limit, offset } = req.query;
    const agents = await listAgents({ specialty, status, minRating }, limit, offset);
    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('[NEXUS-HH] ❌ Erro ao listar agentes:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Obter agente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await getAgent(id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agente não encontrado', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[NEXUS-HH] ❌ Erro ao obter agente:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Criar agente
router.post('/', validate(createAgentSchema, 'body'), async (req, res) => {
  try {
    const { name, specialty, capabilities } = req.body;
    const agent = await registerAgent(name, specialty, capabilities);
    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    console.error('[NEXUS-HH] ❌ Erro ao criar agente:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Actualizar agente
router.put('/:id', validate(updateAgentSchema, 'body'), async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await updateAgent(id, req.body);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agente não encontrado', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[NEXUS-HH] ❌ Erro ao actualizar agente:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Avaliar agente
router.post('/:id/rate', validate(rateAgentSchema, 'body'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const agent = await rateAgent(id, rating);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agente não encontrado', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[NEXUS-HH] ❌ Erro ao avaliar agente:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

// Desactivar agente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await deactivateAgent(id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agente não encontrado', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('[NEXUS-HH] ❌ Erro ao desactivar agente:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
});

module.exports = { router, registerAgent, getAgent, listAgents, updateAgent, deactivateAgent, rateAgent };
