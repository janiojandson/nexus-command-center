class MemoryService {
  constructor() {
    this.vectors = new Map();
  }

  async getAllVectors() {
    // Retorna todos os vetores da memória
    return Array.from(this.vectors.values());
  }

  async search(query) {
    // Implementar busca vetorial BM25
    return [];
  }

  async store(vectorData) {
    // Armazenar novo vetor na memória
    const id = Date.now().toString();
    this.vectors.set(id, vectorData);
    return { id, ...vectorData };
  }

  async delete(id) {
    return this.vectors.delete(id);
  }
}

module.exports = new MemoryService();