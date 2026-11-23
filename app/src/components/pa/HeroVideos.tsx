import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const HERO_SLIDES = 4;
/** Share of a slide used to cross-fade into the next one. */
const FADE = 0.28;
/** How long (in viewport heights) each slide holds while scrolling. */
const HOLD = 1.3;
// smootherstep: gentle start and finish, so cross-fades never feel abrupt
const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Hero background: four 3D clips. The hero stays pinned while you scroll and EVERYTHING (clip time,
 * cross-fades, text, progress) is computed from one smoothed scroll value, so it glides instead of stepping.
 * The slide texts are `.pa-slide` elements inside the same section.
 */
export function HeroVideos({ stepLabel, scrollLabel }: { stepLabel: string; scrollLabel: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const hero = el?.closest<HTMLElement>(".pa-hero");
    if (!el || !hero) return;
    gsap.registerPlugin(ScrollTrigger);
    const videos = [...el.querySelectorAll<HTMLVideoElement>("video")];
    const slides = [...hero.querySelectorAll<HTMLElement>(".pa-slide")];
    const actions = hero.querySelector<HTMLElement>(".pa-hero-actions");
    const steps = [...hero.querySelectorAll<HTMLElement>(".pa-hero-step")];
    const count = hero.querySelector<HTMLElement>(".pa-hero-count b");
    const hint = hero.querySelector<HTMLElement>(".pa-hero-hint");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      hero.classList.add("is-sliding");
      videos.forEach((v) => {
        v.preload = "auto";
        v.load();
      });

      const N = HERO_SLIDES;
      const st = { target: 0, smooth: 0 };
      let active = -1;
      let last = -1;

      const render = (p: number) => {
        for (let s = 0; s < N; s++) {
          const d = p - s; // 0..1 while slide s is the current one
          const fin = s === 0 ? 1 : ease(clamp01((d + FADE) / FADE));
          const fout = s === N - 1 ? 1 : 1 - ease(clamp01((d - (1 - FADE)) / FADE));
          const vo = fin * fout;
          const v = videos[s];
          v.style.opacity = String(vo);
          v.style.visibility = vo > 0.01 ? "visible" : "hidden";
          if (vo > 0.01) {
            v.style.transform = `scale(${1 + clamp01(d) * 0.09})`;
            const dur = v.duration;
            if (dur && Number.isFinite(dur)) {
              const t = Math.round(clamp01(d) * (dur - 0.06) * 24) / 24;
              if (Math.abs(v.currentTime - t) > 0.03) v.currentTime = t;
            }
          }
          // text slides in from its own side and leaves to the same side
          const dir = s % 2 ? 1 : -1;
          const tin = s === 0 ? 1 : ease(clamp01((d - 0.04) / 0.26));
          const tout = s === N - 1 ? 1 : 1 - ease(clamp01((d - 0.66) / 0.24));
          const to = tin * tout;
          const sl = slides[s];
          sl.style.opacity = String(to);
          sl.style.visibility = to > 0.01 ? "visible" : "hidden";
          sl.style.transform = `translate3d(${dir * (70 * (1 - tin) + 50 * (1 - tout))}px, 0, 0)`;
        }

        const idx = Math.min(N - 1, Math.max(0, Math.floor(p + 0.02)));
        if (idx !== active) {
          active = idx;
          hero.classList.toggle("is-right", idx % 2 === 1);
          steps.forEach((b, n) => b.classList.toggle("on", n === idx));
          if (count) count.textContent = String(idx + 1).padStart(2, "0");
        }
        // buttons dip out while the text swaps sides
        if (actions) {
          const b = Math.round(p);
          const dist = b >= 1 && b <= N - 1 ? Math.abs(p - b) : 1;
          const ao = ease(clamp01((dist - 0.03) / 0.14));
          actions.style.opacity = String(ao);
          actions.style.visibility = ao > 0.01 ? "visible" : "hidden";
          actions.style.transform = `translate3d(${(idx % 2 ? 1 : -1) * 36 * (1 - ao)}px, 0, 0)`;
        }
        steps.forEach((b, n) => b.style.setProperty("--fill", String(clamp01(p - n))));
        if (hint) hint.style.opacity = String(1 - clamp01(p * 6));
      };

      const trigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * N * HOLD)}`,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        // refresh first: every section below is positioned after this pin's spacer
        refreshPriority: 100,
        onUpdate: (self) => {
          st.target = self.progress;
        },
      });

      // one damped value drives everything, so fast wheel flicks still glide
      const tick = (_t: number, dt: number) => {
        const k = 1 - Math.exp(-dt / 170);
        st.smooth += (st.target - st.smooth) * k;
        if (Math.abs(st.target - st.smooth) < 0.00015) st.smooth = st.target;
        if (st.smooth !== last) {
          last = st.smooth;
          render(Math.min(0.9999, st.smooth) * N);
        }
      };
      gsap.ticker.add(tick);
      render(0);

      ScrollTrigger.sort();
      ScrollTrigger.refresh();

      const go = (e: Event) => {
        const n = Number((e.currentTarget as HTMLElement).dataset.i);
        const y = trigger.start + ((n + 0.4) / N) * (trigger.end - trigger.start);
        window.scrollTo({ top: y, behavior: "smooth" });
      };
      steps.forEach((s) => s.addEventListener("click", go));

      return () => {
        steps.forEach((s) => s.removeEventListener("click", go));
        gsap.ticker.remove(tick);
        trigger.kill();
        hero.classList.remove("is-sliding", "is-right");
        [...videos, ...slides, ...(actions ? [actions] : [])].forEach((x) => x.removeAttribute("style"));
        steps.forEach((s, n) => s.classList.toggle("on", n === 0));
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <>
      <div className="pa-hero-media" ref={root} aria-hidden="true">
        {Array.from({ length: HERO_SLIDES }, (_, i) => (
          <video
            key={i}
            src={`/assets/hero/slide-${i + 1}.mp4`}
            poster={`/assets/hero/slide-${i + 1}.jpg`}
            muted
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            tabIndex={-1}
          />
        ))}
        <span className="pa-hero-veil" />
        <span className="pa-hero-veil r" />
        <span className="pa-hero-shade" />
      </div>
      <div className="pa-hero-hud">
        <p className="pa-hero-count" aria-hidden="true">
          <b>01</b> / {String(HERO_SLIDES).padStart(2, "0")}
        </p>
        <ol className="pa-hero-steps" aria-label={stepLabel}>
          {Array.from({ length: HERO_SLIDES }, (_, i) => (
            <li key={i}>
              <button type="button" className={`pa-hero-step${i === 0 ? " on" : ""}`} data-i={i} aria-label={`${stepLabel} ${i + 1}`}>
                <i />
              </button>
            </li>
          ))}
        </ol>
        <p className="pa-hero-hint" aria-hidden="true">
          <span />
          {scrollLabel}
        </p>
      </div>
    </>
  );
}
