const app = require('./config/server');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus Command Center rodando na porta ${PORT}`);
  console.log(`📍 Acesso em: http://localhost:${PORT}`);
  console.log(`📊 Rotas disponíveis:`);
  console.log(`   - API: /api`);
  console.log(`   - Status: /api/health`);
  console.log(`   - Métricas: /api/metrics`);
});