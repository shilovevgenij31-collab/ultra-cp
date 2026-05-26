const express = require('express');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const {
  createCalculation,
  getCalculations,
  getCalculationById,
  updateCalculationMeta,
  updateCalculationKPData,
} = require('../db');

const router = express.Router();

// All routes require auth
router.use(auth);

// GET /api/calculations
router.get('/', (req, res) => {
  const calcs = getCalculations();
  res.json(calcs);
});

// POST /api/calculations
router.post('/', (req, res) => {
  const { title, client, calc_params, kp_data, price } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: 'Поле title обязательно' });
  }

  if (!calc_params && !kp_data) {
    return res.status(400).json({ error: 'Необходимо передать calc_params или kp_data' });
  }

  // Generate slug: base64url(hmac-sha256(title + client + timestamp))[:20]
  const slug = crypto
    .createHmac('sha256', 'calc-kp-secret-2024')
    .update(title + (client || '') + Date.now())
    .digest('base64url')
    .slice(0, 20);

  const id = createCalculation({
    slug,
    title,
    client: client || '',
    responsible_id: req.user.id,
    responsible_name: req.user.display_name,
    calc_params: calc_params || null,
    kp_data: kp_data || null,
    price: price || 0,
  });

  res.status(201).json({ id, slug });
});

// PUT /api/calculations/:id — update kp_data + calc_params (regenerate)
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { kp_data, calc_params, price } = req.body || {};
  const calc = getCalculationById(id);
  if (!calc) return res.status(404).json({ error: 'Не найдено' });
  if (calc.responsible_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  // Fall back to existing calc_params if not provided (NOT NULL constraint)
  const finalCalcParams = calc_params != null ? calc_params : calc.calc_params;
  updateCalculationKPData(id, kp_data, finalCalcParams, price);
  res.json({ ok: true });
});

// PATCH /api/calculations/:id  — update title/client
router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, client } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title обязателен' });
  const calc = getCalculationById(id);
  if (!calc) return res.status(404).json({ error: 'Не найдено' });
  updateCalculationMeta(id, title, client || '');
  res.json({ ok: true });
});

// GET /api/calculations/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const calc = getCalculationById(id);
  if (!calc) {
    return res.status(404).json({ error: 'Расчёт не найден' });
  }

  // Parse JSON fields
  try {
    calc.calc_params = JSON.parse(calc.calc_params);
  } catch (e) {}
  if (calc.kp_data) {
    try {
      calc.kp_data = JSON.parse(calc.kp_data);
    } catch (e) {}
  }

  res.json(calc);
});

module.exports = router;
