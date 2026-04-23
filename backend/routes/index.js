const express = require('express');
const router = express.Router();

// Controladores
const headhunterController = require('../controllers/headhunterController');
const hipocampoController = require('../controllers/hipocampoController');
const missoesController = require('../controllers/missoesController');

// ============================================
// HEADHUNTER - Recrutamento e Gestão de Talentos (4 endpoints)
// ============================================
router.get('/api/headhunter/candidates', headhunterController.getAllCandidates);
router.post('/api/headhunter/candidates', headhunterController.createCandidate);
router.get('/api/headhunter/candidates/:id', headhunterController.getCandidateById);
router.put('/api/headhunter/candidates/:id', headhunterController.updateCandidate);

// ============================================
// HIPOCAMPO - Memória e Base de Conhecimento (4 endpoints)
// ============================================
router.get('/api/hipocampo/memories', hipocampoController.getAllMemories);
router.post('/api/hipocampo/memories', hipocampoController.createMemory);
router.get('/api/hipocampo/memories/:id', hipocampoController.getMemoryById);
router.delete('/api/hipocampo/memories/:id', hipocampoController.deleteMemory);

// ============================================
// MISSÕES - Operações e Tracking (4 endpoints)
// ============================================
router.get('/api/missoes', missoesController.getAllMissoes);
router.post('/api/missoes', missoesController.createMissao);
router.get('/api/missoes/:id', missoesController.getMissaoById);
router.patch('/api/missoes/:id/status', missoesController.updateMissaoStatus);

module.exports = router;