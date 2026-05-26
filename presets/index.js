// Индекс типовых пресетов КП EdAgency.
// Используется фронтом (список + отдельный пресет) и бэкендом при
// сохранении КП, построенного на пресете.

const courseTurnkey = require('./course-turnkey');
const mentorship    = require('./mentorship');
const marathon      = require('./marathon');
const lessons       = require('./lessons');
const landing       = require('./landing');
const salesDeck     = require('./sales-deck');
const webinar       = require('./webinar');
const leadMagnet    = require('./lead-magnet');

const PRESETS = [
  courseTurnkey,
  mentorship,
  marathon,
  lessons,
  landing,
  salesDeck,
  webinar,
  leadMagnet,
];

function listPresets() {
  return PRESETS.map(p => ({
    slug: p.slug,
    label: p.label,
    category: p.category,
    priceFrom: p.priceFrom,
    maxDiscount: p.maxDiscount,
    // Короткая выжимка для карточек в списке
    audience: p.data?.concept?.audience?.slice(0, 140) || '',
    durationWeeks: p.data?.durationWeeks || null,
  }));
}

function getPreset(slug) {
  return PRESETS.find(p => p.slug === slug) || null;
}

// Применяет скидку к цене пресета. Ограничивает сверху maxDiscount.
// Возвращает новый data-объект для рендера (не мутирует пресет).
function applyDiscount(preset, discountPct) {
  const d = Math.min(Math.max(Number(discountPct) || 0, 0), preset.maxDiscount);
  const base = preset.data;
  const originalTotal = base.price;
  const total = Math.round(originalTotal * (1 - d / 100));

  // Пересчитываем модули / этапы пропорционально, чтобы сумма сошлась
  const k = originalTotal > 0 ? total / originalTotal : 1;
  const scale = (arr) => (arr || []).map(item => ({
    ...item,
    price: Math.round((item.price || 0) * k),
  }));

  return {
    ...base,
    modules: scale(base.modules),
    stages:  scale(base.stages),
    total,
    originalTotal: d > 0 ? originalTotal : 0,
    discount: d,
  };
}

module.exports = { PRESETS, listPresets, getPreset, applyDiscount };
