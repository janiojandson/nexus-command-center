// ============================================
// HIPOCAMPO CONTROLLER
// Memória Vetorial e Base de Conhecimento
// ============================================

const memories = new Map();
let nextId = 1;

exports.getAllMemories = (req, res) => {
  const allMemories = Array.from(memories.values());

  // Suporte a filtro por categoria via query param
  const { categoria } = req.query;
  let filtered = allMemories;

  if (categoria) {
    filtered = allMemories.filter(m => m.categoria === categoria);
  }

  res.json({
    success: true,
    count: filtered.length,
    data: filtered
  });
};

exports.getMemoryById = (req, res) => {
  const { id } = req.params;
  const memory = memories.get(id);

  if (!memory) {
    return res.status(404).json({
      success: false,
      error: 'Memória não encontrada',
      message: `Nenhuma memória com ID ${id} existe no Hipocampo`
    });
  }

  res.json({ success: true, data: memory });
};

exports.createMemory = (req, res) => {
  const { titulo, conteudo, categoria, tags, prioridade } = req.body;

  if (!titulo || !conteudo) {
    return res.status(400).json({
      success: false,
      error: 'Dados obrigatórios em falta',
      message: 'Os campos "titulo" e "conteudo" são obrigatórios'
    });
  }

  const id = String(nextId++);
  const memory = {
    id,
    titulo,
    conteudo,
    categoria: categoria || 'geral',
    tags: tags || [],
    prioridade: prioridade || 'media',
    acessos: 0,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  memories.set(id, memory);

  res.status(201).json({
    success: true,
    message: 'Memória armazenada com sucesso no Hipocampo',
    data: memory
  });
};

exports.deleteMemory = (req, res) => {
  const { id } = req.params;
  const memory = memories.get(id);

  if (!memory) {
    return res.status(404).json({
      success: false,
      error: 'Memória não encontrada',
      message: `Nenhuma memória com ID ${id} existe no Hipocampo`
    });
  }

  memories.delete(id);

  res.json({
    success: true,
    message: 'Memória eliminada permanentemente do Hipocampo',
    deletedId: id
  });
};