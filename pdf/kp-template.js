// Серверный рендер PDF коммерческого предложения EdAgency.
// Дизайн: светлая версия фирменного стиля /kp/:slug и edagency.ru —
// Manrope + JetBrains Mono, purple-акцент #6866f2, крупные hero-заголовки,
// меты в моноширинном, тонкие hairlines между секциями.
// Движок: @react-pdf/renderer (на котором работает pdfx).

const path = require('path');
const fs = require('fs');
const React = require('react');
const {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} = require('@react-pdf/renderer');

const FONTS_DIR = path.join(__dirname, 'fonts');
const LOGO_PATH = path.join(__dirname, '..', 'public', 'edagency-logo.png');

let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  Font.register({
    family: 'Manrope',
    fonts: [
      { src: path.join(FONTS_DIR, 'Manrope-400.ttf'), fontWeight: 400 },
      { src: path.join(FONTS_DIR, 'Manrope-500.ttf'), fontWeight: 500 },
      { src: path.join(FONTS_DIR, 'Manrope-600.ttf'), fontWeight: 600 },
      { src: path.join(FONTS_DIR, 'Manrope-700.ttf'), fontWeight: 700 },
      { src: path.join(FONTS_DIR, 'Manrope-800.ttf'), fontWeight: 800 },
    ],
  });
  Font.register({
    family: 'JBMono',
    fonts: [
      { src: path.join(FONTS_DIR, 'JetBrainsMono-400.ttf'), fontWeight: 400 },
      { src: path.join(FONTS_DIR, 'JetBrainsMono-500.ttf'), fontWeight: 500 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

// ── Палитра (светлая версия /kp/:slug) ───────────────────────────────────
const c = {
  bg:        '#FFFFFF',
  surface:   '#FAFAFB',    // мягкая карточная заливка
  surface2:  '#F4F3F9',    // карточка с лёгким purple-тинтом
  border:    '#ECECF1',    // hairlines
  border2:   '#D9D8E3',
  t1:        '#0F0F14',    // primary ink
  t2:        '#6B6B7A',    // secondary
  t3:        '#9A9AAA',    // tertiary / captions
  purple:    '#6866F2',
  purpleDeep:'#4D4BD1',
  purpleTint:'#EEEDFB',    // soft brand surface
  green:     '#2E9367',    // для блока скидки
  greenTint: '#E8F6EE',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: c.bg,
    color: c.t1,
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: 400,
    lineHeight: 1.5,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // ── Cover ───────────────────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  brandLogo: { width: 20, height: 20, marginRight: 10 },
  brandWord: {
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 13,
    color: c.t1,
    lineHeight: 1,
  },
  brandSep: {
    width: 1,
    height: 12,
    backgroundColor: c.border2,
    marginHorizontal: 10,
  },
  brandTag: {
    fontFamily: 'JBMono',
    fontWeight: 400,
    fontSize: 8.5,
    color: c.t3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 1,
  },

  badge: {
    marginTop: 48,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: c.purpleTint,
    borderWidth: 0.5,
    borderColor: c.purple,
    fontFamily: 'JBMono',
    fontWeight: 500,
    fontSize: 9,
    color: c.purple,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  heroTitle: {
    marginTop: 22,
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 44,
    lineHeight: 1.04,
    letterSpacing: -0.8,
    color: c.t1,
    maxWidth: 460,
  },
  heroTitleAccent: { color: c.purple },

  heroLead: {
    marginTop: 18,
    fontFamily: 'Manrope',
    fontWeight: 400,
    fontSize: 12.5,
    lineHeight: 1.55,
    color: c.t2,
    maxWidth: 460,
  },

  // Статистика в hero: «3 модуля · 8 недель»
  heroStats: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: { marginRight: 28 },
  heroStatValue: {
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 26,
    color: c.purple,
    lineHeight: 1,
  },
  heroStatLabel: {
    marginTop: 4,
    fontFamily: 'JBMono',
    fontSize: 8,
    color: c.t3,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroStatDiv: {
    width: 1,
    height: 28,
    backgroundColor: c.border2,
    marginRight: 28,
  },

  // Meta grid нижняя (Подготовлено для / менеджер / дата / действует)
  coverMeta: {
    marginTop: 38,
    paddingTop: 22,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  coverMetaItem: {
    width: '25%',
    paddingRight: 10,
    marginBottom: 6,
  },
  coverMetaLbl: {
    fontFamily: 'JBMono',
    fontSize: 8,
    color: c.t3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  coverMetaVal: {
    fontFamily: 'Manrope',
    fontWeight: 600,
    fontSize: 11,
    color: c.t1,
    lineHeight: 1.3,
  },
  coverMetaSub: {
    fontFamily: 'Manrope',
    fontWeight: 400,
    fontSize: 9.5,
    color: c.t2,
    marginTop: 2,
  },

  // ── Section header ─────────────────────────────────────────────────
  section: { marginTop: 32 },
  sectionHead: { marginBottom: 18 },
  sectionKicker: {
    fontFamily: 'JBMono',
    fontWeight: 500,
    fontSize: 9,
    color: c.purple,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 28,
    lineHeight: 1.08,
    letterSpacing: -0.4,
    color: c.t1,
  },
  sectionTitleAccent: { color: c.purple },
  sectionLead: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontWeight: 400,
    fontSize: 10,
    color: c.t2,
    maxWidth: 460,
    lineHeight: 1.55,
  },

  sepRule: {
    height: 0.5,
    backgroundColor: c.border,
    marginTop: 28,
  },

  // ── Таблица работ (модулей) ────────────────────────────────────────
  table: {},
  tHead: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.t1,
    marginBottom: 0,
  },
  th: {
    fontFamily: 'JBMono',
    fontSize: 8,
    fontWeight: 500,
    color: c.t1,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  tNum: {
    width: 32,
    fontFamily: 'JBMono',
    fontWeight: 500,
    fontSize: 10,
    color: c.purple,
  },
  tName: {
    flex: 1,
    paddingRight: 10,
    fontFamily: 'Manrope',
    fontSize: 11.5,
    fontWeight: 600,
    color: c.t1,
  },
  tDur: {
    width: 90,
    fontFamily: 'JBMono',
    fontSize: 9.5,
    color: c.t2,
  },
  tPrice: {
    width: 110,
    textAlign: 'right',
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 12,
    color: c.t1,
  },

  // ── Этапы (stage cards) ────────────────────────────────────────────
  stageCard: {
    marginBottom: 10,
    padding: 18,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: c.border2,
    backgroundColor: c.surface,
    flexDirection: 'row',
  },
  stageCardFeat: {
    backgroundColor: c.purpleTint,
    borderColor: c.purple,
  },
  stageIndex: {
    width: 46,
    fontFamily: 'JBMono',
    fontWeight: 500,
    fontSize: 22,
    color: c.purple,
    lineHeight: 1,
  },
  stageBody: { flex: 1, paddingRight: 14 },
  stageTitle: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 15,
    color: c.t1,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  stageFeature: {
    fontFamily: 'Manrope',
    fontSize: 9.5,
    color: c.t2,
    lineHeight: 1.55,
    marginBottom: 2,
    paddingLeft: 12,
    textIndent: -8,
  },
  stagePay: {
    marginTop: 10,
    fontFamily: 'JBMono',
    fontSize: 8.5,
    color: c.t3,
    letterSpacing: 0.3,
  },
  stageComment: {
    marginTop: 5,
    fontFamily: 'JBMono',
    fontSize: 8.5,
    color: c.t3,
    letterSpacing: 0.2,
  },
  stagePriceCol: {
    width: 110,
    alignItems: 'flex-end',
  },
  stagePrice: {
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 22,
    color: c.purple,
    letterSpacing: -0.3,
    lineHeight: 1,
  },
  stagePriceCap: {
    marginTop: 5,
    fontFamily: 'JBMono',
    fontSize: 8,
    color: c.t3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Timeline (roadmap) ─────────────────────────────────────────────
  roadRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  roadWeek: {
    width: 90,
    fontFamily: 'JBMono',
    fontWeight: 500,
    fontSize: 10,
    color: c.purple,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  roadBody: { flex: 1 },
  roadTitle: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: 700,
    color: c.t1,
    marginBottom: 2,
  },
  roadDesc: {
    fontFamily: 'Manrope',
    fontSize: 9.5,
    color: c.t2,
    lineHeight: 1.5,
  },

  // ── Итог ───────────────────────────────────────────────────────────
  totalCard: {
    marginTop: 28,
    padding: 28,
    borderRadius: 14,
    backgroundColor: c.surface2,
    borderWidth: 0.5,
    borderColor: c.border2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalCol: {},
  totalLbl: {
    fontFamily: 'JBMono',
    fontSize: 9,
    color: c.t3,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  totalVal: {
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 48,
    color: c.purple,
    letterSpacing: -1.2,
    lineHeight: 1,
  },
  totalNote: {
    marginTop: 10,
    fontFamily: 'JBMono',
    fontSize: 8.5,
    color: c.t3,
    letterSpacing: 0.3,
  },
  totalRight: {
    alignItems: 'flex-end',
    paddingBottom: 6,
  },
  totalOriginal: {
    fontFamily: 'Manrope',
    fontWeight: 500,
    fontSize: 12,
    color: c.t3,
    textDecoration: 'line-through',
    marginBottom: 4,
  },
  totalSavingPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: c.greenTint,
    fontFamily: 'JBMono',
    fontSize: 9,
    fontWeight: 500,
    color: c.green,
    letterSpacing: 0.5,
  },

  // ── Подпись ────────────────────────────────────────────────────────
  sign: {
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
  },
  signHi: {
    fontFamily: 'Manrope',
    fontSize: 10.5,
    color: c.t2,
    marginBottom: 8,
  },
  signName: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 13,
    color: c.t1,
    marginBottom: 2,
  },
  signOrg: {
    fontFamily: 'JBMono',
    fontSize: 9,
    color: c.t3,
    letterSpacing: 0.4,
  },

  // ── Footer только с номером страницы ──────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLbl: {
    fontFamily: 'Manrope',
    fontWeight: 800,
    fontSize: 10,
    color: c.purple,
    letterSpacing: 0.3,
  },
  footerPage: {
    fontFamily: 'JBMono',
    fontSize: 9,
    color: c.t3,
    letterSpacing: 0.5,
  },
});

// ── Утилиты ──────────────────────────────────────────────────────────────
function fmtRub(n) {
  if (!n || n <= 0) return '—';
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}
function fmtDateLong(d) {
  const dt = d instanceof Date ? d : new Date();
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtValidityDate(validity) {
  const n = Number(validity) || 14;
  const dt = new Date();
  dt.setDate(dt.getDate() + n);
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

const h = React.createElement;

// ── Разбиение заголовка для purple-акцента ───────────────────────────────
function splitTitleWords(title) {
  const words = String(title || 'Коммерческое предложение').split(' ');
  if (words.length <= 2) return { accent: words.join(' '), rest: '' };
  const mid = Math.ceil(words.length / 2);
  return { accent: words.slice(0, mid).join(' '), rest: words.slice(mid).join(' ') };
}

// ── Hero / cover ─────────────────────────────────────────────────────────
function Cover(data) {
  const hasLogo = fs.existsSync(LOGO_PATH);
  const modules = data.modules || [];
  const stages = data.stages || [];
  const roadmap = data.roadmap || [];
  const count = stages.length || modules.length;
  const weeksMatch = roadmap.length
    ? String(roadmap[roadmap.length - 1].weeks || '').match(/(\d+)/g)
    : null;
  const totalWeeks = weeksMatch ? weeksMatch[weeksMatch.length - 1] : null;

  const t = splitTitleWords(data.title);

  return h(View, { key: 'cover' },
    h(View, { style: styles.brandRow },
      hasLogo ? h(Image, { src: LOGO_PATH, style: styles.brandLogo }) : null,
      h(Text, { style: styles.brandWord }, 'EdAgency'),
      h(View, { style: styles.brandSep }),
      h(Text, { style: styles.brandTag }, 'Методологическое агентство'),
    ),

    h(Text, { style: styles.badge },
      'Для' + (data.client ? ' · ' + data.client : ''),
    ),

    h(Text, { style: styles.heroTitle },
      h(Text, { style: styles.heroTitleAccent }, t.accent),
      t.rest ? ' ' + t.rest : '',
    ),

    data.intro ? h(Text, { style: styles.heroLead }, data.intro) : null,

    h(View, { style: styles.coverMeta },
      data.client ? h(View, { style: styles.coverMetaItem },
        h(Text, { style: styles.coverMetaLbl }, 'Клиент'),
        h(Text, { style: styles.coverMetaVal }, data.client),
        data.org ? h(Text, { style: styles.coverMetaSub }, data.org) : null,
      ) : null,
      data.manager ? h(View, { style: styles.coverMetaItem },
        h(Text, { style: styles.coverMetaLbl }, 'Менеджер'),
        h(Text, { style: styles.coverMetaVal }, data.manager),
        h(Text, { style: styles.coverMetaSub }, 'EdAgency'),
      ) : null,
      h(View, { style: styles.coverMetaItem },
        h(Text, { style: styles.coverMetaLbl }, 'Дата'),
        h(Text, { style: styles.coverMetaVal }, fmtDateLong()),
      ),
      h(View, { style: styles.coverMetaItem },
        h(Text, { style: styles.coverMetaLbl }, 'Действует до'),
        h(Text, { style: styles.coverMetaVal }, fmtValidityDate(data.validity)),
      ),
    ),
  );
}

// ── Section head ─────────────────────────────────────────────────────────
function SectionHead(kicker, title) {
  const t = splitTitleWords(title);
  return h(View, { style: styles.sectionHead, wrap: false },
    h(Text, { style: styles.sectionKicker }, kicker),
    h(Text, { style: styles.sectionTitle },
      t.accent,
      t.rest ? h(Text, { style: styles.sectionTitleAccent }, ' ' + t.rest) : '',
    ),
  );
}

// ── Блоки контента ───────────────────────────────────────────────────────
function ModulesTable(modules, roadmap) {
  const rows = modules.map((m, i) => {
    const dur = (roadmap || [])[i]?.weeks ? `нед. ${roadmap[i].weeks}` : '';
    return h(View, { style: styles.tRow, key: `r${i}`, wrap: false },
      h(Text, { style: styles.tNum }, String(i + 1).padStart(2, '0')),
      h(Text, { style: styles.tName }, m.name || `Модуль ${i + 1}`),
      h(Text, { style: styles.tDur }, dur),
      h(Text, { style: styles.tPrice }, fmtRub(m.price || 0)),
    );
  });
  return h(View, { style: styles.table },
    h(View, { style: styles.tHead, wrap: false },
      h(Text, { style: [styles.th, { width: 32 }] }, '№'),
      h(Text, { style: [styles.th, { flex: 1, paddingRight: 10 }] }, 'Работа'),
      h(Text, { style: [styles.th, { width: 90 }] }, 'Срок'),
      h(Text, { style: [styles.th, { width: 110, textAlign: 'right' }] }, 'Стоимость'),
    ),
    ...rows,
  );
}

function StagesList(stages) {
  // Фичеринг средней карточки, если их 3
  return stages.map((s, i) => {
    const prepay = s.prepay || Math.round((s.price || 0) * 0.5);
    const rem = (s.price || 0) - prepay;
    const isFeat = s.featured || (stages.length === 3 && i === 1);
    const features = (s.features || []).slice(0, 6).map((f, j) =>
      h(Text, { style: styles.stageFeature, key: `f${j}` }, '→  ' + f)
    );
    return h(View, {
        style: [styles.stageCard, isFeat ? styles.stageCardFeat : null],
        key: `s${i}`,
        wrap: false,
      },
      h(Text, { style: styles.stageIndex }, String(i + 1).padStart(2, '0')),
      h(View, { style: styles.stageBody },
        h(Text, { style: styles.stageTitle }, s.title || s.version || `Этап ${i + 1}`),
        features.length ? h(View, null, ...features) : null,
        h(Text, { style: styles.stagePay },
          `Предоплата 50% · ${fmtRub(prepay)}   После сдачи · ${fmtRub(rem)}`,
        ),
        s.comment ? h(Text, { style: styles.stageComment }, s.comment) : null,
      ),
      h(View, { style: styles.stagePriceCol },
        h(Text, { style: styles.stagePrice }, fmtRub(s.price || 0)),
        h(Text, { style: styles.stagePriceCap }, 'за этап'),
      ),
    );
  });
}

function RoadmapList(roadmap) {
  return roadmap.map((r, i) =>
    h(View, { style: styles.roadRow, key: `rd${i}`, wrap: false },
      h(Text, { style: styles.roadWeek }, `Нед. ${r.weeks || i + 1}`),
      h(View, { style: styles.roadBody },
        r.title ? h(Text, { style: styles.roadTitle }, r.title) : null,
        r.desc ? h(Text, { style: styles.roadDesc }, r.desc) : null,
      ),
    )
  );
}

function TotalBlock(total, originalTotal, discount, validity) {
  const hasDisc = originalTotal > 0 && discount > 0;
  return h(View, { style: styles.totalCard, wrap: false },
    h(View, { style: styles.totalCol },
      h(Text, { style: styles.totalLbl }, 'Итого по проекту'),
      h(Text, { style: styles.totalVal }, fmtRub(total)),
      h(Text, { style: styles.totalNote }, `Действительно ${validity || 14} дней · до ${fmtValidityDate(validity)}`),
    ),
    hasDisc ? h(View, { style: styles.totalRight },
      h(Text, { style: styles.totalOriginal }, fmtRub(originalTotal)),
      h(Text, { style: styles.totalSavingPill }, `−${discount}%   ЭКОНОМИЯ ${fmtRub(originalTotal - total)}`),
    ) : null,
  );
}

function formatTelegram(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  // Пытаемся вытащить юзернейм/ссылку в читаемый вид
  const m = s.match(/(?:t\.me\/|@)([A-Za-z0-9_]+)/);
  if (m) return '@' + m[1];
  if (/^https?:\/\//i.test(s)) return s.replace(/^https?:\/\//i, '').toLowerCase();
  return s;
}

function Signature(data) {
  if (!data.manager) return null;
  const tg = formatTelegram(data.telegram);
  return h(View, { style: styles.sign, wrap: false },
    h(Text, { style: styles.signHi }, 'С уважением,'),
    h(Text, { style: styles.signName }, data.manager),
    tg ? h(Text, { style: styles.signOrg }, tg) : null,
  );
}

function FixedFooter() {
  return h(View, { style: styles.footer, fixed: true },
    h(Text, { style: styles.footerLbl }, 'EdAgency'),
    h(Text, {
      style: styles.footerPage,
      render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`,
    }),
  );
}

// ── Document ─────────────────────────────────────────────────────────────
function KPDocument(data) {
  const modules = data.modules || [];
  const roadmap = data.roadmap || [];
  const stages = data.stages || [];
  const total = data.total || modules.reduce((s, m) => s + (m.price || 0), 0);
  const originalTotal = data.originalTotal || 0;
  const discount = data.discount || 0;

  const workCount = stages.length || modules.length;
  const workFits = workCount > 0 && workCount <= 3;

  const workSection = stages.length
    ? h(View, { style: styles.section, key: 'stages', break: true, wrap: !workFits },
        SectionHead('Этапы и оплата', 'Платите за результат'),
        ...StagesList(stages),
      )
    : modules.length
    ? h(View, { style: styles.section, key: 'modules', break: true, wrap: !workFits },
        SectionHead('Состав работ', 'Из чего состоит проект'),
        ModulesTable(modules, roadmap),
      )
    : null;

  const roadmapSection = roadmap.length && stages.length
    ? h(View, { style: styles.section, key: 'road' },
        SectionHead('График', 'Сроки по неделям'),
        RoadmapList(roadmap),
      )
    : null;

  return h(Document, {
      title: `КП — ${data.title || 'Коммерческое предложение'}`,
      author: data.manager || 'EdAgency',
      creator: 'ultra-cp',
      producer: 'react-pdf',
      subject: 'Коммерческое предложение',
    },
    h(Page, { size: 'A4', style: styles.page },
      Cover(data),
      workSection,
      roadmapSection,
      h(View, { style: styles.section, key: 'total' },
        TotalBlock(total, originalTotal, discount, data.validity),
        Signature(data),
      ),
      FixedFooter(),
    ),
  );
}

async function renderKPPdf(data) {
  ensureFontsRegistered();
  const { renderToBuffer } = require('@react-pdf/renderer');
  return renderToBuffer(KPDocument(data || {}));
}

module.exports = { renderKPPdf };
