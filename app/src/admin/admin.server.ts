/**
 * Server-only handler behind /api/admin. Login uses the ADMIN_PASSWORD secret (set in the Cloudflare
 * project settings); the session is a signed, HttpOnly cookie. Every action except login needs it.
 */
import { CATEGORIES, ORIGINAL, slugify, type ProductEdit } from "../shop/catalog";
import { bustSiteData, loadSiteData } from "./data.server";
import { envVar, getDb, nowIso, today, type Db } from "./db.server";
import { flattenCopy, type ContentOverrides } from "./site-data";

const COOKIE = "pa_admin";
const WEEK = 7 * 24 * 3600;
const enc = new TextEncoder();

const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`pa-admin|${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function sameText(a: string, b: string) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const A = new Uint8Array(x);
  const B = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i];
  return d === 0;
}
const cookieOf = (req: Request, name: string) =>
  (req.headers.get("cookie") || "")
    .split(/;\s*/)
    .map((c) => c.split("="))
    .find((c) => c[0] === name)?.[1];

async function signedIn(req: Request, password: string) {
  const v = cookieOf(req, COOKIE);
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return sameText(sig, await hmac(password, exp));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const urlOk = (v: string) => v === "" || v.startsWith("/") || /^https:\/\//i.test(v);

export async function handleAdmin(request: Request): Promise<Response> {
  const password = await envVar("ADMIN_PASSWORD");
  const db = await getDb();
  const stripeKey = await envVar("STRIPE_SECRET_KEY");
  const secure = new URL(request.url).protocol === "https:";

  if (request.method === "GET") {
    return json({
      auth: !!password && (await signedIn(request, password)),
      setup: { password: !!password, db: !!db, stripe: stripeKey ? (stripeKey.startsWith("sk_live_") ? "live" : "test") : null },
    });
  }

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "forbidden" }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const action = str(body.action, 40);

  if (action === "login") {
    if (!password) return json({ error: "no_password" }, 503);
    const ok = await sameText(str(body.password, 200), password);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 900));
      return json({ error: "wrong_password" }, 401);
    }
    const exp = String(Math.floor(Date.now() / 1000) + WEEK);
    const c = `${COOKIE}=${exp}.${await hmac(password, exp)}; Path=/; Max-Age=${WEEK}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
    return json({ ok: true }, 200, { "set-cookie": c });
  }
  if (action === "logout") return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict` });

  if (!password || !(await signedIn(request, password))) return json({ error: "auth" }, 401);
  if (!db) return json({ error: "no_db" }, 503);

  try {
    return await run(action, body, db);
  } catch (e) {
    console.error("admin", action, e);
    return json({ error: "server", message: e instanceof Error ? e.message : "error" }, 500);
  }
}

async function run(action: string, body: Record<string, unknown>, db: Db): Promise<Response> {
  switch (action) {
    case "stats":
      return json(await stats(db, Math.min(90, Math.max(1, Number(body.days) || 30))));

    case "content.get": {
      const c = await db.prepare("SELECT value FROM settings WHERE key = 'content'").first<{ value: string }>();
      return json({ content: c ? (JSON.parse(c.value) as ContentOverrides) : { en: {}, es: {} } });
    }
    case "content.save": {
      const changes = Array.isArray(body.changes) ? (body.changes as { lang?: string; path?: string; value?: unknown }[]) : [];
      const c = await db.prepare("SELECT value FROM settings WHERE key = 'content'").first<{ value: string }>();
      const cur: ContentOverrides = c ? JSON.parse(c.value) : { en: {}, es: {} };
      const valid = { en: new Set(flattenCopy("en").map((f) => f.path)), es: new Set(flattenCopy("es").map((f) => f.path)) };
      for (const ch of changes) {
        if ((ch.lang !== "en" && ch.lang !== "es") || typeof ch.path !== "string" || !valid[ch.lang].has(ch.path)) continue;
        cur[ch.lang] ??= {};
        if (typeof ch.value === "string") cur[ch.lang][ch.path] = ch.value.slice(0, 4000);
        else delete cur[ch.lang][ch.path];
      }
      await db
        .prepare("INSERT INTO settings (key, value) VALUES ('content', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(JSON.stringify(cur))
        .run();
      bustSiteData();
      return json({ ok: true, content: cur });
    }

    case "posts.list": {
      const r = await db
        .prepare("SELECT id, slug, title, excerpt, body, cover, published, created_at, updated_at FROM posts ORDER BY created_at DESC")
        .all();
      return json({ posts: r.results });
    }
    case "posts.save": {
      const title = str(body.title, 200);
      if (!title) return json({ error: "title_required" }, 400);
      const cover = str(body.cover, 400);
      if (!urlOk(cover)) return json({ error: "bad_cover" }, 400);
      const id = Number(body.id) || 0;
      let slug = slugify(str(body.slug, 100) || title);
      const taken = async (s: string) => !!(await db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").bind(s, id).first());
      let n = 2;
      const base = slug;
      while (await taken(slug)) slug = `${base}-${n++}`;
      const f = [title, str(body.excerpt, 500), str(body.body, 60000), cover, body.published ? 1 : 0];
      const now = nowIso();
      if (id) {
        await db
          .prepare("UPDATE posts SET slug=?, title=?, excerpt=?, body=?, cover=?, published=?, updated_at=? WHERE id=?")
          .bind(slug, ...f, now, id)
          .run();
        return json({ ok: true, id, slug });
      }
      const r = await db
        .prepare("INSERT INTO posts (slug, title, excerpt, body, cover, published, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)")
        .bind(slug, ...f, now, now)
        .run();
      return json({ ok: true, id: r.meta?.last_row_id, slug });
    }
    case "posts.delete":
      await db.prepare("DELETE FROM posts WHERE id = ?").bind(Number(body.id) || 0).run();
      return json({ ok: true });

    case "products.list": {
      const d = await loadSiteData();
      return json({ edits: d.products });
    }
    case "products.save": {
      const e = (body.edit ?? {}) as Record<string, unknown>;
      let id = Number(e.id) || 0;
      const custom = !!e.custom;
      if (custom && !id) {
        const m = await db.prepare("SELECT MAX(id) AS m FROM products WHERE id >= 900000").first<{ m: number | null }>();
        id = Math.max(900000, m?.m ?? 900000) + 1;
      }
      if (!custom && !ORIGINAL.some((p) => p.id === id)) return json({ error: "unknown_product" }, 400);
      if (custom && id < 900000) return json({ error: "bad_id" }, 400);
      const img = str(e.img, 400);
      const file = str(e.file, 600);
      if (!urlOk(img) || !(file === "" || /^https:\/\//i.test(file))) return json({ error: "bad_url" }, 400);
      const slugs = new Set(CATEGORIES.map((c) => c.slug));
      const list = (v: unknown, n: number, m: number) => (Array.isArray(v) ? v.map((x) => str(x, m)).filter(Boolean).slice(0, n) : []);
      const title = str(e.title, 200);
      if (custom && !title) return json({ error: "title_required" }, 400);
      const edit: ProductEdit = {
        id,
        ...(custom ? { custom: true, slug: `${slugify(title)}-${id}` } : {}),
        title,
        subtitle: str(e.subtitle, 300),
        desc: str(e.desc, 2000),
        price: Math.min(1_000_000, Math.max(0, Math.round(Number(e.price) || 0))),
        cats: list(e.cats, 6, 80).filter((c) => slugs.has(c)),
        img,
        hidden: !!e.hidden,
        paras: list(e.paras, 40, 4000),
        tags: list(e.tags, 30, 60),
        file,
      };
      await db
        .prepare("INSERT INTO products (id, data, updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at")
        .bind(id, JSON.stringify(edit), nowIso())
        .run();
      bustSiteData();
      return json({ ok: true, edit });
    }
    case "products.reset":
      await db.prepare("DELETE FROM products WHERE id = ?").bind(Number(body.id) || 0).run();
      bustSiteData();
      return json({ ok: true });

    case "upload": {
      const mime = str(body.mime, 40);
      const data = typeof body.data === "string" ? body.data : "";
      if (!/^image\/(jpeg|png|webp|gif)$/.test(mime) || !/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 1_400_000) return json({ error: "bad_image" }, 400);
      const id = hex(crypto.getRandomValues(new Uint8Array(8)).buffer);
      await db.prepare("INSERT INTO images (id, mime, data, created_at) VALUES (?,?,?,?)").bind(id, mime, data, nowIso()).run();
      return json({ ok: true, url: `/api/img/${id}` });
    }
  }
  return json({ error: "unknown_action" }, 400);
}

async function stats(db: Db, days: number) {
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = (
    await db
      .prepare(
        "SELECT day, kind, key, SUM(n) AS n FROM stats WHERE day >= ? AND kind IN ('page','visit','cart','buy','ref','country') GROUP BY day, kind, key",
      )
      .bind(from)
      .all<{ day: string; kind: string; key: string; n: number }>()
  ).results;

  const daily = new Map<string, { views: number; visitors: number }>();
  for (let i = 0; i < days; i++) daily.set(new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10), { views: 0, visitors: 0 });
  const pages = new Map<string, number>();
  const prod = new Map<number, { views: number; cart: number; buy: number }>();
  const refs = new Map<string, number>();
  const countries = new Map<string, number>();
  const bump = <K,>(m: Map<K, number>, k: K, n: number) => m.set(k, (m.get(k) ?? 0) + n);
  const p = (id: number) => {
    if (!prod.has(id)) prod.set(id, { views: 0, cart: 0, buy: 0 });
    return prod.get(id)!;
  };
  let views = 0;
  let visitors = 0;
  for (const r of rows) {
    if (r.kind === "page") {
      views += r.n;
      const d = daily.get(r.day);
      if (d) d.views += r.n;
      bump(pages, r.key, r.n);
      const id = Number(r.key.match(/^\/shop\/ebook\/.*-(\d+)$/)?.[1]);
      if (id) p(id).views += r.n;
    } else if (r.kind === "visit") {
      visitors += r.n;
      const d = daily.get(r.day);
      if (d) d.visitors += r.n;
    } else if (r.kind === "cart") p(Number(r.key)).cart += r.n;
    else if (r.kind === "buy") p(Number(r.key)).buy += r.n;
    else if (r.kind === "ref") bump(refs, r.key, r.n);
    else if (r.kind === "country") bump(countries, r.key, r.n);
  }
  const top = <K,>(m: Map<K, number>, n: number) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
  const all = [...prod].map(([id, v]) => ({ id, ...v }));
  const products = [...all].sort((a, b) => b.views + b.cart * 3 - (a.views + a.cart * 3)).slice(0, 25);
  return {
    from,
    totals: {
      views,
      visitors,
      productViews: all.reduce((a, x) => a + x.views, 0),
      cart: all.reduce((a, x) => a + x.cart, 0),
      buy: all.reduce((a, x) => a + x.buy, 0),
    },
    daily: [...daily].map(([day, v]) => ({ day, ...v })),
    pages: top(pages, 15).map(([key, n]) => ({ key, n })),
    products,
    refs: top(refs, 8).map(([key, n]) => ({ key, n })),
    countries: top(countries, 8).map(([key, n]) => ({ key, n })),
    today: today(),
  };
}
