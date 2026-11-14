import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { usePrefs } from "../components/pa/prefs";
import { useCart } from "./cart";
import { categoryName, formatPrice, productHref, tintFor, type Product } from "./catalog";
import { flyToCart } from "./fly";
import { useShopCopy } from "./useShopCopy";

/** The book-style card: tinted by topic, cover tilts toward the cursor, price sticker, add-to-cart flies to the cart. */
export function ProductCard({ p }: { p: Product }) {
  const s = useShopCopy();
  const { lang } = usePrefs();
  const { has, add, setOpen } = useCart();
  const coverRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const inCart = has(p.id);
  const free = p.price <= 0;

  const tilt = (e: React.PointerEvent) => {
    const el = coverRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) scale(1.03)`;
  };
  const untilt = () => {
    if (coverRef.current) coverRef.current.style.transform = "";
  };

  return (
    <article className="pa-s-card" data-flip-id={p.id} style={{ "--tint": tintFor(p.cats[0]) } as React.CSSProperties}>
      <Link to="/shop/ebook/$slug" params={{ slug: p.slug }} className="pa-s-cover-link" aria-label={`${s.view}: ${p.title}`} onPointerMove={tilt} onPointerLeave={untilt}>
        <div className="pa-s-cover" ref={coverRef}>
          <img ref={imgRef} src={p.img} alt={p.title} width={300} height={300} loading="lazy" />
          <span className={`pa-s-sticker${free ? " is-free" : ""}`}>{formatPrice(p.price, lang, s.free)}</span>
        </div>
      </Link>
      <div className="pa-s-body">
        <ul className="pa-s-cats">
          {p.cats.slice(0, 2).map((c) => (
            <li key={c}>{categoryName(c)}</li>
          ))}
        </ul>
        <h3>
          <Link to="/shop/ebook/$slug" params={{ slug: p.slug }}>
            {p.title}
          </Link>
        </h3>
        {p.subtitle && <p className="pa-s-sub">{p.subtitle}</p>}
        <div className="pa-s-actions">
          {free ? (
            <a className="pa-s-btn" href="#stay-connected">
              {s.getFree}
            </a>
          ) : inCart ? (
            <button type="button" className="pa-s-btn is-added" onClick={() => setOpen(true)}>
              ✓ {s.added}
            </button>
          ) : (
            <button
              type="button"
              className="pa-s-btn"
              onClick={() => {
                flyToCart(imgRef.current);
                add(p.id);
              }}
            >
              {s.add}
            </button>
          )}
          <Link to="/shop/ebook/$slug" params={{ slug: p.slug }} className="pa-s-more">
            {s.view} →
          </Link>
        </div>
      </div>
    </article>
  );
}
