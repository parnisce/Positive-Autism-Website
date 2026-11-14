import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PrefsProvider, usePrefs } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import { scrollToEl, useScrolledHeader, useSmoothScroll } from "../components/pa/useSmoothScroll";
import "./shop.css";
import { CartProvider } from "./cart";
import { CartDrawer, CartFab } from "./CartUI";
import { CATEGORIES, PRODUCTS, categoryName, formatPrice, tintFor, type Product } from "./catalog";
import { ProductCard } from "./ProductCard";
import { useShopCopy } from "./useShopCopy";

gsap.registerPlugin(ScrollTrigger, Flip, useGSAP);

const PAGE_SIZE = 24;
type Sort = "newest" | "low" | "high" | "az";

/** One cover from each of the biggest topics, so the hero shows variety. */
const heroCovers = () => {
  const seen = new Set<number>();
  const out: string[] = [];
  for (const c of CATEGORIES) {
    const p = PRODUCTS.find((x) => x.cats.includes(c.slug) && !seen.has(x.id));
    if (p) {
      seen.add(p.id);
      out.push(p.img);
    }
    if (out.length === 9) break;
  }
  return out;
};
/** A different cover for each topic tile (the first ebook of that topic not already used by an earlier tile). */
const TOPIC_COVERS = (() => {
  const used = new Set<number>();
  const map = new Map<string, string>();
  for (const c of CATEGORIES) {
    const list = PRODUCTS.filter((p) => p.cats.includes(c.slug));
    const pick = list.find((p) => !used.has(p.id)) ?? list[0];
    if (pick) {
      used.add(pick.id);
      map.set(c.slug, pick.img);
    }
  }
  return map;
})();
const topicCover = (slug: string) => TOPIC_COVERS.get(slug);

/* ------------------------------------------------------------------ hero */

