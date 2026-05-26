function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRubles(n) {
  return n > 0 ? `${Number(n).toLocaleString('ru-RU')}&nbsp;₽` : 'По запросу';
}

function extractLastWeek(roadmap) {
  const last = Array.isArray(roadmap) && roadmap.length ? roadmap[roadmap.length - 1] : null;
  const match = last && last.weeks ? String(last.weeks).match(/(\d+)/g) : null;
  return match && match.length ? match[match.length - 1] : '';
}

function accentLastWords(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Коммерческое <span class="accent">предложение</span>';
  if (words.length === 1) return `<span class="accent">${escapeHtml(words[0])}</span>`;
  const splitIndex = Math.max(1, words.length - 2);
  return `${escapeHtml(words.slice(0, splitIndex).join(' '))} <span class="accent">${escapeHtml(words.slice(splitIndex).join(' '))}</span>`;
}

function trimSentence(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function shortenText(value, max = 120) {
  const text = trimSentence(value);
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function metricCard(value, label, accent) {
  return `
    <article class="metric-card${accent ? ' metric-card-accent' : ''}">
      <strong>${value}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function buildRoadmapCopy(item) {
  const source = trimSentence(item.outcome || item.desc);
  if (!source) return 'На выходе: фиксируем конкретный результат этапа и материалы для следующего шага.';
  if (/^на выходе[:\s]/i.test(source.toLowerCase())) return source;
  return `На выходе: ${source}`;
}

function buildKpHtml(kpData, slug) {
  const modules = Array.isArray(kpData.modules) ? kpData.modules : [];
  const roadmap = Array.isArray(kpData.roadmap) ? kpData.roadmap : [];
  const stages = Array.isArray(kpData.stages) ? kpData.stages : [];
  const tariffs = Array.isArray(kpData.tariffs) ? kpData.tariffs : [];
  const faq = Array.isArray(kpData.faq) ? kpData.faq : [];
  const terms = Array.isArray(kpData.terms) ? kpData.terms : [];
  const cases = Array.isArray(kpData.cases) ? kpData.cases : [];
  const concept = kpData.concept || null;
  const screens = kpData.screens || null;
  const total = kpData.total || kpData.price || modules.reduce((sum, item) => sum + (item.price || 0), 0);
  const originalTotal = kpData.originalTotal || 0;
  const discount = kpData.discount || 0;
  const intro = kpData.intro || '';
  const title = kpData.title || 'Коммерческое предложение';
  const client = kpData.client || '';
  const org = kpData.org || '';
  const tg = kpData.telegram || '';
  const manager = kpData.manager || '';
  const validity = kpData.validity || kpData.validUntil || 14;
  const durationWeeks = kpData.durationWeeks || extractLastWeek(roadmap);
  const audienceLabel = concept && concept.audienceLabel ? concept.audienceLabel : 'Для кого';
  const riskCopy = concept && concept.analogy
    ? shortenText(concept.analogy, 190)
    : shortenText(intro || 'Без системной упаковки продукт быстро распадается на отдельные материалы и теряет логику результата.', 190);
  const clientMeta = [client, org].filter(Boolean).join(' · ');
  const pageDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const pdfHref = slug.startsWith('service-')
    ? `/services/${slug.replace(/^service-/, '')}/pdf`
    : `/kp/${encodeURIComponent(slug)}/pdf`;
  const priceMeta = [
    durationWeeks ? `${durationWeeks} недель` : '',
    total ? `от ${formatRubles(total)}` : '',
    validity ? `${validity} дней актуальности` : '',
  ].filter(Boolean);

  const primaryCta = tg
    ? `<a href="${escapeHtml(tg)}" target="_blank" rel="noreferrer" class="btn btn-primary">Обсудить проект</a>`
    : `<button type="button" class="btn btn-primary" onclick="openClarifyModal()">Обсудить проект</button>`;
  const secondaryCta = `<a href="${escapeHtml(pdfHref)}" class="btn btn-secondary" download>Скачать PDF</a>`;
  const clarifyCta = `<button type="button" class="btn btn-tertiary" onclick="openClarifyModal()">Запросить уточнение</button>`;

  const conceptCardsHtml = concept && Array.isArray(concept.cards) && concept.cards.length
    ? `<div class="detail-grid">
        ${concept.cards.map((card, index) => `
          <article class="surface-card detail-card">
            <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
            ${card.label ? `<div class="eyebrow-small">${escapeHtml(card.label)}</div>` : ''}
            ${card.title ? `<h3>${escapeHtml(card.title)}</h3>` : ''}
            ${card.desc ? `<p>${escapeHtml(shortenText(card.desc, 145))}</p>` : ''}
          </article>
        `).join('')}
      </div>`
    : '';

  const conceptHtml = concept ? `
  <section class="section" id="solution">
    <div class="shell">
      <div class="section-head">
        <span class="section-kicker">Решение</span>
        <h2 class="section-title">Кому подходит <span class="accent">и какой риск закрываем</span></h2>
      </div>
      <div class="solution-grid">
        ${concept.audience ? `
          <article class="surface-card solution-card">
            <div class="eyebrow-small">${escapeHtml(audienceLabel)}</div>
            <h3>Для кого это решение</h3>
            <p>${escapeHtml(concept.audience)}</p>
          </article>` : ''}
        <article class="surface-card solution-card risk-card">
          <div class="eyebrow-small risk-copy-label">Ключевой риск</div>
          <h3>${concept.analogyIcon ? `${escapeHtml(concept.analogyIcon)} ` : ''}Где проект чаще всего ломается</h3>
          <p>${escapeHtml(riskCopy)}</p>
        </article>
      </div>
      ${conceptCardsHtml}
    </div>
  </section>` : '';

  const screensHtml = screens && Array.isArray(screens.tabs) && screens.tabs.length ? `
  <section class="section section-alt" id="process">
    <div class="shell">
      <div class="section-head section-head-wide">
        <span class="section-kicker">Процесс</span>
        <h2 class="section-title">${escapeHtml(screens.tabsLabel || 'Как выглядит работа внутри')}</h2>
        <p class="section-description">Показываем логику проекта по шагам: что делаем, в каком виде собираем результат и какие материалы клиент держит на руках.</p>
      </div>
      <div class="tabs-shell">
        <div class="tab-switcher" role="tablist">
          ${screens.tabs.map((tab, index) => `
            <button class="tab-btn${index === 0 ? ' active' : ''}" type="button" data-tab="${escapeHtml(tab.id || `tab-${index}`)}">${escapeHtml(tab.label || `Этап ${index + 1}`)}</button>
          `).join('')}
        </div>
        ${screens.tabs.map((tab, index) => {
          const tabId = escapeHtml(tab.id || `tab-${index}`);
          const features = Array.isArray(tab.features) ? tab.features.slice(0, 4) : [];
          return `
            <div class="tab-panel${index === 0 ? ' active' : ''}" data-panel="${tabId}">
              <article class="surface-card tab-copy-card">
                ${tab.title ? `<h3>${escapeHtml(tab.title)}</h3>` : ''}
                ${tab.desc ? `<p class="tab-lead">${escapeHtml(tab.desc)}</p>` : ''}
                ${features.length ? `
                  <div class="feature-grid">
                    ${features.map((item, featureIndex) => `
                      <article class="feature-item">
                        <span class="feature-index">${String(featureIndex + 1).padStart(2, '0')}</span>
                        <div>
                          ${item.title ? `<strong>${escapeHtml(item.title)}</strong>` : ''}
                          ${item.desc ? `<p>${escapeHtml(shortenText(item.desc, 120))}</p>` : ''}
                        </div>
                      </article>
                    `).join('')}
                  </div>` : ''}
              </article>
            </div>`;
        }).join('')}
      </div>
    </div>
  </section>` : '';

  const modulesHtml = modules.length ? `
  <section class="section" id="scope">
    <div class="shell">
      <div class="section-head">
        <span class="section-kicker">Состав</span>
        <h2 class="section-title">Из чего состоит <span class="accent">проект</span></h2>
      </div>
      <div class="module-grid">
        ${modules.map((item, index) => `
          <article class="surface-card module-card">
            <div class="module-head">
              <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
              ${item.price ? `<span class="module-price">${formatRubles(item.price)}</span>` : ''}
            </div>
            <h3>${escapeHtml(item.name || `Модуль ${index + 1}`)}</h3>
            ${(item.bullets || []).length ? `
              <ul class="clean-list">
                ${(item.bullets || []).slice(0, 4).map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
              </ul>` : ''}
          </article>
        `).join('')}
      </div>
    </div>
  </section>` : '';

  const roadmapHtml = roadmap.length ? `
  <section class="section section-alt" id="roadmap">
    <div class="shell">
      <div class="section-head section-head-wide">
        <span class="section-kicker">Этапы</span>
        <h2 class="section-title">Через ${durationWeeks || extractLastWeek(roadmap) || 'несколько'} недель <span class="accent">вы увидите это</span></h2>
        <p class="section-description">Каждый шаг заканчивается конкретным результатом: документом, модулем, набором материалов или готовым запуском.</p>
      </div>
      <div class="roadmap-grid">
        ${roadmap.map((item, index) => `
          <article class="surface-card roadmap-card">
            <div class="roadmap-head">
              <span class="roadmap-step">${String(index + 1).padStart(2, '0')}</span>
              <span class="chip">Недели ${escapeHtml(item.weeks || `${index + 1}`)}</span>
            </div>
            <h3>${escapeHtml(item.title || `Этап ${index + 1}`)}</h3>
            <p>${escapeHtml(buildRoadmapCopy(item))}</p>
          </article>
        `).join('')}
      </div>
    </div>
  </section>` : '';

  const pricingBody = stages.length
    ? `
      <div class="scope-list scope-list-stages">
        ${stages.map((stage, index) => {
          const prepay = stage.prepay || Math.round((stage.price || 0) * 0.5);
          const remain = Math.max((stage.price || 0) - prepay, 0);
          return `
            <article class="scope-entry">
              <div class="scope-entry-head">
                <span>${String(index + 1).padStart(2, '0')}</span>
                <strong>${escapeHtml(stage.title || stage.version || `Этап ${index + 1}`)}</strong>
                ${stage.price ? `<em>${formatRubles(stage.price)}</em>` : ''}
              </div>
              ${(stage.features || []).length ? `<ul class="compact-list">${stage.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
              <div class="scope-meta">
                <span>50% предоплата · ${formatRubles(prepay)}</span>
                <span>После сдачи · ${formatRubles(remain)}</span>
              </div>
              ${stage.comment ? `<p class="small-note">${escapeHtml(stage.comment)}</p>` : ''}
            </article>`;
        }).join('')}
      </div>`
    : tariffs.length
      ? `
        <div class="scope-list scope-list-tariffs">
          ${tariffs.map((tariff, index) => `
            <article class="scope-entry${tariff.featured ? ' scope-entry-featured' : ''}">
              <div class="scope-entry-head">
                <span>${String(index + 1).padStart(2, '0')}</span>
                <strong>${escapeHtml(tariff.title || `Тариф ${index + 1}`)}</strong>
                ${tariff.price ? `<em>${formatRubles(tariff.price)}${tariff.period ? ` / ${escapeHtml(tariff.period)}` : ''}</em>` : ''}
              </div>
              ${tariff.badge ? `<div class="scope-chip-row"><span class="chip">${escapeHtml(tariff.badge)}</span></div>` : ''}
              ${tariff.desc ? `<p class="small-note">${escapeHtml(tariff.desc)}</p>` : ''}
              ${(tariff.features || []).length ? `<ul class="compact-list">${tariff.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
            </article>
          `).join('')}
        </div>`
      : `
        <div class="scope-list">
          ${modules.slice(0, 4).map((module, index) => `
            <div class="scope-row">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <strong>${escapeHtml(module.name || `Модуль ${index + 1}`)}</strong>
              ${module.price ? `<em>${formatRubles(module.price)}</em>` : ''}
            </div>
          `).join('')}
        </div>`;

  const pricingHtml = total || stages.length || tariffs.length ? `
  <section class="section" id="pricing">
    <div class="shell">
      <div class="section-head section-head-wide">
        <span class="section-kicker">Стоимость</span>
        <h2 class="section-title">Стоимость и <span class="accent">состав работ</span></h2>
        <p class="section-description">Фиксируем объём, этапы и формат сдачи заранее. Без скрытых работ и без размытой зоны ответственности.</p>
      </div>
      <div class="surface-card pricing-card">
        <div class="pricing-grid">
          <div class="pricing-copy">
            ${originalTotal && discount ? `<div class="total-old">${formatRubles(originalTotal)}</div>` : ''}
            <div class="total-row">
              <div class="total-main">${formatRubles(total)}</div>
              ${discount ? `<span class="total-badge">−${escapeHtml(discount)}%</span>` : ''}
            </div>
            <div class="price-meta">
              ${priceMeta.map(item => `<span>${item}</span>`).join('')}
            </div>
            <ul class="terms-inline">
              <li>Согласуем структуру и результат до продакшна.</li>
              <li>Оплата и сдача идут по этапам.</li>
              <li>Все ключевые материалы остаются у вас.</li>
            </ul>
            <div class="hero-actions">
              ${primaryCta}
              ${clarifyCta}
            </div>
          </div>
          <div class="pricing-side">
            <div class="pricing-side-head">
              <div class="eyebrow-small">Что входит</div>
              <h3>Смета проекта</h3>
            </div>
            ${pricingBody}
          </div>
        </div>
      </div>
    </div>
  </section>` : '';

  const casesHtml = cases.length ? `
  <section class="section section-alt" id="cases">
    <div class="shell">
      <div class="section-head section-head-wide">
        <span class="section-kicker">Почему мы</span>
        <h2 class="section-title">Кейсы, опыт и <span class="accent">контекст EdAgency</span></h2>
      </div>
      <div class="cases-layout">
        <div class="stats-grid">
          <article class="surface-card stat-card"><strong>600+</strong><span>уроков собрано и произведено</span></article>
          <article class="surface-card stat-card"><strong>30+</strong><span>вебинаров под ключ</span></article>
          <article class="surface-card stat-card"><strong>3</strong><span>флагманских EdTech-проекта</span></article>
        </div>
        <div class="cases-cloud">
          ${cases.map((item, index) => `<span class="case-pill${index === 0 ? ' case-pill-accent' : ''}">${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>
    </div>
  </section>` : '';

  const faqHtml = faq.length ? `
  <section class="section">
    <div class="shell">
      <div class="section-head">
        <span class="section-kicker">FAQ</span>
        <h2 class="section-title">Вопросы перед стартом</h2>
      </div>
      <div class="faq-grid">
        ${faq.map(item => `
          <article class="surface-card faq-card">
            <h3>${escapeHtml(item.q || '')}</h3>
            <p>${escapeHtml(item.a || '')}</p>
          </article>
        `).join('')}
      </div>
    </div>
  </section>` : '';

  const termsHtml = terms.length ? `
  <section class="section">
    <div class="shell">
      <div class="section-head">
        <span class="section-kicker">Условия</span>
        <h2 class="section-title">Как работаем</h2>
      </div>
      <ul class="terms-list">
        ${terms.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  </section>` : '';

  const titleHtml = accentLastWords(title);
  const metaBadgeHtml = clientMeta ? `<span class="meta-badge">${escapeHtml(clientMeta)}</span>` : '';
  const heroMetaHtml = `
    <div class="hero-metrics">
      ${metricCard(modules.length || stages.length || tariffs.length || '—', modules.length ? 'блоков в проекте' : stages.length ? 'этапа оплаты' : tariffs.length ? 'варианта работы' : 'формат проекта')}
      ${metricCard(durationWeeks || '—', 'недель до результата')}
      ${metricCard(total ? formatRubles(total) : 'По запросу', 'стоимость проекта', true)}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>КП — ${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#090b11;
  --stroke:rgba(255,255,255,.08);
  --stroke-strong:rgba(124,116,255,.2);
  --text:#f7f8fc;
  --muted:#a4aec5;
  --muted-2:#7e88a1;
  --accent:#7c74ff;
  --accent-2:#55a2ff;
  --danger:#ffb4c1;
  --success:#8ce0b0;
  --shell:1180px;
  --radius:24px;
  --section-gap:72px;
}
html{scroll-behavior:smooth}
body{
  background:
    radial-gradient(circle at top, rgba(124,116,255,.16), transparent 26%),
    radial-gradient(circle at 85% 8%, rgba(85,162,255,.08), transparent 22%),
    linear-gradient(180deg, #090b11 0%, #0d111a 42%, #090b11 100%);
  color:var(--text);
  font-family:'Inter',sans-serif;
  line-height:1.55;
}
body::before{
  content:'';
  position:fixed;
  inset:0;
  pointer-events:none;
  background:
    linear-gradient(rgba(255,255,255,.018), rgba(255,255,255,0) 24%),
    radial-gradient(circle at 50% 12%, rgba(255,255,255,.03), transparent 48%);
}
a{color:inherit;text-decoration:none}
button{font:inherit}
img{display:block;max-width:100%}
.shell{width:min(calc(100% - 40px), var(--shell));margin:0 auto}
.site-header{
  position:sticky;
  top:0;
  z-index:40;
  backdrop-filter:blur(18px);
  background:rgba(9,11,17,.72);
  border-bottom:1px solid rgba(255,255,255,.05);
}
.header-inner{
  min-height:76px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
}
.brand{display:flex;align-items:center;gap:12px;min-width:0}
.brand-mark{
  width:14px;
  height:14px;
  border-radius:999px;
  background:linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow:0 0 24px rgba(124,116,255,.56);
}
.brand-text{display:flex;flex-direction:column;gap:3px;line-height:1.16}
.brand-text strong{font-family:'Manrope',sans-serif;font-size:15px}
.brand-text span{font-size:10px;color:var(--muted-2);text-transform:uppercase;letter-spacing:.12em}
.top-nav{display:flex;flex-wrap:wrap;gap:22px;justify-content:center}
.top-nav a{font-size:14px;color:var(--muted);transition:color .18s ease}
.top-nav a:hover{color:var(--text)}
.header-actions{display:flex;align-items:center;gap:12px}
.edit-link{
  color:var(--muted);
  border:1px solid var(--stroke);
  border-radius:999px;
  padding:10px 14px;
  font-size:13px;
}
.edit-link:hover{border-color:var(--stroke-strong);color:var(--text)}
.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  min-height:48px;
  padding:0 22px;
  border-radius:999px;
  border:1px solid transparent;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  transition:transform .18s ease,border-color .18s ease,background .18s ease,color .18s ease;
}
.btn:hover{transform:translateY(-1px)}
.btn-primary{
  color:#fff;
  background:linear-gradient(135deg, var(--accent), #938cff);
  box-shadow:0 12px 34px rgba(124,116,255,.28);
}
.btn-secondary,.btn-tertiary{
  background:rgba(255,255,255,.03);
  border-color:var(--stroke);
  color:var(--text);
}
.btn-tertiary{color:var(--muted)}
.btn-secondary:hover,.btn-tertiary:hover{border-color:var(--stroke-strong);color:var(--text)}
.hero-section{
  position:relative;
  overflow:hidden;
  padding:60px 0 18px;
}
.hero-glow{
  position:absolute;
  border-radius:999px;
  filter:blur(90px);
  pointer-events:none;
  opacity:.52;
}
.hero-glow-a{width:420px;height:420px;left:8%;top:12%;background:rgba(124,116,255,.18)}
.hero-glow-b{width:300px;height:300px;right:9%;top:20%;background:rgba(85,162,255,.1)}
.hero-grid{
  position:relative;
  z-index:1;
  min-height:calc(100vh - 210px);
  display:flex;
  justify-content:center;
  align-items:center;
}
.hero-copy{
  width:min(100%, 860px);
  padding:48px 0 36px;
  text-align:center;
}
.eyebrow-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px;justify-content:center}
.eyebrow,.meta-badge,.chip,.eyebrow-small{
  display:inline-flex;
  align-items:center;
  min-height:32px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.03);
  color:var(--muted);
  font-size:12px;
  letter-spacing:.04em;
}
.meta-badge{color:#d6dbea}
.chip{
  min-height:28px;
  padding:0 10px;
  color:#ddd9ff;
  background:rgba(124,116,255,.1);
  border-color:rgba(124,116,255,.24);
  text-transform:uppercase;
  font-size:11px;
}
.eyebrow-small{
  min-height:26px;
  padding:0 10px;
  width:max-content;
  margin-bottom:14px;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.12em;
}
.hero-title{
  max-width:11ch;
  margin:0 auto;
  font-family:'Manrope',sans-serif;
  font-size:clamp(42px, 6vw, 78px);
  line-height:1;
  letter-spacing:-.05em;
}
.accent{color:#958cff;text-shadow:0 0 28px rgba(124,116,255,.2)}
.hero-subtitle{
  max-width:700px;
  margin:20px auto 0;
  color:var(--muted);
  font-size:18px;
}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.hero-copy .hero-actions{justify-content:center}
.hero-metrics{
  max-width:760px;
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:14px;
  margin:30px auto 0;
}
.metric-card{
  padding:18px;
  border-radius:20px;
  border:1px solid var(--stroke);
  background:linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02));
}
.metric-card strong{
  display:block;
  font-family:'Manrope',sans-serif;
  font-size:24px;
  line-height:1.02;
}
.metric-card span{display:block;margin-top:8px;color:var(--muted);font-size:12px}
.metric-card-accent strong{color:#d8d3ff}
.section{padding:var(--section-gap) 0;scroll-margin-top:104px}
.section-alt{background:linear-gradient(180deg, rgba(255,255,255,.018), rgba(255,255,255,0))}
.section-head{
  max-width:760px;
  display:grid;
  gap:10px;
  margin-bottom:24px;
}
.section-head-wide{max-width:900px}
.section-kicker{
  color:#d7d3ff;
  font-size:12px;
  letter-spacing:.16em;
  text-transform:uppercase;
}
.section-title{
  max-width:16ch;
  font-family:'Manrope',sans-serif;
  font-size:clamp(30px, 4.1vw, 50px);
  line-height:1.02;
  letter-spacing:-.04em;
}
.section-description{font-size:16px;color:var(--muted)}
.surface-card{
  border-radius:var(--radius);
  border:1px solid var(--stroke);
  background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  padding:24px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}
.surface-card h3{
  font-family:'Manrope',sans-serif;
  font-size:22px;
  line-height:1.16;
  letter-spacing:-.03em;
}
.surface-card p{
  margin-top:14px;
  color:var(--muted);
  font-size:15px;
}
.solution-grid,
.detail-grid,
.module-grid,
.roadmap-grid,
.stats-grid,
.faq-grid{
  display:grid;
  gap:18px;
}
.solution-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
.detail-grid{grid-template-columns:repeat(4, minmax(0, 1fr));margin-top:18px}
.module-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
.roadmap-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
.solution-card,.detail-card,.module-card,.roadmap-card{min-height:100%}
.detail-card .card-index{margin-bottom:14px}
.card-index{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:36px;
  height:36px;
  border-radius:999px;
  border:1px solid rgba(124,116,255,.26);
  background:rgba(124,116,255,.12);
  color:#ddd9ff;
  font-size:12px;
  font-weight:800;
}
.risk-card{
  background:
    linear-gradient(180deg, rgba(171,92,109,.12), rgba(171,92,109,.06)),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  border-color:rgba(171,92,109,.18);
}
.risk-copy-label{color:var(--danger)}
.tabs-shell{display:grid;gap:18px}
.tab-switcher{display:flex;flex-wrap:wrap;gap:10px}
.tab-btn{
  min-height:40px;
  padding:0 16px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.02);
  color:var(--muted);
  cursor:pointer;
}
.tab-btn.active{
  color:#fff;
  background:linear-gradient(135deg, rgba(124,116,255,.22), rgba(124,116,255,.1));
  border-color:rgba(124,116,255,.3);
}
.tab-panel{display:none}
.tab-panel.active{display:block}
.tab-copy-card h3{font-size:30px}
.tab-lead{margin-top:14px;font-size:15px;color:var(--muted)}
.feature-grid{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px 20px;
  margin-top:22px;
}
.feature-item{
  display:grid;
  grid-template-columns:32px 1fr;
  gap:12px;
  align-items:flex-start;
  padding-top:12px;
  border-top:1px solid rgba(255,255,255,.06);
}
.feature-item:nth-child(-n+2){padding-top:0;border-top:none}
.feature-index{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:32px;
  height:32px;
  border-radius:10px;
  background:rgba(124,116,255,.1);
  color:#ddd9ff;
  font-size:11px;
  font-weight:800;
}
.feature-item strong{display:block;font-size:14px;line-height:1.3}
.feature-item p{margin-top:6px;font-size:13px;color:var(--muted);line-height:1.5}
.module-head,.roadmap-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  margin-bottom:16px;
}
.module-price{font-size:14px;color:#ddd9ff;white-space:nowrap}
.clean-list,.terms-list,.terms-inline{
  display:grid;
  gap:10px;
  list-style:none;
  margin-top:18px;
}
.clean-list li,.terms-list li,.terms-inline li{
  position:relative;
  padding-left:18px;
  color:var(--muted);
  font-size:14px;
}
.clean-list li::before,.terms-list li::before,.terms-inline li::before{
  content:'→';
  position:absolute;
  left:0;
  color:#968dff;
}
.roadmap-step{color:#ddd9ff;font-size:13px;font-weight:800;letter-spacing:.08em}
.pricing-card{
  background:
    radial-gradient(circle at top, rgba(124,116,255,.14), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.024));
  border-color:rgba(124,116,255,.16);
}
.pricing-grid{
  display:grid;
  grid-template-columns:minmax(0, .92fr) minmax(300px, 1.08fr);
  gap:28px;
  align-items:start;
}
.total-old{
  color:var(--muted-2);
  font-size:22px;
  text-decoration:line-through;
  text-decoration-color:rgba(255,255,255,.35);
}
.total-row{
  display:flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
}
.total-main{
  font-family:'Manrope',sans-serif;
  font-size:clamp(40px, 5vw, 62px);
  line-height:.98;
  letter-spacing:-.05em;
}
.total-badge{
  display:inline-flex;
  align-items:center;
  min-height:34px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid rgba(124,116,255,.3);
  background:rgba(124,116,255,.18);
  color:#e2ddff;
  font-size:13px;
  font-weight:800;
}
.price-meta{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:14px;
}
.price-meta span{
  padding:8px 12px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.03);
  color:var(--muted);
  font-size:12px;
}
.pricing-side-head{margin-bottom:18px}
.pricing-side-head h3{margin-top:0;font-size:20px}
.scope-list{display:grid;gap:0}
.scope-row,.scope-entry{
  padding:12px 0;
  border-top:1px solid rgba(255,255,255,.06);
}
.scope-row:first-child,.scope-entry:first-child{padding-top:0;border-top:none}
.scope-row{
  display:grid;
  grid-template-columns:38px 1fr auto;
  gap:12px;
  align-items:center;
}
.scope-row span,.scope-entry-head span{font-size:12px;color:#ddd9ff;font-weight:800}
.scope-row strong,.scope-entry-head strong{font-size:14px;line-height:1.4}
.scope-row em,.scope-entry-head em{font-style:normal;color:var(--muted);font-size:13px;white-space:nowrap}
.scope-entry-head{
  display:grid;
  grid-template-columns:38px 1fr auto;
  gap:12px;
  align-items:center;
}
.compact-list{
  display:grid;
  gap:8px;
  list-style:none;
  margin:12px 0 0 50px;
}
.compact-list li{
  position:relative;
  padding-left:16px;
  color:var(--muted);
  font-size:13px;
}
.compact-list li::before{
  content:'→';
  position:absolute;
  left:0;
  color:#968dff;
}
.scope-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin:12px 0 0 50px;
}
.scope-meta span,.small-note{font-size:13px;color:var(--muted)}
.small-note{margin:10px 0 0 50px}
.scope-chip-row{margin:10px 0 0 50px}
.scope-entry-featured{border-color:rgba(124,116,255,.2)}
.cases-layout{
  display:grid;
  grid-template-columns:.84fr 1.16fr;
  gap:18px;
  align-items:start;
}
.stats-grid{grid-template-columns:repeat(3, minmax(0, 1fr))}
.stat-card strong{
  display:block;
  font-family:'Manrope',sans-serif;
  font-size:36px;
  line-height:1;
  letter-spacing:-.04em;
}
.stat-card span{display:block;margin-top:10px;color:var(--muted);font-size:14px}
.cases-cloud{display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start}
.case-pill{
  display:inline-flex;
  align-items:center;
  min-height:40px;
  padding:0 14px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.03);
  color:var(--muted);
  font-size:13px;
}
.case-pill-accent{
  color:#fff;
  border-color:rgba(124,116,255,.28);
  background:rgba(124,116,255,.12);
}
.faq-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
.faq-card h3{font-size:18px}
.final-cta{padding:56px 0 56px}
.final-cta-box{
  padding:42px;
  text-align:center;
  border-radius:32px;
  border:1px solid var(--stroke);
  background:
    radial-gradient(circle at top, rgba(124,116,255,.16), transparent 34%),
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
}
.final-cta-box h2{
  font-family:'Manrope',sans-serif;
  font-size:clamp(34px, 4.5vw, 56px);
  line-height:1;
  letter-spacing:-.04em;
}
.final-cta-box p{
  max-width:640px;
  margin:16px auto 0;
  color:var(--muted);
  font-size:16px;
}
.final-cta-box .hero-actions{justify-content:center}
.site-footer{padding:0 0 40px}
.footer-inner{
  padding-top:22px;
  border-top:1px solid rgba(255,255,255,.06);
  display:flex;
  justify-content:space-between;
  gap:16px;
  color:var(--muted-2);
  font-size:13px;
}
.modal{
  display:none;
  position:fixed;
  inset:0;
  z-index:80;
  background:rgba(4,5,9,.72);
  backdrop-filter:blur(10px);
  padding:20px;
  align-items:center;
  justify-content:center;
}
.modal-card{
  width:min(100%, 520px);
  padding:28px;
  border-radius:28px;
  border:1px solid var(--stroke);
  background:linear-gradient(180deg, rgba(19,24,41,.96), rgba(11,13,21,.98));
  position:relative;
}
.modal-close{
  position:absolute;
  top:16px;
  right:16px;
  width:36px;
  height:36px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.02);
  color:var(--muted);
  cursor:pointer;
}
.modal-card h3{
  font-family:'Manrope',sans-serif;
  font-size:28px;
  line-height:1.05;
}
.modal-card p{margin-top:10px;color:var(--muted)}
.modal-form{display:grid;gap:14px;margin-top:22px}
.modal-form label{
  display:grid;
  gap:8px;
  font-size:12px;
  color:var(--muted);
  text-transform:uppercase;
  letter-spacing:.12em;
}
.modal-form input,.modal-form textarea{
  width:100%;
  padding:14px 16px;
  border-radius:16px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.03);
  color:var(--text);
  outline:none;
}
.modal-form textarea{min-height:120px;resize:vertical}
.modal-error{min-height:18px;color:#ff9fb1;font-size:13px}
.modal-ok{display:none;text-align:center;padding-top:14px}
.modal-ok strong{display:block;font-size:20px;color:var(--success)}
@media (max-width:1100px){
  .pricing-grid,.cases-layout,.solution-grid{grid-template-columns:1fr}
  .detail-grid,.roadmap-grid,.module-grid,.stats-grid,.faq-grid,.feature-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
  .hero-grid{min-height:auto}
}
@media (max-width:860px){
  :root{--section-gap:56px}
  .header-inner{min-height:72px;flex-wrap:wrap;padding:12px 0}
  .top-nav{order:3;width:100%;justify-content:flex-start;overflow:auto;padding-bottom:4px}
  .hero-section{padding-top:38px}
  .hero-metrics{grid-template-columns:1fr}
  .detail-grid,.roadmap-grid,.module-grid,.stats-grid,.faq-grid,.feature-grid{grid-template-columns:1fr}
  .footer-inner{flex-direction:column}
}
@media (max-width:640px){
  .shell{width:min(calc(100% - 24px), var(--shell))}
  .btn{width:100%}
  .header-actions{width:100%}
  .hero-copy{padding:34px 0 28px}
  .hero-actions{flex-direction:column}
  .hero-title{max-width:12ch;font-size:clamp(36px, 12vw, 52px)}
  .hero-subtitle,.section-description{font-size:15px}
  .surface-card,.final-cta-box,.modal-card{padding:20px}
  .tab-copy-card h3{font-size:26px}
  .scope-row,.scope-entry-head{grid-template-columns:34px 1fr}
  .scope-row em,.scope-entry-head em{grid-column:2}
  .compact-list,.scope-meta,.small-note,.scope-chip-row{margin-left:0}
}
</style>
</head>
<body>
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="#top">
        <span class="brand-mark"></span>
        <span class="brand-text">
          <strong>EdAgency</strong>
          <span>product design for EdTech</span>
        </span>
      </a>
      <nav class="top-nav" aria-label="Разделы страницы">
        <a href="#solution">Решение</a>
        <a href="#scope">Состав</a>
        <a href="#roadmap">Этапы</a>
        <a href="#pricing">Стоимость</a>
      </nav>
      <div class="header-actions">
        <a id="kp-edit-btn" class="edit-link" href="/?edit=${escapeHtml(slug)}" style="display:none">Редактировать</a>
        ${primaryCta}
      </div>
    </div>
  </header>

  <section class="hero-section" id="top">
    <div class="hero-glow hero-glow-a"></div>
    <div class="hero-glow hero-glow-b"></div>
    <div class="shell hero-grid">
      <div class="hero-copy">
        <div class="eyebrow-row">
          <span class="eyebrow">EdAgency · коммерческое предложение ${new Date().getFullYear()}</span>
          ${metaBadgeHtml}
        </div>
        <h1 class="hero-title">${titleHtml}</h1>
        ${intro ? `<p class="hero-subtitle">${escapeHtml(intro)}</p>` : ''}
        <div class="hero-actions">
          ${primaryCta}
          ${secondaryCta}
        </div>
        ${heroMetaHtml}
      </div>
    </div>
  </section>

  ${conceptHtml}
  ${screensHtml}
  ${modules.length && !stages.length ? modulesHtml : ''}
  ${roadmapHtml}
  ${pricingHtml}
  ${casesHtml}
  ${faqHtml}
  ${termsHtml}

  <section class="final-cta" id="final-cta">
    <div class="shell">
      <div class="final-cta-box">
        <span class="section-kicker">Следующий шаг</span>
        <h2>Готовы обсудить <span class="accent">детали?</span></h2>
        <p>Разберём задачу, уточним формат запуска и скажем, как собрать проект без лишних итераций и пустой разработки.</p>
        <div class="hero-actions">
          ${primaryCta}
          ${secondaryCta}
          ${clarifyCta}
        </div>
      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="shell footer-inner">
      <span>EdAgency${clientMeta ? ` · ${escapeHtml(clientMeta)}` : ''}</span>
      <span>${escapeHtml(pageDate)}${manager ? ` · ${escapeHtml(manager)}` : ''}</span>
    </div>
  </footer>

  <div id="clarify-modal" class="modal">
    <div class="modal-card">
      <button type="button" class="modal-close" onclick="closeClarifyModal()">×</button>
      <span class="section-kicker">Уточнение</span>
      <h3>Есть вопросы по проекту?</h3>
      <p>Напишите, что нужно уточнить. Ответим и предложим следующий шаг без лишней переписки.</p>
      <div id="clarify-form" class="modal-form">
        <label>Ваше имя
          <input id="clarify-name" type="text" placeholder="Иван Петров">
        </label>
        <label>Сообщение
          <textarea id="clarify-msg" placeholder="Что именно хотите уточнить?"></textarea>
        </label>
        <div id="clarify-err" class="modal-error"></div>
        <button id="clarify-submit" type="button" class="btn btn-primary" onclick="submitClarify()">Отправить</button>
      </div>
      <div id="clarify-ok" class="modal-ok">
        <strong>Запрос отправлен</strong>
        <p>Свяжемся с вами в ближайшее время.</p>
      </div>
    </div>
  </div>

  <script>
  window.__KP_SLUG__ = ${JSON.stringify(slug)};
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      const shell = btn.closest('.tabs-shell');
      if (!shell) return;
      shell.querySelectorAll('.tab-btn').forEach(node => node.classList.toggle('active', node === btn));
      shell.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.getAttribute('data-panel') === tabId));
    });
  });
  if (localStorage.getItem('calc_token')) {
    const editLink = document.getElementById('kp-edit-btn');
    if (editLink) editLink.style.display = '';
  }
  function openClarifyModal() {
    const modal = document.getElementById('clarify-modal');
    if (modal) modal.style.display = 'flex';
  }
  function closeClarifyModal() {
    const modal = document.getElementById('clarify-modal');
    if (modal) modal.style.display = 'none';
    const nameInput = document.getElementById('clarify-name');
    const msgInput = document.getElementById('clarify-msg');
    const err = document.getElementById('clarify-err');
    const ok = document.getElementById('clarify-ok');
    const form = document.getElementById('clarify-form');
    if (nameInput) nameInput.value = '';
    if (msgInput) msgInput.value = '';
    if (err) err.textContent = '';
    if (ok) ok.style.display = 'none';
    if (form) form.style.display = 'grid';
  }
  async function submitClarify() {
    const name = document.getElementById('clarify-name').value.trim();
    const message = document.getElementById('clarify-msg').value.trim();
    const errEl = document.getElementById('clarify-err');
    const okEl = document.getElementById('clarify-ok');
    const formEl = document.getElementById('clarify-form');
    const btn = document.getElementById('clarify-submit');
    if (!message) {
      errEl.textContent = 'Введите сообщение';
      return;
    }
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Отправка...';
    try {
      const response = await fetch('/kp/' + encodeURIComponent(window.__KP_SLUG__) + '/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
      const data = await response.json();
      if (!response.ok) {
        errEl.textContent = data.error || 'Ошибка';
        return;
      }
      okEl.style.display = 'block';
      formEl.style.display = 'none';
    } catch (error) {
      errEl.textContent = 'Ошибка соединения';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Отправить';
    }
  }
  </script>
</body>
</html>`;
}

module.exports = buildKpHtml;
