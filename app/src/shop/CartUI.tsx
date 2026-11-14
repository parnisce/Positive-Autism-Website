import { useEffect, useState } from "react";
import { usePrefs } from "../components/pa/prefs";
import { useCart } from "./cart";
import { formatPrice, getProduct, type Product } from "./catalog";
import { startCheckout } from "./checkout-client";
import { useShopCopy } from "./useShopCopy";

/** Floating cart button (bottom right). */
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

/** Slide-in cart with the Stripe checkout button. */
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
    const result = await startCheckout(
      items.map((p) => p.id),
      lang,
    );
    if (result === "redirected") return;
    setError(result === "not_configured" ? s.notConfigured : s.error);
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
          <ul className="pa-drawer-list" data-lenis-prevent>
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
