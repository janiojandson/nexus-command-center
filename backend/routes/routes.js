// backend/routes/routes.js

const express = require('express');
const router = express.Router();
const headhunterController = require('../controllers/headhunterController');
const hipocampoController = require('../controllers/hipocampoController');
const missionsController = require('../controllers/missionsController');

// Rotas para Headhunter
router.get('/headhunter/jobs', headhunterController.getJobs);
router.post('/headhunter/jobs', headhunterController.createJob);

// Rotas para Hipocampo
router.get('/hipocampo/memories', hipocampoController.getMemories);
router.post('/hipocampo/memories', hipocampoController.createMemory);

// Rotas para Missões
router.get('/missions/status', missionsController.getStatus);
router.post('/missions/status', missionsController.updateStatus);
router.put('/missions/status/:id', missionsController.updateStatusById);

module.exports = router;