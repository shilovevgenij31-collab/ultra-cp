const express = require('express');
const { getCalculationBySlug, createClarification } = require('../db');
const { renderKPPdf } = require('../pdf/kp-template');
const buildPremiumKpHtml = require('../lib/build-kp-html');

const router = express.Router();

// POST /kp/pdf — генерация PDF из произвольных данных КП (для предпросмотра из калькулятора).
router.post('/pdf', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const data = req.body || {};
    const buf = await renderKPPdf(data);
    const fn = (data.title || 'kp').replace(/[^\wа-яёА-ЯЁ\- ]+/gi, '').trim().slice(0, 60) || 'kp';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fn)}.pdf`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  } catch (e) {
    console.error('PDF render error:', e);
    res.status(500).json({ error: 'Не удалось сгенерировать PDF' });
  }
});

// GET /kp/:slug/pdf — скачивание PDF сохранённого КП.
router.get('/:slug/pdf', async (req, res) => {
  const calc = getCalculationBySlug(req.params.slug);
  if (!calc || !calc.kp_data) {
    return res.status(404).json({ error: 'КП не найдено' });
  }
  let kpData;
  try {
    kpData = typeof calc.kp_data === 'string' ? JSON.parse(calc.kp_data) : calc.kp_data;
  } catch {
    return res.status(500).json({ error: 'Повреждённые данные КП' });
  }
  try {
    const buf = await renderKPPdf(kpData);
    const fn = (kpData.title || calc.slug).replace(/[^\wа-яёА-ЯЁ\- ]+/gi, '').trim().slice(0, 60) || calc.slug;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fn)}.pdf`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  } catch (e) {
    console.error('PDF render error:', e);
    res.status(500).json({ error: 'Не удалось сгенерировать PDF' });
  }
});

// GET /kp/:slug/data — public, returns calc_params + id for loading back into calculator
router.get('/:slug/data', (req, res) => {
  const calc = getCalculationBySlug(req.params.slug);
  if (!calc) return res.status(404).json({ error: 'Не найдено' });
  let calc_params = null;
  try { calc_params = calc.calc_params ? JSON.parse(calc.calc_params) : null; } catch (e) {}
  res.json({ id: calc.id, slug: calc.slug, title: calc.title, client: calc.client, calc_params });
});

