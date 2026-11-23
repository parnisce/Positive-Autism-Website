import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { STATUS_LABEL, isSale, type Order, type OrderStatus } from "./orders-types";
import { Card, OrdersNotice, StatusPill, cash, downloadCsv, num, useOrders, when } from "./ui";

const short = (id: string) => id.slice(-8).toUpperCase();
const who = (o: Order) => o.name || o.email || "Guest (did not finish)";

export type Customer = { email: string; name: string; orders: number; spent: number; first: number; last: number; country: string };
export function customersOf(orders: Order[]): Customer[] {
  const m = new Map<string, Customer>();
  for (const o of orders) {
    if (!isSale(o) || !o.email) continue;
    const c = m.get(o.email) ?? { email: o.email, name: o.name, orders: 0, spent: 0, first: o.created, last: o.created, country: o.country };
    c.orders++;
    c.spent += o.total - o.refunded;
    c.first = Math.min(c.first, o.created);
    c.last = Math.max(c.last, o.created);
    c.name = c.name || o.name;
    m.set(o.email, c);
  }
  return [...m.values()].sort((a, b) => b.spent - a.spent);
}

export function OrdersTab() {
  const data = useOrders();
  // new orders appear on their own
  useEffect(() => {
    const t = setInterval(data.reload, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [view, setView] = useState<"orders" | "customers">("orders");
  const [status, setStatus] = useState<OrderStatus | "all" | "hidden">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Order | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.orders.length };
    for (const o of data.orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [data.orders]);
  const hiddenList = useMemo(() => data.all.filter((o) => o.hidden), [data.all]);
  async function setHidden(ids: string[], hidden: boolean) {
    await api("orders.hide", { ids, hidden }).catch(() => {});
    setOpen(null);
    data.reload();
  }
  const list = (status === "hidden" ? hiddenList : data.orders).filter(
    (o) => (status === "all" || status === "hidden" || o.status === status) && (!q || `${o.name} ${o.email} ${o.id} ${o.items.map((i) => i.title).join(" ")}`.toLowerCase().includes(q.toLowerCase())),
  );
  const customers = useMemo(() => customersOf(data.orders), [data.orders]);

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Orders</h1>
          <p>
            Every checkout from the shop, read live from Stripe{data.state === "ok" ? (data.live ? " (live payments)" : " (test mode: sandbox payments)") : ""}.
          </p>
        </div>
        <div className="ad-tools">
          <div className="ad-seg">
            <button className={view === "orders" ? "on" : ""} onClick={() => setView("orders")}>
              Orders
            </button>
            <button className={view === "customers" ? "on" : ""} onClick={() => setView("customers")}>
              Customers
            </button>
          </div>
          <button className="ad-btn ghost" onClick={data.reload}>
            ↻ Refresh
          </button>
        </div>
      </header>
      <OrdersNotice o={data} />

      {data.state === "ok" && view === "orders" && (
        <>
          <div className="ad-filters">
            <div className="ad-seg">
              {(["all", "paid", "pending", "expired", "refunded", "partial"] as const)
                .filter((s) => s === "all" || counts[s])
                .map((s) => (
                  <button key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
                    {s === "all" ? "All" : STATUS_LABEL[s]} <em>{counts[s] ?? 0}</em>
                  </button>
                ))}
              {hiddenList.length > 0 && (
                <button className={status === "hidden" ? "on" : ""} onClick={() => setStatus("hidden")}>
                  Hidden <em>{hiddenList.length}</em>
                </button>
              )}
            </div>
            <input className="ad-in" placeholder="Search by name, email, order or ebook…" value={q} onChange={(e) => setQ(e.target.value)} />
            {list.length > 0 && (status !== "all" || q) && (
              <button
                className="ad-btn ghost"
                onClick={() => confirm(`${status === "hidden" ? "Show" : "Hide"} these ${list.length} orders ${status === "hidden" ? "again" : "from every total and report"}?`) && setHidden(list.map((o) => o.id), status !== "hidden")}
              >
                {status === "hidden" ? "Restore these" : `Hide these ${list.length}`}
              </button>
            )}
            <button
              className="ad-btn ghost"
              onClick={() =>
                downloadCsv("orders.csv", [
                  ["Order", "Date", "Status", "Name", "Email", "Country", "Items", "Total", "Refunded", "Currency"],
                  ...list.map((o) => [short(o.id), new Date(o.created).toISOString(), STATUS_LABEL[o.status], o.name, o.email, o.country, o.items.map((i) => i.title).join("; "), o.total / 100, o.refunded / 100, o.currency]),
                ])
              }
            >
              Export CSV
            </button>
          </div>
          <Card>
            {list.length === 0 ? (
              <p className="ad-empty">{data.orders.length ? "No orders match." : "No orders yet. They appear here as soon as someone starts a checkout."}</p>
            ) : (
              <div className="ad-scroll">
                <table className="ad-table ad-orders">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Ebooks</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((o) => (
                      <tr key={o.id} className="click" onClick={() => setOpen(o)}>
                        <td>
                          <b>#{short(o.id)}</b>
                        </td>
                        <td>{when(o.created)}</td>
                        <td>
                          {who(o)}
                          {o.email && o.name && <small>{o.email}</small>}
                        </td>
                        <td>
                          {o.items[0]?.title ?? "—"}
                          {o.items.length > 1 && <small>+ {o.items.length - 1} more</small>}
                        </td>
                        <td>
                          <StatusPill s={o.status} />
                        </td>
                        <td>{cash(o.total, o.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {data.state === "ok" && view === "customers" && (
        <>
          <div className="ad-filters">
            <span className="ad-fine">
              {customers.length} customer{customers.length === 1 ? "" : "s"} who paid
            </span>
            <button
              className="ad-btn ghost"
              onClick={() =>
                downloadCsv("customers.csv", [
                  ["Name", "Email", "Country", "Orders", "Spent", "First order", "Last order"],
                  ...customers.map((c) => [c.name, c.email, c.country, c.orders, c.spent / 100, new Date(c.first).toISOString(), new Date(c.last).toISOString()]),
                ])
              }
            >
              Export CSV
            </button>
          </div>
          <Card>
            {customers.length === 0 ? (
              <p className="ad-empty">No paying customers yet.</p>
            ) : (
              <div className="ad-scroll">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Country</th>
                      <th>Orders</th>
                      <th>Total spent</th>
                      <th>Last order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.email}>
                        <td>
                          {c.name || c.email}
                          {c.name && <small>{c.email}</small>}
                        </td>
                        <td>{c.country || "—"}</td>
                        <td>{num(c.orders)}</td>
                        <td>{cash(c.spent)}</td>
                        <td>{when(c.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {open && (
        <div className="ad-modal" onClick={() => setOpen(null)}>
          <div className="ad-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Order ${short(open.id)}`}>
            <header>
              <h2>Order #{short(open.id)}</h2>
              <button className="ad-link" onClick={() => setOpen(null)}>
                Close ✕
              </button>
            </header>
            <div className="ad-sheet-row">
              <StatusPill s={open.status} />
              <span>{when(open.created)}</span>
            </div>
            <dl className="ad-dl">
              <dt>Customer</dt>
              <dd>{open.name || "—"}</dd>
              <dt>Email</dt>
              <dd>{open.email ? <a href={`mailto:${open.email}`}>{open.email}</a> : "—"}</dd>
              <dt>Country</dt>
              <dd>{open.country || "—"}</dd>
            </dl>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Ebook</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {open.items.map((i, n) => (
                  <tr key={n}>
                    <td>{i.title}</td>
                    <td>{cash(i.amount, open.currency)}</td>
                  </tr>
                ))}
                {open.discount > 0 && (
                  <tr>
                    <td>Discount</td>
                    <td>−{cash(open.discount, open.currency)}</td>
                  </tr>
                )}
                {open.refunded > 0 && (
                  <tr>
                    <td>Refunded</td>
                    <td>−{cash(open.refunded, open.currency)}</td>
                  </tr>
                )}
                <tr className="ad-total">
                  <td>Total</td>
                  <td>{cash(open.total, open.currency)}</td>
                </tr>
              </tbody>
            </table>
            {open.pi && (
              <a className="ad-btn ghost" target="_blank" rel="noreferrer" href={`https://dashboard.stripe.com/${open.live ? "" : "test/"}payments/${open.pi}`}>
                Open in Stripe ↗
              </a>
            )}
            <button className="ad-btn ghost" onClick={() => setHidden([open.id], !open.hidden)}>
              {open.hidden ? "Show this order again" : "Hide this order (test or fake)"}
            </button>
            <p className="ad-fine">Hidden orders are left out of the dashboard, reports and customers. Refunds are made in Stripe and show here after you refresh.</p>
          </div>
        </div>
      )}
    </div>
  );
}
