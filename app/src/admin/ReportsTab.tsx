import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, ORIGINAL, type ProductEdit } from "../shop/catalog";
import { api } from "./api";
import { customersOf } from "./OrdersTab";
import { isSale } from "./orders-types";
import { mergeProducts } from "./ProductsTab";
import { BarChart, Card, Kpi, OrdersNotice, RankList, cash, downloadCsv, num, pct, ranked, shortDay, useOrders, useStats } from "./ui";

/** Sales reports: revenue, refunds, funnel from views to paid orders, best sellers, topics and customers. */
export function ReportsTab() {
  const [days, setDays] = useState(30);
  const data = useOrders();
  const { s } = useStats(days);
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const prods = useMemo(() => new Map(mergeProducts(edits).map((p) => [p.id, p])), [edits]);

  const r = useMemo(() => {
    const from = Date.now() - days * 86400000;
    const orders = data.orders.filter((o) => o.created >= from);
    const sales = orders.filter(isSale);
    const gross = sales.reduce((a, o) => a + o.total, 0);
    const refunds = sales.reduce((a, o) => a + o.refunded, 0);
    const items = sales.reduce((a, o) => a + o.items.length, 0);
    const abandoned = orders.filter((o) => o.status === "expired" || o.status === "pending").length;
    const day = new Map<string, number>();
    for (let i = 0; i < days; i++) day.set(new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10), 0);
    for (const o of sales) {
      const k = new Date(o.created).toISOString().slice(0, 10);
      if (day.has(k)) day.set(k, (day.get(k) ?? 0) + o.total - o.refunded);
    }
    const sell = new Map<string, { id: number | null; title: string; units: number; revenue: number }>();
    const topic = new Map<string, number>();
    const country = new Map<string, number>();
    for (const o of sales) {
      for (const i of o.items) {
        const k = i.id != null ? String(i.id) : i.title;
        const e = sell.get(k) ?? { id: i.id, title: i.title, units: 0, revenue: 0 };
        e.units++;
        e.revenue += i.amount;
        sell.set(k, e);
        const cat = (i.id != null && prods.get(i.id)?.cats[0]) || "";
        const name = CATEGORIES.find((c) => c.slug === cat)?.name ?? "Other";
        topic.set(name, (topic.get(name) ?? 0) + i.amount);
      }
      if (o.country) country.set(o.country, (country.get(o.country) ?? 0) + 1);
    }
    return { orders, sales, gross, refunds, items, abandoned, day: [...day], sellers: [...sell.values()].sort((a, b) => b.revenue - a.revenue), topic: [...topic].sort((a, b) => b[1] - a[1]), country: [...country].sort((a, b) => b[1] - a[1]), customers: customersOf(sales) };
  }, [data.orders, days, prods]);

  const viewsOf = (id: number | null) => (id == null ? 0 : (s?.products.find((p) => p.id === id)?.views ?? 0));
  const net = r.gross - r.refunds;
  const funnel = s
    ? [
        { label: "Visits", n: s.totals.visitors },
        { label: "Viewed an ebook", n: s.totals.productViews },
        { label: "Added to cart", n: s.totals.cart },
        { label: "Started checkout", n: s.totals.buy },
        { label: "Paid orders", n: r.sales.length },
      ]
    : [];
  const fmax = Math.max(1, ...funnel.map((f) => f.n));

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Reports</h1>
          <p>Sales, refunds, best sellers and how visitors turn into buyers.</p>
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
          <div className="ad-kpis">
            <Kpi label="Net sales" value={cash(net)} sub={`${cash(r.gross)} gross`} />
            <Kpi label="Orders" value={num(r.sales.length)} sub={`${num(r.items)} ebooks sold`} />
            <Kpi label="Average order" value={cash(r.sales.length ? Math.round(r.gross / r.sales.length) : 0)} sub="per paid order" />
            <Kpi label="Refunds" value={cash(r.refunds)} sub={pct(r.refunds, r.gross) + " of sales"} />
            <Kpi label="Conversion" value={pct(r.sales.length, s?.totals.visitors ?? 0)} sub="visits that paid" />
            <Kpi label="Abandoned checkouts" value={num(r.abandoned)} sub="started, not paid" />
          </div>

          <Card title="Sales per day" note="Net of refunds">
            <BarChart label="Sales per day" data={r.day.map(([d, v]) => ({ key: d, v, tip: `${shortDay(d)}: ${cash(v)}` }))} />
            <div className="ad-axis">
              <span>{shortDay(r.day[0][0])}</span>
              <span>{shortDay(r.day[r.day.length - 1][0])}</span>
            </div>
          </Card>

          <div className="ad-grid2">
            <Card title="From visit to purchase">
              <ul className="ad-funnel">
                {funnel.map((f, i) => (
                  <li key={f.label} style={{ ["--w" as string]: `${Math.max(3, (f.n / fmax) * 100)}%` }}>
                    <span>{f.label}</span>
                    <b>{num(f.n)}</b>
                    <small>{i ? pct(f.n, funnel[i - 1].n) + " of previous" : ""}</small>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Sales by topic">
              <RankList
                empty="No sales in this period."
                rows={(() => {
                  const max = Math.max(1, ...r.topic.map((t) => t[1]));
                  return r.topic.slice(0, 8).map(([label, v]) => ({ label, n: cash(v), w: v / max }));
                })()}
              />
            </Card>
          </div>

          <Card
            title="Best sellers"
            note="Views are counted over the same period"
          >
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
                      {r.sellers.slice(0, 20).map((p) => (
                        <tr key={p.title}>
                          <td>{prods.get(p.id ?? -1)?.title ?? ORIGINAL.find((o) => o.id === p.id)?.title ?? p.title}</td>
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
                  onClick={() => downloadCsv("best-sellers.csv", [["Ebook", "Sold", "Revenue", "Views"], ...r.sellers.map((p) => [p.title, p.units, p.revenue / 100, viewsOf(p.id)])])}
                >
                  Export CSV
                </button>
              </>
            )}
          </Card>

          <div className="ad-grid2">
            <Card title="Best customers">
              <RankList
                empty="No customers yet."
                rows={(() => {
                  const max = Math.max(1, ...r.customers.map((c) => c.spent));
                  return r.customers.slice(0, 8).map((c) => ({ label: c.name || c.email, n: cash(c.spent), w: c.spent / max }));
                })()}
              />
            </Card>
            <Card title="Buyers by country">
              <RankList empty="No data yet." rows={ranked(r.country.map(([key, n]) => ({ key, n })))} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
