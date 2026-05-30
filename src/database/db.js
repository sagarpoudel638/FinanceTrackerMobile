import * as SQLite from 'expo-sqlite';

let db;

export const AI_DAILY_LIMIT = 5;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('finance_tracker.db');

    // Create tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT NOT NULL,
        income     REAL DEFAULT 0,
        expenses   REAL DEFAULT 0,
        date       TEXT,
        remarks    TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ai_usage (
        date  TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      );
    `);


    try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN date TEXT`); } catch {}
    try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN remarks TEXT DEFAULT ''`); } catch {}


    await db.execAsync(`
      UPDATE transactions SET date = substr(created_at, 1, 10) WHERE date IS NULL OR date = ''
    `);
  }
  return db;
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const getAllTransactions = async () => {
  const db = await getDB();
  return await db.getAllAsync('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
};

export const addTransaction = async (title, income, expenses, date, remarks = '') => {
  const db = await getDB();
  return await db.runAsync(
    'INSERT INTO transactions (title, income, expenses, date, remarks) VALUES (?, ?, ?, ?, ?)',
    [title, parseFloat(income) || 0, parseFloat(expenses) || 0, date, remarks]
  );
};

export const updateTransaction = async (id, title, income, expenses, date, remarks = '') => {
  const db = await getDB();
  return await db.runAsync(
    'UPDATE transactions SET title = ?, income = ?, expenses = ?, date = ?, remarks = ? WHERE id = ?',
    [title, parseFloat(income) || 0, parseFloat(expenses) || 0, date, remarks, id]
  );
};

export const deleteTransaction = async (id) => {
  const db = await getDB();
  return await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};

// ─── AI usage tracking ────────────────────────────────────────────────────────

const today = () => new Date().toISOString().substring(0, 10);

export const getAIUsageToday = async () => {
  const db  = await getDB();
  const row = await db.getFirstAsync('SELECT count FROM ai_usage WHERE date = ?', [today()]);
  return row?.count || 0;
};

export const incrementAIUsage = async () => {
  const db = await getDB();
  await db.runAsync(`
    INSERT INTO ai_usage (date, count) VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET count = count + 1
  `, [today()]);
};
