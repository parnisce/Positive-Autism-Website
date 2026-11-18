import { useEffect, useMemo, useState, type FormEvent } from "react";
import { productHref, ORIGINAL, type ProductEdit } from "../shop/catalog";
import { AnalyticsTab } from "./AnalyticsTab";
import { api, getStatus, type Setup, type Status } from "./api";
import { BlogTab } from "./BlogTab";
import { ContentTab } from "./ContentTab";
import { OrdersTab } from "./OrdersTab";
import { isSale } from "./orders-types";
import { mergeProducts, ProductsTab } from "./ProductsTab";
import { ReportsTab } from "./ReportsTab";
import { SCHEMA_SQL } from "./schema-sql";
import { BarChart, Card, Kpi, OrdersNotice, StatusPill, cash, num, pct, shortDay, useOrders, useStats, when } from "./ui";
import "./admin.css";

type Tab = "dashboard" | "orders" | "ebooks" | "reports" | "analytics" | "blog" | "pages" | "settings";
const GROUPS: { title: string; tabs: { id: Tab; label: string; icon: string }[] }[] = [
  { title: "", tabs: [{ id: "dashboard", label: "Dashboard", icon: "◧" }] },
  {
    title: "Store",
    tabs: [
      { id: "orders", label: "Orders", icon: "🧾" },
      { id: "ebooks", label: "Ebooks", icon: "📚" },
      { id: "reports", label: "Reports", icon: "📈" },
    ],
  },
  {
    title: "Website",
    tabs: [
      { id: "analytics", label: "Analytics", icon: "📊" },
      { id: "blog", label: "Blog", icon: "✍" },
      { id: "pages", label: "Pages and text", icon: "📝" },
    ],
  },
  { title: "", tabs: [{ id: "settings", label: "Settings", icon: "⚙" }] },
];
const ALL = GROUPS.flatMap((g) => g.tabs.map((t) => t.id));

export function AdminApp() {
  const [st, setSt] = useState<Status | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    getStatus().then(setSt).catch(() => setSt({ auth: false, setup: { password: false, db: false, adminKey: false, stripe: null } }));
  }, []);
  if (!mounted || !st) return <div className="ad ad-center"><p>Loading…</p></div>;
  if (!st.setup.password) return <Setup setup={st.setup} />;
  if (!st.auth) return <Login onDone={() => getStatus().then(setSt)} />;
  return <Shell setup={st.setup} onOut={() => setSt({ ...st, auth: false })} />;
}

