/**
 * ============================================================
 * NEXUS COMMAND CENTER — HTTPS Redirect Middleware
 * ============================================================
 * Redireciona todo o tráfego HTTP para HTTPS em produção.
 * Em desenvolvimento, não aplica redirecionamento.
 * 
 * Detecta HTTP via:
 *   - Header X-Forwarded-Proto (Railway/Heroku/Load Balancers)
 *   - Conexão não-TLS directa
 * 
 * Uso: app.use(require('./middleware/httpsRedirect'));
 * ============================================================
 */

const logger = require('../config/logger');

function httpsRedirect(req, res, next) {
  // Não redirecionar em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Verificar se a conexão já é HTTPS
  const isHttps = req.secure || 
    req.headers['x-forwarded-proto'] === 'https';

  if (isHttps) {
    return next();
  }

  // Log do redirecionamento
  logger.security('HTTP_REDIRECT', {
    originalUrl: req.originalUrl,
    ip: req.ip,
    forwardedProto: req.headers['x-forwarded-proto'],
  });

  // Redirecionar para HTTPS
  const httpsUrl = `https://${req.headers.host}${req.originalUrl}`;
  res.redirect(301, httpsUrl);
}

module.exports = httpsRedirect;
