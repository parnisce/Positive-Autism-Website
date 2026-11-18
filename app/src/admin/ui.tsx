import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { STATUS_LABEL, type Order, type OrderStatus } from "./orders-types";

export const num = (n: number) => new Intl.NumberFormat("en").format(n);
export const cash = (cents: number, cur = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: cur, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
export const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "0.0%");
export const shortDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" });
export const when = (ms: number) => new Date(ms).toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ad-kpi">
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

export function Card({ title, note, children, className = "" }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ad-card ${className}`}>
      {(title || note) && (
        <header className="ad-card-h">
          {title && <h2>{title}</h2>}
          {note && <small>{note}</small>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Tall bars on dark tracks, one per day (hover for the exact numbers). */
export function BarChart({ data, label }: { data: { key: string; v: number; tip: string }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div className="ad-bars2" role="img" aria-label={label}>
      {data.map((d) => (
        <div key={d.key} className="ad-bar2" title={d.tip}>
          <i style={{ height: `${d.v ? Math.max(3, (d.v / max) * 100) : 1}%` }} />
        </div>
      ))}
    </div>
  );
}

export function RankList({ rows, empty }: { rows: { label: string; n: number | string; w: number; href?: string }[]; empty: string }) {
  if (!rows.length) return <p className="ad-empty">{empty}</p>;
  return (
    <ul className="ad-rank">
      {rows.map((r) => (
        <li key={r.label} style={{ ["--w" as string]: `${Math.max(4, r.w * 100)}%` }}>
          {r.href ? (
            <a href={r.href} target="_blank" rel="noreferrer">
              {r.label}
            </a>
          ) : (
            <span>{r.label}</span>
          )}
          <b>{typeof r.n === "number" ? num(r.n) : r.n}</b>
        </li>
      ))}
    </ul>
  );
}
export const ranked = (rows: { key: string; n: number }[], label = (k: string) => k, href = (_k: string): string | undefined => undefined) => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return rows.map((r) => ({ label: label(r.key), n: r.n, w: r.n / max, href: href(r.key) }));
};

export function StatusPill({ s }: { s: OrderStatus }) {
  return <span className={`ad-st ad-st-${s}`}>{STATUS_LABEL[s]}</span>;
}

export type Stats = {
  totals: { views: number; visitors: number; productViews: number; cart: number; buy: number };
  daily: { day: string; views: number; visitors: number }[];
  pages: { key: string; n: number }[];
  products: { id: number; views: number; cart: number; buy: number }[];
  refs: { key: string; n: number }[];
  countries: { key: string; n: number }[];
  devices: { key: string; n: number }[];
  actions: { key: string; n: number }[];
  utm: { key: string; n: number }[];
};

export function useStats(days: number) {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setS(null);
    setErr("");
    api<Stats>("stats", { days })
      .then(setS)
      .catch(() => setErr("Could not load the numbers."));
  }, [days, tick]);
  return { s, err, reload: useCallback(() => setTick((t) => t + 1), []) };
}

type OrdersState = { state: "loading" | "ok" | "no_key" | "error"; all: Order[]; message: string; live: boolean };
export function useOrders() {
  const [o, setO] = useState<OrdersState>({ state: "loading", all: [], message: "", live: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    api<{ ok: boolean; orders?: Order[]; livemode?: boolean; error?: string; message?: string }>("orders", { force: tick > 0 })
      .then((r) =>
        r.ok
          ? setO({ state: "ok", all: r.orders ?? [], message: "", live: !!r.livemode })
          : setO({ state: r.error === "no_key" ? "no_key" : "error", all: [], message: r.message || "", live: false }),
      )
      .catch(() => setO({ state: "error", all: [], message: "Could not reach the server.", live: false }));
  }, [tick]);
  // `orders` leaves out the ones the owner hid; `all` has everything
  const orders = useMemo(() => o.all.filter((x) => !x.hidden), [o.all]);
  return { ...o, orders, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function OrdersNotice({ o }: { o: ReturnType<typeof useOrders> }) {
  if (o.state === "loading") return <p className="ad-note">Loading orders from Stripe…</p>;
  if (o.state === "no_key") return <p className="ad-note">Stripe is not connected yet, so there are no orders to show. Add the STRIPE_SECRET_KEY secret in Cloudflare.</p>;
  if (o.state === "error") return <p className="ad-note">Stripe said: {o.message || "something went wrong"}.</p>;
  return null;
}

export const downloadCsv = (name: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
