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
    try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN category TEXT DEFAULT 'other'`); } catch {}


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

export const addTransaction = async (title, income, expenses, date, remarks = '', category = 'other') => {
  const db = await getDB();
  return await db.runAsync(
    'INSERT INTO transactions (title, income, expenses, date, remarks, category) VALUES (?, ?, ?, ?, ?, ?)',
    [title, parseFloat(income) || 0, parseFloat(expenses) || 0, date, remarks, category]
  );
};

export const updateTransaction = async (id, title, income, expenses, date, remarks = '', category = 'other') => {
  const db = await getDB();
  return await db.runAsync(
    'UPDATE transactions SET title = ?, income = ?, expenses = ?, date = ?, remarks = ?, category = ? WHERE id = ?',
    [title, parseFloat(income) || 0, parseFloat(expenses) || 0, date, remarks, category, id]
  );
};

export const deleteTransaction = async (id) => {
  const db = await getDB();
  return await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};

// ─── Export / Import ─────────────────────────────────────────────────────────

// Returns all transactions as a clean array (no internal SQLite rowid noise)
export const exportTransactions = async () => {
  const db   = await getDB();
  const rows = await db.getAllAsync('SELECT title, income, expenses, date, remarks, created_at FROM transactions ORDER BY date DESC');
  return rows;
};

// Replace: wipe all existing data then insert imported rows
export const replaceAllTransactions = async (rows) => {
  const db = await getDB();
  await db.runAsync('DELETE FROM transactions');
  for (const t of rows) {
    await db.runAsync(
      'INSERT INTO transactions (title, income, expenses, date, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [t.title, parseFloat(t.income) || 0, parseFloat(t.expenses) || 0, t.date || '', t.remarks || '', t.created_at || new Date().toISOString()]
    );
  }
};

// Merge: keep existing data and append imported rows
export const mergeTransactions = async (rows) => {
  const db = await getDB();
  for (const t of rows) {
    await db.runAsync(
      'INSERT INTO transactions (title, income, expenses, date, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [t.title, parseFloat(t.income) || 0, parseFloat(t.expenses) || 0, t.date || '', t.remarks || '', t.created_at || new Date().toISOString()]
    );
  }
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