// POST /kp/:slug/clarify — public, send clarification request (works for any slug: saved KP or preset)
router.post('/:slug/clarify', express.json({ limit: '64kb' }), (req, res) => {
  const { name, message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Сообщение обязательно' });
  createClarification(req.params.slug, (name || '').trim(), message.trim());
  res.json({ ok: true });
});

// GET /kp/:slug  — public
router.get('/:slug', (req, res) => {
  const calc = getCalculationBySlug(req.params.slug);
  if (!calc || !calc.kp_data) {
    const msg = calc && !calc.kp_data
      ? 'Ссылка устарела — КП было сохранено без данных. Пересоздайте КП в калькуляторе.'
      : 'Коммерческое предложение не найдено.';
    return res.status(404).send(`<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><title>КП не найдено</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f0f0f;color:#f5f5f5;font-family:'Manrope',sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;gap:16px;padding:24px}
h1{font-size:48px;font-weight:800;color:#2B3A9A}
p{font-size:16px;color:#888;max-width:400px}
a{color:#2B3A9A;text-decoration:none}a:hover{text-decoration:underline}
</style></head>
<body>
<h1>404</h1>
<p>${msg}</p>
<a href="/">← На главную</a>
</body></html>`);
  }

  let kpData;
  try {
    kpData = typeof calc.kp_data === 'string' ? JSON.parse(calc.kp_data) : calc.kp_data;
  } catch (e) {
    return res.status(500).send('Ошибка данных КП');
  }

  res.send(buildPremiumKpHtml(kpData, req.params.slug));
});

function buildKpHtml(kpData, slug) {
  const html = `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>КП — ${escapeHtml(kpData.title || 'Коммерческое предложение')}</title>
<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F7F5F0;--surface:#FFFFFF;--surface2:#EFECE6;
  --border:rgba(26,25,20,0.09);--border2:rgba(26,25,20,0.16);
  --accent:#2B3A9A;--accent-lo:rgba(43,58,154,0.09);
  --green:#1A7A4A;--green-lo:rgba(26,122,74,0.09);
  --t1:#1A1914;--t2:#5A574F;--t3:#9C9990;
  --display:'Raleway',sans-serif;--sans:'Barlow',sans-serif;--cond:'Barlow Condensed',sans-serif;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--t1);font-family:var(--sans);overflow-x:hidden;line-height:1.55}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:14px 48px;background:rgba(247,245,240,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.nl{font-family:var(--sans);font-size:14px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:10px;letter-spacing:.04em}
.nd{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pd 2s ease-in-out infinite}
@keyframes pd{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}
.nm{font-family:var(--cond);font-size:11px;color:var(--t3);letter-spacing:.06em}

.hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 48px 80px;overflow:hidden;background:var(--bg)}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 50% 30%,rgba(43,58,154,0.05) 0%,transparent 70%)}
.h-badge{position:relative;z-index:1;font-family:var(--cond);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);border:1px solid rgba(43,58,154,0.25);padding:7px 18px;border-radius:100px;background:var(--accent-lo);margin-bottom:32px;display:inline-block}
.h-title{position:relative;z-index:1;font-family:var(--display);font-size:clamp(42px,6vw,84px);font-weight:800;line-height:.97;letter-spacing:-.02em;margin-bottom:8px}
.h-title .accent{color:var(--accent)}
.h-line2{display:block}
.h-sub{position:relative;z-index:1;font-size:16px;font-weight:500;color:var(--t2);margin-bottom:40px;max-width:480px;line-height:1.6}
.h-stats{position:relative;z-index:1;display:flex;gap:28px;align-items:center}
.h-stat{text-align:center}
.h-sv{font-family:var(--sans);font-size:36px;font-weight:800;color:var(--accent);line-height:1}
.h-sl{font-family:var(--cond);font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-top:5px}
.h-div{width:1px;height:36px;background:var(--border2)}
.scrollh{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:1;display:flex;flex-direction:column;align-items:center;gap:6px}
.scrollh span{font-family:var(--cond);font-size:9px;letter-spacing:.2em;color:var(--t3);text-transform:uppercase}
.sline{width:1px;height:28px;background:linear-gradient(to bottom,var(--accent),transparent);animation:sp 2s ease-in-out infinite}
@keyframes sp{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes fu{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}

.sec{padding:72px 48px;max-width:1180px;margin:0 auto}
.sep{width:100%;max-width:1180px;margin:0 auto;height:1px;background:var(--border)}
.slbl{font-family:var(--cond);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;display:flex;align-items:center;gap:10px}
.stitle{font-family:var(--display);font-size:clamp(28px,3.5vw,44px);font-weight:800;line-height:1.05;letter-spacing:-.02em;margin-bottom:8px;color:var(--t1)}
.stitle .accent{color:var(--accent)}
.sdesc{font-size:14px;color:var(--t2);line-height:1.7;max-width:480px}

.svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:40px}
.svc-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px 22px;transition:border-color .15s;cursor:default}
.svc-card:hover{border-color:var(--border2)}
.svc-num{font-family:var(--cond);font-size:11px;font-weight:500;color:var(--accent);letter-spacing:.1em;margin-bottom:10px;opacity:.8}
.svc-name{font-family:var(--sans);font-size:17px;font-weight:700;color:var(--t1);margin-bottom:10px;line-height:1.2}
.svc-list{list-style:none;color:var(--t2);font-size:12px;line-height:1.6}
.svc-list li{padding-left:14px;position:relative;margin-bottom:2px}
.svc-list li::before{content:'→';position:absolute;left:0;color:var(--accent)}
.svc-price{font-family:var(--cond);font-size:13px;font-weight:800;color:var(--accent);margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}

.tl{position:relative;margin-top:40px;padding-left:52px}
.tl::before{content:'';position:absolute;left:14px;top:8px;bottom:0;width:1px;background:linear-gradient(to bottom,var(--accent),transparent)}
.tl-item{position:relative;margin-bottom:32px;padding-left:16px}
.tl-dot{position:absolute;left:-44px;top:4px;width:16px;height:16px;border-radius:50%;background:var(--bg);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center}
.tl-dot::after{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent)}
.tl-week{font-family:var(--cond);font-size:10px;color:var(--accent);letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px;opacity:.9}
.tl-title{font-family:var(--sans);font-size:20px;font-weight:700;margin-bottom:5px}
.tl-desc{font-size:13px;color:var(--t2);line-height:1.65;max-width:540px}
.tl-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
.tp{font-family:var(--cond);font-size:9px;padding:3px 8px;border-radius:3px;background:var(--surface2);border:1px solid var(--border);color:var(--t2);letter-spacing:.05em}

.stages-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:40px}
.stage-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px 22px;position:relative;overflow:hidden;transition:border-color .15s}
.stage-card.stage-feat{border-color:rgba(43,58,154,0.3);background:linear-gradient(135deg,rgba(43,58,154,0.05),var(--surface))}
.stage-v{font-family:var(--cond);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);background:var(--accent-lo);border:1px solid rgba(43,58,154,0.25);padding:4px 12px;border-radius:3px;display:inline-block;margin-bottom:14px}
.stage-title{font-family:var(--sans);font-size:19px;font-weight:700;margin-bottom:6px;color:var(--t1)}
.stage-features{list-style:none;margin:10px 0 16px;display:flex;flex-direction:column;gap:6px}
.stage-features li{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--t2);line-height:1.5}
.stage-features li::before{content:'→';color:var(--accent);font-weight:700;flex-shrink:0}
.stage-divider{height:1px;background:var(--border);margin:14px 0}
.stage-price-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.stage-price{font-family:var(--sans);font-size:32px;font-weight:800;color:var(--accent);line-height:1;letter-spacing:-.02em}
.stage-price-label{font-size:12px;color:var(--t3);font-family:var(--cond)}
.stage-payments{display:flex;flex-direction:column;gap:5px;margin-top:8px}
.stage-pay-row{display:flex;justify-content:space-between;align-items:center;font-size:12px}
.stage-pay-label{color:var(--t2)}
.stage-pay-val{font-family:var(--cond);font-size:12px;color:var(--t1);font-weight:600}
.stage-comment{font-size:11px;color:var(--t3);margin-top:10px;line-height:1.5;font-style:italic}
.tariff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:40px}
.tariff-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 24px;position:relative;overflow:hidden;transition:border-color .2s}
.tariff-card.feat{border-color:rgba(43,58,154,0.3);background:linear-gradient(135deg,rgba(43,58,154,0.05),var(--surface))}
.feat-glow{display:none}
.t-badge{font-family:var(--cond);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);background:var(--accent-lo);border:1px solid rgba(43,58,154,0.25);padding:4px 12px;border-radius:3px;display:inline-block;margin-bottom:16px}
.t-title{font-family:var(--sans);font-size:22px;font-weight:700;margin-bottom:6px}
.t-desc{font-size:12px;color:var(--t2);line-height:1.6;margin-bottom:18px}
.t-price{font-family:var(--sans);font-size:40px;font-weight:800;color:var(--accent);line-height:1;margin-bottom:3px;letter-spacing:-.02em}
.t-period{font-family:var(--sans);font-size:14px;font-weight:500;color:var(--t3)}
.t-div{height:1px;background:var(--border);margin:16px 0}
.t-features{list-style:none;display:flex;flex-direction:column;gap:8px}
.t-features li{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--t2);line-height:1.5}
.t-features li::before{content:'→';color:var(--accent);font-weight:700;flex-shrink:0;margin-top:1px}

.total-block{margin-top:48px;padding:28px 36px;background:var(--surface);border:1px solid var(--border2);border-radius:16px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;position:relative;overflow:hidden}
.total-block::before{display:none}
.total-l{position:relative;z-index:1}
.total-lbl{font-family:var(--cond);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--t3);margin-bottom:6px}
.total-amt{font-family:var(--sans);font-size:clamp(36px,4vw,52px);font-weight:800;color:var(--accent);line-height:1;letter-spacing:-.02em}
.total-note{font-family:var(--cond);font-size:10px;color:var(--t3);margin-top:6px;letter-spacing:.04em}
.total-r{position:relative;z-index:1}

.cta-wrap{padding:72px 48px;text-align:center;position:relative;overflow:hidden}
.cta-wrap::before{display:none}
.cta-top{position:relative;z-index:1;font-family:var(--cond);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:16px}
.cta-title{position:relative;z-index:1;font-family:var(--display);font-size:clamp(36px,4.5vw,58px);font-weight:800;line-height:1.02;letter-spacing:-.02em;margin-bottom:14px;color:var(--t1)}
.cta-title .accent{color:var(--accent)}
.cta-sub{position:relative;z-index:1;font-size:15px;color:var(--t2);margin:0 auto 36px;max-width:380px;line-height:1.6}
.cta-btns{position:relative;z-index:1;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-pri{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;padding:14px 32px;border-radius:12px;font-family:var(--sans);font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;text-decoration:none}
.cta-pri:hover{filter:brightness(1.1);transform:translateY(-1px)}
.cta-sec{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--t2);border:1px solid rgba(43,58,154,0.25);padding:14px 32px;border-radius:12px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
.cta-sec:hover{border-color:var(--accent);color:var(--accent)}

footer{padding:24px 48px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;max-width:1180px;margin:0 auto}
.fl{font-family:var(--sans);font-size:13px;font-weight:800;color:var(--accent);letter-spacing:.04em}
.fc{font-family:var(--cond);font-size:10px;color:var(--t3);letter-spacing:.05em}

.reveal{opacity:1;transform:none;transition:opacity .55s ease,transform .55s ease}
.faq-list{display:flex;flex-direction:column;gap:12px;margin-top:36px}
.faq-item{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 22px;transition:border-color .15s}
.faq-item:hover{border-color:var(--border2)}
.faq-q{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:8px;display:flex;align-items:flex-start;gap:10px}
.faq-q::before{content:'Q';font-family:var(--cond);font-size:10px;font-weight:700;color:var(--accent);background:var(--accent-lo);padding:2px 6px;border-radius:4px;flex-shrink:0;margin-top:1px}
.faq-a{font-size:13px;color:var(--t2);line-height:1.65;padding-left:28px}
.terms-list{list-style:none;display:flex;flex-direction:column;gap:10px;margin-top:28px}
.terms-list li{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--t2);line-height:1.55}
.terms-list li::before{content:'✓';color:var(--green);font-weight:700;flex-shrink:0;margin-top:1px}

/* ── Секция 01 — Концепция ────────────────────────────────── */
.concept-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;margin-top:32px}
.concept-audience{grid-column:span 7;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px}
.c-audience-lbl{font-family:var(--cond);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.c-audience-text{font-family:var(--sans);font-size:17px;font-weight:500;color:var(--t1);line-height:1.5}
.concept-analogy{grid-column:span 5;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:14px}
.c-analogy-icon{font-size:28px;line-height:1}
.c-analogy-text{font-family:var(--sans);font-size:15px;font-weight:500;color:var(--t1);line-height:1.55;font-style:italic}
.concept-cards{grid-column:span 12;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.concept-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 20px 22px;transition:border-color .15s}
.concept-card:hover{border-color:var(--border2)}
.c-card-label{font-family:var(--cond);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.c-card-title{font-family:var(--sans);font-size:16px;font-weight:700;color:var(--t1);margin-bottom:8px;line-height:1.25}
.c-card-desc{font-family:var(--sans);font-size:12.5px;color:var(--t2);line-height:1.55}

/* ── Секция 02 — Экраны программы ─────────────────────────── */
.screens-wrap{margin-top:40px}
.tab-switcher{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:14px;width:fit-content;max-width:100%}
.tab-btn{font-family:var(--sans);font-size:13px;font-weight:600;color:var(--t2);background:transparent;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;transition:all .15s;white-space:nowrap}
.tab-btn:hover{color:var(--t1)}
.tab-btn.active{background:var(--accent);color:#fff}
.tab-panel{display:none;grid-template-columns:1.1fr 1fr;gap:32px;align-items:start}
.tab-panel.active{display:grid}
@media (max-width:840px){.tab-panel.active{display:block}}
.tab-panel-body{display:flex;flex-direction:column;gap:18px}
.tab-panel-title{font-family:var(--sans);font-size:22px;font-weight:800;color:var(--t1);letter-spacing:-.02em;line-height:1.15}
.tab-panel-desc{font-family:var(--sans);font-size:14px;color:var(--t2);line-height:1.65;max-width:520px}
.tab-features{display:flex;flex-direction:column;gap:14px;margin-top:6px}
.tab-feature{display:grid;grid-template-columns:28px 1fr;gap:14px;align-items:start}
.tab-feature-icon{width:28px;height:28px;border-radius:8px;background:var(--accent-lo);border:1px solid rgba(43,58,154,0.25);display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:14px;font-weight:700;margin-top:2px}
.tab-feature-title{font-family:var(--sans);font-size:13px;font-weight:700;color:var(--t1);margin-bottom:3px}
.tab-feature-desc{font-family:var(--sans);font-size:12.5px;color:var(--t2);line-height:1.55}
.tab-image{position:relative;border:1px solid var(--border);border-radius:18px;overflow:hidden;background:linear-gradient(135deg,var(--surface),var(--bg));min-height:420px;display:flex;align-items:center;justify-content:center}
.tab-image img{width:100%;height:auto;display:block}
.tab-image-placeholder{font-family:var(--cond);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--t3);text-align:center;padding:40px 20px}
.tab-image-placeholder::before{content:'';display:block;width:48px;height:48px;border:1px solid var(--border2);border-radius:12px;margin:0 auto 18px}
.stages-list{display:flex;flex-direction:column;gap:0;margin-top:36px}
.stage-li{display:grid;grid-template-columns:56px 1fr;gap:24px;padding:28px 0;border-bottom:1px solid var(--border);align-items:start}
.stage-li:last-child{border-bottom:none}
.stage-li-num{font-family:var(--cond);font-size:32px;font-weight:800;color:var(--accent);opacity:.2;line-height:1.1}
.stage-li-title{font-size:18px;font-weight:700;color:var(--t1);margin-bottom:10px;line-height:1.2}
.stage-li-features{list-style:none;display:flex;flex-direction:column;gap:5px;margin-bottom:16px}
.stage-li-features li{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--t2);line-height:1.5}
.stage-li-features li::before{content:'→';color:var(--accent);font-weight:700;flex-shrink:0}
.stage-li-bottom{display:flex;align-items:center;gap:24px;padding-top:14px;border-top:1px solid var(--border);flex-wrap:wrap}
.stage-li-price{font-size:24px;font-weight:800;color:var(--accent);font-family:var(--sans);letter-spacing:-.02em}
.stage-li-pay{font-size:10px;color:var(--t3);font-family:var(--cond);line-height:1.8}
.stage-li-comment{font-size:11px;color:var(--t3);font-style:italic;flex-basis:100%;margin-top:2px}

/* ── Кейсы ──────────────────────────────────────────────────── */
.cases-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.case-pill{background:var(--surface);border:1px solid var(--border);border-radius:100px;padding:8px 18px;font-size:12px;font-weight:600;color:var(--t2);white-space:nowrap;transition:border-color .15s}
.case-pill:hover{border-color:var(--border2);color:var(--t1)}
.case-pill.case-accent{border-color:rgba(43,58,154,.28);color:var(--t1);background:var(--accent-lo)}

/* ── Манибэк ─────────────────────────────────────────────────── */
.moneyback{display:flex;align-items:flex-start;gap:14px;background:var(--surface);border:1px solid rgba(26,122,74,0.18);border-radius:14px;padding:18px 22px;margin-top:24px}
.moneyback-icon{font-size:22px;flex-shrink:0;line-height:1.2}
.moneyback-text{font-size:13px;color:var(--t2);line-height:1.6}
.moneyback-text strong{color:var(--t1);font-weight:700}
/* ── EdAgency credentials ──────────────────────────────────────── */
.ea-stats{display:flex;align-items:center;gap:0;margin-top:32px;flex-wrap:wrap}
.ea-stat{padding:20px 40px 20px 0;flex-shrink:0}
.ea-sv{font-family:var(--display);font-size:clamp(40px,5vw,60px);font-weight:800;color:var(--accent);line-height:1;letter-spacing:-.02em}
.ea-sl{font-family:var(--cond);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-top:4px}
.ea-div{width:1px;height:48px;background:var(--border2);margin-right:40px;flex-shrink:0;align-self:center}
.ea-clients{font-size:14px;color:var(--t2);margin-top:24px;line-height:1.5;max-width:600px}
@media(max-width:640px){.ea-stat{padding:16px 24px 16px 0}.ea-div{display:none}}
</style></head><body>
<script>
window.__KP_DATA__ = ${JSON.stringify(kpData)};
</script>
<div id="kp-root"></div>
<script>
(function(){
  const data = window.__KP_DATA__;
  const slug = ${JSON.stringify(slug)};
  const fmtR = n => n > 0 ? n.toLocaleString('ru-RU') + '\u202f₽' : 'По запросу';
  const today = new Date().toLocaleDateString('ru-RU', {day:'2-digit',month:'long',year:'numeric'});
  const modules = data.modules || [];
  const roadmap = data.roadmap || [];
  const stages = data.stages || [];
  const tariffs = data.tariffs || [];
  const total = data.total || modules.reduce((s,m) => s + (m.price||0), 0);
  const originalTotal = data.originalTotal || 0;
  const discount = data.discount || 0;
  const client = data.client || '';
  const org = data.org || '';
  const titleStr = data.title || 'Коммерческое предложение';
  const intro = data.intro || '';
  const tg = data.telegram || '';
  const validity = data.validity || 14;
  const manager = data.manager || '';
  const faq = data.faq || [];
  const terms = data.terms || [];
  const concept = data.concept || null;
  const screens = data.screens || null;
  const cases = data.cases || [];

  const words = titleStr.split(' ');
  const half = Math.ceil(words.length / 2);
  const l1 = words.slice(0, half).join(' ');
  const l2 = words.slice(half).join(' ');

  const modulesHtml = modules.map((m,i) => \`
    <div class="svc-card reveal" style="transition-delay:\${i*0.07}s">
      <div class="svc-num">\${String(i+1).padStart(2,'0')}</div>
      <div class="svc-name">\${m.name||'Модуль '+(i+1)}</div>
      \${(m.bullets||[]).length ? '<ul class="svc-list"><li>' + (m.bullets||[]).slice(0,3).join('</li><li>') + '</li></ul>' : ''}
    </div>\`).join('');

  const roadmapHtml = roadmap.map((r,i) => \`
    <div class="tl-item reveal" style="transition-delay:\${i*0.09}s">
      <div class="tl-dot"></div>
      <div class="tl-week">Недели \${r.weeks||i+1}</div>
      <div class="tl-title">\${r.title||''}</div>
      <div class="tl-desc">\${r.desc||''}</div>
    </div>\`).join('');

  const stagesHtml = stages.map((s,i) => {
    const prepay = s.prepay || Math.round((s.price||0) * 0.5);
    const rem = (s.price||0) - prepay;
    return \`<div class="stage-li reveal" style="transition-delay:\${i*0.08}s">
      <div class="stage-li-num">\${String(i+1).padStart(2,'0')}</div>
      <div class="stage-li-body">
        <div class="stage-li-title">\${s.title||s.version||''}</div>
        \${(s.features||[]).length ? '<ul class="stage-li-features"><li>' + s.features.join('</li><li>') + '</li></ul>' : ''}
        <div class="stage-li-bottom">
          <div class="stage-li-price">\${fmtR(s.price||0)}</div>
          <div class="stage-li-pay">Предоплата 50%: \${fmtR(prepay)}<br>После сдачи: \${fmtR(rem)}</div>
          \${s.comment ? '<div class="stage-li-comment">'+s.comment+'</div>' : ''}
        </div>
      </div>
    </div>\`;
  }).join('');

  const tariffsHtml = tariffs.map((t, i) => {
    const feat = t.featured || (tariffs.length === 3 && i === 1);
    return \`
    <div class="tariff-card\${feat?' feat':''}">
      \${feat ? '<div class="feat-glow"></div>' : ''}
      <div class="t-badge">\${t.badge||''}</div>
      <div class="t-title">\${t.title||''}</div>
      <div class="t-desc">\${t.desc||''}</div>
      \${stages.length ? '' : '<div class="t-price">'+fmtR(t.price||0)+'<span class="t-period">'+(t.period?' / '+t.period:'')+'</span></div>'}
      <div class="t-div"></div>
      <ul class="t-features">\${(t.features||[]).map(f => '<li>'+f+'</li>').join('')}</ul>
    </div>\`;
  }).join('');

  const faqHtml = faq.map((item, i) => \`
  <div class="faq-item reveal" style="transition-delay:\${i*0.06}s">
    <div class="faq-q">\${item.q||''}</div>
    <div class="faq-a">\${item.a||''}</div>
  </div>\`).join('');
  const termsHtml = terms.map(t => \`<li>\${t}</li>\`).join('');

  const conceptHtml = concept ? \`
  <div class="sep"></div>
  <div class="sec">
    <div class="slbl reveal">Для кого</div>
    <h2 class="stitle reveal">Кому подходит <span class="accent">— и кому нет</span></h2>
    <div class="concept-grid">
      \${concept.audience ? \`
      <div class="concept-audience reveal">
        <div class="c-audience-lbl">\${concept.audienceLabel || 'Для кого'}</div>
        <div class="c-audience-text">\${concept.audience}</div>
      </div>\` : ''}
      \${concept.analogy ? \`
      <div class="concept-analogy reveal" style="transition-delay:.05s">
        \${concept.analogyIcon ? '<div class="c-analogy-icon">'+concept.analogyIcon+'</div>' : ''}
        <div class="c-analogy-text">\${concept.analogy}</div>
      </div>\` : ''}
      \${(concept.cards || []).length ? \`
      <div class="concept-cards">
        \${concept.cards.map((card, i) => \`
        <div class="concept-card reveal" style="transition-delay:\${i*0.05}s">
          \${card.label ? '<div class="c-card-label">'+card.label+'</div>' : ''}
          \${card.title ? '<div class="c-card-title">'+card.title+'</div>' : ''}
          \${card.desc ? '<div class="c-card-desc">'+card.desc+'</div>' : ''}
        </div>\`).join('')}
      </div>\` : ''}
    </div>
  </div>\` : '';

  const screensHtml = screens && screens.tabs && screens.tabs.length ? \`
  <div class="sep"></div>
  <div class="sec">
    <div class="slbl reveal">Состав работы</div>
    <h2 class="stitle reveal">\${screens.tabsLabel || 'Что входит в работу'}</h2>
    <div class="screens-wrap reveal">
      <div class="tab-switcher" role="tablist">
        \${screens.tabs.map((t, i) => \`<button class="tab-btn\${i===0?' active':''}" data-tab="\${t.id || ('tab'+i)}" type="button">\${t.label || ''}</button>\`).join('')}
      </div>
      \${screens.tabs.map((t, i) => \`
      <div class="tab-panel\${i===0?' active':''}" data-panel="\${t.id || ('tab'+i)}">
        <div class="tab-panel-body">
          \${t.title ? '<div class="tab-panel-title">'+t.title+'</div>' : ''}
          \${t.desc ? '<div class="tab-panel-desc">'+t.desc+'</div>' : ''}
          \${(t.features || []).length ? \`
          <div class="tab-features">
            \${t.features.map(f => \`
            <div class="tab-feature">
              <div class="tab-feature-icon">→</div>
              <div class="tab-feature-body">
                \${f.title ? '<div class="tab-feature-title">'+f.title+'</div>' : ''}
                \${f.desc ? '<div class="tab-feature-desc">'+f.desc+'</div>' : ''}
              </div>
            </div>\`).join('')}
          </div>\` : ''}
        </div>
        <div class="tab-image">
          \${t.image ? '<img src="'+t.image+'" alt="'+(t.label||'')+'" loading="lazy">' : '<div class="tab-image-placeholder">Превью<br>программы</div>'}
        </div>
      </div>\`).join('')}
    </div>
  </div>\` : '';

  const casesHtml = cases.length ? \`
  <div class="sep"></div>
  <div class="sec">
    <div class="slbl reveal">Кейсы</div>
    <h2 class="stitle reveal">Среди наших клиентов — <span class="accent">вот кто работал с нами</span></h2>
    <div class="cases-strip">
      \${cases.map((c,i) => \`<div class="case-pill\${i===0?' case-accent':''}">\${c}</div>\`).join('')}
    </div>
  </div>\` : '';

  const pdfHref = slug.startsWith('service-')
    ? '/services/' + slug.replace(/^service-/, '') + '/pdf'
    : '/kp/' + encodeURIComponent(slug) + '/pdf';
  const pdfBtn = \`<a href="\${pdfHref}" class="cta-sec" download><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Скачать PDF</a>\`;
  const tgBtn = tg
    ? \`<a href="\${tg}" target="_blank" class="cta-pri"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>Написать в Telegram — ответим сегодня</a>\`
    : '';
  const clarifyBtn = \`<button onclick="openClarifyModal()" class="cta-sec" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Запросить уточнение</button>\`;

  document.getElementById('kp-root').innerHTML = \`
<nav>
  <div class="nl"><span class="nd"></span>Коммерческое предложение</div>
  <div style="display:flex;align-items:center;gap:10px">
    <div class="nm">\${today}</div>
    <a id="kp-edit-btn" href="/?edit=${slug}" style="display:none;font-family:var(--cond);font-size:10px;letter-spacing:.08em;color:var(--t3);text-decoration:none;border:1px solid var(--border);padding:5px 12px;border-radius:6px;transition:all .15s" onmouseover="this.style.borderColor='rgba(43,58,154,0.4)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--t3)'">Редактировать</a>
  </div>
</nav>

<div class="hero">
  <div class="h-badge">Для:\${client ? ' '+client : ''}\${org ? ' · '+org : ''}</div>
  <h1 class="h-title"><span class="accent">\${l1}</span>\${l2 ? '<span class="h-line2">'+l2+'</span>' : ''}</h1>
  \${intro ? '<p class="h-sub">'+intro+'</p>' : ''}
  \${modules.length ? \`<div class="h-stats">
    <div class="h-stat"><div class="h-sv">\${modules.length}</div><div class="h-sl">\${modules.length===1?'модуль':modules.length<5?'модуля':'модулей'}</div></div>
    \${roadmap.length ? (() => { const m=roadmap[roadmap.length-1]?.weeks?.match(/(\\d+)/g); return m ? '<div class="h-div"></div><div class="h-stat"><div class="h-sv">'+m[m.length-1]+'</div><div class="h-sl">недель</div></div>' : ''; })() : ''}
  </div>\` : ''}
  \${tg ? \`<div style="position:relative;z-index:1;margin-top:28px"><a href="\${tg}" target="_blank" class="cta-pri">Обсудить задачу в Telegram</a></div>\` : ''}
  <div class="scrollh"><span>Подробнее</span><div class="sline"></div></div>
</div>

\${conceptHtml}

\${screensHtml}

\${modules.length && !stages.length ? \`
<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Этапы</div>
  <h2 class="stitle reveal">Из чего состоит <span class="accent">работа</span></h2>
  <div class="svc-grid">\${modulesHtml}</div>
  <div class="total-block reveal" style="margin-top:40px">
    <div class="total-l">
      <div class="total-lbl">Итого по проекту</div>
      \${discount>0&&originalTotal>0?'<div class="total-amt-old">'+fmtR(originalTotal)+'</div>':''}
      <div class="total-amt">\${fmtR(total)}\${discount>0?'<span class="total-disc-badge">−'+discount+'%</span>':''}</div>
      <div class="total-note">Предложение действительно \${validity} дней · \${today}</div>
    </div>
    <div class="total-r">\${tg ? '<a href="'+tg+'" target="_blank" class="cta-pri" style="font-size:13px;padding:12px 22px">Написать в Telegram</a>' : ''}</div>
  </div>
  <div class="moneyback reveal">
    <div class="moneyback-icon">✦</div>
    <div class="moneyback-text"><strong>Первый этап — пробный.</strong> Если после первого этапа видите, что подход не подходит, — расходимся без штрафов. Платите только за сделанное.</div>
  </div>
</div>\` : ''}

\${casesHtml}

<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Кто делает</div>
  <h2 class="stitle reveal">EdAgency — методисты <span class="accent">и продюсеры</span></h2>
  <div class="ea-stats">
    <div class="ea-stat reveal">
      <div class="ea-sv">600+</div>
      <div class="ea-sl">уроков произведено</div>
    </div>
    <div class="ea-div reveal"></div>
    <div class="ea-stat reveal" style="transition-delay:.05s">
      <div class="ea-sv">30+</div>
      <div class="ea-sl">вебинаров под ключ</div>
    </div>
    <div class="ea-div reveal" style="transition-delay:.05s"></div>
    <div class="ea-stat reveal" style="transition-delay:.1s">
      <div class="ea-sv">3</div>
      <div class="ea-sl">флагманских проекта с именными экспертами</div>
    </div>
  </div>
  <p class="ea-clients reveal">Среди клиентов: Михаил Дашкиев, Алиса Старовойтова, Маргулан Сейсембаев</p>
</div>

\${roadmap.length ? \`
<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Сроки</div>
  <h2 class="stitle reveal">Работаем <span class="accent">\${(() => { const m=roadmap[roadmap.length-1]?.weeks?.match(/(\\d+)/g); return m?m[m.length-1]:'?'; })()}&nbsp;недель</span> — план по этапам</h2>
  <div class="tl">\${roadmapHtml}</div>
</div>\` : ''}

\${stages.length ? \`
<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Этапы и оплата</div>
  <h2 class="stitle reveal">Оплачиваете поэтапно — <span class="accent">только за сделанное</span></h2>
  <div class="stages-list">\${stagesHtml}</div>
  <div class="total-block reveal" style="margin-top:32px">
    <div class="total-l">
      <div class="total-lbl">Итого по проекту</div>
      \${discount>0&&originalTotal>0?'<div class="total-amt-old">'+fmtR(originalTotal)+'</div>':''}
      <div class="total-amt">\${fmtR(total)}\${discount>0?'<span class="total-disc-badge">−'+discount+'%</span>':''}</div>
      <div class="total-note">Предложение действительно \${validity} дней · \${today}</div>
    </div>
    <div class="total-r">\${tg ? '<a href="'+tg+'" target="_blank" class="cta-pri" style="font-size:13px;padding:12px 22px">Написать в Telegram</a>' : ''}</div>
  </div>
  <div class="moneyback reveal">
    <div class="moneyback-icon">✦</div>
    <div class="moneyback-text"><strong>Первый этап — пробный.</strong> Если после первого этапа видите, что подход не подходит, — расходимся без штрафов. Платите только за сделанное.</div>
  </div>
</div>\` : tariffs.length ? \`
<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Стоимость</div>
  <h2 class="stitle reveal">Что входит <span class="accent">и сколько стоит</span></h2>
  <div class="tariff-grid">\${tariffsHtml}</div>
  \${total > 0 ? \`
  <div class="total-block reveal">
    <div class="total-l">
      <div class="total-lbl">Итого по проекту</div>
      \${discount>0&&originalTotal>0?'<div class="total-amt-old">'+fmtR(originalTotal)+'</div>':''}
      <div class="total-amt">\${fmtR(total)}\${discount>0?'<span class="total-disc-badge">−'+discount+'%</span>':''}</div>
      <div class="total-note">Предложение действительно \${validity} дней · \${today}</div>
    </div>
    <div class="total-r">\${tg ? '<a href="'+tg+'" target="_blank" class="cta-pri" style="font-size:13px;padding:12px 22px">Написать в Telegram</a>' : ''}</div>
  </div>\` : ''}
</div>\` : ''}

\${faq.length ? \`
<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Вопросы</div>
  <h2 class="stitle reveal">Что спрашивают <span class="accent">перед стартом</span></h2>
  <div class="faq-list">\${faqHtml}</div>
</div>\` : ''}

\${terms.length ? \`
<div class="sep"></div>
<div class="sec">
  <div class="slbl reveal">Условия</div>
  <h2 class="stitle reveal">Как работаем <span class="accent">и чего ожидаем</span></h2>
  <ul class="terms-list reveal">\${termsHtml}</ul>
</div>\` : ''}

<div class="sep"></div>
<div class="cta-wrap">
  <div style="position:relative;z-index:1">
    <h2 class="cta-title">Пришлите задачу — <span class="accent">ответим сегодня</span></h2>
    <p class="cta-sub">Разберём вашу ситуацию и скажем, подходит ли этот формат — без обязательств</p>
    <div class="cta-btns">\${tgBtn}\${pdfBtn}\${clarifyBtn}</div>
  </div>
</div>

<footer>
  <div class="fl">EdAgency\${client ? ' · '+client : ''}</div>
  <div class="fc">Действительно \${validity} дней · \${today}\${manager ? ' · '+manager : ''}</div>
</footer>\`;

})();
</script>
<script>
function openKPPdf() {
  const d = window.__KP_DATA__;
  const w = window.open('', '_blank');
  if (!w) return;
  const fR = n => n > 0 ? n.toLocaleString('ru-RU') + '\u202f₽' : '—';
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const rows = (d.stages && d.stages.length ? d.stages : d.modules || []).map((item,i) => {
    const isStage = !!(item.version || item.prepay !== undefined);
    const desc = isStage ? (item.features||[]).join('; ') : (item.bullets||[]).slice(0,3).join('; ');
    const dur = isStage ? '' : (d.roadmap||[])[i]?.weeks ? 'Нед. '+(d.roadmap||[])[i].weeks : '';
    const price = fR(item.price||0);
    return \`<tr><td>\${i+1}</td><td>\${esc(isStage?item.title:item.name)}</td><td>\${esc(desc)}</td><td>\${esc(isStage?'':dur)}</td><td>\${price}</td></tr>\`;
  }).join('');
  const discRow = d.discount>0&&d.originalTotal>0 ? \`<tr class="disc-row"><td colspan="4">Скидка \${d.discount}%</td><td>\${fR(d.total)}</td></tr>\` : '';
  w.document.write(\`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<title>КП — \${esc(d.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
@page{margin:18mm 16mm;size:A4}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Manrope',sans-serif;color:#111;font-size:11px;line-height:1.5}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #2B3A9A;margin-bottom:18px}
.hdr-logo{font-size:18px;font-weight:800;color:#2B3A9A;letter-spacing:.03em}
.hdr-info{text-align:right;font-size:10px;color:#666}
.hdr-info strong{display:block;font-size:13px;font-weight:700;color:#111;margin-bottom:2px}
.project-meta{display:flex;gap:24px;margin-bottom:18px;padding:12px 16px;background:#f0f1fa;border-radius:8px;border-left:3px solid #2B3A9A}
.meta-item{display:flex;flex-direction:column;gap:2px}
.meta-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#888}
.meta-val{font-size:12px;font-weight:600;color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:0}
thead tr{background:#2B3A9A;color:#fff}
th{padding:9px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
td{padding:8px 10px;border-bottom:1px solid #e8e8f0;vertical-align:top;font-size:11px}
tr:nth-child(even) td{background:#faf9ff}
td:first-child{font-weight:700;color:#2B3A9A;width:28px;text-align:center}
td:nth-child(4){width:80px;color:#555;white-space:nowrap}
td:last-child{font-weight:700;white-space:nowrap;text-align:right;width:100px}
.total-row td{background:#eceffe!important;font-weight:800;font-size:13px;border-top:2px solid #2B3A9A}
.total-row td:last-child{color:#2B3A9A;font-size:15px}
.disc-row td{background:#f0fff8!important;color:#16a34a;font-weight:700;border-top:1px dashed #16a34a}
.footer{margin-top:18px;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#999;border-top:1px solid #e8e8f0;padding-top:10px}
</style></head><body>
<div class="hdr">
  <div><div class="hdr-logo">EdAgency</div><div style="font-size:10px;color:#666;margin-top:3px">Коммерческое предложение</div></div>
  <div class="hdr-info"><strong>\${esc(d.title)}</strong>\${d.client?'Для: '+esc(d.client)+'<br>':''}\${new Date().toLocaleDateString('ru-RU')}</div>
</div>
<div class="project-meta">
  \${d.client?\`<div class="meta-item"><div class="meta-lbl">Клиент</div><div class="meta-val">\${esc(d.client)}</div></div>\`:''}
  \${d.total?\`<div class="meta-item"><div class="meta-lbl">Стоимость</div><div class="meta-val">\${fR(d.total)}\${d.discount>0?' (скидка '+d.discount+'%)':''}</div></div>\`:''}
  \${d.manager?\`<div class="meta-item"><div class="meta-lbl">Менеджер</div><div class="meta-val">\${esc(d.manager)}</div></div>\`:''}
  \${d.validity?\`<div class="meta-item"><div class="meta-lbl">Действует</div><div class="meta-val">\${d.validity} дней</div></div>\`:''}
</div>
<table>
<thead><tr><th>№</th><th>Задача</th><th>Описание</th><th>Срок</th><th>Стоимость</th></tr></thead>
<tbody>\${rows}\${discRow}<tr class="total-row"><td colspan="4">Итого по проекту</td><td>\${fR(d.total||0)}</td></tr></tbody>
</table>
<div class="footer"><span>EdAgency · edagency.ru</span><span>\${d.manager||''}</span><span>Предложение действительно \${d.validity||14} дней</span></div>
<script>window.onload=()=>window.print();<\\/script>
</body></html>\`);
  w.document.close();
}
const obs = new IntersectionObserver(
  e => e.forEach(x => { if(x.isIntersecting) x.target.classList.add('visible'); }),
  {threshold:.07, rootMargin:'0px 0px -24px 0px'}
);
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// Табы «Экраны программы»
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-tab');
    const wrap = btn.closest('.screens-wrap');
    if (!wrap) return;
    wrap.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    wrap.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.getAttribute('data-panel') === id));
  });
});

// Show edit button only if user is authenticated (has calc_token)
if (localStorage.getItem('calc_token')) {
  const eb = document.getElementById('kp-edit-btn');
  if (eb) eb.style.display = '';
}

// Clarify modal
function openClarifyModal() {
  document.getElementById('clarify-modal').style.display = 'flex';
}
function closeClarifyModal() {
  document.getElementById('clarify-modal').style.display = 'none';
  document.getElementById('clarify-name').value = '';
  document.getElementById('clarify-msg').value = '';
  document.getElementById('clarify-err').textContent = '';
  document.getElementById('clarify-ok').style.display = 'none';
}
async function submitClarify() {
  const name = document.getElementById('clarify-name').value.trim();
  const message = document.getElementById('clarify-msg').value.trim();
  const errEl = document.getElementById('clarify-err');
  if (!message) { errEl.textContent = 'Введите сообщение'; return; }
  errEl.textContent = '';
  const btn = document.getElementById('clarify-submit');
  btn.disabled = true; btn.textContent = 'Отправка…';
  try {
    const r = await fetch('/kp/${slug}/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message })
    });
    const d = await r.json();
    if (!r.ok) { errEl.textContent = d.error || 'Ошибка'; return; }
    document.getElementById('clarify-ok').style.display = 'block';
    document.getElementById('clarify-form').style.display = 'none';
  } catch (e) {
    errEl.textContent = 'Ошибка соединения';
  } finally {
    btn.disabled = false; btn.textContent = 'Отправить';
  }
}
</script>

<!-- Clarify modal -->
<div id="clarify-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--surface);border:1px solid var(--border2);border-radius:20px;padding:32px;max-width:480px;width:100%;position:relative">
    <button onclick="closeClarifyModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--t2);font-size:20px;cursor:pointer;line-height:1">×</button>
    <div style="font-family:var(--cond);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:12px">Запрос уточнения</div>
    <h3 style="font-size:20px;font-weight:800;margin-bottom:6px;color:var(--t1)">Есть вопросы?</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:24px;line-height:1.6">Опишите, что хотите уточнить — мы свяжемся с вами.</p>
    <div id="clarify-form">
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:11px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.06em;text-transform:uppercase">Ваше имя (необязательно)</label>
        <input id="clarify-name" type="text" placeholder="Иван Петров" style="width:100%;background:var(--input-bg);border:1px solid var(--input-bd);border-radius:10px;padding:10px 14px;font-family:var(--sans);font-size:13px;color:var(--t1);outline:none">
      </div>
      <div style="margin-bottom:16px">
        <label style="display:block;font-size:11px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.06em;text-transform:uppercase">Сообщение <span style="color:var(--accent)">*</span></label>
        <textarea id="clarify-msg" rows="4" placeholder="Что именно хотите уточнить?" style="width:100%;background:var(--input-bg);border:1px solid var(--input-bd);border-radius:10px;padding:10px 14px;font-family:var(--sans);font-size:13px;color:var(--t1);outline:none;resize:vertical"></textarea>
      </div>
      <div id="clarify-err" style="color:var(--error);font-size:12px;margin-bottom:10px"></div>
      <button id="clarify-submit" onclick="submitClarify()" style="width:100%;background:var(--accent);color:#fff;border:none;border-radius:12px;padding:13px;font-family:var(--sans);font-size:14px;font-weight:700;cursor:pointer;transition:filter .15s" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter=''">Отправить</button>
    </div>
    <div id="clarify-ok" style="display:none;text-align:center;padding:20px 0">
      <div style="font-size:36px;margin-bottom:12px">✓</div>
      <div style="font-size:16px;font-weight:700;color:var(--success);margin-bottom:6px">Запрос отправлен</div>
      <div style="font-size:13px;color:var(--t2)">Мы свяжемся с вами в ближайшее время</div>
    </div>
  </div>
</div>

</body></html>`;
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
module.exports.buildKpHtml = buildPremiumKpHtml;
