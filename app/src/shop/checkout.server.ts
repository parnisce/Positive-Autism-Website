/**
 * Server-only Stripe Checkout helpers.
 *
 * The Stripe secret key is read from the environment (STRIPE_SECRET_KEY, set in the Cloudflare
 * project settings) and never leaves the server. Prices always come from the catalogue file here,
 * never from the browser, so a visitor cannot change what they pay.
 */
import { CURRENCY, getProduct } from "./catalog";
import { DOWNLOADS } from "./downloads";

const STRIPE = "https://api.stripe.com/v1";
const MAX_ITEMS = 50;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function secretKey(): Promise<string | undefined> {
  try {
    const { bindings } = await import("../lib/bindings.server");
    const v = (bindings() as unknown as Record<string, unknown>)?.STRIPE_SECRET_KEY;
    if (typeof v === "string" && v) return v;
  } catch {
    /* not running inside Workers (local dev): fall back to process.env */
  }
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.STRIPE_SECRET_KEY || undefined;
}

export async function createCheckout(request: Request): Promise<Response> {
  let body: { ids?: unknown; lang?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ code: "bad_request" }, 400);
  }
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = [...new Set(rawIds.filter((n): n is number => Number.isInteger(n)))].slice(0, MAX_ITEMS);
  const items = ids.map((id) => getProduct(id)).filter((p): p is NonNullable<typeof p> => !!p && p.price > 0);
  if (!items.length) return json({ code: "no_items" }, 400);

  const key = await secretKey();
  if (!key) return json({ code: "not_configured" }, 503);

  const origin = new URL(request.url).origin;
  const lang = body.lang === "es" ? "es" : "en";
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("locale", lang);
  p.set("success_url", `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`);
  p.set("cancel_url", `${origin}/shop?checkout=cancelled`);
  p.set("allow_promotion_codes", "true");
  p.set("billing_address_collection", "auto");
  p.set("metadata[ids]", items.map((i) => i.id).join(","));
  items.forEach((item, i) => {
    const base = `line_items[${i}]`;
    p.set(`${base}[quantity]`, "1");
    p.set(`${base}[price_data][currency]`, CURRENCY.toLowerCase());
    p.set(`${base}[price_data][unit_amount]`, String(item.price));
    p.set(`${base}[price_data][product_data][name]`, item.title.slice(0, 250));
    if (item.subtitle) p.set(`${base}[price_data][product_data][description]`, item.subtitle.slice(0, 500));
    p.set(`${base}[price_data][product_data][metadata][id]`, String(item.id));
    if (origin.startsWith("https://")) p.set(`${base}[price_data][product_data][images][0]`, `${origin}${item.img}`);
  });

  const res = await fetch(`${STRIPE}/checkout/sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: p,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    console.error("Stripe checkout session failed", res.status, data.error?.message);
    return json({ code: "stripe_error" }, 502);
  }
  return json({ url: data.url });
}

/** After payment: confirm the session with Stripe and return what was bought (plus download links, if configured). */
export async function checkoutStatus(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(id)) return json({ code: "bad_request" }, 400);
  const key = await secretKey();
  if (!key) return json({ code: "not_configured" }, 503);

  const res = await fetch(`${STRIPE}/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${key}` } });
  const s = (await res.json().catch(() => ({}))) as {
    payment_status?: string;
    customer_details?: { email?: string | null };
    metadata?: { ids?: string };
  };
  if (!res.ok) return json({ code: "not_found" }, 404);

  const paid = s.payment_status === "paid";
  const products = (s.metadata?.ids || "")
    .split(",")
    .map((n) => getProduct(Number(n)))
    .filter((p): p is NonNullable<typeof p> => !!p);
  return json({
    paid,
    email: s.customer_details?.email ?? null,
    items: products.map((p) => ({ id: p.id, title: p.title, img: p.img, download: paid ? DOWNLOADS[p.id] ?? null : null })),
  });
}
