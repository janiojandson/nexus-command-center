const db = require('../config/database');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VECTOR_SIZE_BYTES = 1024 * 1024; // 1MB

class MemoryService {
  constructor() {
    this._initTable();
  }

  async _initTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS memory_vectors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vector_data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('[NEXUS-MEMORY] ✅ Tabela memory_vectors inicializada com sucesso.');
    } catch (error) {
      console.error('[NEXUS-MEMORY] ❌ Erro ao inicializar tabela memory_vectors:', error.message);
      throw error;
    }
  }

  async getAllVectors() {
    try {
      const result = await db.query(
        'SELECT id, vector_data, created_at FROM memory_vectors ORDER BY created_at DESC'
      );
      console.log(`[NEXUS-MEMORY] 📊 Recuperados ${result.rows.length} vetores.`);
      return result.rows;
    } catch (error) {
      console.error('[NEXUS-MEMORY] ❌ Erro ao buscar todos os vetores:', error.message);
      throw error;
    }
  }

  async search(query) {
    try {
      if (!query || typeof query !== 'string') {
        console.warn('[NEXUS-MEMORY] ⚠️ Parâmetro de busca inválido.');
        return [];
      }
      const param = `%${query}%`;
      const result = await db.query(
        'SELECT id, vector_data, created_at FROM memory_vectors WHERE vector_data::text ILIKE $1 ORDER BY created_at DESC',
        [param]
      );
      console.log(`[NEXUS-MEMORY] 🔍 Busca por "${query}" retornou ${result.rows.length} resultado(s).`);
      return result.rows;
    } catch (error) {
      console.error(`[NEXUS-MEMORY] ❌ Erro ao buscar vetores com query "${query}":`, error.message);
      throw error;
    }
  }

  async store(vectorData) {
    try {
      // Validação de input
      if (!vectorData || typeof vectorData !== 'object' || Array.isArray(vectorData)) {
        const errorMsg = 'vectorData deve ser um objeto não-nulo.';
        console.error(`[NEXUS-MEMORY] ❌ Validação falhou: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const stringifiedData = JSON.stringify(vectorData);
      const dataSizeBytes = Buffer.byteLength(stringifiedData, 'utf8');

      if (dataSizeBytes > MAX_VECTOR_SIZE_BYTES) {
        const errorMsg = `vectorData excede o tamanho máximo de 1MB (${dataSizeBytes} bytes).`;
        console.error(`[NEXUS-MEMORY] ❌ Validação falhou: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const result = await db.query(
        'INSERT INTO memory_vectors (vector_data) VALUES ($1) RETURNING id, vector_data, created_at',
        [stringifiedData]
      );

      console.log(`[NEXUS-MEMORY] ✅ Vetor armazenado com id ${result.rows[0].id}.`);
      return result.rows[0];
    } catch (error) {
      console.error('[NEXUS-MEMORY] ❌ Erro ao armazenar vetor:', error.message);
      throw error;
    }
  }

  async delete(id) {
    try {
      // Validação de UUID
      if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) {
        const errorMsg = `UUID inválido fornecido para deleção: ${id}`;
        console.error(`[NEXUS-MEMORY] ❌ Validação falhou: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const result = await db.query(
        'DELETE FROM memory_vectors WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        console.warn(`[NEXUS-MEMORY] ⚠️ Nenhum vetor encontrado para deleção com id ${id}.`);
        return null;
      }

      console.log(`[NEXUS-MEMORY] 🗑️ Vetor deletado com id ${result.rows[0].id}.`);
      return result.rows[0];
    } catch (error) {
      console.error(`[NEXUS-MEMORY] ❌ Erro ao deletar vetor com id ${id}:`, error.message);
      throw error;
    }
  }
}

module.exports = new MemoryService();