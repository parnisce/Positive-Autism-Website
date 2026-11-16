/** Server-only: page-view and event counters (one row per day, kind and key). */
import { today } from "./db.server";
import * as store from "./store.server";
import { syncSite } from "./data.server";
import { productFromSlug } from "../shop/catalog";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|node-fetch/i;
const STATIC = new Set(["/", "/shop", "/blog", "/shop/success", "/privacy-policy", "/terms-and-conditions", "/user-data-management"]);

type Hit = { p?: unknown; e?: unknown; id?: unknown; u?: unknown; r?: unknown };

const up = (day: string, kind: string, key: string) => ({ day, kind, key });

export async function recordHit(request: Request): Promise<void> {
  if (BOT.test(request.headers.get("user-agent") || "")) return;
  let b: Hit;
  try {
    b = (await request.json()) as Hit;
  } catch {
    return;
  }
  await syncSite();
  const day = today();
  const stmts: store.Bump[] = [];

  if (b.e === "cart" && Number.isInteger(b.id)) {
    stmts.push(up(day, "cart", String(b.id)));
  } else if (typeof b.p === "string") {
    const path = b.p.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
    let ok = STATIC.has(path) || /^\/blog\/[a-z0-9-]{1,100}$/.test(path);
    const m = path.match(/^\/shop\/ebook\/(.+)$/);
    if (m) ok = !!productFromSlug(m[1]);
    if (!ok) return;
    stmts.push(up(day, "page", path));
    if (b.u === 1) {
      stmts.push(up(day, "visit", ""));
      const cc = request.headers.get("cf-ipcountry");
      if (cc && /^[A-Z]{2}$/.test(cc)) stmts.push(up(day, "country", cc));
      if (typeof b.r === "string" && /^[a-z0-9.-]{3,80}$/i.test(b.r)) stmts.push(up(day, "ref", b.r.toLowerCase()));
    }
  }
  if (stmts.length) await store.bump(stmts).catch((e) => console.error("track", e));
}

/** Counts an ebook as "checkout started" (called when a Stripe session is created). */
export async function recordCheckout(ids: number[]): Promise<void> {
  try {
    if (!ids.length) return;
    const day = today();
    await store.bump(ids.map((id) => up(day, "buy", String(id))));
  } catch (e) {
    console.error("record checkout", e);
  }
}
