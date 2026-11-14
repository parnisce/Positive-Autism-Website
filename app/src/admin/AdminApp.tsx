import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ORIGINAL, productHref, type ProductEdit } from "../shop/catalog";
import { api, getStatus, money, type Setup, type Status } from "./api";
import { BlogTab } from "./BlogTab";
import { ContentTab } from "./ContentTab";
import { mergeProducts, ProductsTab } from "./ProductsTab";
import "./admin.css";

type Tab = "overview" | "pages" | "blog" | "ebooks" | "settings";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "pages", label: "Pages and text", icon: "✎" },
  { id: "blog", label: "Blog", icon: "❝" },
  { id: "ebooks", label: "Ebooks", icon: "▤" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function AdminApp() {
  const [st, setSt] = useState<Status | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    getStatus().then(setSt).catch(() => setSt({ auth: false, setup: { password: false, db: false, stripe: null } }));
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
        <p className="ad-fine">Database attached: {setup.db ? "yes" : "not yet (see Settings after signing in)"}</p>
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
        <img src="/assets/img/logo.png" alt="Positive Autism" width={190} height={48} />
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
  const [tab, setTab] = useState<Tab>(() => (typeof location !== "undefined" && (location.hash.slice(1) as Tab)) || "overview");
  useEffect(() => {
    history.replaceState(null, "", `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab]);
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
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <i aria-hidden="true">{t.icon}</i>
              {t.label}
            </button>
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
        {!setup.db && tab !== "settings" ? <NoDb go={() => setTab("settings")} /> : null}
        {setup.db && tab === "overview" && <Overview />}
        {setup.db && tab === "pages" && <ContentTab />}
        {setup.db && tab === "blog" && <BlogTab />}
        {setup.db && tab === "ebooks" && <ProductsTab />}
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
        <p>Saving text, blog posts, ebooks and analytics needs a small Cloudflare database. It is free and takes about two minutes.</p>
        <button className="ad-btn" onClick={go}>
          Show me how
        </button>
      </div>
    </div>
  );
}

type Stats = {
  totals: { views: number; visitors: number; productViews: number; cart: number; buy: number };
  daily: { day: string; views: number; visitors: number }[];
  pages: { key: string; n: number }[];
  products: { id: number; views: number; cart: number; buy: number }[];
  refs: { key: string; n: number }[];
  countries: { key: string; n: number }[];
};

const num = (n: number) => new Intl.NumberFormat("en").format(n);

function Overview() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    setS(null);
    api<Stats>("stats", { days }).then(setS).catch(() => setErr("Could not load the numbers."));
  }, [days]);
  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const names = useMemo(() => new Map(mergeProducts(edits).map((p) => [p.id, p])), [edits]);
  const max = Math.max(1, ...(s?.daily.map((d) => d.views) ?? [1]));

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Overview</h1>
          <p>See which pages and ebooks visitors look at the most. Your own visits from this browser are not counted.</p>
        </div>
        <div className="ad-seg" role="group" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>
              {d} days
            </button>
          ))}
        </div>
      </header>
      {err && <p className="ad-note">{err}</p>}
      {!s && !err && <p className="ad-note">Loading…</p>}
      {s && (
        <>
          <div className="ad-kpis">
            <Kpi label="Page views" v={s.totals.views} />
            <Kpi label="Visitors" v={s.totals.visitors} hint="visits, one per browsing session" />
            <Kpi label="Ebook page views" v={s.totals.productViews} />
            <Kpi label="Added to cart" v={s.totals.cart} />
            <Kpi label="Started checkout" v={s.totals.buy} />
          </div>

          <section className="ad-card">
            <h2>Views per day</h2>
            <div className="ad-chart" role="img" aria-label="Daily page views">
              {s.daily.map((d) => (
                <div key={d.day} className="ad-bar" title={`${d.day}: ${d.views} views, ${d.visitors} visitors`}>
                  <i style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="ad-axis">
              <span>{s.daily[0]?.day}</span>
              <span>{s.daily[s.daily.length - 1]?.day}</span>
            </div>
          </section>

          <div className="ad-two">
            <section className="ad-card">
              <h2>Most viewed ebooks</h2>
              {s.products.length === 0 && <p className="ad-empty">No ebook views yet.</p>}
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Ebook</th>
                    <th>Views</th>
                    <th>Cart</th>
                    <th>Checkout</th>
                  </tr>
                </thead>
                <tbody>
                  {s.products.map((p) => {
                    const info = names.get(p.id) ?? ORIGINAL.find((o) => o.id === p.id);
                    return (
                      <tr key={p.id}>
                        <td>
                          {info ? (
                            <a href={productHref(info)} target="_blank" rel="noreferrer">
                              {info.title}
                            </a>
                          ) : (
                            `Ebook ${p.id} (removed)`
                          )}
                          {info && <small>{money(info.price)}</small>}
                        </td>
                        <td>{num(p.views)}</td>
                        <td>{num(p.cart)}</td>
                        <td>{num(p.buy)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            <section className="ad-card">
              <h2>Most viewed pages</h2>
              {s.pages.length === 0 && <p className="ad-empty">No page views yet. They appear as visitors browse the site.</p>}
              <Bars rows={s.pages.map((p) => ({ label: p.key === "/" ? "Home" : p.key.replace(/^\/shop\/ebook\/(.*)-\d+$/, "Ebook: $1"), n: p.n, href: p.key }))} />
            </section>
          </div>
          <div className="ad-two">
            <section className="ad-card">
              <h2>Where visitors come from</h2>
              {s.refs.length === 0 ? <p className="ad-empty">Direct visits only so far.</p> : <Bars rows={s.refs.map((r) => ({ label: r.key, n: r.n }))} />}
            </section>
            <section className="ad-card">
              <h2>Countries</h2>
              {s.countries.length === 0 ? <p className="ad-empty">No data yet.</p> : <Bars rows={s.countries.map((r) => ({ label: countryName(r.key), n: r.n }))} />}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

const countryName = (cc: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc;
  } catch {
    return cc;
  }
};

function Kpi({ label, v, hint }: { label: string; v: number; hint?: string }) {
  return (
    <div className="ad-kpi" title={hint}>
      <strong>{num(v)}</strong>
      <span>{label}</span>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; n: number; href?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="ad-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="ad-bars-fill" style={{ width: `${(r.n / max) * 100}%` }} />
          {r.href ? (
            <a href={r.href} target="_blank" rel="noreferrer">
              {r.label}
            </a>
          ) : (
            <span>{r.label}</span>
          )}
          <b>{num(r.n)}</b>
        </li>
      ))}
    </ul>
  );
}

function Settings({ setup }: { setup: Setup }) {
  const [track, setTrack] = useState(() => {
    try {
      return !localStorage.getItem("pa-notrack");
    } catch {
      return true;
    }
  });
  const flip = () => {
    try {
      if (track) localStorage.setItem("pa-notrack", "1");
      else localStorage.removeItem("pa-notrack");
    } catch {
      /* ignore */
    }
    setTrack(!track);
  };
  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Settings</h1>
          <p>Connection status and setup steps.</p>
        </div>
      </header>
      <section className="ad-card">
        <h2>Status</h2>
        <ul className="ad-status">
          <li className="ok">Admin password is set</li>
          <li className={setup.db ? "ok" : "bad"}>Database {setup.db ? "connected" : "not connected yet"}</li>
          <li className={setup.stripe ? "ok" : "bad"}>
            Stripe payments: {setup.stripe ? `${setup.stripe === "live" ? "live" : "test (sandbox)"} key found` : "no key found"}
          </li>
        </ul>
      </section>
      {!setup.db && (
        <section className="ad-card">
          <h2>Connect the database (about 2 minutes, free)</h2>
          <ol className="ad-steps">
            <li>
              In the Cloudflare dashboard open <b>Storage &amp; Databases → D1 SQL Database → Create database</b>. Name it <code>positive-autism</code>.
            </li>
            <li>
              Open <b>Workers &amp; Pages → positive-autism-website → Settings → Bindings → Add → D1 database</b>. Set the variable name to{" "}
              <code>DB</code> and choose the database you just made. Save.
            </li>
            <li>
              Go to <b>Deployments</b>, open the latest deployment and press <b>Retry deployment</b> so the binding is picked up.
            </li>
            <li>Reload this page. The tables are created automatically.</li>
          </ol>
        </section>
      )}
      <section className="ad-card">
        <h2>This browser</h2>
        <label className="ad-check">
          <input type="checkbox" checked={!track} onChange={flip} />
          Do not count my own visits in the analytics
        </label>
        <p className="ad-fine">To change the admin password, edit the ADMIN_PASSWORD secret in Cloudflare and redeploy. Everyone signed in is signed out.</p>
      </section>
    </div>
  );
}
