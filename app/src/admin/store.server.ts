/**
 * Server-only: all database access (Supabase, over its REST API).
 *
 * - The project URL and the publishable key are public by design and are the defaults below.
 *   They can only read public data (see schema-sql.ts) and bump the visit counters.
 * - Everything the admin does (drafts, edits, uploads, analytics) uses the SECRET key, set as the
 *   Cloudflare secret SUPABASE_SECRET_KEY. It never reaches the browser.
 */
import type { ContentOverrides } from "./site-data";
import type { ProductEdit } from "../shop/catalog";
import { envVar } from "./db.server";

const DEFAULT_URL = "https://dvaenpxerqxfddzbpgvp.supabase.co";
const DEFAULT_PUBLISHABLE = "sb_publishable_P9VnNu59UxldSQskedpD-g_14srg_w7";

async function config() {
  const url = ((await envVar("SUPABASE_URL")) || DEFAULT_URL).replace(/\/+$/, "");
  const publishable = (await envVar("SUPABASE_PUBLISHABLE_KEY")) || DEFAULT_PUBLISHABLE;
  const secret = await envVar("SUPABASE_SECRET_KEY");
  return { url, publishable, secret };
}

export class StoreError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Opts = { method?: string; body?: unknown; prefer?: string; admin?: boolean; range?: [number, number] };

