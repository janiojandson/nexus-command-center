const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Importar os controladores
const headhunterController = require('../controllers/headhunterController');
const hipocampoController = require('../controllers/hipocampoController');
const missionsController = require('../controllers/missionsController');
const authController = require('../controllers/authController');

// ============================================
// AUTH — Rotas Públicas (sem JWT)
// ============================================
router.use('/api/auth', authController);

// ============================================
// MIDDLEWARE JWT — Tudo abaixo exige autenticação
// ============================================
router.use('/api', authMiddleware);

// ============================================
// HEADHUNTER - Recrutamento e Gestão de Talentos
// ============================================
router.use('/api/headhunter', headhunterController.router);

// ============================================
// HIPOCAMPO - Memória Vetorial e Conhecimento
// ============================================
router.use('/api/hipocampo', hipocampoController.router);

// ============================================
// MISSÕES - Lançamento e Tracking
// ============================================
router.use('/api/missions', missionsController.router);

module.exports = router;