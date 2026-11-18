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
    throw new StoreError(res.status, code === "PGRST205" || code === "42P01" ? "no_tables" : text.slice(0, 300) || `http_${res.status}`);
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
  return { tables, secretKey: !!c.secret };
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
export type PostRow = { id: number; slug: string; title: string; excerpt: string; body: string; cover: string; published: number; created_at: string; updated_at: string };
const toRow = (p: Omit<PostRow, "published"> & { published: boolean }): PostRow => ({ ...p, published: p.published ? 1 : 0 });
const POST_COLS = "id,slug,title,excerpt,body,cover,published,created_at,updated_at";

export async function listPostsAdmin(): Promise<PostRow[]> {
  const r = await rest<(Omit<PostRow, "published"> & { published: boolean })[]>(`posts?select=${POST_COLS}&order=created_at.desc&limit=500`, { admin: true });
  return r.map(toRow);
}
export async function listPublished() {
  return rest<{ slug: string; title: string; excerpt: string; cover: string; created_at: string }[]>(
    "posts?select=slug,title,excerpt,cover,created_at&published=eq.true&order=created_at.desc&limit=100",
  );
}
export async function getPublished(slug: string) {
  const r = await rest<{ slug: string; title: string; excerpt: string; cover: string; body: string; created_at: string; updated_at: string }[]>(
    `posts?select=slug,title,excerpt,cover,body,created_at,updated_at&published=eq.true&slug=${eq(slug)}&limit=1`,
  );
  return r[0] ?? null;
}
export async function slugTaken(slug: string, exceptId: number) {
  const r = await rest<{ id: number }[]>(`posts?select=id&slug=${eq(slug)}&id=neq.${exceptId}&limit=1`, { admin: true });
  return r.length > 0;
}
export async function savePost(id: number, f: { slug: string; title: string; excerpt: string; body: string; cover: string; published: boolean }) {
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
