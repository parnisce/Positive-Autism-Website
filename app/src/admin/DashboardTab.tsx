import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATEGORIES, productHref, type ProductEdit } from "../shop/catalog";
import { api, type Setup } from "./api";
import { isSale, type Order } from "./orders-types";
import { mergeProducts } from "./ProductsTab";
import { Card, OrdersNotice, RankList, StatusPill, cash, num, pct, ranked, shortDay, useOrders, useStats, when } from "./ui";

export type DashTab = "orders" | "ebooks" | "reports" | "analytics" | "blog" | "pages" | "categories" | "settings";
const DAY = 86400000;
const RANGES = [
  { d: 1, label: "Today" },
  { d: 7, label: "7 days" },
  { d: 30, label: "30 days" },
  { d: 90, label: "90 days" },
];

const ago = (ms: number) => {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d === 1 ? "" : "s"} ago` : new Date(ms).toLocaleDateString("en", { month: "short", day: "numeric" });
};
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Tiny trend line for a KPI card. */
function Spark({ values, color = "var(--acc)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 34;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - (v / max) * (h - 8)}`);
  return (
    <svg className="ad-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={color} opacity=".12" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Delta({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return <em className="ad-delta">no change</em>;
  if (!before) return <em className="ad-delta up">new</em>;
  const p = Math.round(((now - before) / before) * 100);
  const good = invert ? p <= 0 : p >= 0;
  return (
    <em className={`ad-delta ${p === 0 ? "" : good ? "up" : "down"}`}>
      {p > 0 ? "▲" : p < 0 ? "▼" : "•"} {Math.abs(p)}%
    </em>
  );
}

function Tile({ label, value, now, before, invert, spark, hint }: { label: string; value: string; now: number; before: number; invert?: boolean; spark?: number[]; hint?: string }) {
  return (
    <div className="ad-kpi ad-tile" title={hint}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>
        <Delta now={now} before={before} invert={invert} /> <i>vs previous</i>
      </span>
      {spark && <Spark values={spark} />}
    </div>
  );
}

