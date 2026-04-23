// ============================================
// MISSÕES CONTROLLER
// Operações, Tracking e Gestão de Missões
// ============================================

const missoes = new Map();
let nextId = 1;

// Status válidos para uma missão
const STATUS_VALIDOS = ['planeada', 'em_curso', 'concluida', 'cancelada', 'pausada'];

exports.getAllMissoes = (req, res) => {
  const allMissoes = Array.from(missoes.values());

  // Suporte a filtro por status via query param
  const { status } = req.query;
  let filtered = allMissoes;

  if (status) {
    filtered = allMissoes.filter(m => m.status === status);
  }

  res.json({
    success: true,
    count: filtered.length,
    data: filtered
  });
};

exports.getMissaoById = (req, res) => {
  const { id } = req.params;
  const missao = missoes.get(id);

  if (!missao) {
    return res.status(404).json({
      success: false,
      error: 'Missão não encontrada',
      message: `Nenhuma missão com ID ${id} existe no sistema`
    });
  }

  res.json({ success: true, data: missao });
};

exports.createMissao = (req, res) => {
  const { titulo, descricao, prioridade, responsavel, prazo } = req.body;

  if (!titulo || !descricao) {
    return res.status(400).json({
      success: false,
      error: 'Dados obrigatórios em falta',
      message: 'Os campos "titulo" e "descricao" são obrigatórios'
    });
  }

  const id = String(nextId++);
  const missao = {
    id,
    titulo,
    descricao,
    prioridade: prioridade || 'media',
    status: 'planeada',
    responsavel: responsavel || 'não atribuído',
    prazo: prazo || null,
    progresso: 0,
    historico: [
      { status: 'planeada', timestamp: new Date().toISOString(), observacao: 'Missão criada' }
    ],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  missoes.set(id, missao);

  res.status(201).json({
    success: true,
    message: 'Missão registada com sucesso no sistema de operações',
    data: missao
  });
};

exports.updateMissaoStatus = (req, res) => {
  const { id } = req.params;
  const { status, observacao } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Status obrigatório',
      message: 'O campo "status" é obrigatório para atualização'
    });
  }

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Status inválido',
      message: `Status deve ser um de: ${STATUS_VALIDOS.join(', ')}`
    });
  }

  const missao = missoes.get(id);

  if (!missao) {
    return res.status(404).json({
      success: false,
      error: 'Missão não encontrada',
      message: `Nenhuma missão com ID ${id} existe no sistema`
    });
  }

  const statusAnterior = missao.status;
  missao.status = status;
  missao.atualizadoEm = new Date().toISOString();
  missao.historico.push({
    status,
    timestamp: new Date().toISOString(),
    observacao: observacao || `Status alterado de "${statusAnterior}" para "${status}"`
  });

  // Atualizar progresso automaticamente
  if (status === 'concluida') missao.progresso = 100;
  else if (status === 'em_curso') missao.progresso = Math.max(missao.progresso, 25);
  else if (status === 'cancelada') missao.progresso = 0;

  missoes.set(id, missao);

  res.json({
    success: true,
    message: `Status da missão atualizado: ${statusAnterior} → ${status}`,
    data: missao
  });
};