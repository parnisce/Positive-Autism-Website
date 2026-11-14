import { gsap } from "gsap";

/** A copy of the cover flies into the cart button, which then gives a little bump. */
export function flyToCart(img: HTMLElement | null) {
  const fab = document.querySelector<HTMLElement>(".pa-cart-fab");
  if (!img || !fab || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = img.getBoundingClientRect();
  const b = fab.getBoundingClientRect();
  const clone = img.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: "fixed",
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: "0",
    zIndex: "120",
    borderRadius: "14px",
    objectFit: "cover",
    pointerEvents: "none",
    transform: "none",
  });
  document.body.appendChild(clone);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  gsap
    .timeline({
      onComplete: () => {
        clone.remove();
        gsap.fromTo(fab, { scale: 1 }, { scale: 1.16, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
      },
    })
    .to(clone, { x: dx * 0.45, y: dy * 0.45 - 90, scale: 0.55, rotate: -10, duration: 0.38, ease: "power2.out" })
    .to(clone, { x: dx, y: dy, scale: 0.08, rotate: 14, opacity: 0.5, duration: 0.45, ease: "power2.in" });
}
