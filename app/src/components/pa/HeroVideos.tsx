import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const HERO_SLIDES = 4;
/** Frames per second of the "stop motion" while scrolling: the video only advances in these small steps. */
const STEP_FPS = 9;
/** Where each clip starts (as a share of its length). Every clip plays from its first frame. */
const START = [0, 0, 0, 0];

/**
 * Hero background: four hyperlapse clips. The hero stays pinned while you scroll; the scroll position
 * drives the clip (in stop-motion steps) and moves to the next slide every quarter.
 * The slide texts are `.pa-slide` elements inside the same section.
 */
export function HeroVideos({ stepLabel }: { stepLabel: string }) {
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
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      hero.classList.add("is-sliding");
      videos.forEach((v) => {
        v.preload = "auto";
        v.load();
      });
      gsap.set(slides, { autoAlpha: 0 });
      gsap.set(slides[0], { autoAlpha: 1 });
      gsap.set(videos, { autoAlpha: 0 });
      gsap.set(videos[0], { autoAlpha: 1 });

      // open on the sun and flowers
      const first = videos[0];
      const seekFirst = () => {
        if (first.duration) first.currentTime = START[0] * first.duration;
      };
      if (first.readyState >= 1) seekFirst();
      else first.addEventListener("loadedmetadata", seekFirst, { once: true });

      let cur = 0;
      const show = (i: number) => {
        if (i === cur) return;
        const prev = cur;
        cur = i;
        // stop-motion style: a short, snappy cross-fade
        gsap.to(videos[prev], { autoAlpha: 0, duration: 0.35, ease: "steps(4)", overwrite: true });
        gsap.to(videos[i], { autoAlpha: 1, duration: 0.35, ease: "steps(4)", overwrite: true });
        // text alternates sides: slides 1 and 3 sit on the left, 2 and 4 on the right
        const dir = (n: number) => (n % 2 ? 1 : -1);
        hero.classList.toggle("is-right", i % 2 === 1);
        gsap.to(slides[prev], { autoAlpha: 0, x: dir(prev) * 70, duration: 0.3, ease: "power2.in", overwrite: true });
        gsap.fromTo(slides[i], { autoAlpha: 0, x: dir(i) * 90 }, { autoAlpha: 1, x: 0, duration: 0.65, delay: 0.18, ease: "power3.out", overwrite: true });
        if (actions) gsap.fromTo(actions, { autoAlpha: 0, x: dir(i) * 60 }, { autoAlpha: 1, x: 0, duration: 0.6, delay: 0.25, ease: "power3.out", overwrite: true });
        steps.forEach((s, n) => s.classList.toggle("on", n === i));
      };

      const trigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * HERO_SLIDES * 1.05)}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // refresh first: every section below is positioned after this pin's spacer
        refreshPriority: 100,
        onUpdate: (self) => {
          const p = Math.min(0.9999, self.progress) * HERO_SLIDES;
          const i = Math.min(HERO_SLIDES - 1, Math.floor(p));
          show(i);
          const v = videos[i];
          const d = v.duration;
          if (!d || !Number.isFinite(d)) return;
          // quantise to a few frames per second so it ticks like stop motion, and play forward as you scroll
          const from = START[i] * d;
          const t = Math.min(d - 0.05, Math.floor((from + (p - i) * (d - from)) * STEP_FPS) / STEP_FPS);
          if (Math.abs(v.currentTime - t) > 0.01) v.currentTime = t;
          // a slow push-in on top of the footage reinforces the hyperlapse feel
          gsap.set(v, { scale: 1 + (p - i) * 0.12 });
        },
      });

      ScrollTrigger.sort();
      ScrollTrigger.refresh();

      const go = (e: Event) => {
        const n = Number((e.currentTarget as HTMLElement).dataset.i);
        const y = trigger.start + ((n + 0.02) / HERO_SLIDES) * (trigger.end - trigger.start);
        window.scrollTo({ top: y, behavior: "smooth" });
      };
      steps.forEach((s) => s.addEventListener("click", go));

      return () => {
        steps.forEach((s) => s.removeEventListener("click", go));
        trigger.kill();
        hero.classList.remove("is-sliding", "is-right");
        gsap.set([...videos, ...slides, ...(actions ? [actions] : [])], { clearProps: "all" });
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
      </div>
      <ol className="pa-hero-steps" aria-label={stepLabel}>
        {Array.from({ length: HERO_SLIDES }, (_, i) => (
          <li key={i}>
            <button type="button" className={`pa-hero-step${i === 0 ? " on" : ""}`} data-i={i} aria-label={`${stepLabel} ${i + 1}`}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <i />
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
