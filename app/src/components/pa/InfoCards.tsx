import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import SpotlightCard from "../react-bits/SpotlightCard";
import { usePrefs } from "./prefs";

type Point = { title: string; text: string };

/** Illustration behind each card (same order as the copy). */
const BGS = [
  "/assets/img/bloom-5.webp",
  "/assets/img/bloom-2.webp",
  "/assets/img/bloom-4.webp",
  "/assets/img/bloom-3.webp",
  "/assets/img/bloom-6.webp",
  "/assets/img/bloom-1.webp",
];

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** One animated icon per point (same order as the copy in src/i18n.ts). */
const ICONS: ReactNode[] = [
  // communication: two speech bubbles
  svg(
    <>
      <path className="pa-ic-a" d="M4 4h10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9l-3 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path className="pa-ic-b" d="M18 9h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2v3l-3-3h-5a2 2 0 0 1-2-2v-1" />
    </>,
  ),
  // routines: looping arrow
  svg(
    <g className="pa-ic-spin">
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v4h-4" />
    </g>,
  ),
  // deep interests: star
  svg(<path className="pa-ic-star" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />),
  // sensory: speaker with waves
  svg(
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path className="pa-ic-w1" d="M16 9a4 4 0 0 1 0 6" />
      <path className="pa-ic-w2" d="M19 6a8 8 0 0 1 0 12" />
    </>,
  ),
  // strengths: light bulb
  svg(
    <>
      <path d="M9 18h6M10 21h4" />
      <path className="pa-ic-bulb" d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.5h6c0-1.2.4-1.9 1-2.5A6 6 0 0 0 12 3z" />
    </>,
  ),
  // support levels: three rising bars
  svg(
    <>
      <path className="pa-ic-bar1" d="M5 20v-5" />
      <path className="pa-ic-bar2" d="M12 20V11" />
      <path className="pa-ic-bar3" d="M19 20V5" />
    </>,
  ),
];

function InfoCard({ point, index, id }: { point: Point; index: number; id: string }) {
  const { theme } = usePrefs();
  const [open, setOpen] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

  // 3D tilt that follows the cursor (skipped for touch and reduced motion)
  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 900 });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      rx(-y * 10);
      ry(x * 12);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <article className="pa-point pa-reveal">
      <div className="pa-point-tilt" ref={tiltRef}>
        <SpotlightCard
          className={`pa-point-in${open ? " is-open" : ""}`}
          theme={theme}
          spotlightColor="var(--pa-orange)"
          intensity={0.55}
          spotlightSize={260}
          style={{ "--spotlight-card-surface": "var(--pa-tint)" } as CSSProperties}
        >
          <img className="pa-point-bg" src={BGS[index]} alt="" aria-hidden="true" loading="lazy" />
          <button
            type="button"
            className="pa-point-btn"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="pa-point-top">
              <span className="pa-ic">{ICONS[index]}</span>
              <span className="pa-point-n">{String(index + 1).padStart(2, "0")}</span>
            </span>
            <span className="pa-point-title">{point.title}</span>
            <span className="pa-point-plus" aria-hidden="true" />
          </button>
          <div className="pa-point-text" id={id}>
            <span className="pa-point-text-title" aria-hidden="true">
              {point.title}
            </span>
            <p>{point.text}</p>
          </div>
        </SpotlightCard>
      </div>
    </article>
  );
}

/** The six "what is autism" boxes: animated icons, cursor light, tilt, and a text panel on hover, focus or tap. */
export function InfoCards({ points }: { points: Point[] }) {
  return (
    <div className="pa-points">
      {points.map((p, i) => (
        <InfoCard key={p.title} point={p} index={i} id={`pa-point-${i}`} />
      ))}
    </div>
  );
}
