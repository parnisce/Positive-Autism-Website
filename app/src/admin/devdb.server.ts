/**
 * Local-only stand-in for Cloudflare D1, backed by Node's built-in SQLite. Used by `vite dev`
 * when PA_DEV_DB points at a file. It is never imported by the production build.
 */
import { DatabaseSync } from "node:sqlite";
import type { Db } from "./db.server";

export function devDb(file: string): Db {
  const sqlite = new DatabaseSync(file);
  const make = (sql: string, args: unknown[]) => {
    const st = sqlite.prepare(sql);
    const self = {
      bind: (...a: unknown[]) => make(sql, a),
      all: async () => ({ results: st.all(...(args as never[])) as never[] }),
      run: async () => {
        const r = st.run(...(args as never[]));
        return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
      },
      first: async () => (st.get(...(args as never[])) as never) ?? null,
    };
    return self;
  };
  return {
    prepare: (sql) => make(sql, []),
    batch: async (stmts) => {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}
