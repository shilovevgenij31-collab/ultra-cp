const express = require('express');
const path = require('path');

// Initialize DB first
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Public settings route (only dist_* and base_rate, no secrets)
app.get('/api/settings', (req, res) => {
  const { getSettings } = require('./db');
  const s = getSettings();
  const { anthropic_api_key, kp_prompt, ...publicSettings } = s;
  res.json(publicSettings);
});

// Типовые пресеты КП (список + получение одного + применение скидки)
app.get('/api/presets', (req, res) => {
  const { listPresets } = require('./presets');
  res.json(listPresets());
});
app.get('/api/presets/:slug', (req, res) => {
  const { getPreset, applyDiscount } = require('./presets');
  const preset = getPreset(req.params.slug);
  if (!preset) return res.status(404).json({ error: 'Пресет не найден' });
  const discount = parseFloat(req.query.discount) || 0;
  const data = applyDiscount(preset, discount);
  res.json({
    slug: preset.slug,
    label: preset.label,
    category: preset.category,
    priceFrom: preset.priceFrom,
    maxDiscount: preset.maxDiscount,
    data,
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/calculations', require('./routes/calculations'));

// KP public pages
app.use('/kp', require('./routes/kp'));

// Service preset landing pages
app.get('/services', (req, res) => {
  const { listPresets } = require('./presets/index');
  const presets = listPresets();
  const cards = presets.map(p => `
    <a href="/services/${p.slug}" class="sc">
      <div class="sc-label">${escSrv(p.category)}</div>
      <div class="sc-title">${escSrv(p.label)}</div>
      <div class="sc-price">от ${formatPriceSrv(p.priceFrom)}</div>
    </a>`).join('');
  res.send(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Программы EdAgency</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f7f5;color:#1a1a1a;padding:40px 20px}
h1{font-size:28px;font-weight:700;margin-bottom:8px}
.sub{color:#666;margin-bottom:32px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;max-width:900px}
.sc{display:block;background:#fff;border-radius:12px;padding:24px;text-decoration:none;color:inherit;border:1px solid #eee;transition:box-shadow .15s}
.sc:hover{box-shadow:0 4px 20px rgba(0,0,0,.1)}
.sc-label{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.sc-title{font-size:17px;font-weight:700;margin-bottom:12px;line-height:1.3}
.sc-price{font-size:14px;color:#059669;font-weight:600}
</style></head><body>
<h1>Программы EdAgency</h1>
<p class="sub">Выберите программу, чтобы посмотреть полное предложение</p>
<div class="grid">${cards}</div>
</body></html>`);
});

app.get('/services/:slug/pdf', async (req, res) => {
  const { getPreset, applyDiscount } = require('./presets/index');
  const { renderKPPdf } = require('./pdf/kp-template');
  const preset = getPreset(req.params.slug);
  if (!preset) return res.status(404).json({ error: 'Не найдено' });
  const discount = parseFloat(req.query.discount) || 0;
  const data = applyDiscount(preset, discount);
  const kpData = { title: preset.label, ...data };
  try {
    const buf = await renderKPPdf(kpData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(preset.label)}.pdf`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  } catch (e) {
    console.error('Service PDF error:', e);
    res.status(500).json({ error: 'Не удалось сгенерировать PDF' });
  }
});

app.get('/services/:slug', (req, res) => {
  const { getPreset, applyDiscount } = require('./presets/index');
  const { buildKpHtml } = require('./routes/kp');
  const preset = getPreset(req.params.slug);
  if (!preset) return res.status(404).send('Программа не найдена');
  const discount = parseFloat(req.query.discount) || 0;
  const data = applyDiscount(preset, discount);
  const kpData = {
    title: preset.label,
    client: req.query.client || '',
    responsible_name: 'EdAgency',
    telegram: req.query.telegram || '',
    manager: req.query.manager || 'EdAgency',
    validUntil: req.query.valid || '',
    ...data,
  };
  res.send(buildKpHtml(kpData, `service-${preset.slug}`));
});

function escSrv(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function formatPriceSrv(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

// Frontend routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root — serve calculator (auth check handled on frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(PORT, () => {
  console.log(`Calc-service running at http://localhost:${PORT}`);
});
