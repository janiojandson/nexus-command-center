// ============================================
// HEADHUNTER CONTROLLER
// Recrutamento e Gestão de Talentos
// ============================================

const candidates = new Map();
let nextId = 1;

exports.getAllCandidates = (req, res) => {
  const allCandidates = Array.from(candidates.values());
  res.json({
    success: true,
    count: allCandidates.length,
    data: allCandidates
  });
};

exports.getCandidateById = (req, res) => {
  const { id } = req.params;
  const candidate = candidates.get(id);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      error: 'Candidato não encontrado',
      message: `Nenhum candidato com ID ${id} existe no sistema`
    });
  }

  res.json({ success: true, data: candidate });
};

exports.createCandidate = (req, res) => {
  const { nome, especialidade, experiencia, status, habilidades } = req.body;

  if (!nome || !especialidade) {
    return res.status(400).json({
      success: false,
      error: 'Dados obrigatórios em falta',
      message: 'Os campos "nome" e "especialidade" são obrigatórios'
    });
  }

  const id = String(nextId++);
  const candidate = {
    id,
    nome,
    especialidade,
    experiencia: experiencia || 'Não especificada',
    status: status || 'disponivel',
    habilidades: habilidades || [],
    recrutadoPor: 'Headhunter',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  candidates.set(id, candidate);

  res.status(201).json({
    success: true,
    message: 'Candidato registado com sucesso no sistema Headhunter',
    data: candidate
  });
};

exports.updateCandidate = (req, res) => {
  const { id } = req.params;
  const candidate = candidates.get(id);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      error: 'Candidato não encontrado',
      message: `Nenhum candidato com ID ${id} existe no sistema`
    });
  }

  const updatedCandidate = {
    ...candidate,
    ...req.body,
    id: candidate.id,
    atualizadoEm: new Date().toISOString()
  };

  candidates.set(id, updatedCandidate);

  res.json({
    success: true,
    message: 'Candidato atualizado com sucesso',
    data: updatedCandidate
  });
};