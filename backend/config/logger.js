/**
 * ============================================================
 * NEXUS COMMAND CENTER — Logger Estruturado
 * ============================================================
 * Substitui console.log/warn/error por logging estruturado.
 * Formato JSON para ingestão por SIEM/ELK.
 * Níveis: error, warn, info, debug
 * Configurável via NODE_ENV e LOG_LEVEL.
 * ============================================================
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? 
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug);

/**
 * Formata um log entry em JSON estruturado.
 */
function formatLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'nexus-command-center',
    environment: process.env.NODE_ENV || 'development',
    message,
    ...meta,
  };

  // Em produção, remover dados sensíveis
  if (process.env.NODE_ENV === 'production') {
    delete entry.stack;
    // Redact potential secrets
    for (const key of Object.keys(entry)) {
      if (typeof entry[key] === 'string' && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('key')
      )) {
        entry[key] = '[REDACTED]';
      }
    }
  }

  return JSON.stringify(entry);
}

/**
 * Logger com níveis e formato estruturado.
 */
const logger = {
  error(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.error) {
      const logLine = formatLog('error', message, meta);
      console.error(logLine);
    }
  },

  warn(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.warn) {
      const logLine = formatLog('warn', message, meta);
      console.warn(logLine);
    }
  },

  info(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      const logLine = formatLog('info', message, meta);
      console.log(logLine);
    }
  },

  debug(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.debug) {
      const logLine = formatLog('debug', message, meta);
      console.log(logLine);
    }
  },

  /**
   * Log de requisição HTTP estruturado.
   */
  request(req, res, duration) {
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this[level]('HTTP Request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.sub || 'anonymous',
    });
  },

  /**
   * Log de evento de segurança estruturado.
   */
  security(event, meta = {}) {
    this.warn(`SECURITY: ${event}`, {
      securityEvent: event,
      ...meta,
    });
  },

  /**
   * Log de evento de auditoria estruturado.
   */
  audit(action, meta = {}) {
    this.info(`AUDIT: ${action}`, {
      auditEvent: action,
      ...meta,
    });
  },
};

module.exports = logger;
