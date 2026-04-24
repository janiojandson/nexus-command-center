const express = require('express');
const router = express.Router();

// Importar os controladores atualizados e blindados com PostgreSQL
// Nota: Passámos a usar o missionsController que contém as rotas modernas
const headhunterController = require('../controllers/headhunterController');
const hipocampoController = require('../controllers/hipocampoController');
const missionsController = require('../controllers/missionsController');

// ============================================
// HEADHUNTER - Recrutamento e Gestão de Talentos
// ============================================
// O controlador já traz as rotas (/agents, /specialties, etc.), só precisamos de montá-las.
router.use('/api/headhunter', headhunterController.router);

// ============================================
// HIPOCAMPO - Memória Vetorial e Conhecimento
// ============================================
// O controlador já traz as rotas (/memories, /stats, etc.)
router.use('/api/hipocampo', hipocampoController.router);

// ============================================
// MISSÕES - Lançamento e Tracking
// ============================================
// O controlador já traz as rotas principais das missões
router.use('/api/missions', missionsController.router);

module.exports = router;
