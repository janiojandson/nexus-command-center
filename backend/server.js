const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rotas da API
app.use('/', routes);

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString(), service: 'nexus-command-center' });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.stack);
  res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus Command Center operacional na porta ${PORT}`);
  console.log(`📋 12 endpoints ativos: Headhunter (4) | Hipocampo (4) | Missoes (4)`);
});

module.exports = app;