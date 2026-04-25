const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'shareblock.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    // Enable foreign keys
    db.run(`PRAGMA foreign_keys = ON;`);
    
    // Create tables
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS group_members (
          group_id TEXT,
          address TEXT,
          PRIMARY KEY (group_id, address),
          FOREIGN KEY (group_id) REFERENCES groups (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          group_id TEXT,
          payer TEXT,
          amount REAL,
          hash TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS expense_participants (
          expense_id TEXT,
          address TEXT,
          share REAL,
          PRIMARY KEY (expense_id, address),
          FOREIGN KEY (expense_id) REFERENCES expenses (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS settlements (
          id TEXT PRIMARY KEY,
          group_id TEXT,
          from_address TEXT,
          to_address TEXT,
          amount REAL,
          tx_hash TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id TEXT,
          sender TEXT,
          message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups (id)
        )
      `);
    });
  }
});

// Wrap DB operations in Promises for async/await usage
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet
};