/** Bars of net sales with a tooltip, plus the visitors line. */
function SalesChart({ days }: { days: { day: string; net: number; orders: number; visitors: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.net));
  const vmax = Math.max(1, ...days.map((d) => d.visitors));
  const h = hover != null ? days[hover] : null;
  return (
    <div className="ad-schart" onMouseLeave={() => setHover(null)}>
      <div className="ad-schart-bars">
        {days.map((d, i) => (
          <div key={d.day} className={`ad-sbar${hover === i ? " on" : ""}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
            <i style={{ height: `${d.net ? Math.max(4, (d.net / max) * 100) : 1}%` }} />
          </div>
        ))}
        <svg className="ad-schart-line" viewBox={`0 0 ${days.length * 10} 100`} preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={days.map((d, i) => `${i * 10 + 5},${100 - (d.visitors / vmax) * 90 - 4}`).join(" ")}
            fill="none"
            stroke="var(--warm)"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        {h && hover != null && (
          <div className="ad-tip" style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
            <b>{shortDay(h.day)}</b>
            <span>{cash(h.net)} sales</span>
            <span>
              {h.orders} order{h.orders === 1 ? "" : "s"}
            </span>
            <span>{h.visitors} visitors</span>
          </div>
        )}
      </div>
      <div className="ad-axis">
        <span>{shortDay(days[0].day)}</span>
        <span className="ad-legend">
          <i className="b" /> Sales <i className="l" /> Visitors
        </span>
        <span>{shortDay(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}

/** The store at a glance: money, traffic, what sells, what needs attention. Refreshes by itself. */
export function DashboardTab({ go, setup }: { go: (t: DashTab) => void; setup: Setup }) {
  const [range, setRange] = useState(30);
  const orders = useOrders();
  const chartDays = range === 1 ? 7 : range;
  const cur = useStats(range);
  const wide = useStats(Math.min(180, chartDays * 2));
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  const [toast, setToast] = useState<Order | null>(null);
  const [now, setNow] = useState(Date.now());
  const [updated, setUpdated] = useState(Date.now());
  const [goal, setGoal] = useState(() => {
    try {
      return Number(localStorage.getItem("pa-goal")) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const rows = useMemo(() => mergeProducts(edits), [edits]);
  const byId = useMemo(() => new Map(rows.map((p) => [p.id, p])), [rows]);

  // refresh by itself every minute, and tell the owner when a new order arrives
  useEffect(() => {
    const t = setInterval(() => {
      orders.reload();
      cur.reload();
      wide.reload();
    }, 60000);
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => (clearInterval(t), clearInterval(tick));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (orders.state !== "ok") return;
    setUpdated(Date.now());
    const ids = new Set(orders.all.map((o) => o.id));
    if (seen.current) {
      const fresh = orders.orders.find((o) => !seen.current!.has(o.id) && isSale(o));
      if (fresh) {
        setToast(fresh);
        setTimeout(() => setToast(null), 9000);
      }
    }
    seen.current = ids;
  }, [orders.all, orders.state, orders.orders]);

  const d = useMemo(() => {
    const t = Date.now();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const from = range === 1 ? start.getTime() : t - range * DAY;
    const span = t - from;
    const inCur = (o: Order) => o.created >= from;
    const inPrev = (o: Order) => o.created >= from - span && o.created < from;
    const all = orders.orders;
    const curO = all.filter(inCur);
    const prevO = all.filter(inPrev);
    const sum = (l: Order[]) => {
      const sales = l.filter(isSale);
      const gross = sales.reduce((a, o) => a + o.total, 0);
      const refunds = sales.reduce((a, o) => a + o.refunded, 0);
      return { sales, net: gross - refunds, gross, n: sales.length, aov: sales.length ? Math.round(gross / sales.length) : 0, unfinished: l.filter((o) => o.status === "expired" || o.status === "pending") };
    };
    const c = sum(curO);
    const p = sum(prevO);
    // per-day series for the chart (net sales and orders), aligned with the stats' daily visitors
    const vis = new Map((wide.s?.daily ?? []).map((x) => [x.day, x.visitors]));
    const series: { day: string; net: number; orders: number; visitors: number }[] = [];
    for (let i = 0; i < chartDays; i++) {
      const key = dayKey(t - (chartDays - 1 - i) * DAY);
      series.push({ day: key, net: 0, orders: 0, visitors: vis.get(key) ?? 0 });
    }
    const idx = new Map(series.map((x, i) => [x.day, i]));
    for (const o of all.filter(isSale)) {
      const i = idx.get(dayKey(o.created));
      if (i != null) {
        series[i].net += o.total - o.refunded;
        series[i].orders++;
      }
    }
    // revenue by topic
    const topic = new Map<string, number>();
    const sold = new Map<number, { units: number; revenue: number }>();
    for (const o of c.sales)
      for (const it of o.items) {
        const cat = (it.id != null && byId.get(it.id)?.cats[0]) || "";
        const name = CATEGORIES.find((x) => x.slug === cat)?.name ?? "Other";
        topic.set(name, (topic.get(name) ?? 0) + it.amount);
        if (it.id != null) {
          const e = sold.get(it.id) ?? { units: 0, revenue: 0 };
          e.units++;
          e.revenue += it.amount;
          sold.set(it.id, e);
        }
      }
    // this calendar month, for the goal
    const m0 = new Date();
    m0.setDate(1);
    m0.setHours(0, 0, 0, 0);
    const month = all.filter((o) => isSale(o) && o.created >= m0.getTime()).reduce((a, o) => a + o.total - o.refunded, 0);
    const dim = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
    const elapsed = Math.max(1, new Date().getDate());
    const customers = new Map<string, number>();
    for (const o of c.sales) if (o.email) customers.set(o.email, (customers.get(o.email) ?? 0) + 1);
    const firstSeen = new Map<string, number>();
    for (const o of all.filter(isSale)) if (o.email) firstSeen.set(o.email, Math.min(firstSeen.get(o.email) ?? Infinity, o.created));
    const newBuyers = [...customers.keys()].filter((e) => (firstSeen.get(e) ?? 0) >= from).length;
    return { c, p, series, topic: [...topic].sort((a, b) => b[1] - a[1]), sold, month, dim, elapsed, buyers: customers.size, newBuyers, pending: all.filter((o) => o.status === "pending").length, refunded: all.filter((o) => o.status === "refunded" || o.status === "partial").length, feed: all.filter((o) => o.status !== "expired").slice(0, 7) };
  }, [orders.orders, range, chartDays, wide.s, byId]);

  const ok = orders.state === "ok";
  const vNow = cur.s?.totals.visitors ?? 0;
  const half = wide.s ? Math.floor(wide.s.daily.length / 2) : 0;
  const vPrev = wide.s && range > 1 ? wide.s.daily.slice(0, half).reduce((a, x) => a + x.visitors, 0) : 0;
  const conv = vNow ? d.c.n / vNow : 0;
  const convPrev = vPrev ? d.p.n / vPrev : 0;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // store health
  const paid = rows.filter((r) => !r.hidden && r.price > 0);
  const noFile = paid.filter((r) => !r.file).length;
  const hidden = rows.filter((r) => r.hidden).length;
  const viewedNoSale = (cur.s?.products ?? []).filter((p) => p.views >= 5 && !d.sold.has(p.id)).slice(0, 3);
  const lostRevenue = d.c.unfinished.reduce((a, o) => a + o.total, 0);
  type Alert = { tone: "bad" | "warn" | "ok"; text: ReactNode; to?: DashTab; cta?: string };
  const alerts: Alert[] = [];
  if (setup.stripe === "test") alerts.push({ tone: "warn", text: "Payments are in test (sandbox) mode. Real customers cannot pay yet.", to: "settings", cta: "How to go live" });
  if (!setup.stripe) alerts.push({ tone: "bad", text: "Stripe is not connected, so nobody can check out.", to: "settings", cta: "Fix" });
  if (noFile > 0) alerts.push({ tone: "warn", text: <><b>{noFile}</b> of {paid.length} paid ebooks have no download link, so buyers get no file after paying.</>, to: "ebooks", cta: "Add links" });
  if (d.pending > 0) alerts.push({ tone: "warn", text: <><b>{d.pending}</b> order{d.pending === 1 ? " is" : "s are"} waiting for payment.</>, to: "orders", cta: "View" });
  if (d.c.unfinished.length > 0) alerts.push({ tone: "warn", text: <><b>{d.c.unfinished.length}</b> abandoned checkout{d.c.unfinished.length === 1 ? "" : "s"} ({cash(lostRevenue)} not collected).</>, to: "reports", cta: "Report" });
  if (d.refunded > 0) alerts.push({ tone: "warn", text: <><b>{d.refunded}</b> refunded order{d.refunded === 1 ? "" : "s"}.</>, to: "orders", cta: "View" });
  for (const p of viewedNoSale) alerts.push({ tone: "warn", text: <><b>{byId.get(p.id)?.title ?? `Ebook ${p.id}`}</b> got {p.views} views but no sale. Try a new price or description.</>, to: "ebooks", cta: "Edit" });
  if (!alerts.length) alerts.push({ tone: "ok", text: "Everything looks good. Nothing needs your attention." });

  const spark = (f: (x: (typeof d.series)[number]) => number) => d.series.map(f);
  const goalPct = goal ? Math.min(100, Math.round((d.month / (goal * 100)) * 100)) : 0;
  const projected = Math.round((d.month / d.elapsed) * d.dim);
  const topEbooks = [...d.sold].map(([id, v]) => ({ id, ...v, views: cur.s?.products.find((p) => p.id === id)?.views ?? 0 })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const mostViewed = (cur.s?.products ?? []).slice(0, 6);
  const funnel = cur.s
    ? [
        { label: "Visitors", n: vNow },
        { label: "Viewed an ebook", n: cur.s.totals.productViews },
        { label: "Added to cart", n: cur.s.totals.cart },
        { label: "Started checkout", n: cur.s.totals.buy },
        { label: "Paid", n: d.c.n },
      ]
    : [];
  const fmax = Math.max(1, ...funnel.map((f) => f.n));
  const direct = Math.max(0, vNow - (cur.s?.refs.reduce((a, r) => a + r.n, 0) ?? 0));

  return (
    <div className="ad-page ad-dash">
      <section className="ad-welcome">
        <div>
          <small>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</small>
          <h1>{hello} 👋</h1>
          <p>
            {ok ? (d.c.n ? `${d.c.n} order${d.c.n === 1 ? "" : "s"} and ${cash(d.c.net)} in sales ${range === 1 ? "today" : `in the last ${range} days`}.` : `No orders ${range === 1 ? "yet today" : `in the last ${range} days`}.`) : "Connect Stripe to see your orders here."}{" "}
            {cur.s ? `${num(vNow)} visitor${vNow === 1 ? "" : "s"}.` : ""}
          </p>
        </div>
        <div className="ad-welcome-tools">
          <div className="ad-seg ad-seg-light" role="group" aria-label="Period">
            {RANGES.map((r) => (
              <button key={r.d} className={range === r.d ? "on" : ""} onClick={() => setRange(r.d)}>
                {r.label}
              </button>
            ))}
          </div>
          <button
            className="ad-btn ghost light"
            onClick={() => {
              orders.reload();
              cur.reload();
              wide.reload();
            }}
          >
            ↻ Refresh
          </button>
          <small className="ad-live">
            <i /> Live · updated {ago(updated)}
            <span hidden>{now}</span>
          </small>
        </div>
      </section>
      <OrdersNotice o={orders} />

      <div className="ad-tiles">
        <Tile label="Net sales" value={ok ? cash(d.c.net) : "—"} now={d.c.net} before={d.p.net} spark={spark((x) => x.net)} hint="Sales minus refunds" />
        <Tile label="Orders" value={ok ? num(d.c.n) : "—"} now={d.c.n} before={d.p.n} spark={spark((x) => x.orders)} />
        <Tile label="Average order" value={ok ? cash(d.c.aov) : "—"} now={d.c.aov} before={d.p.aov} />
        <Tile label="Visitors" value={cur.s ? num(vNow) : "…"} now={vNow} before={vPrev} spark={spark((x) => x.visitors)} />
        <Tile label="Conversion" value={cur.s && ok ? pct(d.c.n, vNow) : "—"} now={conv} before={convPrev} hint="Visits that ended in a paid order" />
        <Tile label="Abandoned" value={ok ? num(d.c.unfinished.length) : "—"} now={d.c.unfinished.length} before={d.p.unfinished.length} invert hint="Checkouts started but not paid" />
      </div>

      <div className="ad-dgrid">
        <Card title={range === 1 ? "Last 7 days" : `Sales and visitors, last ${chartDays} days`} note={ok ? `${cash(d.series.reduce((a, x) => a + x.net, 0))} net` : ""}>
          <SalesChart days={d.series} />
        </Card>
        <Card title="Monthly goal" note={new Date().toLocaleDateString("en", { month: "long" })}>
          <div className="ad-goal">
            <div className="ad-goalbar" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${goalPct}%` }} />
            </div>
            <p>
              <b>{cash(d.month)}</b> {goal ? `of ${cash(goal * 100)} (${goalPct}%)` : "so far this month"}
            </p>
            {goal > 0 && (
              <small>
                On pace for <b>{cash(projected)}</b> by month end.
              </small>
            )}
            <label className="ad-goalset">
              <span>{goal ? "Change goal" : "Set a monthly goal"} (CAD)</span>
              <input
                className="ad-in"
                type="number"
                min="0"
                step="50"
                placeholder="e.g. 500"
                defaultValue={goal || ""}
                onBlur={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setGoal(v);
                  try {
                    localStorage.setItem("pa-goal", String(v));
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          </div>
        </Card>
      </div>

      <div className="ad-dgrid even">
        <Card title="Needs your attention" note={alerts[0].tone === "ok" ? "" : `${alerts.length} item${alerts.length === 1 ? "" : "s"}`}>
          <ul className="ad-alerts">
            {alerts.map((a, i) => (
              <li key={i} className={`is-${a.tone}`}>
                <i aria-hidden="true">{a.tone === "ok" ? "✓" : a.tone === "bad" ? "!" : "•"}</i>
                <span>{a.text}</span>
                {a.to && (
                  <button className="ad-link" onClick={() => go(a.to!)}>
                    {a.cta}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Latest orders">
          {d.feed.length === 0 ? (
            <p className="ad-empty">Nothing yet. Orders appear here the moment someone checks out.</p>
          ) : (
            <ul className="ad-feed">
              {d.feed.map((o) => {
                const who = o.name || o.email || "Someone";
                return (
                  <li key={o.id}>
                    <span className="ad-av" aria-hidden="true">
                      {who.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <b>{who}</b> · {o.items[0]?.title ?? "an ebook"}
                      {o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}
                      <small>
                        {ago(o.created)} · <StatusPill s={o.status} />
                      </small>
                    </div>
                    <strong>{cash(o.total, o.currency)}</strong>
                  </li>
                );
              })}
            </ul>
          )}
          <button className="ad-link" onClick={() => go("orders")}>
            All orders →
          </button>
        </Card>
      </div>

      <div className="ad-dgrid even">
        <Card title="Best sellers" note={ok ? "by revenue" : ""}>
          {topEbooks.length === 0 ? (
            <>
              <p className="ad-empty">No sales in this period yet. Most viewed ebooks instead:</p>
              <RankList
                empty=""
                rows={ranked(mostViewed.map((p) => ({ key: String(p.id), n: p.views })), (id) => byId.get(Number(id))?.title ?? `Ebook ${id}`, (id) => (byId.get(Number(id)) ? productHref(byId.get(Number(id))!) : undefined))}
              />
            </>
          ) : (
            <ul className="ad-top">
              {topEbooks.map((t, i) => {
                const p = byId.get(t.id);
                return (
                  <li key={t.id}>
                    <span className="ad-rankn">{i + 1}</span>
                    <div className="ad-thumb">{p?.img ? <img src={p.img} alt="" loading="lazy" /> : "✦"}</div>
                    <div className="ad-row-main">
                      <strong>{p?.title ?? `Ebook ${t.id}`}</strong>
                      <small>
                        {t.units} sold · {num(t.views)} views · {pct(t.units, t.views)} view-to-sale
                      </small>
                    </div>
                    <b>{cash(t.revenue)}</b>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Visitors to buyers">
          {funnel.length === 0 ? (
            <p className="ad-empty">Loading…</p>
          ) : (
            <ul className="ad-funnel">
              {funnel.map((f, i) => (
                <li key={f.label} style={{ ["--w" as string]: `${Math.max(3, (f.n / fmax) * 100)}%` }}>
                  <span>{f.label}</span>
                  <b>{num(f.n)}</b>
                  <small>{i ? pct(f.n, funnel[i - 1].n) + " of the step before" : ""}</small>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="ad-dgrid thirds">
        <Card title="Sales by topic">
          <RankList
            empty="No sales in this period."
            rows={(() => {
              const max = Math.max(1, ...d.topic.map((t) => t[1]));
              return d.topic.slice(0, 6).map(([label, v]) => ({ label, n: cash(v), w: v / max }));
            })()}
          />
        </Card>
        <Card title="Where visitors come from">
          <RankList empty="No visits yet." rows={ranked([{ key: "Direct / none", n: direct }, ...(cur.s?.refs ?? [])].filter((r) => r.n > 0).slice(0, 6))} />
        </Card>
        <Card title="Customers">
          <div className="ad-mini">
            <div>
              <strong>{ok ? num(d.buyers) : "—"}</strong>
              <small>buyers</small>
            </div>
            <div>
              <strong>{ok ? num(d.newBuyers) : "—"}</strong>
              <small>new</small>
            </div>
            <div>
              <strong>{ok ? num(Math.max(0, d.buyers - d.newBuyers)) : "—"}</strong>
              <small>returning</small>
            </div>
          </div>
          <p className="ad-fine">
            Catalogue: {rows.length - hidden} ebooks on sale{hidden ? `, ${hidden} hidden` : ""}. {paid.length - noFile} of {paid.length} paid ebooks have a download link.
          </p>
          <div className="ad-quick">
            <button onClick={() => go("ebooks")}>📚 Add an ebook</button>
            <button onClick={() => go("blog")}>✍ Write a post</button>
            <button onClick={() => go("orders")}>🧾 Orders</button>
            <button onClick={() => go("reports")}>📈 Reports</button>
          </div>
        </Card>
      </div>

      {toast && (
        <div className="ad-toast" role="status">
          <b>New order!</b> {toast.name || toast.email || "Someone"} bought {toast.items[0]?.title ?? "an ebook"} · {cash(toast.total, toast.currency)}
          <small>{when(toast.created)}</small>
        </div>
      )}
    </div>
  );
}
