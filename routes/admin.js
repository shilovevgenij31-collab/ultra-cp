const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');
const { getSettings, upsertSetting, getAllUsers, updateUserPassword, updateUserDisplayName, getUserById, getCalculations, deleteCalculation, getAllClarifications, getClarificationsBySlug } = require('../db');

const router = express.Router();

// All routes require admin
router.use(requireAdmin);

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  const settings = getSettings();
  res.json(settings);
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  const body = req.body || {};
  const allowedKeys = [
    'dist_product', 'dist_marketing', 'dist_sales', 'dist_admin',
    'dist_taxes', 'dist_profit', 'base_rate', 'kp_prompt', 'anthropic_api_key',
  ];

  for (const key of allowedKeys) {
    if (key in body) {
      upsertSetting(key, body[key]);
    }
  }

  res.json({ ok: true, settings: getSettings() });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

// PUT /api/admin/users/:id/password
router.put('/users/:id/password', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { password } = req.body || {};

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать не менее 6 символов' });
  }

  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const hash = await bcrypt.hash(password, 10);
  updateUserPassword(userId, hash);

  res.json({ ok: true });
});

// PUT /api/admin/users/:id/name
router.put('/users/:id/name', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { display_name } = req.body || {};

  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: 'Имя не может быть пустым' });
  }

  const user = getUserById(userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  updateUserDisplayName(userId, display_name.trim());
  res.json({ ok: true });
});

// GET /api/admin/kp-list
router.get('/kp-list', (req, res) => {
  const calcs = getCalculations();
  res.json(calcs);
});

// DELETE /api/admin/kp/:id
router.delete('/kp/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  deleteCalculation(id);
  res.json({ ok: true });
});

// GET /api/admin/clarifications — all clarification requests
router.get('/clarifications', (req, res) => {
  res.json(getAllClarifications());
});

// GET /api/admin/kp/:slug/clarifications — for specific KP
router.get('/kp/:slug/clarifications', (req, res) => {
  res.json(getClarificationsBySlug(req.params.slug));
});

module.exports = router;