function Setup({ setup }: { setup: Setup }) {
  return (
    <div className="ad ad-center">
      <div className="ad-card narrow">
        <h1>Set up your admin password</h1>
        <p>The admin page is ready, but it needs a password before anyone can sign in.</p>
        <ol>
          <li>Open your project in the Cloudflare dashboard: Workers &amp; Pages → positive-autism-website → Settings → Variables and Secrets.</li>
          <li>
            Add a secret named <code>ADMIN_PASSWORD</code> with a long password of your choice and save.
          </li>
          <li>Redeploy (Deployments → the latest one → Retry deployment), then reload this page.</li>
        </ol>
        <p className="ad-fine">Database ready: {setup.db ? "yes" : "not yet (see Settings after signing in)"}</p>
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("login", { password: pw });
      try {
        localStorage.setItem("pa-notrack", "1");
      } catch {
        /* ignore */
      }
      onDone();
    } catch (x) {
      setErr(x instanceof Error && x.message === "wrong_password" ? "That password is not right." : "Could not sign in. Try again.");
      setBusy(false);
    }
  }
  return (
    <div className="ad ad-center">
      <form className="ad-card narrow" onSubmit={go}>
        <img className="ad-logo" src="/assets/img/logo.png" alt="Positive Autism" width={190} height={48} />
        <h1>Admin sign in</h1>
        <label>
          <span>Password</span>
          <input className="ad-in" type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {err && <p className="ad-err">{err}</p>}
        <button className="ad-btn" disabled={busy || !pw}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Shell({ setup, onOut }: { setup: Setup; onOut: () => void }) {
  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof location !== "undefined" ? (location.hash.replace(/^#\/?/, "") as Tab) : "dashboard";
    return ALL.includes(h) ? h : "dashboard";
  });
  useEffect(() => {
    history.replaceState(null, "", `#${tab}`);
    document.querySelector(".ad-main")?.scrollTo(0, 0);
  }, [tab]);
  const ready = setup.db && setup.adminKey;
  async function out() {
    await api("logout").catch(() => {});
    onOut();
  }
  return (
    <div className="ad">
      <aside className="ad-nav">
        <a className="ad-brand" href="/">
          <img src="/assets/img/logo.png" alt="Positive Autism" width={150} height={38} />
        </a>
        <nav>
          {GROUPS.map((g, i) => (
            <div key={i} className="ad-navgroup">
              {g.title && <small>{g.title}</small>}
              {g.tabs.map((t) => (
                <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                  <i aria-hidden="true">{t.icon}</i>
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="ad-nav-foot">
          <a href="/" target="_blank" rel="noreferrer">
            View website ↗
          </a>
          <button onClick={out}>Sign out</button>
        </div>
      </aside>
      <main className="ad-main">
        {!ready && tab !== "settings" && tab !== "orders" && tab !== "reports" ? <NoDb go={() => setTab("settings")} /> : null}
        {ready && tab === "dashboard" && <Dashboard go={setTab} />}
        {tab === "orders" && <OrdersTab />}
        {ready && tab === "ebooks" && <ProductsTab />}
        {tab === "reports" && <ReportsTab />}
        {ready && tab === "analytics" && <AnalyticsTab />}
        {ready && tab === "blog" && <BlogTab />}
        {ready && tab === "pages" && <ContentTab />}
        {tab === "settings" && <Settings setup={setup} />}
      </main>
    </div>
  );
}

function NoDb({ go }: { go: () => void }) {
  return (
    <div className="ad-page">
      <div className="ad-card">
        <h1>One more step: connect the database</h1>
        <p>Saving text, blog posts, ebooks and analytics needs your Supabase database to be set up. It takes about three minutes.</p>
        <button className="ad-btn" onClick={go}>
          Show me how
        </button>
      </div>
    </div>
  );
}

function Dashboard({ go }: { go: (t: Tab) => void }) {
  const orders = useOrders();
  const { s } = useStats(30);
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const names = useMemo(() => new Map(mergeProducts(edits).map((p) => [p.id, p])), [edits]);

  const d = useMemo(() => {
    const from = Date.now() - 30 * 86400000;
    const recent = orders.orders.filter((o) => o.created >= from);
    const sales = recent.filter(isSale);
    const gross = sales.reduce((a, o) => a + o.total, 0);
    const refunds = sales.reduce((a, o) => a + o.refunded, 0);
    const byDay = new Map<string, number>();
    for (let i = 0; i < 30; i++) byDay.set(new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10), 0);
    for (const o of sales) {
      const k = new Date(o.created).toISOString().slice(0, 10);
      if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + o.total - o.refunded);
    }
    return { sales, net: gross - refunds, gross, byDay: [...byDay], pending: orders.orders.filter((o) => o.status === "pending").length };
  }, [orders.orders]);

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Dashboard</h1>
          <p>The last 30 days at a glance: sales, orders, visitors and what needs attention.</p>
        </div>
      </header>
      <OrdersNotice o={orders} />
      <div className="ad-kpis">
        <Kpi label="Net sales" value={orders.state === "ok" ? cash(d.net) : "—"} sub={orders.state === "ok" ? `${cash(d.gross)} gross` : "connect Stripe"} />
        <Kpi label="Orders" value={orders.state === "ok" ? num(d.sales.length) : "—"} sub="paid in 30 days" />
        <Kpi label="Visits" value={s ? num(s.totals.visitors) : "…"} sub={s ? `${num(s.totals.views)} page views` : ""} />
        <Kpi label="Conversion" value={s && orders.state === "ok" ? pct(d.sales.length, s.totals.visitors) : "—"} sub="visits that paid" />
        <Kpi label="Average order" value={orders.state === "ok" ? cash(d.sales.length ? Math.round(d.gross / d.sales.length) : 0) : "—"} sub="per paid order" />
      </div>

      <div className="ad-grid2">
        <Card title="Sales per day" note="Net of refunds">
          <BarChart label="Sales per day" data={d.byDay.map(([day, v]) => ({ key: day, v, tip: `${shortDay(day)}: ${cash(v)}` }))} />
          <div className="ad-axis">
            <span>{shortDay(d.byDay[0][0])}</span>
            <span>{shortDay(d.byDay[d.byDay.length - 1][0])}</span>
          </div>
        </Card>
        <Card title="Needs attention">
          <ul className="ad-todo">
            <li>
              <b>{d.pending}</b> order{d.pending === 1 ? "" : "s"} waiting for payment
              <button className="ad-link" onClick={() => go("orders")}>
                View
              </button>
            </li>
            <li>
              <b>{orders.orders.filter((o) => o.status === "partial" || o.status === "refunded").length}</b> refunded order(s)
              <button className="ad-link" onClick={() => go("orders")}>
                View
              </button>
            </li>
            <li>
              <b>{orders.orders.filter((o) => o.status === "expired").length}</b> abandoned checkout(s)
              <button className="ad-link" onClick={() => go("reports")}>
                Report
              </button>
            </li>
          </ul>
        </Card>
      </div>

      <div className="ad-grid2">
        <Card title="Recent orders">
          {orders.orders.length === 0 ? (
            <p className="ad-empty">No orders yet.</p>
          ) : (
            <table className="ad-table">
              <tbody>
                {orders.orders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.name || o.email || "Guest"}
                      <small>{when(o.created)}</small>
                    </td>
                    <td>
                      <StatusPill s={o.status} />
                    </td>
                    <td>{cash(o.total, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="ad-link" onClick={() => go("orders")}>
            All orders →
          </button>
        </Card>
        <Card title="Most viewed ebooks" note="Last 30 days">
          {!s || s.products.length === 0 ? (
            <p className="ad-empty">No ebook views yet.</p>
          ) : (
            <table className="ad-table">
              <tbody>
                {s.products.slice(0, 6).map((p) => {
                  const info = names.get(p.id) ?? ORIGINAL.find((o) => o.id === p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        {info ? (
                          <a href={productHref(info)} target="_blank" rel="noreferrer">
                            {info.title}
                          </a>
                        ) : (
                          `Ebook ${p.id}`
                        )}
                      </td>
                      <td>{num(p.views)} views</td>
                      <td>{num(p.cart)} in cart</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <button className="ad-link" onClick={() => go("analytics")}>
            Full analytics →
          </button>
        </Card>
      </div>
    </div>
  );
}

function Settings({ setup }: { setup: Setup }) {
  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Settings</h1>
          <p>Connection status and setup steps.</p>
        </div>
      </header>
      <Card title="Status">
        <ul className="ad-status">
          <li className="ok">Admin password is set</li>
          <li className={setup.db ? "ok" : "bad"}>Database tables {setup.db ? "found" : "not created yet"}</li>
          <li className={setup.adminKey ? "ok" : "bad"}>Supabase secret key {setup.adminKey ? "found" : "not added yet"}</li>
          <li className={setup.stripe ? "ok" : "bad"}>
            Stripe payments: {setup.stripe ? `${setup.stripe === "live" ? "live" : "test (sandbox)"} key found` : "no key found"}
          </li>
        </ul>
      </Card>
      {!(setup.db && setup.adminKey) && (
        <Card title="Connect Supabase (about 3 minutes)">
          <ol className="ad-steps">
            <li>
              In Supabase open your project, then <b>SQL Editor → New query</b>. Paste the setup script below and press <b>Run</b>. It creates the tables and keeps them private.
              <br />
              <button type="button" className="ad-btn ghost sm" onClick={() => navigator.clipboard.writeText(SCHEMA_SQL)}>
                Copy setup script
              </button>
            </li>
            <li>
              In Supabase open <b>Project Settings → API Keys</b> and copy the <b>secret</b> key (it starts with <code>sb_secret_</code>). Never share it or paste it in public.
            </li>
            <li>
              In Cloudflare open <b>Workers &amp; Pages → positive-autism-website → Settings → Variables and Secrets</b>. Add a secret named <code>SUPABASE_SECRET_KEY</code> with that key.
            </li>
            <li>
              Open <b>Deployments</b>, then the latest one, and press <b>Retry deployment</b>. Reload this page when it finishes.
            </li>
          </ol>
        </Card>
      )}
      <Card title="Good to know">
        <p className="ad-fine">
          Orders are read live from Stripe, so refunds and payment status always match your Stripe dashboard. To change the admin password, edit the ADMIN_PASSWORD secret in Cloudflare and redeploy. Everyone signed in is signed out.
        </p>
      </Card>
    </div>
  );
}
