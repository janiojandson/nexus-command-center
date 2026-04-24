const { query } = require('../config/database');

/**
 * GET /missoes
 * Listar todas as missões com filtro opcional por status
 */
exports.listarMissoes = async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = $' + (params.length + 1));
      params.push(status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT * FROM missoes ${whereClause}`, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[MISSOES-CTRL] Erro ao listar missões:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * GET /missoes/:id
 */
exports.obterMissao = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM missoes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[MISSOES-CTRL] Erro ao obter missao:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * POST /missoes
 */
exports.criarMissao = async (req, res) => {
  try {
    const { titulo, descricao, status } = req.body;
    if (!titulo || !status) {
      return res.status(400).json({ error: 'Título e status são obrigatórios' });
    }
    const result = await query(
      `INSERT INTO missoes (titulo, descricao, status) VALUES ($1, $2, $3) RETURNING *`,
      [titulo, descricao || null, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[MISSOES-CTRL] Erro ao criar missao:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * PUT /missoes/:id
 */
exports.atualizarMissao = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, status } = req.body;
    if (!titulo || !status) {
      return res.status(400).json({ error: 'Título e status são obrigatórios' });
    }
    const result = await query(
      `UPDATE missoes SET titulo = $2, descricao = $3, status = $4, \"updatedAt\" = NOW() WHERE id = $1 RETURNING *`,
      [id, titulo, descricao || null, status]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[MISSOES-CTRL] Erro ao atualizar missao:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * DELETE /missoes/:id
 */
exports.excluirMissao = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM missoes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Missão não encontrada' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[MISSOES-CTRL] Erro ao excluir missao:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};