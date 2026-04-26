/**
 * ============================================================
 * NEXUS COMMAND CENTER — Entry Point Alternativo
 * ============================================================
 * Usa a configuração blindada do config/server.js.
 * Para produção, usar server.js directamente.
 * ============================================================
 */

const app = require('./config/server');
const logger = require('./config/logger');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info('Nexus Command Center iniciado (config/server)', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '2.1.0-secured',
  });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`Recebido ${signal}. Iniciando graceful shutdown...`);
  server.close();
  await db.closePool();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