function ShopHero({ q, setQ, onSearch, onTopic }: { q: string; setQ: (v: string) => void; onSearch: () => void; onTopic: (slug: string) => void }) {
  const s = useShopCopy();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dispose: (() => void) | undefined;
    let trigger: ScrollTrigger | undefined;
    let cancelled = false;
    import("./ShopScene").then(({ mountShopScene }) => {
      if (cancelled) return;
      const scene = mountShopScene(canvas, heroCovers(), reduce);
      if (!scene) {
        canvas.style.display = "none";
        return;
      }
      dispose = scene.dispose;
      if (!reduce) {
        trigger = ScrollTrigger.create({
          trigger: canvas.parentElement,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
          onUpdate: (self) => (scene.state.scroll = self.progress),
        });
      }
    });
    return () => {
      cancelled = true;
      trigger?.kill();
      dispose?.();
    };
  }, []);

  return (
    <section className="pa-s-hero" id="shop-top">
      <canvas ref={canvasRef} className="pa-s-scene" aria-hidden="true" />
      <div className="pa-wrap pa-s-hero-in">
        <div className="pa-s-hero-copy">
          <p className="pa-eyebrow pa-s-fade">{s.eyebrow}</p>
          <h1 className="pa-s-fade">{s.heroTitle}</h1>
          <p className="pa-lead pa-s-fade">{s.heroSub}</p>
          <form
            className="pa-s-herosearch pa-s-fade"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
          >
            <label>
              <span className="pa-sr">{s.searchLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.heroSearch} autoComplete="off" />
            </label>
            <button type="submit">{s.heroGo}</button>
          </form>
          <div className="pa-s-popular pa-s-fade">
            <span>{s.popular}</span>
            {CATEGORIES.slice(0, 4).map((c) => (
              <button key={c.slug} type="button" onClick={() => onTopic(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <p className="pa-s-stats pa-s-fade">
            <b>{PRODUCTS.length}</b> {s.statEbooks} <i>·</i> <b>{CATEGORIES.length}</b> {s.statTopics}
          </p>
        </div>
      </div>
      <a className="pa-s-scrollcue pa-s-fade" href="#browse">
        <span>{s.scroll}</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ topics */

function Topics({ active, onTopic }: { active: string[]; onTopic: (slug: string) => void }) {
  const s = useShopCopy();
  const strip = useRef<HTMLDivElement>(null);
  const go = (dir: number) => strip.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  return (
    <section className="pa-s-topics">
      <div className="pa-wrap">
        <div className="pa-s-head">
          <div>
            <h2 className="pa-h2">{s.topicsTitle}</h2>
            <p className="pa-sub">{s.topicsSub}</p>
          </div>
          <div className="pa-s-arrows">
            <button type="button" onClick={() => go(-1)} aria-label={s.prev}>
              ←
            </button>
            <button type="button" onClick={() => go(1)} aria-label={s.next}>
              →
            </button>
          </div>
        </div>
      </div>
      <div className="pa-s-strip" ref={strip}>
        {CATEGORIES.map((c, i) => (
          <button
            key={c.slug}
            type="button"
            className={`pa-s-topic${active.includes(c.slug) ? " is-on" : ""}`}
            style={{ "--tint": tintFor(c.slug) } as React.CSSProperties}
            onClick={() => onTopic(c.slug)}
          >
            {topicCover(c.slug) && <img src={topicCover(c.slug)} alt="" loading="lazy" width={300} height={300} />}
            <span className="pa-s-topic-n">{String(i + 1).padStart(2, "0")}</span>
            <strong>{c.name}</strong>
            <em>{c.count === 1 ? s.topicOne : s.topicEbooks.replace("{n}", String(c.count))}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ browse */

function Browse({ q, setQ, cats, setCats, min, setMin, max, setMax, sort, setSort, visible, setVisible, results, mutate, gridRef }: {
  q: string;
  setQ: (v: string) => void;
  cats: string[];
  setCats: React.Dispatch<React.SetStateAction<string[]>>;
  min: string;
  setMin: (v: string) => void;
  max: string;
  setMax: (v: string) => void;
  sort: Sort;
  setSort: (v: Sort) => void;
  visible: number;
  setVisible: React.Dispatch<React.SetStateAction<number>>;
  results: Product[];
  mutate: (fn: () => void) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
}) {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasFilters = !!(q || cats.length || min || max);
  const filterCount = cats.length + (min || max ? 1 : 0);
  const toggleCat = (slug: string) => mutate(() => setCats((cur) => (cur.includes(slug) ? cur.filter((c) => c !== slug) : [...cur, slug])));
  const reset = () =>
    mutate(() => {
      setQ("");
      setCats([]);
      setMin("");
      setMax("");
    });
  const setPrice = (lo: string, hi: string) =>
    mutate(() => {
      setMin(lo);
      setMax(hi);
    });
  const chip = (label: string, lo: string, hi: string) => (
    <button type="button" className={`pa-chip${min === lo && max === hi ? " is-on" : ""}`} onClick={() => setPrice(lo, hi)}>
      {label}
    </button>
  );

  return (
    <section className="pa-s-shop" id="shop-grid">
      <div className="pa-wrap">
        <div className="pa-s-bar">
          <label className="pa-s-search">
            <span className="pa-sr">{s.searchLabel}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" value={q} onChange={(e) => mutate(() => setQ(e.target.value))} placeholder={s.searchPlaceholder} autoComplete="off" />
          </label>
          <label className="pa-s-sort">
            <span>{s.sortLabel}</span>
            <select value={sort} onChange={(e) => mutate(() => setSort(e.target.value as Sort))}>
              {(Object.keys(s.sorts) as Sort[]).map((k) => (
                <option key={k} value={k}>
                  {s.sorts[k]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="pa-s-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
            {s.filters}
            {filterCount > 0 && <b>{filterCount}</b>}
          </button>
        </div>

        <div className="pa-s-layout">
          <aside className={`pa-s-filters${filtersOpen ? " is-open" : ""}`} data-lenis-prevent>
            <section>
              <h2>{s.categories}</h2>
              <ul>
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <label>
                      <input type="checkbox" checked={cats.includes(c.slug)} onChange={() => toggleCat(c.slug)} />
                      <i style={{ background: tintFor(c.slug) }} aria-hidden="true" />
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
                {chip(s.priceAll, "", "")}
                {chip(s.priceFree, "0", "0")}
                {chip(`${s.priceUpTo} ${formatPrice(500, lang, s.free)}`, "", "5")}
              </div>
              <div className="pa-price-range">
                <label>
                  <span>{s.min}</span>
                  <input type="number" inputMode="decimal" min={0} step={0.5} value={min} onChange={(e) => mutate(() => setMin(e.target.value))} placeholder="0" />
                </label>
                <label>
                  <span>{s.max}</span>
                  <input type="number" inputMode="decimal" min={0} step={0.5} value={max} onChange={(e) => mutate(() => setMax(e.target.value))} placeholder="10" />
                </label>
              </div>
            </section>
          </aside>

          <div className="pa-s-results" aria-live="polite">
            <div className="pa-s-meta">
              <p>{s.showing.replace("{n}", String(Math.min(visible, results.length))).replace("{total}", String(results.length))}</p>
              {hasFilters && (
                <div className="pa-s-pills" aria-label={s.activeFilters}>
                  {q && (
                    <button type="button" onClick={() => mutate(() => setQ(""))}>
                      “{q}” ×
                    </button>
                  )}
                  {cats.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCat(c)}>
                      {categoryName(c)} ×
                    </button>
                  ))}
                  {(min || max) && (
                    <button type="button" onClick={() => setPrice("", "")}>
                      {min || "0"}–{max || "∞"} ×
                    </button>
                  )}
                  <button type="button" className="pa-s-clear" onClick={reset}>
                    {s.reset}
                  </button>
                </div>
              )}
            </div>
            {results.length === 0 ? (
              <div className="pa-s-none">
                <strong>{s.none}</strong>
                <p>{s.noneHint}</p>
                <button type="button" className="pa-s-btn" onClick={reset}>
                  {s.reset}
                </button>
              </div>
            ) : (
              <div className="pa-s-grid" ref={gridRef}>
                {results.slice(0, visible).map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
            {visible < results.length && (
              <button type="button" className="pa-s-more-btn" onClick={() => mutate(() => setVisible((v) => v + PAGE_SIZE))}>
                {s.more}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const s = useShopCopy();
  return (
    <section className="pa-s-how">
      <div className="pa-wrap">
        <h2 className="pa-h2">{s.howTitle}</h2>
        <ol className="pa-s-steps">
          {s.steps.map((st, i) => (
            <li key={st.t} style={{ "--tint": `var(--pa-tint-${[1, 3, 4][i]})` } as React.CSSProperties}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{st.t}</h3>
              <p>{st.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ page */

function Shop({ initialQ, initialCat, cancelled }: { initialQ: string; initialCat: string; cancelled: boolean }) {
  const s = useShopCopy();
  const rootRef = useRef<HTMLDivElement>(null);
  useSmoothScroll();
  useScrolledHeader(rootRef);

  const [q, setQ] = useState(initialQ);
  const [cats, setCats] = useState<string[]>(initialCat && CATEGORIES.some((c) => c.slug === initialCat) ? [initialCat] : []);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /** Capture card positions before a change, so the grid can glide to its new layout afterwards. */
  const mutate = (fn: () => void) => {
    if (!reduced.current && gridRef.current) flipState.current = Flip.getState(gridRef.current.querySelectorAll("[data-flip-id]"));
    fn();
  };

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

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    Flip.from(state, {
      duration: 0.6,
      ease: "power3.inOut",
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.45, delay: 0.15, stagger: 0.025 }),
    });
  }, [results, visible]);

  // hero builds in, then dims as the shop slides over it
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".pa-header-in > *", { autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: "power3.out" });
        gsap.from(".pa-s-fade", { autoAlpha: 0, scale: 0.96, duration: 0.9, stagger: 0.1, ease: "power3.out", delay: 0.15 });
        gsap.fromTo(".pa-s-hero", { "--cover": 0 }, { "--cover": 0.6, ease: "none", scrollTrigger: { trigger: ".pa-s-main", start: "top bottom", end: "top top", scrub: true } });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const toGrid = () => window.setTimeout(() => scrollToEl(document.getElementById("shop-grid"), -150), 60);
  const onTopic = (slug: string) => {
    mutate(() => setCats((cur) => (cur.length === 1 && cur[0] === slug ? [] : [slug])));
    toGrid();
  };

  return (
    <div className="pa-root pa-page pa-shop-root" ref={rootRef}>
      <SiteHeader />
      <main id="main">
        <div className="pa-s-stage">
          <ShopHero q={q} setQ={(v) => mutate(() => setQ(v))} onSearch={toGrid} onTopic={onTopic} />
          <div className="pa-s-main" id="browse">
            {cancelled && <p className="pa-shop-note pa-s-note">{s.cancelled}</p>}
            <Topics active={cats} onTopic={onTopic} />
            <Browse
              q={q}
              setQ={setQ}
              cats={cats}
              setCats={setCats}
              min={min}
              setMin={setMin}
              max={max}
              setMax={setMax}
              sort={sort}
              setSort={setSort}
              visible={visible}
              setVisible={setVisible}
              results={results}
              mutate={mutate}
              gridRef={gridRef}
            />
            <HowItWorks />
          </div>
        </div>
      </main>
      <SiteFooter />
      <CartFab />
      <CartDrawer />
    </div>
  );
}

export function ShopPage({ initialQ = "", initialCat = "", cancelled = false }: { initialQ?: string; initialCat?: string; cancelled?: boolean }) {
  return (
    <PrefsProvider>
      <CartProvider>
        <Shop initialQ={initialQ} initialCat={initialCat} cancelled={cancelled} />
      </CartProvider>
    </PrefsProvider>
  );
}
