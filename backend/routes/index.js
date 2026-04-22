const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');

// 🧠 Rotas de Headhunter (públicas)
router.post('/api/headhunter/search', require('../controllers/headhunter/search'));
router.get('/api/headhunter/profiles/:id', require('../controllers/headhunter/getProfile'));
router.post('/api/headhunter/connect', require('../controllers/headhunter/connect'));

// 🧠 Rotas da Memória Vetorial (públicas)
router.get('/api/memory/vectors', require('../controllers/memory/vectors'));
router.post('/api/memory/vectors', require('../controllers/memory/store'));
router.get('/api/memory/search', require('../controllers/memory/search'));
router.delete('/api/memory/:id', require('../controllers/memory/delete'));

// 🚀 Rotas de Lançamento de Missões (protegidas)
router.post('/api/missions/launch', requireAuth, require('../controllers/missions/launch'));
router.get('/api/missions/status/:id', requireAuth, require('../controllers/missions/status'));
router.get('/api/missions/history', requireAuth, require('../controllers/missions/history'));
router.post('/api/missions/retry/:id', requireAuth, require('../controllers/missions/retry'));

// 📊 Rotas de Dashboard/Status (protegidas)
router.get('/api/status', requireAuth, require('../controllers/status'));
router.get('/api/metrics', requireAuth, require('../controllers/metrics'));
router.get('/api/health', requireAuth, require('../controllers/health'));

// 🔐 Rotas de Autenticação (públicas)
router.post('/api/auth/login', require('../controllers/auth/login'));
router.post('/api/auth/logout', require('../controllers/auth/logout'));

module.exports = router;