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
import { Card, OrdersNotice, RankList, cash, num, ranked, useOrders, useStats } from "./ui";
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

const ago = (ms: number) => {
  const m = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d === 1 ? "" : "s"} ago` : new Date(ms).toLocaleDateString("en", { month: "short", day: "numeric" });
};

/** Today at a glance: what happened, what needs doing, and shortcuts. (Deeper numbers live in Reports and Analytics.) */
function Dashboard({ go }: { go: (t: Tab) => void }) {
  const orders = useOrders();
  const { s } = useStats(7);
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const names = useMemo(() => new Map(mergeProducts(edits).map((p) => [p.id, p])), [edits]);

  const d = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sales = orders.orders.filter(isSale);
    const today = sales.filter((o) => o.created >= start.getTime());
    const week = sales.filter((o) => o.created >= Date.now() - 7 * 86400000);
    const net = (l: typeof sales) => l.reduce((a, o) => a + o.total - o.refunded, 0);
    return {
      todayNet: net(today),
      todayN: today.length,
      weekNet: net(week),
      weekN: week.length,
      pending: orders.orders.filter((o) => o.status === "pending").length,
      refunded: orders.orders.filter((o) => o.status === "refunded" || o.status === "partial").length,
      feed: orders.orders.filter((o) => o.status !== "expired").slice(0, 8),
    };
  }, [orders.orders]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayVisits = s?.daily[s.daily.length - 1]?.visitors ?? 0;
  const ok = orders.state === "ok";

  return (
    <div className="ad-page">
      <section className="ad-welcome">
        <div>
          <small>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</small>
          <h1>{hello} 👋</h1>
          <p>
            {ok
              ? d.todayN
                ? `${d.todayN} order${d.todayN === 1 ? "" : "s"} today, ${cash(d.todayNet)} in sales.`
                : "No orders yet today."
              : "Connect Stripe to see your orders here."}{" "}
            {s ? `${num(todayVisits)} visitor${todayVisits === 1 ? "" : "s"} so far today.` : ""}
          </p>
        </div>
        <div className="ad-today">
          <div>
            <small>Today</small>
            <strong>{ok ? cash(d.todayNet) : "—"}</strong>
          </div>
          <div>
            <small>Last 7 days</small>
            <strong>{ok ? cash(d.weekNet) : "—"}</strong>
            <span>{ok ? `${d.weekN} order${d.weekN === 1 ? "" : "s"}` : ""}</span>
          </div>
        </div>
      </section>
      <OrdersNotice o={orders} />

      <div className="ad-grid2">
        <Card title="Latest activity">
          {d.feed.length === 0 ? (
            <p className="ad-empty">Nothing yet. Orders appear here the moment someone checks out.</p>
          ) : (
            <ul className="ad-feed">
              {d.feed.map((o) => {
                const who = o.name || o.email || "Someone";
                const verb = o.status === "pending" ? "started a checkout for" : o.status === "refunded" || o.status === "partial" ? "was refunded for" : "bought";
                return (
                  <li key={o.id}>
                    <span className="ad-av" aria-hidden="true">
                      {who.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <b>{who}</b> {verb} {o.items[0]?.title ?? "an ebook"}
                      {o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}
                      <small>{ago(o.created)}</small>
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

        <div className="ad-stack">
          <Card title="Quick actions">
            <div className="ad-quick">
              <button onClick={() => go("ebooks")}>📚 Add an ebook</button>
              <button onClick={() => go("blog")}>✍ Write a post</button>
              <button onClick={() => go("pages")}>📝 Edit page text</button>
              <button onClick={() => go("reports")}>📈 Sales report</button>
            </div>
          </Card>
          <Card title="Needs attention">
            <ul className="ad-todo">
              <li>
                <b>{ok ? d.pending : "—"}</b> waiting for payment
                <button className="ad-link" onClick={() => go("orders")}>
                  View
                </button>
              </li>
              <li>
                <b>{ok ? d.refunded : "—"}</b> refunded
                <button className="ad-link" onClick={() => go("orders")}>
                  View
                </button>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Card title="Most viewed ebooks this week" note="Last 7 days">
        <RankList
          empty="No ebook views yet."
          rows={ranked(
            (s?.products ?? [])
              .filter((p) => p.views > 0)
              .slice(0, 6)
              .map((p) => ({ key: String(p.id), n: p.views })),
            (id) => names.get(Number(id))?.title ?? ORIGINAL.find((o) => o.id === Number(id))?.title ?? `Ebook ${id}`,
            (id) => {
              const p = names.get(Number(id)) ?? ORIGINAL.find((o) => o.id === Number(id));
              return p ? productHref(p) : undefined;
            },
          )}
        />
      </Card>
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
