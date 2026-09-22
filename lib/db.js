'use strict';
/**
 * Database layer — SQLite via node:sqlite (built into Node >= 22, zero native deps).
 * Tables: users, businesses, brand_identity, reviews, perceptions, settings.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'autoreview.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  google_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  address TEXT DEFAULT '',
  connection TEXT NOT NULL DEFAULT 'demo',        -- 'demo' | 'google'
  google_account_name TEXT,                        -- accounts/{id}
  google_location_name TEXT,                       -- locations/{id} (v4 path used for reviews/reply)
  google_place_id TEXT,                            -- public place id (landing page)
  google_refresh_token TEXT,
  reviews_total INTEGER DEFAULT 0,
  rating_avg REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS brand_identity (
  business_id INTEGER PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  tone TEXT DEFAULT 'friendly',
  about TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  language TEXT DEFAULT 'English',
  rules_do TEXT DEFAULT '',
  rules_dont TEXT DEFAULT '',
  emoji_policy TEXT DEFAULT 'sparingly',
  reply_length TEXT DEFAULT 'medium',
  thank_positive TEXT DEFAULT '',
  handle_negative TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  google_review_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_photo TEXT DEFAULT '',
  rating INTEGER NOT NULL,
  text TEXT DEFAULT '',
  posted_at TEXT,                                   -- when the review was created on Google
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'new',               -- new | auto_replied | pending_approval | replied | skipped
  reply_text TEXT DEFAULT '',
  reply_source TEXT DEFAULT '',                     -- ai_auto | ai_approved | manual
  replied_at TEXT,
  topics TEXT DEFAULT '',                           -- comma tags e.g. 'wait time,food'
  sentiment TEXT DEFAULT ''                         -- positive | mixed | negative
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_bid_gid ON reviews(business_id, google_review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(business_id, status);

CREATE TABLE IF NOT EXISTS perceptions (
  business_id INTEGER PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  data TEXT NOT NULL,                               -- JSON blob
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  engine TEXT DEFAULT 'heuristic'                   -- ai model name | heuristic
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

/* ---------- helpers ---------- */
const q = {
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p),
};

module.exports = { db, q };
