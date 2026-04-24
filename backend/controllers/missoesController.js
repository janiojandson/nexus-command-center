const { query } = require('../config/database');

const STATUS_VALIDOS = ['planeada', 'em_curso', 'concluida', 'cancelada', 'pausada'];

exports.getAllMissoes = async (req, res) => {
  try {
    const { status } = req.query;
    const text = 'SELECT * FROM missoes';
    const params = [];
    if (status) {
      text += ' WHERE status = $1';
      params.push(status);
    }
    const result = await query(text, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('[MISSOES-CONTROLLER] Erro em getAllMissoes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

exports.getMissaoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM missoes WHERE id = $1', [id]);
    const missao = result.rows[0];
    if (!missao) {
      return res.status(404).json({
        success: false,
        error: 'Missão não encontrada',
        message: `Nenhuma missão com ID ${id} existe no sistema`
      });
    }
    res.json({ success: true, data: missao });
  } catch (error) {
    console.error('[MISSOES-CONTROLLER] Erro em getMissaoById:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

exports.createMissao = async (req, res) => {
  try {
    const { titulo, descricao, prioridade, responsavel, prazo } = req.body;
    if (!titulo || !descricao) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios em falta',
        message: 'Os campos \"titulo\" e \"descricao\" são obrigatórios'
      });
    }
    const statusInicial = 'planeada';
    const historicoInicial = JSON.stringify([{
      status: statusInicial,
      timestamp: new Date().toISOString(),
      observacao: 'Missão criada'
    }]);

    const sql = `
      INSERT INTO missoes (titulo, descricao, prioridade, status, responsavel, prazo, progresso, historico, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    const values = [titulo, descricao, prioridade || 'media', statusInicial, responsavel || 'não atribuído', prazo || null, 0, historicoInicial];
    const result = await query(sql, values);
    const novaMissao = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Missão registada com sucesso no sistema de operações',
      data: novaMissao
    });
  } catch (error) {
    console.error('[MISSOES-CONTROLLER] Erro em createMissao:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

exports.updateMissaoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacao } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status obrigatório',
        message: 'O campo \"status\" é obrigatório para atualização'
      });
    }
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido',
        message: `Status deve ser um de: ${STATUS_VALIDOS.join(', ')}`
      });
    }
    const selectResult = await query('SELECT * FROM missoes WHERE id = $1', [id]);
    if (!selectResult.rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'Missão não encontrada',
        message: `Nenhuma missão com ID ${id} existe no sistema`
      });
    }
    const missao = selectResult.rows[0];
    const historico = JSON.parse(missao.historico || '[]');
    const novoHistorico = [...historico, {
      status,
      timestamp: new Date().toISOString(),
      observacao: observacao || `Status alterado de "${missao.status}" para "${status}"`
    }];
    await query(
      `UPDATE missoes SET status = $1, historico = $2, atualizado_em = NOW() WHERE id = $3`,
      [status, JSON.stringify(novoHistorico), id]
    );
    const updatedMissao = await query('SELECT * FROM missoes WHERE id = $1', [id]);
    res.json({ success: true, data: updatedMissao.rows[0] });
  } catch (error) {
    console.error('[MISSOES-CONTROLLER] Erro em updateMissaoStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}