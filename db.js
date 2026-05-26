const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'calc.db'));

// WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  display_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  client TEXT DEFAULT '',
  responsible_id INTEGER NOT NULL,
  responsible_name TEXT NOT NULL,
  calc_params TEXT NOT NULL,
  kp_data TEXT DEFAULT NULL,
  price REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(responsible_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clarifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  name TEXT DEFAULT '',
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── Default settings ─────────────────────────────────────────────────────────
const defaultSettings = {
  dist_product:  '26',
  dist_marketing:'10',
  dist_sales:    '10',
  dist_admin:    '15',
  dist_taxes:    '9',
  dist_profit:   '30',
  base_rate:     '1200',
  kp_prompt:     '',
  anthropic_api_key: process.env.ANTHROPIC_API_KEY || '',
};

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [k, v] of Object.entries(defaultSettings)) {
  insertSetting.run(k, v);
}

// ── Default users ─────────────────────────────────────────────────────────────
const countUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (countUsers.cnt === 0) {
  const defaultUsers = [
    { username: 'admin',   password: 'Admin1234',  role: 'admin',  display_name: 'Администратор' },
    { username: 'editor1', password: 'Editor1234', role: 'editor', display_name: 'Редактор 1' },
    { username: 'editor2', password: 'Editor1234', role: 'editor', display_name: 'Редактор 2' },
    { username: 'editor3', password: 'Editor1234', role: 'editor', display_name: 'Редактор 3' },
    { username: 'editor4', password: 'Editor1234', role: 'editor', display_name: 'Редактор 4' },
    { username: 'editor5', password: 'Editor1234', role: 'editor', display_name: 'Редактор 5' },
    { username: 'editor6', password: 'Editor1234', role: 'editor', display_name: 'Редактор 6' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)'
  );

  for (const u of defaultUsers) {
    const hash = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.username, hash, u.role, u.display_name);
  }
  console.log('Default users created.');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

function upsertSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, role, display_name, created_at FROM users WHERE id = ?').get(id);
}

function getAllUsers() {
  return db.prepare('SELECT id, username, role, display_name, created_at FROM users ORDER BY id').all();
}

function updateUserPassword(id, hash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
}

function updateUserDisplayName(id, display_name) {
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(display_name, id);
}

function createCalculation({ slug, title, client, responsible_id, responsible_name, calc_params, kp_data, price }) {
  const stmt = db.prepare(`
    INSERT INTO calculations (slug, title, client, responsible_id, responsible_name, calc_params, kp_data, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    slug, title, client || '',
    responsible_id, responsible_name,
    calc_params ? (typeof calc_params === 'string' ? calc_params : JSON.stringify(calc_params)) : null,
    kp_data ? (typeof kp_data === 'string' ? kp_data : JSON.stringify(kp_data)) : null,
    price || 0
  );
  return result.lastInsertRowid;
}

function getCalculations() {
  return db.prepare(`
    SELECT id, slug, title, client, responsible_name, price, created_at,
           CASE WHEN kp_data IS NOT NULL THEN 1 ELSE 0 END as has_kp
    FROM calculations
    ORDER BY created_at DESC
  `).all();
}

function getCalculationById(id) {
  return db.prepare('SELECT * FROM calculations WHERE id = ?').get(id);
}

function getCalculationBySlug(slug) {
  return db.prepare('SELECT * FROM calculations WHERE slug = ?').get(slug);
}

function deleteCalculation(id) {
  return db.prepare('DELETE FROM calculations WHERE id = ?').run(id);
}

function updateCalculationMeta(id, title, client) {
  return db.prepare('UPDATE calculations SET title=?, client=? WHERE id=?').run(title, client || '', id);
}

function updateCalculationKPData(id, kp_data, calc_params, price) {
  return db.prepare('UPDATE calculations SET kp_data=?, calc_params=?, price=? WHERE id=?').run(
    kp_data != null ? (typeof kp_data === 'string' ? kp_data : JSON.stringify(kp_data)) : null,
    calc_params != null ? (typeof calc_params === 'string' ? calc_params : JSON.stringify(calc_params)) : null,
    price || 0,
    id
  );
}

function createClarification(slug, name, message) {
  return db.prepare('INSERT INTO clarifications (slug, name, message) VALUES (?, ?, ?)').run(slug, name || '', message).lastInsertRowid;
}

function getClarificationsBySlug(slug) {
  return db.prepare('SELECT * FROM clarifications WHERE slug = ? ORDER BY created_at DESC').all(slug);
}

function getAllClarifications() {
  return db.prepare('SELECT c.*, calc.title as kp_title FROM clarifications c LEFT JOIN calculations calc ON calc.slug = c.slug ORDER BY c.created_at DESC').all();
}

module.exports = {
  db,
  getSettings,
  upsertSetting,
  getUserByUsername,
  getUserById,
  getAllUsers,
  updateUserPassword,
  updateUserDisplayName,
  createCalculation,
  getCalculations,
  getCalculationById,
  getCalculationBySlug,
  deleteCalculation,
  updateCalculationMeta,
  updateCalculationKPData,
  createClarification,
  getClarificationsBySlug,
  getAllClarifications,
};