async function rest<T = unknown>(path: string, o: Opts = {}): Promise<T> {
  const c = await config();
  const key = o.admin ? c.secret : c.publishable;
  if (!key) throw new StoreError(503, "no_secret_key");
  const headers: Record<string, string> = { apikey: key, "content-type": "application/json" };
  // legacy service_role keys are JWTs and also go in Authorization; the new sb_ keys only use apikey
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  if (o.prefer) headers.prefer = o.prefer;
  if (o.range) headers.range = `${o.range[0]}-${o.range[1]}`;
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    method: o.method || "GET",
    headers,
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const text = await res.text();
  if (!res.ok) {
    const code = (() => {
      try {
        return (JSON.parse(text) as { code?: string }).code;
      } catch {
        return undefined;
      }
    })();
    if (code === "42501" && o.admin) throw new StoreError(res.status, "wrong_key: Supabase refused the write, so the key saved as SUPABASE_SECRET_KEY is not the secret key. In Supabase open Project Settings > API Keys, copy the secret key (it starts with sb_secret_), put it in the Cloudflare secret SUPABASE_SECRET_KEY and redeploy.");
    throw new StoreError(res.status, code === "PGRST205" || code === "42P01" ? "no_tables" : code === "PGRST204" || code === "42703" ? "schema" : text.slice(0, 300) || `http_${res.status}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

const eq = (v: string | number) => `eq.${encodeURIComponent(String(v))}`;

/** What the admin page needs to know about the connection. */
export async function health() {
  const c = await config();
  let tables = false;
  try {
    await rest("settings?select=key&limit=1");
    tables = true;
  } catch {
    /* tables missing or project unreachable */
  }
  // the blog categories need one extra column; this says whether the update script has been run
  let schema = false;
  if (tables) {
    try {
      await rest("posts?select=cats&limit=1");
      schema = true;
    } catch {
      /* update script not run yet */
    }
  }
  // a key that is really the public one can read but never write, so say so instead of failing later
  const role = (() => {
    const k = c.secret || "";
    if (k.startsWith("sb_secret_")) return "secret";
    if (k.startsWith("sb_publishable_")) return "publishable";
    try {
      const p = JSON.parse(atob(k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      return p.role === "service_role" ? "secret" : p.role === "anon" ? "publishable" : "unknown";
    } catch {
      return c.secret ? "unknown" : "none";
    }
  })();
  return { tables, schema, secretKey: !!c.secret && role !== "publishable", keyProblem: role === "publishable" };
}

// ---- settings (page text) ----
export async function getContent(): Promise<ContentOverrides | null> {
  const r = await rest<{ value: ContentOverrides }[]>("settings?select=value&key=eq.content&limit=1");
  return r[0]?.value ?? null;
}
export async function setContent(value: ContentOverrides) {
  await rest("settings?on_conflict=key", { method: "POST", admin: true, prefer: "resolution=merge-duplicates", body: { key: "content", value } });
}

// ---- products ----
export async function listProductEdits(): Promise<ProductEdit[]> {
  const r = await rest<{ data: ProductEdit }[]>("products?select=data&limit=2000");
  return r.map((x) => x.data);
}
export async function maxCustomId(): Promise<number> {
  const r = await rest<{ id: number }[]>("products?select=id&id=gte.900000&order=id.desc&limit=1", { admin: true });
  return r[0]?.id ?? 900000;
}
export async function saveProduct(edit: ProductEdit) {
  await rest("products?on_conflict=id", {
    method: "POST",
    admin: true,
    prefer: "resolution=merge-duplicates",
    body: { id: edit.id, data: edit, updated_at: new Date().toISOString() },
  });
}
export async function deleteProduct(id: number) {
  await rest(`products?id=${eq(id)}`, { method: "DELETE", admin: true });
}

// ---- blog ----
export type PostRow = { id: number; slug: string; title: string; excerpt: string; body: string; cover: string; published: number; created_at: string; updated_at: string; cats: string[] };
const toRow = (p: Omit<PostRow, "published"> & { published: boolean }): PostRow => ({ ...p, cats: p.cats ?? [], published: p.published ? 1 : 0 });
const POST_COLS = "id,slug,title,excerpt,body,cover,published,created_at,updated_at,cats";
export type PostCardRow = { slug: string; title: string; excerpt: string; cover: string; created_at: string; cats: string[] };

export async function listPostsAdmin(): Promise<PostRow[]> {
  const r = await rest<(Omit<PostRow, "published"> & { published: boolean })[]>(`posts?select=${POST_COLS}&order=created_at.desc&limit=1000`, { admin: true });
  return r.map(toRow);
}
export async function listPublished(): Promise<PostCardRow[]> {
  const r = await rest<PostCardRow[]>("posts?select=slug,title,excerpt,cover,created_at,cats&published=eq.true&order=created_at.desc&limit=1000");
  return r.map((p) => ({ ...p, cats: p.cats ?? [] }));
}
export async function getPublished(slug: string) {
  const r = await rest<(PostCardRow & { body: string; updated_at: string })[]>(
    `posts?select=slug,title,excerpt,cover,body,created_at,updated_at,cats&published=eq.true&slug=${eq(slug)}&limit=1`,
  );
  return r[0] ? { ...r[0], cats: r[0].cats ?? [] } : null;
}
export async function slugTaken(slug: string, exceptId: number) {
  const r = await rest<{ id: number }[]>(`posts?select=id&slug=${eq(slug)}&id=neq.${exceptId}&limit=1`, { admin: true });
  return r.length > 0;
}
export type PostInput = { slug: string; title: string; excerpt: string; body: string; cover: string; published: boolean; cats: string[] };
export async function savePost(id: number, f: PostInput) {
  const now = new Date().toISOString();
  if (id) {
    await rest(`posts?id=${eq(id)}`, { method: "PATCH", admin: true, body: { ...f, updated_at: now } });
    return id;
  }
  const r = await rest<{ id: number }[]>("posts", { method: "POST", admin: true, prefer: "return=representation", body: { ...f, created_at: now, updated_at: now } });
  return r[0].id;
}
export async function deletePost(id: number) {
  await rest(`posts?id=${eq(id)}`, { method: "DELETE", admin: true });
}
/** Inserts many posts, skipping slugs that already exist. A bad row never stops the others; failures are reported at the end. */
export async function bulkInsertPosts(rows: (PostInput & { created_at: string })[]) {
  const failed: string[] = [];
  const send = (list: typeof rows) =>
    rest("posts?on_conflict=slug", {
      method: "POST",
      admin: true,
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: list.map((r) => ({ ...r, updated_at: r.created_at })),
    });
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10);
    try {
      await send(chunk);
    } catch {
      for (const r of chunk) {
        try {
          await send([r]);
        } catch (e) {
          failed.push(`${r.slug}: ${e instanceof Error ? e.message.slice(0, 160) : "error"}`);
        }
      }
    }
  }
  if (failed.length) throw new Error(`${failed.length} of ${rows.length} posts could not be saved. First: ${failed[0]}`);
}
/** Posts (any status) that carry a category, so it can be removed from them when the category is deleted. */
export async function postsWithCategory(slug: string): Promise<{ id: number; cats: string[] }[]> {
  return rest(`posts?select=id,cats&cats=cs.%7B${encodeURIComponent(slug)}%7D&limit=1000`, { admin: true });
}
export async function setPostCats(id: number, cats: string[]) {
  await rest(`posts?id=${eq(id)}`, { method: "PATCH", admin: true, body: { cats } });
}

// ---- blog categories (kept in settings as one list) ----
export type Category = { slug: string; name: string; parent: string; description: string };
export async function getCategories(): Promise<Category[]> {
  const r = await rest<{ value: Category[] }[]>("settings?select=value&key=eq.categories&limit=1");
  return Array.isArray(r[0]?.value) ? r[0].value : [];
}
export async function setCategories(value: Category[]) {
  await rest("settings?on_conflict=key", { method: "POST", admin: true, prefer: "resolution=merge-duplicates", body: { key: "categories", value } });
}
/** True once the starter articles have been copied into the database (they then stop being shown separately). */
export async function getSeedImported(): Promise<boolean> {
  const r = await rest<{ value: boolean }[]>("settings?select=value&key=eq.seed_imported&limit=1");
  return r[0]?.value === true;
}
export async function setSeedImported(v: boolean) {
  await rest("settings?on_conflict=key", { method: "POST", admin: true, prefer: "resolution=merge-duplicates", body: { key: "seed_imported", value: v } });
}

// ---- images ----
export async function putImage(id: string, mime: string, data: string) {
  await rest("images", { method: "POST", admin: true, body: { id, mime, data } });
}
export async function getImage(id: string) {
  const r = await rest<{ mime: string; data: string }[]>(`images?select=mime,data&id=${eq(id)}&limit=1`);
  return r[0] ?? null;
}

// ---- analytics ----
export type Bump = { day: string; kind: string; key: string };
export async function bump(rows: Bump[]) {
  if (rows.length) await rest("rpc/bump_stats", { method: "POST", body: { rows } });
}
export async function fetchStats(from: string) {
  const out: { day: string; kind: string; key: string; n: number }[] = [];
  for (let page = 0; page < 30; page++) {
    const r = await rest<typeof out>(
      `stats?select=day,kind,key,n&day=gte.${from}&kind=in.(page,visit,cart,buy,ref,country,device,action,utm)&order=day.asc,kind.asc,key.asc`,
      { admin: true, range: [page * 1000, page * 1000 + 999] },
    );
    out.push(...r);
    if (r.length < 1000) break;
  }
  return out;
}

// ---- orders the owner hid (test or fake orders) ----
export async function getHiddenOrders(): Promise<string[]> {
  const r = await rest<{ value: string[] }[]>("settings?select=value&key=eq.hidden_orders&limit=1", { admin: true });
  return Array.isArray(r[0]?.value) ? r[0].value : [];
}
export async function setHiddenOrders(ids: string[]) {
  await rest("settings?on_conflict=key", { method: "POST", admin: true, prefer: "resolution=merge-duplicates", body: { key: "hidden_orders", value: ids.slice(-1000) } });
}
