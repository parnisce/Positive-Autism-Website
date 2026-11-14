import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PrefsProvider, usePrefs } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import { useScrolledHeader, useSmoothScroll } from "../components/pa/useSmoothScroll";
import TiltedCard from "../components/react-bits/TiltedCard";
import "./shop.css";
import { CartProvider, useCart } from "./cart";
import { CartDrawer, CartFab } from "./CartUI";
import { PRODUCTS, categoryName, formatPrice, tintFor, type Details, type Product } from "./catalog";
import { startCheckout } from "./checkout-client";
import { flyToCart } from "./fly";
import { ProductCard } from "./ProductCard";
import { useShopCopy } from "./useShopCopy";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function BuyBox({ p, id }: { p: Product; id?: string }) {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const { has, add, setOpen } = useCart();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const free = p.price <= 0;
  const inCart = has(p.id);

  async function buyNow() {
    setBusy(true);
    setMsg("");
    const r = await startCheckout([p.id], lang);
    if (r === "redirected") return;
    setMsg(r === "not_configured" ? s.notConfigured : s.error);
    setBusy(false);
  }

  return (
    <div className="pa-pp-buy" id={id}>
      <p className="pa-pp-price">{formatPrice(p.price, lang, s.free)}</p>
      {free ? (
        <>
          <p className="pa-pp-freenote">{s.freeNote}</p>
          <a className="pa-s-btn" href="#stay-connected">
            {s.getFree}
          </a>
        </>
      ) : (
        <div className="pa-pp-buttons">
          {inCart ? (
            <button type="button" className="pa-s-btn is-added" onClick={() => setOpen(true)}>
              ✓ {s.added} · {s.inCartGo}
            </button>
          ) : (
            <button
              type="button"
              className="pa-s-btn"
              onClick={() => {
                flyToCart(document.querySelector<HTMLElement>(".pa-pp-cover img"));
                add(p.id);
              }}
            >
              {s.add}
            </button>
          )}
          <button type="button" className="pa-s-btn is-dark" onClick={buyNow} disabled={busy}>
            {busy ? s.redirecting : s.buyNow}
          </button>
        </div>
      )}
      <p className="pa-drawer-note" role="status">
        {msg}
      </p>
    </div>
  );
}

