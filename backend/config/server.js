const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('../routes');
const { authenticate } = require('../middleware/auth');

const app = express();

// Middleware principal
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rotas públicas
app.use('/api', routes);

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

module.exports = app;