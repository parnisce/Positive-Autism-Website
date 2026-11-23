/**
 * Server-only handler behind /api/admin. Login uses the ADMIN_PASSWORD secret (set in the Cloudflare
 * project settings); the session is a signed, HttpOnly cookie. Every action except login needs it.
 */
import { CATEGORIES, ORIGINAL, slugify, type ProductEdit } from "../shop/catalog";
import { bustSiteData } from "./data.server";
import { envVar, today } from "./db.server";
import * as store from "./store.server";
import { fetchOrders, OrdersError } from "./orders.server";
import { SEED } from "./blog-data.server";
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
const cleanCats = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && /^[a-z0-9-]{1,80}$/.test(x)))].slice(0, 20) : []);
const urlOk = (v: string) => v === "" || v.startsWith("/") || /^https:\/\//i.test(v);

export async function handleAdmin(request: Request): Promise<Response> {
  const password = await envVar("ADMIN_PASSWORD");
  const health = await store.health();
  const stripeKey = await envVar("STRIPE_SECRET_KEY");
  const secure = new URL(request.url).protocol === "https:";

  if (request.method === "GET") {
    return json({
      auth: !!password && (await signedIn(request, password)),
      setup: { password: !!password, db: health.tables, schema: health.schema, lists: health.lists, adminKey: health.secretKey, keyProblem: health.keyProblem, stripe: stripeKey ? (stripeKey.startsWith("sk_live_") ? "live" : "test") : null },
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
  if (!health.tables) return json({ error: "no_db" }, 503);
  if (!health.secretKey) return json({ error: "no_secret_key" }, 503);

  try {
    return await run(action, body);
  } catch (e) {
    console.error("admin", action, e);
    return json({ error: "server", message: e instanceof Error ? e.message : "error" }, 500);
  }
}

async function run(action: string, body: Record<string, unknown>): Promise<Response> {
  switch (action) {
    case "orders": {
      try {
        const r = await fetchOrders(body.force === true);
        const hidden = new Set(await store.getHiddenOrders().catch(() => []));
        return json({ ok: true, livemode: r.livemode, orders: r.orders.map((o) => ({ ...o, hidden: hidden.has(o.id) })) });
      } catch (e) {
        if (e instanceof OrdersError) return json({ ok: false, error: e.code, message: e.message });
        throw e;
      }
    }
    case "orders.hide": {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x): x is string => typeof x === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(x)).slice(0, 500);
      const cur = new Set(await store.getHiddenOrders());
      for (const id of ids) (body.hidden ? cur.add(id) : cur.delete(id));
      await store.setHiddenOrders([...cur]);
      return json({ ok: true });
    }
    case "stats":
      return json(await stats(Math.min(180, Math.max(1, Number(body.days) || 30))));

    case "content.get": {
      const c = await store.getContent();
      return json({ content: { en: c?.en ?? {}, es: c?.es ?? {} } });
    }
    case "content.save": {
      const changes = Array.isArray(body.changes) ? (body.changes as { lang?: string; path?: string; value?: unknown }[]) : [];
      const c = await store.getContent();
      const cur: ContentOverrides = { en: c?.en ?? {}, es: c?.es ?? {} };
      const valid = { en: new Set(flattenCopy("en").map((f) => f.path)), es: new Set(flattenCopy("es").map((f) => f.path)) };
      for (const ch of changes) {
        if ((ch.lang !== "en" && ch.lang !== "es") || typeof ch.path !== "string" || !valid[ch.lang].has(ch.path)) continue;
        if (typeof ch.value === "string") cur[ch.lang][ch.path] = ch.value.slice(0, 4000);
        else delete cur[ch.lang][ch.path];
      }
      await store.setContent(cur);
      bustSiteData();
      return json({ ok: true, content: cur });
    }

    case "posts.list":
      return json({ posts: await store.listPostsAdmin() });
    case "posts.save": {
      const title = str(body.title, 200);
      if (!title) return json({ error: "title_required" }, 400);
      const cover = str(body.cover, 400);
      if (!urlOk(cover)) return json({ error: "bad_cover" }, 400);
      const id = Number(body.id) || 0;
      let slug = slugify(str(body.slug, 100) || title);
      let n = 2;
      const base = slug;
      while (await store.slugTaken(slug, id)) slug = `${base}-${n++}`;
      const saved = await store.savePost(id, {
        slug,
        title,
        excerpt: str(body.excerpt, 500),
        body: str(body.body, 60000),
        cover,
        published: !!body.published,
        cats: cleanCats(body.cats),
      });
      return json({ ok: true, id: saved, slug });
    }
    case "posts.delete":
      await store.deletePost(Number(body.id) || 0);
      return json({ ok: true });

    case "categories.list": {
      const db = await store.getCategories();
      const fromSeed = db.length === 0;
      const cats = fromSeed ? SEED.categories : db;
      const posts = await store.listPostsAdmin().catch(() => []);
      const direct = new Map<string, number>();
      for (const p of posts) for (const c of p.cats) direct.set(c, (direct.get(c) ?? 0) + 1);
      const seedActive = !(await store.getSeedImported().catch(() => false));
      if (seedActive) {
        const have = new Set(posts.map((p) => p.slug));
        for (const p of SEED.posts) if (!have.has(p.slug)) for (const c of p.cats) direct.set(c, (direct.get(c) ?? 0) + 1);
      }
      return json({ categories: cats, counts: Object.fromEntries(direct), fromSeed, seed: { active: seedActive, posts: SEED.posts.length } });
    }
    case "categories.save": {
      const name = str(body.name, 120);
      if (!name) return json({ error: "name_required" }, 400);
      let cats = await store.getCategories();
      if (!cats.length) cats = SEED.categories.map((c) => ({ ...c }));
      const old = str(body.oldSlug, 80);
      const idx = old ? cats.findIndex((c) => c.slug === old) : -1;
      if (old && idx < 0) return json({ error: "unknown_category" }, 400);
      let slug = slugify(str(body.slug, 80) || name);
      if (cats.some((c, i) => c.slug === slug && i !== idx)) return json({ error: "slug_taken" }, 400);
      const parent = str(body.parent, 80);
      if (parent && !cats.some((c) => c.slug === parent)) return json({ error: "bad_parent" }, 400);
      // a category cannot sit under itself or one of its own sub-categories
      const below = (root: string): Set<string> => {
        const out = new Set([root]);
        for (const c of cats) if (c.parent === root) for (const x of below(c.slug)) out.add(x);
        return out;
      };
      if (old && parent && below(old).has(parent)) return json({ error: "bad_parent" }, 400);
      const entry = { slug, name, parent, description: str(body.description, 600) };
      if (idx >= 0) {
        cats[idx] = entry;
        if (slug !== old) {
          for (const c of cats) if (c.parent === old) c.parent = slug;
          for (const p of await store.postsWithCategory(old)) await store.setPostCats(p.id, p.cats.map((x) => (x === old ? slug : x)));
        }
      } else cats.push(entry);
      await store.setCategories(cats);
      return json({ ok: true, categories: cats });
    }
    case "categories.delete": {
      const slug = str(body.slug, 80);
      let cats = await store.getCategories();
      if (!cats.length) cats = SEED.categories.map((c) => ({ ...c }));
      const gone = cats.find((c) => c.slug === slug);
      if (!gone) return json({ error: "unknown_category" }, 400);
      // sub-categories move up one level; posts just lose this category
      cats = cats.filter((c) => c.slug !== slug).map((c) => (c.parent === slug ? { ...c, parent: gone.parent } : c));
      for (const p of await store.postsWithCategory(slug)) await store.setPostCats(p.id, p.cats.filter((x) => x !== slug));
      await store.setCategories(cats);
      return json({ ok: true, categories: cats });
    }
    case "posts.import": {
      // copy the articles that shipped with the site into the database so they can be edited
      let step = "reading categories";
      try {
      let cats = await store.getCategories();
      const have = new Set(cats.map((c) => c.slug));
      cats = [...cats, ...SEED.categories.filter((c) => !have.has(c.slug))];
      step = "saving categories";
      await store.setCategories(cats);
      step = "saving posts";
      await store.bulkInsertPosts(
        SEED.posts.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, cover: p.cover, published: true, cats: p.cats, created_at: p.date })),
      );
      step = "finishing";
      await store.setSeedImported(true);
      return json({ ok: true, imported: SEED.posts.length });
      } catch (e) {
        throw new Error(`${step}: ${e instanceof Error ? e.message : "error"}`);
      }
    }

    case "subscribers.list":
      return json({ subscribers: await store.listSubscribers() });
    case "subscribers.delete":
      await store.deleteSubscriber(Number(body.id) || 0);
      return json({ ok: true });
    case "site.get":
      return json({ site: await store.getSite().catch(() => ({ contactEmail: "" })) });
    case "site.save": {
      const email = str(body.contactEmail, 200);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "bad_email" }, 400);
      await store.setSite({ contactEmail: email });
      bustSiteData();
      return json({ ok: true });
    }

    case "products.list":
      return json({ edits: await store.listProductEdits() });
    case "products.save": {
      const e = (body.edit ?? {}) as Record<string, unknown>;
      let id = Number(e.id) || 0;
      const custom = !!e.custom;
      if (custom && !id) id = (await store.maxCustomId()) + 1;
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
      await store.saveProduct(edit);
      bustSiteData();
      return json({ ok: true, edit });
    }
    case "products.reset":
      await store.deleteProduct(Number(body.id) || 0);
      bustSiteData();
      return json({ ok: true });

    case "upload": {
      const mime = str(body.mime, 40);
      const data = typeof body.data === "string" ? body.data : "";
      if (!/^image\/(jpeg|png|webp|gif)$/.test(mime) || !/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 1_400_000) return json({ error: "bad_image" }, 400);
      const id = hex(crypto.getRandomValues(new Uint8Array(8)).buffer);
      await store.putImage(id, mime, data);
      return json({ ok: true, url: `/api/img/${id}` });
    }
  }
  return json({ error: "unknown_action" }, 400);
}

async function stats(days: number) {
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = await store.fetchStats(from);

  const daily = new Map<string, { views: number; visitors: number }>();
  for (let i = 0; i < days; i++) daily.set(new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10), { views: 0, visitors: 0 });
  const pages = new Map<string, number>();
  const prod = new Map<number, { views: number; cart: number; buy: number }>();
  const refs = new Map<string, number>();
  const countries = new Map<string, number>();
  const devices = new Map<string, number>();
  const actions = new Map<string, number>();
  const utm = new Map<string, number>();
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
    else if (r.kind === "device") bump(devices, r.key, r.n);
    else if (r.kind === "action") bump(actions, r.key, r.n);
    else if (r.kind === "utm") bump(utm, r.key, r.n);
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
    devices: top(devices, 5).map(([key, n]) => ({ key, n })),
    actions: top(actions, 8).map(([key, n]) => ({ key, n })),
    utm: top(utm, 8).map(([key, n]) => ({ key, n })),
    today: today(),
  };
}
