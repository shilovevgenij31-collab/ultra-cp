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

function declineWeeks(n) {
  const abs = Math.abs(Number(n));
  if (abs === 1) return 'неделю';
  if (abs >= 2 && abs <= 4) return 'недели';
  return 'недель';
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

function toSlugClass(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^service-/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'proposal';
}

function buildLandingHeroStrip(screens) {
  const stageLabels = Array.isArray(screens && screens.tabs) && screens.tabs.length
    ? screens.tabs.slice(0, 4).map(tab => trimSentence(tab.label || tab.title))
    : [];
  const items = (stageLabels.length ? stageLabels : ['Трафик', 'Оффер', 'Доказательства', 'Заявка']).slice(0, 4);

  return `
    <div class="landing-hero-strip" aria-hidden="true">
      ${items.map((item, index) => `
        <div class="landing-hero-strip-item${index === 1 ? ' active' : ''}">
          <span>${escapeHtml(item)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function buildKpHtml(kpData, slug) {
  const modules = Array.isArray(kpData.modules) ? kpData.modules : [];
  const roadmap = Array.isArray(kpData.roadmap) ? kpData.roadmap : [];
  const stages = Array.isArray(kpData.stages) ? kpData.stages : [];
  const tariffs = Array.isArray(kpData.tariffs) ? kpData.tariffs : [];
  const faq = Array.isArray(kpData.faq) ? kpData.faq : [];
  const terms = Array.isArray(kpData.terms) ? kpData.terms : [];
  const cases = Array.isArray(kpData.cases) ? kpData.cases : [];
  const clientLogos = Array.isArray(kpData.clientLogos) ? kpData.clientLogos : [];
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
  const slugClass = toSlugClass(slug);
  const isLandingPreset = slugClass === 'landing';
  const riskCopy = concept && concept.analogy
    ? shortenText(concept.analogy, 190)
    : shortenText(intro || 'Без системной упаковки продукт быстро распадается на отдельные материалы и теряет логику результата.', 190);
  const clientMeta = [client, org].filter(Boolean).join(' · ');
  const pageDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const pdfHref = slug.startsWith('service-')
    ? `/services/${slug.replace(/^service-/, '')}/pdf`
    : `/kp/${encodeURIComponent(slug)}/pdf`;
  const landingHeroStripHtml = isLandingPreset ? buildLandingHeroStrip(screens) : '';
  const priceMeta = [
    durationWeeks ? `${durationWeeks} ${declineWeeks(durationWeeks)}` : '',
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
        <h2 class="section-title">${escapeHtml(isLandingPreset ? 'Как собираем лендинг' : (screens.tabsLabel || 'Как выглядит работа внутри'))}</h2>
        <p class="section-description">${escapeHtml(isLandingPreset ? 'Разводим смыслы, структуру, визуал и запуск по ролям, чтобы страница сразу работала на заявку.' : 'Показываем логику проекта по шагам: что делаем, в каком виде собираем результат и какие материалы клиент держит на руках.')}</p>
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
                ${isLandingPreset ? `
                  <div class="landing-process-band">
                    ${screens.tabs.slice(0, 4).map((stage, stageIndex) => `
                      <div class="landing-process-step${stageIndex === index ? ' active' : ''}">
                        <span>${String(stageIndex + 1).padStart(2, '0')}</span>
                        <strong>${escapeHtml(stage.label || stage.title || `Этап ${stageIndex + 1}`)}</strong>
                      </div>
                    `).join('')}
                  </div>` : ''}
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
                ${tab.image ? `
                  <div class="tab-artifact">
                    <img src="${escapeHtml(tab.image)}" alt="${escapeHtml(tab.imageAlt || '')}" loading="lazy">
                    ${tab.imageCaption ? `<div class="tab-artifact-caption">${escapeHtml(tab.imageCaption)}</div>` : ''}
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
        <h2 class="section-title">Через ${durationWeeks || extractLastWeek(roadmap) || 'несколько'} ${declineWeeks(durationWeeks || extractLastWeek(roadmap) || 5)} <span class="accent">вы увидите это</span></h2>
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

  // === PROOF SECTION ===
  // DRAFT: все числа ниже нужно подтвердить с EdAgency перед публикацией.
  // Чтобы обновить метрики — поменяй только массив PROOF_METRICS.
  const PROOF_METRICS = [
    { value: '250+', label: 'образовательных проектов', accent: true },
    { value: '7',    label: 'стран присутствия' },
    { value: '971',  label: 'разработанный материал' },
    { value: '110',  label: 'уроков под ключ' },
  ];
  // Рендер карточки кейса. Поддерживает два формата:
  //   - строка: "Название кейса"  (текущий формат всех пресетов)
  //   - объект: { name, desc, tag, img, featured }  (расширенный, для будущих ассетов)
  const renderCaseCard = (item, index) => {
    if (typeof item === 'string') {
      return `
        <article class="surface-card case-card case-card-text${index === 0 ? ' case-card-featured' : ''}">
          <span class="case-card-index">${String(index + 1).padStart(2, '0')}</span>
          <h3 class="case-card-name">${escapeHtml(item)}</h3>
        </article>`;
    }
    const hasImg = !!(item && item.img);
    return `
      <article class="surface-card case-card${hasImg ? ' case-card-with-img' : ' case-card-text'}${index === 0 ? ' case-card-featured' : ''}">
        ${hasImg ? `<div class="case-card-img" style="background-image:url('${escapeHtml(item.img)}')"></div>` : ''}
        <div class="${hasImg ? 'case-card-body' : ''}">
          ${!hasImg ? `<span class="case-card-index">${String(index + 1).padStart(2, '0')}</span>` : ''}
          ${item.tag ? `<span class="chip case-chip">${escapeHtml(item.tag)}</span>` : ''}
          <h3 class="case-card-name">${escapeHtml(item.name || '')}</h3>
          ${item.desc ? `<p class="case-card-result">${escapeHtml(item.desc)}</p>` : ''}
        </div>
      </article>`;
  };
  const casesHtml = cases.length ? `
  <section class="section section-alt" id="cases">
    <div class="shell">
      <div class="section-head section-head-wide">
        <span class="section-kicker">Почему мы</span>
        <h2 class="section-title">Опыт и <span class="accent">кейсы EdAgency</span></h2>
        <p class="section-description">Методологическое агентство на рынке образования с 2022 года. Разрабатываем курсы, вебинары и программы наставничества для компаний и экспертов.</p>
      </div>
      <div class="proof-metrics">
        ${PROOF_METRICS.map(m => `
          <article class="surface-card proof-metric-card${m.accent ? ' proof-metric-accent' : ''}">
            <strong>${escapeHtml(m.value)}</strong>
            <span>${escapeHtml(m.label)}</span>
          </article>`).join('')}
      </div>
      <div class="proof-cases-head">
        <span class="proof-cases-label">Из практики</span>
      </div>
      <div class="case-cards-grid">
        ${cases.map(renderCaseCard).join('')}
      </div>
      ${clientLogos.length ? `
      <div class="client-logos-row">
        <div class="client-logos-label">Среди клиентов</div>
        <div class="client-logos-grid">
          ${clientLogos.map(logo => typeof logo === 'string'
            ? `<span class="client-logo-pill">${escapeHtml(logo)}</span>`
            : `<div class="client-logo-tile">
                 ${logo.img
                   ? `<img src="${escapeHtml(logo.img)}" alt="${escapeHtml(logo.name || '')}" loading="lazy">`
                   : `<span>${escapeHtml(logo.name || '')}</span>`}
               </div>`
          ).join('')}
        </div>
      </div>` : ''}
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
  --bg:#070a12;
  --stroke:rgba(255,255,255,.09);
  --stroke-strong:rgba(124,116,255,.26);
  --text:#f0f2fb;
  --muted:#9ea9c0;
  --muted-2:#697289;
  --accent:#7c74ff;
  --accent-2:#55a2ff;
  --danger:#ff8fa0;
  --success:#7dd9a4;
  --shell:1180px;
  --radius:24px;
  --radius-sm:16px;
  --section-gap:96px;
}
html{scroll-behavior:smooth}
body{
  background:
    radial-gradient(ellipse at top, rgba(124,116,255,.22), transparent 28%),
    radial-gradient(circle at 86% 6%, rgba(85,162,255,.1), transparent 22%),
    linear-gradient(180deg, #070a12 0%, #0c1018 44%, #070a12 100%);
  color:var(--text);
  font-family:'Inter',sans-serif;
  line-height:1.58;
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
.service-page{overflow-x:hidden}
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
.brand-logo{
  height:26px;
  width:auto;
  filter:invert(1);
  mix-blend-mode:screen;
  opacity:.88;
  flex-shrink:0;
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
  transition:transform .22s ease,border-color .22s ease,background .22s ease,color .22s ease,box-shadow .22s ease;
}
.btn:hover{transform:translateY(-2px)}
.btn-primary{
  color:#fff;
  background:linear-gradient(135deg, var(--accent), #938cff);
  box-shadow:0 12px 34px rgba(124,116,255,.28);
}
.btn-primary:hover{box-shadow:0 18px 42px rgba(124,116,255,.36)}
.btn-secondary,.btn-tertiary{
  background:rgba(255,255,255,.03);
  border-color:var(--stroke);
  color:var(--text);
}
.btn-tertiary{color:var(--muted)}
.btn-secondary:hover,.btn-tertiary:hover{border-color:var(--stroke-strong);color:var(--text);background:rgba(255,255,255,.06)}
.hero-section{
  position:relative;
  overflow:hidden;
  padding:80px 0 24px;
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
  width:min(100%, 900px);
  padding:56px 0 44px;
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
  max-width:13ch;
  margin:0 auto;
  font-family:'Manrope',sans-serif;
  font-size:clamp(40px, 5.5vw, 74px);
  line-height:.95;
  letter-spacing:-.044em;
  text-wrap:balance;
}
.accent{color:#9e96ff;text-shadow:0 0 36px rgba(124,116,255,.28)}
.hero-subtitle{
  max-width:620px;
  margin:22px auto 0;
  color:var(--muted);
  font-size:17px;
  line-height:1.68;
  text-wrap:pretty;
}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.hero-copy .hero-actions{justify-content:center}
.hero-metrics{
  max-width:760px;
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:14px;
  margin:30px auto 0;
}
.metric-card{
  padding:20px;
  border-radius:22px;
  border:1px solid var(--stroke);
  background:linear-gradient(155deg, rgba(255,255,255,.052) 0%, rgba(255,255,255,.018) 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.042);
  transition:transform .26s ease,border-color .26s ease,box-shadow .26s ease,background .26s ease;
}
.metric-card:hover{transform:translateY(-3px);border-color:rgba(124,116,255,.22);box-shadow:0 22px 44px rgba(4,6,10,.28)}
.metric-card strong{
  display:block;
  font-family:'Manrope',sans-serif;
  font-size:25px;
  line-height:1;
  letter-spacing:-.02em;
}
.metric-card span{display:block;margin-top:8px;color:var(--muted);font-size:12px;line-height:1.42}
.metric-card-accent strong{color:#d4cfff}
.section{padding:var(--section-gap) 0;scroll-margin-top:104px}
.section-alt{background:linear-gradient(180deg, rgba(255,255,255,.024), rgba(255,255,255,0) 80%)}
.section-head{
  max-width:780px;
  display:grid;
  gap:12px;
  margin-bottom:36px;
}
.section-head-wide{max-width:920px}
.section-kicker{
  display:inline-block;
  color:#b8b2ff;
  font-size:11px;
  font-weight:700;
  letter-spacing:.2em;
  text-transform:uppercase;
}
.section-title{
  max-width:18ch;
  font-family:'Manrope',sans-serif;
  font-size:clamp(32px, 4.2vw, 54px);
  line-height:.98;
  letter-spacing:-.04em;
}
.section-description{font-size:16px;color:var(--muted);line-height:1.65;max-width:72ch}
.surface-card{
  border-radius:var(--radius);
  border:1px solid var(--stroke);
  background:linear-gradient(155deg, rgba(255,255,255,.054) 0%, rgba(255,255,255,.02) 60%, rgba(255,255,255,.008) 100%);
  padding:28px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.048), 0 2px 12px rgba(4,6,10,.14);
  transition:transform .26s ease,border-color .26s ease,box-shadow .26s ease,background .26s ease;
}
.surface-card:hover{
  transform:translateY(-4px);
  border-color:rgba(124,116,255,.22);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.048), 0 32px 64px rgba(4,6,10,.3), 0 0 0 1px rgba(124,116,255,.07);
  background:linear-gradient(155deg, rgba(255,255,255,.068) 0%, rgba(255,255,255,.026) 60%, rgba(255,255,255,.01) 100%);
}
.surface-card h3{
  font-family:'Manrope',sans-serif;
  font-size:21px;
  line-height:1.16;
  letter-spacing:-.028em;
}
.surface-card p{
  margin-top:14px;
  color:var(--muted);
  font-size:15px;
  line-height:1.65;
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
  border-radius:12px;
  border:1px solid rgba(124,116,255,.22);
  background:rgba(124,116,255,.1);
  color:#c6c0ff;
  font-size:12px;
  font-weight:800;
}
.risk-card{
  background:
    linear-gradient(155deg, rgba(171,92,109,.14) 0%, rgba(171,92,109,.05) 60%),
    linear-gradient(155deg, rgba(255,255,255,.048) 0%, rgba(255,255,255,.014) 100%);
  border-color:rgba(171,92,109,.22);
}
.risk-copy-label{color:var(--danger)}
.tabs-shell{display:grid;gap:18px}
.tab-switcher{display:flex;flex-wrap:wrap;gap:10px}
.tab-btn{
  min-height:42px;
  padding:0 20px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.025);
  color:var(--muted);
  font-size:14px;
  font-weight:500;
  cursor:pointer;
  transition:color .18s,border-color .18s,background .18s;
}
.tab-btn:hover{color:var(--text);border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.042)}
.tab-btn.active{
  color:#fff;
  background:linear-gradient(135deg, rgba(124,116,255,.28), rgba(124,116,255,.12));
  border-color:rgba(124,116,255,.36);
  font-weight:700;
  box-shadow:0 6px 22px rgba(124,116,255,.15);
}
.tab-panel{display:none}
.tab-panel.active{display:block}
.tab-copy-card h3{font-size:28px;line-height:1.12;letter-spacing:-.03em}
.tab-lead{margin-top:14px;font-size:15px;color:var(--muted);line-height:1.65}
/* === Patch 7: process tab artifact image === */
.tab-artifact{
  margin-top:22px;
  border-radius:16px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.06);
}
.tab-artifact img{
  display:block;
  width:100%;
  height:240px;
  object-fit:cover;
  object-position:top center;
}
.tab-artifact-caption{
  padding:10px 16px;
  font-size:12px;
  color:var(--muted-2);
  letter-spacing:.03em;
  background:rgba(255,255,255,.02);
  border-top:1px solid rgba(255,255,255,.05);
}
@media(max-width:640px){.tab-artifact img{height:180px}}
.landing-process-band{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:10px;
  margin-top:24px;
  padding:14px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.06);
  background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
}
.landing-process-step{
  min-height:74px;
  padding:12px 14px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.05);
  background:rgba(8,11,19,.42);
}
.landing-process-step span{
  display:block;
  color:#d7d3ff;
  font-size:11px;
  font-weight:800;
  letter-spacing:.1em;
}
.landing-process-step strong{
  display:block;
  margin-top:10px;
  font-size:14px;
  line-height:1.35;
}
.landing-process-step.active{
  border-color:rgba(124,116,255,.24);
  background:linear-gradient(180deg, rgba(124,116,255,.16), rgba(124,116,255,.06));
  box-shadow:0 16px 34px rgba(124,116,255,.12);
}
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
  border:1px solid rgba(124,116,255,.2);
  color:#c8c2ff;
  font-size:11px;
  font-weight:800;
}
.feature-item strong{display:block;font-size:14px;font-weight:700;line-height:1.32;color:var(--text)}
.feature-item p{margin-top:6px;font-size:13px;color:var(--muted);line-height:1.54}
.module-head,.roadmap-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  margin-bottom:16px;
}
.module-price{font-size:14px;font-weight:700;color:#c2bcff;white-space:nowrap}
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
  color:#7c74ff;
  font-size:13px;
}
/* === terms-list: card-style items === */
.terms-list{gap:8px}
.terms-list li{
  padding:14px 18px 14px 44px;
  border-radius:var(--radius-sm);
  border:1px solid rgba(255,255,255,.07);
  background:linear-gradient(155deg, rgba(255,255,255,.036) 0%, rgba(255,255,255,.01) 100%);
  font-size:14px;
  line-height:1.56;
  transition:border-color .22s;
}
.terms-list li:hover{border-color:rgba(124,116,255,.16)}
.terms-list li::before{left:18px;top:15px}
.roadmap-step{color:#b8b2ff;font-size:13px;font-weight:800;letter-spacing:.06em}
.pricing-card{
  background:
    radial-gradient(ellipse at top, rgba(124,116,255,.18), transparent 42%),
    linear-gradient(155deg, rgba(255,255,255,.056) 0%, rgba(255,255,255,.022) 100%);
  border-color:rgba(124,116,255,.22);
  box-shadow:0 4px 28px rgba(4,6,10,.18), inset 0 1px 0 rgba(255,255,255,.05);
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
/* === PROOF METRICS === */
.proof-metrics{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
  margin-bottom:24px;
}
.proof-metric-card{padding:26px 24px}
.proof-metric-card strong{
  display:block;
  font-family:'Manrope',sans-serif;
  font-size:clamp(36px,4.4vw,60px);
  line-height:.92;
  letter-spacing:-.044em;
  color:#ccc6ff;
}
.proof-metric-card span{display:block;margin-top:10px;color:var(--muted);font-size:13px;line-height:1.5}
.proof-metric-accent{
  border-color:rgba(124,116,255,.32);
  background:linear-gradient(155deg,rgba(124,116,255,.17) 0%,rgba(124,116,255,.06) 100%);
  box-shadow:inset 0 1px 0 rgba(124,116,255,.18), 0 12px 32px rgba(124,116,255,.1);
}
.proof-metric-accent strong{color:#ede8ff}
/* === CASE CARDS GRID === */
.case-cards-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
}
.case-card{overflow:hidden}
.case-card-text{padding:24px}
.case-card-with-img{padding:0}
.case-card-img{
  height:156px;
  background-size:cover;
  background-position:center;
  background-color:rgba(124,116,255,.08);
  position:relative;
}
.case-card-img::after{
  content:'';
  position:absolute;inset:0;
  background:linear-gradient(to bottom,transparent 40%,rgba(7,9,16,.52));
}
.case-card-body{padding:18px 22px 22px}
.case-card-index{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:32px;height:32px;
  border-radius:10px;
  background:rgba(124,116,255,.1);
  color:#ddd9ff;
  font-size:11px;
  font-weight:800;
  margin-bottom:14px;
}
.case-card-name{
  font-family:'Manrope',sans-serif;
  font-size:18px;
  line-height:1.24;
  letter-spacing:-.022em;
}
.case-card-result{
  margin-top:8px;
  color:var(--muted);
  font-size:13px;
  line-height:1.54;
}
.case-card-featured{
  border-color:rgba(124,116,255,.28);
  background:linear-gradient(155deg,rgba(124,116,255,.11) 0%,rgba(255,255,255,.02) 100%);
  box-shadow:inset 0 1px 0 rgba(124,116,255,.12), 0 6px 22px rgba(4,6,10,.14);
}
/* === PROOF CASES HEAD === */
.proof-cases-head{
  display:flex;
  align-items:center;
  gap:14px;
  margin:8px 0 16px;
  padding-top:22px;
  border-top:1px solid rgba(255,255,255,.06);
}
.proof-cases-label{
  display:inline-block;
  color:#b8b2ff;
  font-size:11px;
  font-weight:700;
  letter-spacing:.2em;
  text-transform:uppercase;
}
/* === CASE CHIP === */
.case-chip{margin:0 0 10px}
/* === CLIENT LOGOS === */
.client-logos-row{margin-top:28px;padding-top:28px;border-top:1px solid rgba(255,255,255,.06)}
.client-logos-label{
  font-size:12px;
  color:var(--muted-2);
  letter-spacing:.12em;
  text-transform:uppercase;
  margin-bottom:16px;
}
.client-logos-grid{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.client-logo-tile{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:52px;
  min-width:100px;
  padding:0 20px;
  border-radius:14px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.025);
  transition:border-color .22s ease,opacity .22s ease;
}
.client-logo-tile img{height:22px;width:auto;filter:brightness(0) invert(1);opacity:.5}
.client-logo-tile:hover{border-color:rgba(124,116,255,.18)}
.client-logo-tile:hover img{opacity:.8}
.client-logo-tile span{color:var(--muted);font-size:13px}
.client-logo-pill{
  display:inline-flex;
  align-items:center;
  padding:8px 16px;
  min-height:38px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background:rgba(255,255,255,.025);
  color:var(--muted);
  font-size:13px;
}
.faq-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
.faq-card h3{
  font-size:17px;
  line-height:1.32;
  letter-spacing:-.018em;
  color:var(--text);
}
.faq-card p{
  margin-top:0;
  padding-top:14px;
  border-top:1px solid rgba(255,255,255,.07);
  font-size:14px;
  color:var(--muted);
  line-height:1.64;
}
.final-cta{padding:88px 0}
.final-cta-box{
  position:relative;overflow:hidden;
  padding:72px 48px;
  text-align:center;
  border-radius:32px;
  border:1px solid rgba(124,116,255,.24);
  background:
    radial-gradient(ellipse at top, rgba(124,116,255,.26), transparent 38%),
    radial-gradient(circle at 72% 88%, rgba(85,162,255,.08), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,.056) 0%, rgba(255,255,255,.02) 100%);
  box-shadow:0 0 0 1px rgba(124,116,255,.07), 0 40px 100px rgba(4,6,10,.36);
}
.final-cta-box h2{
  font-family:'Manrope',sans-serif;
  font-size:clamp(36px, 4.8vw, 62px);
  line-height:.94;
  letter-spacing:-.044em;
}
.final-cta-box p{
  max-width:580px;
  margin:18px auto 0;
  color:var(--muted);
  font-size:16px;
  line-height:1.68;
}
.final-cta-box .hero-actions{justify-content:center;margin-top:36px}
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
.page-landing .hero-section{padding:108px 0 10px}
.page-landing .hero-grid{
  min-height:auto;
  display:block;
}
.page-landing .hero-copy{
  width:auto;
  max-width:900px;
  margin:0 auto;
  padding:12px 0 6px;
  text-align:center;
}
.page-landing .eyebrow-row,
.page-landing .hero-copy .hero-actions{justify-content:center}
.page-landing .hero-title{
  max-width:14ch;
  margin:0 auto;
  font-size:clamp(50px, 6.6vw, 78px);
  line-height:.98;
  letter-spacing:-.05em;
}
.page-landing .hero-title .accent{
  background:linear-gradient(135deg, #f8f7ff 0%, #bfb9ff 34%, #7c74ff 100%);
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  text-shadow:none;
}
.page-landing .hero-subtitle{
  max-width:56ch;
  margin:18px auto 0;
  font-size:15px;
  line-height:1.6;
  color:#9ca3ba;
}
.page-landing .hero-actions{margin-top:22px}
.page-landing .landing-hero-strip{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:0;
  width:min(100%, 640px);
  margin:20px auto 0;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.06);
  background:rgba(255,255,255,.018);
  overflow:hidden;
}
.page-landing .landing-hero-strip-item{
  position:relative;
  min-height:42px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0 14px;
  border-right:1px solid rgba(255,255,255,.05);
  color:#878ea8;
  font-size:11px;
  letter-spacing:.02em;
}
.page-landing .landing-hero-strip-item:last-child{border-right:none}
.page-landing .landing-hero-strip-item span{white-space:nowrap}
.page-landing .landing-hero-strip-item.active{
  color:#f3f2ff;
  background:linear-gradient(180deg, rgba(124,116,255,.12), rgba(124,116,255,.04));
}
.page-landing .hero-metrics{
  max-width:640px;
  margin:18px auto 0;
  justify-content:center;
  gap:0;
  border-top:1px solid rgba(255,255,255,.05);
  padding-top:18px;
}
.page-landing .metric-card{
  min-height:62px;
  padding:10px 18px 8px;
  border-radius:0;
  background:transparent;
  backdrop-filter:none;
  border:none;
  border-right:1px solid rgba(255,255,255,.06);
  box-shadow:none;
}
.page-landing .metric-card:last-child{border-right:none}
.page-landing .metric-card strong{font-size:22px}
.page-landing .metric-card span{margin-top:6px;font-size:11px;color:#7f879e}
.page-landing .section{padding:88px 0;scroll-margin-top:98px}
.page-landing .section-head{gap:8px;margin-bottom:22px}
.page-landing .section-title{
  max-width:17ch;
  font-size:clamp(24px, 3vw, 42px);
  line-height:1.06;
}
.page-landing .section-description{
  max-width:68ch;
  font-size:13px;
  line-height:1.55;
  color:#868da5;
}
.page-landing .surface-card{
  border-radius:18px;
  background:linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.014));
  border-color:rgba(255,255,255,.055);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
}
.page-landing .surface-card:hover{border-color:rgba(124,116,255,.12);box-shadow:0 20px 44px rgba(6,8,13,.18)}
.page-landing .surface-card h3{font-size:18px;line-height:1.18}
.page-landing .surface-card p{font-size:13px;line-height:1.55;color:#8d94aa}
.page-landing .solution-card:first-child{background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))}
.page-landing .risk-card{
  background:
    radial-gradient(circle at top right, rgba(255,143,160,.06), transparent 48%),
    linear-gradient(180deg, rgba(171,92,109,.11), rgba(171,92,109,.04)),
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
}
.page-landing .module-card:nth-child(2),
.page-landing .module-card:nth-child(3){background:linear-gradient(180deg, rgba(124,116,255,.06), rgba(255,255,255,.015))}
.page-landing .module-grid,
.page-landing .roadmap-grid,
.page-landing .detail-grid,
.page-landing .solution-grid,
.page-landing .stats-grid{gap:14px}
.page-landing .roadmap-grid{position:relative;gap:14px}
.page-landing .roadmap-card{position:relative;overflow:hidden}
.page-landing .roadmap-card::before{
  content:'';
  position:absolute;
  inset:0 auto 0 0;
  width:3px;
  border-radius:999px;
  background:linear-gradient(180deg, rgba(124,116,255,.9), rgba(85,162,255,.25));
}
.page-landing .pricing-card{
  box-shadow:0 24px 56px rgba(6,8,13,.2), inset 0 1px 0 rgba(255,255,255,.03);
  border-color:rgba(255,255,255,.06);
}
.page-landing .cases-layout{align-items:center}
.page-landing .case-pill{min-height:34px;font-size:12px}
.page-landing .final-cta-box{
  background:
    radial-gradient(circle at top, rgba(124,116,255,.14), transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
}
@keyframes floatSoft{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-6px)}
}
/* === Patch 6: Level-1 decorative assets === */
body::after{
  content:'';
  position:fixed;
  inset:0;
  background-image:url('/assets/edagency/bg-grain-black.jpg');
  background-repeat:repeat;
  background-size:340px;
  mix-blend-mode:soft-light;
  opacity:.17;
  pointer-events:none;
  z-index:9999;
}
.hero-deco-star{
  position:absolute;
  right:5%;top:12%;
  width:200px;height:200px;
  object-fit:contain;
  opacity:.15;
  pointer-events:none;
  animation:floatSoft 9s ease-in-out infinite;
  z-index:0;
  filter:saturate(.55) brightness(.88);
}
.cta-deco-square{
  position:absolute;
  right:18px;bottom:18px;
  width:148px;height:148px;
  object-fit:contain;
  opacity:.12;
  pointer-events:none;
  animation:floatSoft 12s ease-in-out infinite reverse;
  z-index:0;
  filter:saturate(.55) brightness(.85);
}
@media(max-width:860px){.hero-deco-star,.cta-deco-square{display:none}}
@media (max-width:1100px){
  .pricing-grid,.cases-layout,.solution-grid{grid-template-columns:1fr}
  .detail-grid,.roadmap-grid,.module-grid,.stats-grid,.faq-grid,.feature-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
  .proof-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .case-cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hero-grid{min-height:auto}
  .page-landing .hero-copy{max-width:100%;text-align:center}
  .page-landing .eyebrow-row,
  .page-landing .hero-copy .hero-actions{justify-content:center}
  .page-landing .hero-title,
  .page-landing .hero-subtitle{margin-left:auto;margin-right:auto}
  .page-landing .landing-hero-strip{width:min(100%, 560px)}
}
@media (max-width:860px){
  :root{--section-gap:64px}
  .header-inner{min-height:72px;flex-wrap:wrap;padding:12px 0}
  .top-nav{order:3;width:100%;justify-content:flex-start;overflow:auto;padding-bottom:4px}
  .hero-section{padding-top:44px}
  .hero-metrics{grid-template-columns:1fr}
  .detail-grid,.roadmap-grid,.module-grid,.stats-grid,.faq-grid,.feature-grid{grid-template-columns:1fr}
  .case-cards-grid{grid-template-columns:1fr}
  .footer-inner{flex-direction:column}
  .landing-process-band,
  .page-landing .landing-hero-strip{grid-template-columns:1fr 1fr}
}
@media (max-width:640px){
  .shell{width:min(calc(100% - 24px), var(--shell))}
  .btn{width:100%}
  .header-actions{width:100%}
  .hero-copy{padding:34px 0 28px}
  .hero-actions{flex-direction:column}
  .hero-title{max-width:13ch;font-size:clamp(34px, 11.5vw, 50px)}
  .hero-subtitle,.section-description{font-size:15px}
  .surface-card{padding:22px}
  .final-cta-box{padding:44px 24px}
  .modal-card{padding:20px}
  .tab-copy-card h3{font-size:26px}
  .scope-row,.scope-entry-head{grid-template-columns:34px 1fr}
  .scope-row em,.scope-entry-head em{grid-column:2}
  .compact-list,.scope-meta,.small-note,.scope-chip-row{margin-left:0}
  .page-landing .hero-section{padding:98px 0 10px}
  .page-landing .hero-title{font-size:clamp(40px, 11.8vw, 56px);max-width:12ch}
  .page-landing .hero-subtitle{font-size:15px;line-height:1.55}
  .page-landing .hero-actions{margin-top:22px}
  .page-landing .hero-metrics{margin-top:18px}
  .page-landing .landing-hero-strip{
    grid-template-columns:1fr;
    margin-top:18px;
  }
  .page-landing .landing-hero-strip-item{
    min-height:38px;
    border-right:none;
    border-bottom:1px solid rgba(255,255,255,.05);
  }
  .page-landing .landing-hero-strip-item:last-child{border-bottom:none}
  .page-landing .hero-metrics{
    grid-template-columns:1fr;
    gap:6px;
    border-top:none;
    padding-top:0;
  }
  .page-landing .metric-card{
    min-height:74px;
    border-right:none;
    border:1px solid rgba(255,255,255,.05);
    border-radius:16px;
    background:rgba(255,255,255,.02);
  }
  .page-landing .section{padding:72px 0}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation:none !important;
    transition:none !important;
    scroll-behavior:auto !important;
  }
}
</style>
</head>
<body class="service-page service-${escapeHtml(slugClass)}${isLandingPreset ? ' page-landing' : ''}">
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="#top">
        <img class="brand-logo" src="/edagency-logo.png" alt="" height="26" loading="eager" onerror="this.style.display='none';this.nextElementSibling.style.display=''">
        <span class="brand-mark" style="display:none"></span>
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
    <img class="hero-deco-star" src="/assets/edagency/shape-star4.png" aria-hidden="true" alt="" loading="eager">
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
        ${landingHeroStripHtml}
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
        <img class="cta-deco-square" src="/assets/edagency/shape-square.png" aria-hidden="true" alt="" loading="lazy">
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
