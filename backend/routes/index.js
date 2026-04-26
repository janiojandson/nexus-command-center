/**
 * ============================================================
 * NEXUS COMMAND CENTER — Rotas da API (BLINDADO)
 * ============================================================
 * Hierarquia de middleware:
 *   1. Auth (JWT) — Todas as rotas /api/* exigem token
 *   2. RBAC — Rotas específicas exigem roles mínimas
 *   
 * Rotas públicas: /api/auth/*
 * Rotas protegidas: /api/headhunter/*, /api/hipocampo/*, /api/missions/*
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin, requireOperator, requireViewer } = require('../middleware/rbac');

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
// Leitura: viewer+ | Escrita: operator+ | Delete: admin
router.use('/api/headhunter', headhunterController.router);

// ============================================
// HIPOCAMPO - Memória Vetorial e Conhecimento
// ============================================
// Leitura: viewer+ | Escrita: operator+ | Delete: admin
router.use('/api/hipocampo', hipocampoController.router);

// ============================================
// MISSÕES - Lançamento e Tracking
// ============================================
// Leitura: viewer+ | Escrita: operator+ | Delete: admin
router.use('/api/missions', missionsController.router);

module.exports = router;