function Product_({ p, details }: { p: Product; details?: Details | null }) {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const { has, add, setOpen } = useCart();
  const rootRef = useRef<HTMLDivElement>(null);
  const buyRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useSmoothScroll();
  useScrolledHeader(rootRef);

  const paras = details?.paras?.length ? details.paras : [p.desc];
  const tags = details?.tags ?? [];
  const related = PRODUCTS.filter((x) => x.id !== p.id && x.cats.includes(p.cats[0])).slice(0, 4);
  const free = p.price <= 0;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [p.id]);

  // the mini buy bar appears once the main buttons have scrolled away
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [p.id]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".pa-header-in > *", { autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: "power3.out" });
        gsap.from(".pa-pp-fade", { autoAlpha: 0, scale: 0.96, duration: 0.85, stagger: 0.09, ease: "power3.out", delay: 0.1 });
        gsap.from(".pa-pp-cover", { autoAlpha: 0, scale: 0.85, rotate: -5, duration: 1.1, ease: "back.out(1.4)", delay: 0.15 });
        gsap.to(".pa-pp-blob", { yPercent: -14, rotate: 8, ease: "none", scrollTrigger: { trigger: ".pa-pp-top", start: "top top", end: "bottom top", scrub: true } });
        gsap.utils.toArray<HTMLElement>(".pa-pp-rise").forEach((el) =>
          gsap.from(el, { autoAlpha: 0, y: 50, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }),
        );
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [p.id] },
  );

  return (
    <div className="pa-root pa-page pa-shop-root pa-pp-root" ref={rootRef} style={{ "--tint": tintFor(p.cats[0]) } as React.CSSProperties}>
      <SiteHeader />
      <main id="main">
        <section className="pa-pp-top">
          <span className="pa-pp-blob" aria-hidden="true" />
          <span className="pa-seam pa-seam-a" aria-hidden="true" style={{ top: "auto", bottom: 70 }} />
          <div className="pa-wrap pa-pp-grid">
            <nav className="pa-pp-crumbs pa-pp-fade" aria-label="Breadcrumb">
              <Link to="/shop">{s.crumb}</Link>
              <i>/</i>
              <Link to="/shop" search={{ cat: p.cats[0] }}>
                {categoryName(p.cats[0])}
              </Link>
            </nav>
            <div className="pa-pp-cover">
              <TiltedCard
                imageSrc={p.img}
                altText={p.title}
                containerWidth="100%"
                containerHeight="100%"
                imageWidth="100%"
                imageHeight="100%"
                radius={26}
                rotateAmplitude={12}
                scaleOnHover={1.05}
                glare={0.3}
                shadow={0.6}
              />
              <span className={`pa-s-sticker pa-pp-sticker${free ? " is-free" : ""}`}>{formatPrice(p.price, lang, s.free)}</span>
            </div>
            <div className="pa-pp-info">
              <ul className="pa-s-cats pa-pp-fade">
                {p.cats.map((c) => (
                  <li key={c}>
                    <Link to="/shop" search={{ cat: c }}>
                      {categoryName(c)}
                    </Link>
                  </li>
                ))}
              </ul>
              <h1 className="pa-pp-fade">{p.title}</h1>
              {p.subtitle && <p className="pa-pp-sub pa-pp-fade">{p.subtitle}</p>}
              <div className="pa-pp-fade" ref={buyRef}>
                <BuyBox p={p} />
              </div>
              <ul className="pa-pp-good pa-pp-fade">
                {s.good.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="pa-pp-about">
          <div className="pa-wrap pa-pp-aboutgrid">
            <div className="pa-pp-text pa-pp-rise">
              <h2 className="pa-h2">{s.overview}</h2>
              {paras.map((t, i) => (
                <p key={i} className={i === 0 ? "is-lead" : undefined}>
                  {t}
                </p>
              ))}
            </div>
            <aside className="pa-pp-side pa-pp-rise">
              <h3>{s.topicsLabel}</h3>
              <div className="pa-pp-chips">
                {p.cats.map((c) => (
                  <Link key={c} to="/shop" search={{ cat: c }} style={{ "--tint": tintFor(c) } as React.CSSProperties}>
                    {categoryName(c)}
                  </Link>
                ))}
              </div>
              {tags.length > 0 && (
                <>
                  <h3>{s.tagsLabel}</h3>
                  <div className="pa-pp-chips is-plain">
                    {tags.map((t) => (
                      <Link key={t} to="/shop" search={{ q: t }}>
                        {t}
                      </Link>
                    ))}
                  </div>
                </>
              )}
              <h3>{s.goodTitle}</h3>
              <ul className="pa-pp-good">
                {s.good.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        {related.length > 0 && (
          <section className="pa-pp-related">
            <div className="pa-wrap">
              <div className="pa-s-head pa-pp-rise">
                <h2 className="pa-h2">{s.related}</h2>
                <Link className="pa-more" to="/shop" search={{ cat: p.cats[0] }}>
                  {s.seeAll} →
                </Link>
              </div>
              <div className="pa-s-grid is-related">
                {related.map((r) => (
                  <ProductCard key={r.id} p={r} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />

      <div className={`pa-pp-sticky${stuck ? " is-on" : ""}`} aria-hidden={!stuck}>
        <img src={p.img} alt="" width={44} height={44} />
        <strong>{p.title}</strong>
        <span>{formatPrice(p.price, lang, s.free)}</span>
        {!free && (
          <button
            type="button"
            className="pa-s-btn"
            tabIndex={stuck ? 0 : -1}
            onClick={() => (has(p.id) ? setOpen(true) : add(p.id))}
          >
            {has(p.id) ? `✓ ${s.added}` : s.add}
          </button>
        )}
      </div>
      <CartFab />
      <CartDrawer />
    </div>
  );
}

export function ProductPage({ product, details }: { product: Product; details?: Details | null }) {
  return (
    <PrefsProvider>
      <CartProvider>
        <Product_ p={product} details={details} />
      </CartProvider>
    </PrefsProvider>
  );
}

function NotFound() {
  const s = useShopCopy();
  return (
    <div className="pa-root pa-scrolled pa-page">
      <SiteHeader />
      <main id="main" className="pa-shop">
        <div className="pa-wrap pa-success">
          <h1>{s.notFoundTitle}</h1>
          <p>{s.notFoundText}</p>
          <Link className="pa-s-btn" to="/shop">
            {s.back}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function ProductNotFound() {
  return (
    <PrefsProvider>
      <NotFound />
    </PrefsProvider>
  );
}
