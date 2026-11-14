/** Server-only: the D1 database (binding "DB") used by the admin page, blog, analytics and edits. */

export type Stmt = {
  bind: (...args: unknown[]) => Stmt;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<{ meta?: { last_row_id?: number; changes?: number } }>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
};
export type Db = { prepare: (sql: string) => Stmt; batch: (s: Stmt[]) => Promise<unknown[]> };

const g = globalThis as unknown as { __paEnv?: Record<string, unknown>; process?: { env?: Record<string, string | undefined> } };

/** Reads a variable or secret from the request env, the Workers env module or process.env. */
export async function envVar(name: string): Promise<string | undefined> {
  const pick = (o: unknown) => {
    const v = o && typeof o === "object" ? (o as Record<string, unknown>)[name] : undefined;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const v = pick(g.__paEnv);
  if (v) return v;
  try {
    const { bindings } = await import("../lib/bindings.server");
    const w = pick(bindings());
    if (w) return w;
  } catch {
    /* not inside Workers (local dev) */
  }
  return pick(g.process?.env);
}

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', cover TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS stats (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, key))",
];
const ready = new WeakSet<object>();
let devInstance: Db | undefined;

/** The database, with its tables created on first use. Null when no database is attached yet. */
export async function getDb(): Promise<Db | null> {
  let db = (g.__paEnv?.DB as Db | undefined) ?? null;
  if (!db) {
    try {
      const { bindings } = await import("../lib/bindings.server");
      db = (bindings().DB as unknown as Db | undefined) ?? null;
    } catch {
      /* not inside Workers */
    }
  }
  if (!db && g.process?.env?.PA_DEV_DB) {
    const path = "./devdb.server";
    devInstance ??= ((await import(/* @vite-ignore */ path)) as { devDb: (f: string) => Db }).devDb(g.process.env.PA_DEV_DB);
    db = devInstance;
  }
  if (!db) return null;
  if (!ready.has(db)) {
    await db.batch(SCHEMA.map((s) => db!.prepare(s)));
    ready.add(db);
  }
  return db;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
