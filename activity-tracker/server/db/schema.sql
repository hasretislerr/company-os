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
  status        TEXT    CHECK(status IN ('active', 'audio', 'idle')) NOT NULL,
  audio_status  TEXT,
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_employee_ts
  ON activity_logs(employee_id, timestamp);

-- Örnek personel verileri
INSERT OR IGNORE INTO employees (id, name) VALUES ('emp-001', 'Ahmet Yılmaz');
INSERT OR IGNORE INTO employees (id, name) VALUES ('emp-002', 'Fatma Kaya');
INSERT OR IGNORE INTO employees (id, name) VALUES ('emp-003', 'Mehmet Demir');
