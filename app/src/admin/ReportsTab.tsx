import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, ORIGINAL, type ProductEdit } from "../shop/catalog";
import { api } from "./api";
import { customersOf } from "./OrdersTab";
import { isSale, type Order } from "./orders-types";
import { mergeProducts } from "./ProductsTab";
import { BarChart, Card, OrdersNotice, RankList, cash, downloadCsv, num, pct, shortDay, useOrders, useStats, when } from "./ui";

type View = "sales" | "products" | "customers" | "funnel";
const DAY = 86400000;

const totals = (list: Order[]) => {
  const sales = list.filter(isSale);
  const gross = sales.reduce((a, o) => a + o.total, 0);
  const refunds = sales.reduce((a, o) => a + o.refunded, 0);
  return { sales, gross, refunds, net: gross - refunds, n: sales.length, items: sales.reduce((a, o) => a + o.items.length, 0) };
};

function Delta({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return <em className="ad-delta">no change</em>;
  if (!before) return <em className="ad-delta up">new</em>;
  const p = Math.round(((now - before) / before) * 100);
  const good = invert ? p <= 0 : p >= 0;
  return (
    <em className={`ad-delta ${p === 0 ? "" : good ? "up" : "down"}`}>
      {p > 0 ? "▲" : p < 0 ? "▼" : "•"} {Math.abs(p)}% vs previous
    </em>
  );
}

function Stat({ label, value, now, before, invert }: { label: string; value: string; now?: number; before?: number; invert?: boolean }) {
  return (
    <div className="ad-kpi">
      <small>{label}</small>
      <strong>{value}</strong>
      {now !== undefined && before !== undefined ? <Delta now={now} before={before} invert={invert} /> : null}
    </div>
  );
}

/** Reports: pick a period and a report; every number is compared with the period before it. */
export function ReportsTab() {
  const [days, setDays] = useState(30);
  const [view, setView] = useState<View>("sales");
  const data = useOrders();
  const { s: wide } = useStats(days * 2); // this period and the one before it
  const { s } = useStats(days);
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const prods = useMemo(() => new Map(mergeProducts(edits).map((p) => [p.id, p])), [edits]);

  const r = useMemo(() => {
    const now = Date.now();
    const cur = data.orders.filter((o) => o.created >= now - days * DAY);
    const prev = data.orders.filter((o) => o.created >= now - days * 2 * DAY && o.created < now - days * DAY);
    const c = totals(cur);
    const p = totals(prev);
    const perDay = new Map<string, { n: number; items: number; gross: number; refunds: number }>();
    for (let i = 0; i < days; i++) perDay.set(new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10), { n: 0, items: 0, gross: 0, refunds: 0 });
    for (const o of c.sales) {
      const e = perDay.get(new Date(o.created).toISOString().slice(0, 10));
      if (e) {
        e.n++;
        e.items += o.items.length;
        e.gross += o.total;
        e.refunds += o.refunded;
      }
    }
    const sell = new Map<string, { id: number | null; title: string; units: number; revenue: number }>();
    const topic = new Map<string, number>();
    for (const o of c.sales)
      for (const i of o.items) {
        const k = i.id != null ? String(i.id) : i.title;
        const e = sell.get(k) ?? { id: i.id, title: i.title, units: 0, revenue: 0 };
        e.units++;
        e.revenue += i.amount;
        sell.set(k, e);
        const cat = (i.id != null && prods.get(i.id)?.cats[0]) || "";
        const name = CATEGORIES.find((x) => x.slug === cat)?.name ?? "Other";
        topic.set(name, (topic.get(name) ?? 0) + i.amount);
      }
    const everyone = customersOf(data.orders.filter(isSale));
    const buyers = customersOf(c.sales);
    const firstSeen = new Map(everyone.map((x) => [x.email, x.first]));
    const fresh = buyers.filter((b) => (firstSeen.get(b.email) ?? 0) >= now - days * DAY).length;
    const unfinished = cur.filter((o) => o.status === "expired" || o.status === "pending");
    const unfinishedPrev = prev.filter((o) => o.status === "expired" || o.status === "pending").length;
    return { c, p, perDay: [...perDay], sellers: [...sell.values()].sort((a, b) => b.revenue - a.revenue), topic: [...topic].sort((a, b) => b[1] - a[1]), buyers, fresh, unfinished, unfinishedPrev };
  }, [data.orders, days, prods]);

  const half = wide ? Math.floor(wide.daily.length / 2) : 0;
  const visitsNow = s?.totals.visitors ?? 0;
  const visitsPrev = wide ? wide.daily.slice(0, half).reduce((a, d) => a + d.visitors, 0) : 0;
  const viewsOf = (id: number | null) => (id == null ? 0 : (s?.products.find((p) => p.id === id)?.views ?? 0));
  const title = (p: { id: number | null; title: string }) => prods.get(p.id ?? -1)?.title ?? ORIGINAL.find((o) => o.id === p.id)?.title ?? p.title;
  const aov = (t: ReturnType<typeof totals>) => (t.n ? Math.round(t.gross / t.n) : 0);

  const funnel = s
    ? [
        { label: "Visits", n: visitsNow },
        { label: "Viewed an ebook", n: s.totals.productViews },
        { label: "Added to cart", n: s.totals.cart },
        { label: "Started checkout", n: s.totals.buy },
        { label: "Paid orders", n: r.c.n },
      ]
    : [];
  const fmax = Math.max(1, ...funnel.map((f) => f.n));

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Reports</h1>
          <p>Pick a report and a period. Every number is compared with the period right before it.</p>
        </div>
        <div className="ad-tools">
          <div className="ad-seg" role="group" aria-label="Period">
            {[7, 30, 90].map((d) => (
              <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>
                {d} days
              </button>
            ))}
          </div>
          <button className="ad-btn ghost" onClick={data.reload}>
            ↻ Refresh
          </button>
        </div>
      </header>
      <OrdersNotice o={data} />
      {data.state === "ok" && (
        <>
          <nav className="ad-tabs" aria-label="Report">
            {(
              [
                ["sales", "Sales"],
                ["products", "Products"],
                ["customers", "Customers"],
                ["funnel", "Funnel and abandoned"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={view === id ? "on" : ""} onClick={() => setView(id)}>
                {label}
              </button>
            ))}
          </nav>

          {view === "sales" && (
            <>
              <div className="ad-kpis">
                <Stat label="Net sales" value={cash(r.c.net)} now={r.c.net} before={r.p.net} />
                <Stat label="Gross sales" value={cash(r.c.gross)} now={r.c.gross} before={r.p.gross} />
                <Stat label="Orders" value={num(r.c.n)} now={r.c.n} before={r.p.n} />
                <Stat label="Average order" value={cash(aov(r.c))} now={aov(r.c)} before={aov(r.p)} />
                <Stat label="Refunds" value={cash(r.c.refunds)} now={r.c.refunds} before={r.p.refunds} invert />
              </div>
              <Card title="Net sales per day">
                <BarChart label="Net sales per day" data={r.perDay.map(([d, v]) => ({ key: d, v: v.gross - v.refunds, tip: `${shortDay(d)}: ${cash(v.gross - v.refunds)}` }))} />
              </Card>
              <Card
                title="Day by day"
                note={`${shortDay(r.perDay[0][0])} to ${shortDay(r.perDay[r.perDay.length - 1][0])}`}
              >
                <div className="ad-scroll">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Orders</th>
                        <th>Ebooks sold</th>
                        <th>Gross</th>
                        <th>Refunds</th>
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...r.perDay]
                        .reverse()
                        .filter(([, v]) => v.n > 0)
                        .map(([d, v]) => (
                          <tr key={d}>
                            <td>{shortDay(d)}</td>
                            <td>{v.n}</td>
                            <td>{v.items}</td>
                            <td>{cash(v.gross)}</td>
                            <td>{v.refunds ? `−${cash(v.refunds)}` : "—"}</td>
                            <td>
                              <b>{cash(v.gross - v.refunds)}</b>
                            </td>
                          </tr>
                        ))}
                      {r.c.n === 0 && (
                        <tr>
                          <td colSpan={6} className="ad-empty">
                            No sales in this period.
                          </td>
                        </tr>
                      )}
                      {r.c.n > 0 && (
                        <tr className="ad-total">
                          <td>Total</td>
                          <td>{r.c.n}</td>
                          <td>{r.c.items}</td>
                          <td>{cash(r.c.gross)}</td>
                          <td>{r.c.refunds ? `−${cash(r.c.refunds)}` : "—"}</td>
                          <td>{cash(r.c.net)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  className="ad-btn ghost"
                  onClick={() => downloadCsv("sales-by-day.csv", [["Date", "Orders", "Ebooks", "Gross", "Refunds", "Net"], ...r.perDay.map(([d, v]) => [d, v.n, v.items, v.gross / 100, v.refunds / 100, (v.gross - v.refunds) / 100])])}
                >
                  Export CSV
                </button>
              </Card>
            </>
          )}

          {view === "products" && (
            <>
              <div className="ad-kpis">
                <Stat label="Ebooks sold" value={num(r.c.items)} now={r.c.items} before={r.p.items} />
                <Stat label="Different ebooks sold" value={num(r.sellers.length)} />
                <Stat label="Ebook page views" value={num(s ? s.totals.productViews : 0)} />
                <Stat label="Views to sale" value={pct(r.c.items, s ? s.totals.productViews : 0)} />
              </div>
              <div className="ad-grid2">
                <Card title="Best sellers" note="Views are for the same period">
                  {r.sellers.length === 0 ? (
                    <p className="ad-empty">No sales in this period.</p>
                  ) : (
                    <>
                      <div className="ad-scroll">
                        <table className="ad-table">
                          <thead>
                            <tr>
                              <th>Ebook</th>
                              <th>Sold</th>
                              <th>Revenue</th>
                              <th>Views</th>
                              <th>Views to sale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.sellers.slice(0, 25).map((p) => (
                              <tr key={p.title}>
                                <td>{title(p)}</td>
                                <td>{num(p.units)}</td>
                                <td>{cash(p.revenue)}</td>
                                <td>{num(viewsOf(p.id))}</td>
                                <td>{pct(p.units, viewsOf(p.id))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        className="ad-btn ghost"
                        onClick={() => downloadCsv("best-sellers.csv", [["Ebook", "Sold", "Revenue", "Views"], ...r.sellers.map((p) => [title(p), p.units, p.revenue / 100, viewsOf(p.id)])])}
                      >
                        Export CSV
                      </button>
                    </>
                  )}
                </Card>
                <Card title="Sales by topic">
                  <RankList
                    empty="No sales in this period."
                    rows={(() => {
                      const max = Math.max(1, ...r.topic.map((t) => t[1]));
                      return r.topic.slice(0, 10).map(([label, v]) => ({ label, n: cash(v), w: v / max }));
                    })()}
                  />
                </Card>
              </div>
              <Card title="Viewed a lot, not sold yet" note="Ideas for a price or description change">
                <RankList
                  empty="Nothing to flag."
                  rows={(() => {
                    const soldIds = new Set(r.sellers.map((x) => x.id));
                    const list = (s?.products ?? []).filter((p) => p.views >= 3 && !soldIds.has(p.id)).slice(0, 8);
                    const max = Math.max(1, ...list.map((p) => p.views));
                    return list.map((p) => ({ label: prods.get(p.id)?.title ?? ORIGINAL.find((o) => o.id === p.id)?.title ?? `Ebook ${p.id}`, n: `${p.views} views`, w: p.views / max }));
                  })()}
                />
              </Card>
            </>
          )}

          {view === "customers" && (
            <>
              <div className="ad-kpis">
                <Stat label="Customers" value={num(r.buyers.length)} />
                <Stat label="New customers" value={num(r.fresh)} />
                <Stat label="Returning" value={num(r.buyers.length - r.fresh)} />
                <Stat label="Average spend" value={cash(r.buyers.length ? Math.round(r.buyers.reduce((a, b) => a + b.spent, 0) / r.buyers.length) : 0)} />
              </div>
              <Card title="Customers in this period">
                {r.buyers.length === 0 ? (
                  <p className="ad-empty">No customers in this period.</p>
                ) : (
                  <>
                    <div className="ad-scroll">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Country</th>
                            <th>Orders</th>
                            <th>Spent</th>
                            <th>Last order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.buyers.map((c) => (
                            <tr key={c.email}>
                              <td>
                                {c.name || c.email}
                                {c.name && <small>{c.email}</small>}
                              </td>
                              <td>{c.country || "—"}</td>
                              <td>{c.orders}</td>
                              <td>{cash(c.spent)}</td>
                              <td>{when(c.last)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      className="ad-btn ghost"
                      onClick={() => downloadCsv("customers.csv", [["Name", "Email", "Country", "Orders", "Spent", "Last order"], ...r.buyers.map((c) => [c.name, c.email, c.country, c.orders, c.spent / 100, new Date(c.last).toISOString()])])}
                    >
                      Export CSV
                    </button>
                  </>
                )}
              </Card>
            </>
          )}

          {view === "funnel" && (
            <>
              <div className="ad-kpis">
                <Stat label="Conversion" value={pct(r.c.n, visitsNow)} now={visitsNow ? r.c.n / visitsNow : 0} before={visitsPrev ? r.p.n / visitsPrev : 0} />
                <Stat label="Visits" value={num(visitsNow)} now={visitsNow} before={visitsPrev} />
                <Stat label="Abandoned checkouts" value={num(r.unfinished.length)} now={r.unfinished.length} before={r.unfinishedPrev} invert />
                <Stat label="Checkout completion" value={pct(r.c.n, r.c.n + r.unfinished.length)} />
              </div>
              <div className="ad-grid2">
                <Card title="From visit to purchase">
                  <ul className="ad-funnel">
                    {funnel.map((f, i) => (
                      <li key={f.label} style={{ ["--w" as string]: `${Math.max(3, (f.n / fmax) * 100)}%` }}>
                        <span>{f.label}</span>
                        <b>{num(f.n)}</b>
                        <small>{i ? pct(f.n, funnel[i - 1].n) + " of the step before" : ""}</small>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card title="Abandoned checkouts" note="Started but never paid">
                  {r.unfinished.length === 0 ? (
                    <p className="ad-empty">None in this period.</p>
                  ) : (
                    <table className="ad-table">
                      <tbody>
                        {r.unfinished.slice(0, 12).map((o) => (
                          <tr key={o.id}>
                            <td>
                              {o.items[0]?.title ?? "Ebook"}
                              <small>{when(o.created)}</small>
                            </td>
                            <td>{cash(o.total, o.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
