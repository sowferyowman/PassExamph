const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const {
  aiInsight,
  dashboardMetrics,
  exams,
  progression,
  rewards,
  subjects,
  studyPlan,
  examStructure
} = require("../data/seed");

const dataDir = path.join(__dirname, "..", "..", "data");
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "acet.sqlite");

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL");
  }
  return db;
}

function ensureDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      target_school TEXT NOT NULL DEFAULT 'Ateneo de Manila University',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exam_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      score INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progression (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      label TEXT NOT NULL,
      score INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      mastery INTEGER NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      day TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dashboard_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      metric_key TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      detail TEXT NOT NULL,
      accent TEXT NOT NULL,
      UNIQUE(student_id, metric_key)
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      points INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      priority TEXT NOT NULL,
      detail TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_blueprint (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS essay_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      exam_log_id INTEGER,
      exam_name TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      response TEXT NOT NULL,
      rubric TEXT,
      points REAL NOT NULL DEFAULT 1,
      ai_score REAL,
      final_score REAL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS drill_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      score INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      total INTEGER NOT NULL,
      best_streak INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      responses TEXT NOT NULL,
      weakness_focus TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

  `);
  migrateLegacySchema(database);
  [
    ["users", "password_salt", "TEXT"],
    ["users", "username", "TEXT"],
    ["users", "name", "TEXT"],
    ["users", "nickname", "TEXT"],
    ["users", "sms_number", "TEXT"],
    ["users", "phone_number", "TEXT"],
    ["users", "recovery_email", "TEXT"],
    ["users", "is_verified", "INTEGER NOT NULL DEFAULT 0"],
    ["users", "is_active", "INTEGER NOT NULL DEFAULT 1"],
    ["users", "failed_login_attempts", "INTEGER NOT NULL DEFAULT 0"],
    ["users", "locked_until", "TEXT"],
    ["users", "last_login_at", "TEXT"],
    ["users", "last_login_ip", "TEXT"],
    ["users", "updated_at", "TEXT"]
  ].forEach(([table, column, definition]) => addColumnIfMissing(database, table, column, definition));
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, refresh_token TEXT NOT NULL, access_token TEXT NOT NULL, expires_at TEXT NOT NULL, ip_address TEXT, user_agent TEXT, is_revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS login_history (id TEXT PRIMARY KEY, user_id INTEGER, email TEXT, ip_address TEXT, user_agent TEXT, status TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS password_reset_tokens (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, token TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS email_verification_tokens (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, token TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS app_data (
      user_id INTEGER NOT NULL,
      namespace TEXT NOT NULL,
      data_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, namespace, data_key),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  addColumnIfMissing(database, "essay_responses", "points", "REAL NOT NULL DEFAULT 1");
  addColumnIfMissing(database, "password_reset_tokens", "is_phone", "INTEGER NOT NULL DEFAULT 0");
  database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_student_name ON subjects(student_id, name)");

  const hasUsers = database.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  if (!hasUsers) {
    database
      .prepare("INSERT INTO users (id, email, password_hash, role) VALUES (1, ?, ?, ?)")
      .run("student.demo@acet.local", null, "student");
    database
      .prepare("INSERT INTO student_profiles (user_id, display_name, target_school) VALUES (1, ?, ?)")
      .run("Demo Student", "Ateneo de Manila University");
  }

  ensureUser(database, {
    id: 1,
    email: "student.demo@acet.local",
    displayName: "Demo Student",
    targetSchool: "Ateneo de Manila University"
  });

  ensureUser(database, {
    id: 2,
    email: "student.current@acet.local",
    displayName: "Current Student",
    targetSchool: "Ateneo de Manila University"
  });

  ensureUser(database, {
    id: 3,
    email: "admin@exams.ph",
    displayName: "Admin Workspace",
    targetSchool: "Ateneo de Manila University",
    role: "admin"
  });

  const hasExamLogs = database.prepare("SELECT COUNT(*) AS total FROM exam_logs WHERE student_id = 1").get().total;
  if (!hasExamLogs) {
    const insertExam = database.prepare("INSERT INTO exam_logs (student_id, name, taken_at, score, status) VALUES (1, ?, ?, ?, ?)");
    exams.forEach((exam) => insertExam.run(exam.name, exam.takenAt, exam.score, exam.status));
  }

  const hasProgression = database.prepare("SELECT COUNT(*) AS total FROM progression WHERE student_id = 1").get().total;
  if (!hasProgression) {
    const insertPoint = database.prepare("INSERT INTO progression (student_id, label, score) VALUES (1, ?, ?)");
    progression.forEach((point) => insertPoint.run(point.label, point.score));
  }

  const hasSubjects = database.prepare("SELECT COUNT(*) AS total FROM subjects WHERE student_id = 1").get().total;
  if (!hasSubjects) {
    const insertSubject = database.prepare("INSERT INTO subjects (student_id, name, mastery, color) VALUES (1, ?, ?, ?)");
    subjects.forEach((subject) => insertSubject.run(subject.name, subject.mastery, subject.color));
  }

  const hasStudyPlan = database.prepare("SELECT COUNT(*) AS total FROM study_plan WHERE student_id = 1").get().total;
  if (!hasStudyPlan) {
    const insertPlan = database.prepare("INSERT INTO study_plan (student_id, day, title, detail, status) VALUES (1, ?, ?, ?, ?)");
    studyPlan.forEach((item) => insertPlan.run(item.day, item.title, item.detail, item.status));
  }

  const hasMetrics = database.prepare("SELECT COUNT(*) AS total FROM dashboard_metrics WHERE student_id = 1").get().total;
  if (!hasMetrics) {
    const insertMetric = database.prepare(`
      INSERT INTO dashboard_metrics (student_id, metric_key, label, value, detail, accent)
      VALUES (1, ?, ?, ?, ?, ?)
    `);
    dashboardMetrics.forEach((metric) => {
      insertMetric.run(metric.key, metric.label, metric.value, metric.detail, metric.accent);
    });
  }

  const hasRewards = database.prepare("SELECT COUNT(*) AS total FROM rewards WHERE student_id = 1").get().total;
  if (!hasRewards) {
    const insertReward = database.prepare("INSERT INTO rewards (student_id, title, description, points) VALUES (1, ?, ?, ?)");
    rewards.forEach((reward) => insertReward.run(reward.title, reward.description, reward.points));
  }

  const hasInsights = database.prepare("SELECT COUNT(*) AS total FROM ai_insights WHERE student_id = 1").get().total;
  if (!hasInsights) {
    database
      .prepare("INSERT INTO ai_insights (student_id, title, priority, detail) VALUES (1, ?, ?, ?)")
      .run(aiInsight.title, aiInsight.priority, aiInsight.detail);
  }

  database.prepare("INSERT OR REPLACE INTO exam_blueprint (id, payload) VALUES (1, ?)").run(JSON.stringify(examStructure));
}

function ensureUser(database, user) {
  database
    .prepare("INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(user.id, user.email, null, user.role || "student");
  if (user.role) database.prepare("UPDATE users SET role = ? WHERE id = ?").run(user.role, user.id);

  database
    .prepare("INSERT OR IGNORE INTO student_profiles (user_id, display_name, target_school) VALUES (?, ?, ?)")
    .run(user.id, user.displayName, user.targetSchool);
}

function migrateLegacySchema(database) {
  [
    "exam_logs",
    "progression",
    "subjects",
    "study_plan",
    "rewards",
    "dashboard_metrics",
    "ai_insights"
  ].forEach((tableName) => {
    addColumnIfMissing(database, tableName, "student_id", "INTEGER NOT NULL DEFAULT 1");
  });
}

function addColumnIfMissing(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

module.exports = { ensureDatabase, getDb };
