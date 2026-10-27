import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY, task_id TEXT NOT NULL, idem TEXT NOT NULL, fingerprint TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(task_id,idem));
      CREATE TABLE IF NOT EXISTS credentials(hash TEXT PRIMARY KEY, task_id TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sandbox_payments(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    `);
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  getTask(id) { const r = this.db.prepare('SELECT data FROM tasks WHERE id=?').get(id); return r && JSON.parse(r.data); }
  tasks() { return this.db.prepare('SELECT data FROM tasks ORDER BY rowid DESC').all().map(r => JSON.parse(r.data)); }
  putTask(task) { this.db.prepare('INSERT INTO tasks VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(task.id, JSON.stringify(task)); }
  getPurchase(id) { const r = this.db.prepare('SELECT data FROM purchases WHERE id=?').get(id); return r && JSON.parse(r.data); }
  findPurchase(task, key) { const r = this.db.prepare('SELECT data FROM purchases WHERE task_id=? AND idem=?').get(task, key); return r && JSON.parse(r.data); }
  purchases(task) { return this.db.prepare('SELECT data FROM purchases WHERE task_id=? ORDER BY rowid DESC').all(task).map(r => JSON.parse(r.data)); }
  putPurchase(p) { this.db.prepare('INSERT INTO purchases VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(p.id,p.taskId,p.idempotencyKey,p.fingerprint,JSON.stringify(p)); }
  event(task, kind, data = {}) { this.db.prepare('INSERT INTO events(task_id,at,kind,data) VALUES(?,?,?,?)').run(task, new Date().toISOString(),kind,JSON.stringify(data)); }
  events(task) { return this.db.prepare('SELECT seq,at,kind,data FROM events WHERE task_id=? ORDER BY seq DESC').all(task).map(r => ({...r,data:JSON.parse(r.data)})); }
  addCredential(hash, task) { this.db.prepare('INSERT INTO credentials(hash,task_id) VALUES(?,?)').run(hash,task); }
  credential(hash) { return this.db.prepare('SELECT task_id,revoked FROM credentials WHERE hash=?').get(hash); }
  revoke(task) { this.db.prepare('UPDATE credentials SET revoked=1 WHERE task_id=?').run(task); }
  payment(id) { const r=this.db.prepare('SELECT data FROM sandbox_payments WHERE id=?').get(id); return r && JSON.parse(r.data); }
  putPayment(id, data) { this.db.prepare('INSERT INTO sandbox_payments VALUES(?,?) ON CONFLICT(id) DO NOTHING').run(id,JSON.stringify(data)); }
  close() { this.db.close(); }
}
