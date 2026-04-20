'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

// ────────────────────────────────────────────
// Yapılandırma
// ────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || './data/activity.db';
const PORT = process.env.PORT || 3100;

// data/ klasörü yoksa oluştur
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ────────────────────────────────────────────
// sql.js — WebAssembly SQLite (derleme gerektirmez)
// ────────────────────────────────────────────
let db;

async function initDatabase() {
    const SQL = await initSqlJs();

    // Mevcut DB dosyası varsa yükle, yoksa yeni oluştur
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Şemayı uygula
    db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id   TEXT    NOT NULL,
      timestamp     TEXT    NOT NULL,
      app_name      TEXT,
      window_title  TEXT,
      status        TEXT    NOT NULL,
      audio_status  TEXT,
      created_at    TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activity_employee_ts
      ON activity_logs(employee_id, timestamp);
  `);

    // Gerçek personeller Company OS Client tarafından otomatik kaydedilir

    saveDb();
    console.log(`✅ Veritabanı hazır: ${path.resolve(DB_PATH)}`);
}

// Değişiklikleri diske yaz
function saveDb() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// sql.js sorgu yardımcısı → dizi döndürür
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

// sql.js tek satır yardımcısı
function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows[0] || null;
}

// ────────────────────────────────────────────
// Express Kurulumu
// ────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ────────────────────────────────────────────
// Route: POST /api/activity — Veri Kayıt
// ────────────────────────────────────────────
app.post('/api/activity', (req, res) => {
    try {
        const { employeeId, timestamp, appName, windowTitle, status, audioStatus } = req.body;

        if (!employeeId || !status) {
            return res.status(400).json({ error: 'employeeId ve status zorunludur.' });
        }
        if (!['active', 'audio', 'idle'].includes(status)) {
            return res.status(400).json({ error: 'Geçersiz status. active | audio | idle olmalı.' });
        }

        const ts = timestamp || new Date().toISOString();

        db.run(
            `INSERT INTO activity_logs
         (employee_id, timestamp, app_name, window_title, status, audio_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [employeeId, ts, appName || null, windowTitle || null, status, audioStatus || null]
        );

        // Personel kayıtlı değilse otomatik ekle
        const existing = queryOne('SELECT id FROM employees WHERE id = ?', [employeeId]);
        if (!existing) {
            db.run('INSERT OR IGNORE INTO employees (id, name) VALUES (?, ?)',
                [employeeId, `Personel (${employeeId})`]);
        }

        saveDb();
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('[POST /api/activity]', err.message);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ────────────────────────────────────────────
// Route: GET /api/employees
// ────────────────────────────────────────────
app.get('/api/employees', (_req, res) => {
    try {
        const employees = queryAll('SELECT id, name FROM employees ORDER BY name');
        res.json(employees);
    } catch (err) {
        console.error('[GET /api/employees]', err.message);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ────────────────────────────────────────────
// Route: POST /api/employees — Client Kayıt
// Client, Company OS'tan aldığı id+name ile kendini kaydeder
// ────────────────────────────────────────────
app.post('/api/employees', (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) return res.status(400).json({ error: 'id ve name zorunludur.' });
        db.run('INSERT OR REPLACE INTO employees (id, name) VALUES (?, ?)', [id, name]);
        saveDb();
        console.log(`👤 Personel kaydedildi: ${name} (${id.slice(0, 8)}…)`);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('[POST /api/employees]', err.message);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ────────────────────────────────────────────
// Route: GET /api/activity/:employeeId?date=YYYY-MM-DD
// ────────────────────────────────────────────
app.get('/api/activity/:employeeId', (req, res) => {
    try {
        const { employeeId } = req.params;
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        const logs = queryAll(
            `SELECT id, employee_id, timestamp, app_name, window_title, status, audio_status
       FROM activity_logs
       WHERE employee_id = ? AND substr(timestamp, 1, 10) = ?
       ORDER BY timestamp ASC`,
            [employeeId, date]
        );
        res.json({ employeeId, date, logs });
    } catch (err) {
        console.error('[GET /api/activity/:employeeId]', err.message);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ────────────────────────────────────────────
// Route: GET /api/activity?date=YYYY-MM-DD (tüm personel)
// ────────────────────────────────────────────
app.get('/api/activity', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        const logs = queryAll(
            `SELECT id, employee_id, timestamp, app_name, window_title, status, audio_status
       FROM activity_logs
       WHERE substr(timestamp, 1, 10) = ?
       ORDER BY employee_id, timestamp ASC`,
            [date]
        );
        res.json({ date, logs });
    } catch (err) {
        console.error('[GET /api/activity]', err.message);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// ────────────────────────────────────────────
// Başlat
// ────────────────────────────────────────────
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Sunucu çalışıyor → http://localhost:${PORT}`);
        console.log(`\nEndpoint'ler:`);
        console.log(`  POST  /api/activity          ← Client veri gönderir`);
        console.log(`  POST  /api/employees         ← Client kendini kaydeder`);
        console.log(`  GET   /api/employees         ← Tüm personel listesi`);
        console.log(`  GET   /api/activity/:id      ← Aktivite kayıtları`);
    });
}).catch(err => {
    console.error('Başlatma hatası:', err);
    process.exit(1);
});
