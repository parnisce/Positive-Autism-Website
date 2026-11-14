import { useEffect, useMemo, useState } from "react";
import { PrefsProvider, usePrefs } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import "./shop.css";
import { CartProvider, useCart } from "./cart";
import { CATEGORIES, PRODUCTS, categoryName, formatPrice, getProduct, type Product } from "./catalog";
import { SHOP_COPY } from "./strings";

const PAGE_SIZE = 24;
type Sort = "newest" | "low" | "high" | "az";

export const useShopCopy = () => SHOP_COPY[usePrefs().lang];

/* ------------------------------------------------------------------ cart */

export function CartFab() {
  const s = useShopCopy();
  const { ids, setOpen } = useCart();
  return (
    <button type="button" className="pa-cart-fab" onClick={() => setOpen(true)} aria-label={`${s.cartOpen}. ${s.cartCount.replace("{n}", String(ids.length))}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M2 3h3l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 7H6" />
      </svg>
      <span>{s.cart}</span>
      {ids.length > 0 && <b>{ids.length}</b>}
    </button>
  );
}

export function CartDrawer() {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const { ids, remove, open, setOpen } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = ids.map((id) => getProduct(id)).filter((p): p is Product => !!p);
  const total = items.reduce((sum, p) => sum + p.price, 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: items.map((p) => p.id), lang }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; code?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.code === "not_configured" ? s.notConfigured : s.error);
    } catch {
      setError(s.error);
    }
    setBusy(false);
  }

  return (
    <div className={`pa-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
      <button type="button" className="pa-drawer-scrim" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} aria-label={s.cartClose} />
      <aside className="pa-drawer-panel" role="dialog" aria-modal="true" aria-label={s.cart}>
        <header>
          <h2>{s.cart}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label={s.cartClose} tabIndex={open ? 0 : -1}>
            ×
          </button>
        </header>
        {items.length === 0 ? (
          <p className="pa-drawer-empty">{s.cartEmpty}</p>
        ) : (
          <ul className="pa-drawer-list">
            {items.map((p) => (
              <li key={p.id}>
                <img src={p.img} alt="" width={64} height={64} />
                <div>
                  <strong>{p.title}</strong>
                  <span>{formatPrice(p.price, lang, s.free)}</span>
                </div>
                <button type="button" onClick={() => remove(p.id)} tabIndex={open ? 0 : -1}>
                  {s.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <footer>
          <p className="pa-drawer-total">
            <span>{s.subtotal}</span>
            <strong>{formatPrice(total, lang, s.free)}</strong>
          </p>
          <button type="button" className="pa-drawer-pay" disabled={busy || items.length === 0 || total <= 0} onClick={checkout} tabIndex={open ? 0 : -1}>
            {busy ? s.redirecting : s.checkout}
          </button>
          <p className="pa-drawer-note" role="status">
            {error || s.secure}
          </p>
        </footer>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ catalogue */

function ProductCard({ p }: { p: Product }) {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const { has, add, remove, setOpen } = useCart();
  const inCart = has(p.id);
  const free = p.price <= 0;
  return (
    <article className="pa-prod">
      <div className="pa-prod-img">
        <img src={p.img} alt={p.title} width={300} height={300} loading="lazy" />
        <span className={`pa-prod-price${free ? " is-free" : ""}`}>{formatPrice(p.price, lang, s.free)}</span>
      </div>
      <div className="pa-prod-body">
        <ul className="pa-prod-cats">
          {p.cats.slice(0, 2).map((c) => (
            <li key={c}>{categoryName(c)}</li>
          ))}
        </ul>
        <h3>{p.title}</h3>
        {p.subtitle && <p className="pa-prod-sub">{p.subtitle}</p>}
        <details>
          <summary>{s.details}</summary>
          <p>{p.desc}</p>
        </details>
        {free ? (
          <a className="pa-prod-btn" href="#stay-connected">
            {s.getFree}
          </a>
        ) : inCart ? (
          <div className="pa-prod-actions">
            <button type="button" className="pa-prod-btn is-added" onClick={() => setOpen(true)}>
              ✓ {s.added}
            </button>
            <button type="button" className="pa-prod-link" onClick={() => remove(p.id)}>
              {s.remove}
            </button>
          </div>
        ) : (
          <button type="button" className="pa-prod-btn" onClick={() => add(p.id)}>
            {s.add}
          </button>
        )}
      </div>
    </article>
  );
}

function Shop({ initialQ, cancelled }: { initialQ: string; cancelled: boolean }) {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const [q, setQ] = useState(initialQ);
  const [cats, setCats] = useState<string[]>([]);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const haystack = useMemo(
    () => new Map(PRODUCTS.map((p) => [p.id, `${p.title} ${p.subtitle} ${p.desc} ${p.cats.map(categoryName).join(" ")}`.toLowerCase()])),
    [],
  );

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const lo = min === "" ? 0 : Math.round(parseFloat(min) * 100);
    const hi = max === "" ? Infinity : Math.round(parseFloat(max) * 100);
    const list = PRODUCTS.filter(
      (p) =>
        (!cats.length || p.cats.some((c) => cats.includes(c))) &&
        p.price >= (Number.isFinite(lo) ? lo : 0) &&
        p.price <= (Number.isFinite(hi) ? hi : Infinity) &&
        terms.every((t) => haystack.get(p.id)!.includes(t)),
    );
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => b.id - a.id);
    if (sort === "low") sorted.sort((a, b) => a.price - b.price || b.id - a.id);
    if (sort === "high") sorted.sort((a, b) => b.price - a.price || b.id - a.id);
    if (sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [q, cats, min, max, sort, haystack]);

  useEffect(() => setVisible(PAGE_SIZE), [q, cats, min, max, sort]);

  const toggleCat = (slug: string) => setCats((cur) => (cur.includes(slug) ? cur.filter((c) => c !== slug) : [...cur, slug]));
  const hasFilters = !!(q || cats.length || min || max);
  const reset = () => {
    setQ("");
    setCats([]);
    setMin("");
    setMax("");
  };
  const setPrice = (lo: string, hi: string) => {
    setMin(lo);
    setMax(hi);
  };
  const priceChip = (label: string, lo: string, hi: string) => (
    <button type="button" className={`pa-chip${min === lo && max === hi ? " is-on" : ""}`} onClick={() => setPrice(lo, hi)}>
      {label}
    </button>
  );

  return (
    <main id="main" className="pa-shop">
      <div className="pa-wrap">
        <header className="pa-shop-head">
          <h1>{s.title}</h1>
          <p>{s.intro}</p>
        </header>
        {cancelled && <p className="pa-shop-note">{s.cancelled}</p>}

        <div className="pa-shop-bar">
          <label className="pa-search">
            <span className="pa-sr">{s.searchLabel}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.searchPlaceholder} autoComplete="off" />
          </label>
          <label className="pa-sort">
            <span>{s.sortLabel}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {(Object.keys(s.sorts) as Sort[]).map((k) => (
                <option key={k} value={k}>
                  {s.sorts[k]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="pa-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
            {s.filters}
            {cats.length + (min || max ? 1 : 0) > 0 && <b>{cats.length + (min || max ? 1 : 0)}</b>}
          </button>
        </div>

        <div className="pa-shop-layout">
          <aside className={`pa-filters${filtersOpen ? " is-open" : ""}`}>
            <section>
              <h2>{s.categories}</h2>
              <ul>
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <label>
                      <input type="checkbox" checked={cats.includes(c.slug)} onChange={() => toggleCat(c.slug)} />
                      <span>{c.name}</span>
                      <em>{c.count}</em>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2>{s.price}</h2>
              <div className="pa-chips">
                {priceChip(s.priceAll, "", "")}
                {priceChip(s.priceFree, "0", "0")}
                {priceChip(`${s.priceUpTo} ${formatPrice(500, lang, s.free)}`, "", "5")}
              </div>
              <div className="pa-price-range">
                <label>
                  <span>{s.min}</span>
                  <input type="number" inputMode="decimal" min={0} step={0.5} value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
                </label>
                <label>
                  <span>{s.max}</span>
                  <input type="number" inputMode="decimal" min={0} step={0.5} value={max} onChange={(e) => setMax(e.target.value)} placeholder="10" />
                </label>
              </div>
            </section>
            {hasFilters && (
              <button type="button" className="pa-reset" onClick={reset}>
                {s.reset}
              </button>
            )}
          </aside>

          <section className="pa-results" aria-live="polite">
            <p className="pa-count">{s.showing.replace("{n}", String(Math.min(visible, results.length))).replace("{total}", String(results.length))}</p>
            {results.length === 0 ? (
              <div className="pa-none">
                <p>{s.none}</p>
                <button type="button" className="pa-reset" onClick={reset}>
                  {s.reset}
                </button>
              </div>
            ) : (
              <div className="pa-prod-grid">
                {results.slice(0, visible).map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
            {visible < results.length && (
              <button type="button" className="pa-more-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                {s.more}
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export function ShopPage({ initialQ = "", cancelled = false }: { initialQ?: string; cancelled?: boolean }) {
  return (
    <PrefsProvider>
      <CartProvider>
        <div className="pa-root pa-scrolled pa-page">
          <SiteHeader />
          <Shop initialQ={initialQ} cancelled={cancelled} />
          <SiteFooter />
          <CartFab />
          <CartDrawer />
        </div>
      </CartProvider>
    </PrefsProvider>
  );
}
