/**
 * Server-only: the shop's orders, read live from Stripe (Checkout Sessions). Nothing is copied into the
 * database, so Stripe stays the single source of truth for who paid and what was refunded.
 */
import { envVar } from "./db.server";
import type { Order, OrderStatus } from "./orders-types";

type Sess = {
  id: string;
  created: number;
  status?: string;
  payment_status?: string;
  amount_total?: number;
  amount_subtotal?: number;
  currency?: string;
  livemode?: boolean;
  metadata?: { ids?: string };
  total_details?: { amount_discount?: number };
  customer_details?: { email?: string | null; name?: string | null; address?: { country?: string | null } | null } | null;
  line_items?: { data?: { description?: string; amount_total?: number }[] };
  payment_intent?: { id?: string; latest_charge?: { amount_refunded?: number; refunded?: boolean } | null } | string | null;
};

let cache: { at: number; key: string; data: { orders: Order[]; livemode: boolean } } | null = null;

export class OrdersError extends Error {
  constructor(public code: "no_key" | "stripe", message?: string) {
    super(message || code);
  }
}

function toOrder(s: Sess): Order {
  const ids = (s.metadata?.ids || "").split(",").map((n) => Number(n));
  const li = s.line_items?.data ?? [];
  const pi = typeof s.payment_intent === "object" && s.payment_intent ? s.payment_intent : null;
  const charge = pi?.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  const total = s.amount_total ?? 0;
  const refunded = charge?.amount_refunded ?? 0;
  const paid = s.payment_status === "paid" || s.payment_status === "no_payment_required";
  let status: OrderStatus = "pending";
  if (s.status === "expired") status = "expired";
  else if (paid) status = refunded >= total && total > 0 ? "refunded" : refunded > 0 ? "partial" : "paid";
  return {
    id: s.id,
    created: s.created * 1000,
    status,
    email: s.customer_details?.email ?? "",
    name: s.customer_details?.name ?? "",
    country: s.customer_details?.address?.country ?? "",
    total,
    discount: s.total_details?.amount_discount ?? 0,
    refunded,
    currency: (s.currency || "cad").toUpperCase(),
    items: li.map((l, i) => ({ id: Number.isFinite(ids[i]) ? ids[i] : null, title: l.description || "Ebook", amount: l.amount_total ?? 0 })),
    pi: pi?.id ?? null,
    live: !!s.livemode,
  };
}

export async function fetchOrders(force = false): Promise<{ orders: Order[]; livemode: boolean }> {
  const key = await envVar("STRIPE_SECRET_KEY");
  if (!key) throw new OrdersError("no_key");
  if (!force && cache && cache.key === key && Date.now() - cache.at < 20000) return cache.data;
  const base = (await envVar("STRIPE_API_BASE")) || "https://api.stripe.com";
  const orders: Order[] = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const p = new URLSearchParams({ limit: "100" });
    p.append("expand[]", "data.line_items");
    p.append("expand[]", "data.payment_intent.latest_charge");
    if (after) p.set("starting_after", after);
    const res = await fetch(`${base}/v1/checkout/sessions?${p}`, { headers: { authorization: `Bearer ${key}` } });
    const j = (await res.json().catch(() => ({}))) as { data?: Sess[]; has_more?: boolean; error?: { message?: string } };
    if (!res.ok || !j.data) throw new OrdersError("stripe", j.error?.message || `Stripe error ${res.status}`);
    orders.push(...j.data.map(toOrder));
    if (!j.has_more || !j.data.length) break;
    after = j.data[j.data.length - 1].id;
  }
  const data = { orders, livemode: key.startsWith("sk_live_") };
  cache = { at: Date.now(), key, data };
  return data;
}
