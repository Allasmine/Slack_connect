import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "slackconnect.db");
const db = new sqlite3.Database(dbPath);

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    slack_user_id TEXT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    team_id TEXT,
    bot_user_id TEXT
  )
`);

// Create scheduled_messages table
db.run(`
  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    text TEXT NOT NULL,
    send_at INTEGER NOT NULL, -- timestamp in seconds
    sent INTEGER DEFAULT 0,
    user_id TEXT, -- links to slack_user_id in users table
    FOREIGN KEY(user_id) REFERENCES users(slack_user_id)
  )
`);

export default db;
