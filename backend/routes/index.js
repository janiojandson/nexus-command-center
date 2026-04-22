const express = require('express');
const router = express.Router();

// 🧠 Rotas de Headhunter
router.post('/api/headhunter/search', require('../controllers/headhunter/search'));
router.get('/api/headhunter/profiles/:id', require('../controllers/headhunter/getProfile'));
router.post('/api/headhunter/connect', require('../controllers/headhunter/connect'));

// 🧠 Rotas da Memória Vetorial (Hipocampo)
router.get('/api/memory/vectors', require('../controllers/memory/vectors'));
router.post('/api/memory/vectors', require('../controllers/memory/store'));
router.get('/api/memory/search', require('../controllers/memory/search'));
router.delete('/api/memory/:id', require('../controllers/memory/delete'));

// 🚀 Rotas de Lançamento de Missões
router.post('/api/missions/launch', require('../controllers/missions/launch'));
router.get('/api/missions/status/:id', require('../controllers/missions/status'));
router.get('/api/missions/history', require('../controllers/missions/history'));
router.post('/api/missions/retry/:id', require('../controllers/missions/retry'));

// 📊 Rotas de Dashboard/Status
router.get('/api/status', require('../controllers/status'));
router.get('/api/metrics', require('../controllers/metrics'));
router.get('/api/health', require('../controllers/health'));

// 🔐 Rotas de Autenticação (se necessário)
router.post('/api/auth/login', require('../controllers/auth/login'));
router.post('/api/auth/logout', require('../controllers/auth/logout'));

module.exports = router;