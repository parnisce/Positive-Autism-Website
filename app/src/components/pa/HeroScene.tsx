import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Three.js hero: an extruded heart orbited by soft shapes, scrubbed by GSAP ScrollTrigger. */
export function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dispose: (() => void) | undefined;
    let trigger: ScrollTrigger | undefined;
    let cancelled = false;

    import("./hero-scene").then(({ mountHeroScene }) => {
      if (cancelled) return;
      const scene = mountHeroScene(canvas, reduce);
      if (!scene) {
        canvas.style.display = "none";
        return;
      }
      dispose = scene.dispose;
      if (!reduce) {
        gsap.fromTo(canvas, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1.4, ease: "power3.out" });
        trigger = ScrollTrigger.create({
          trigger: canvas.parentElement,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
          onUpdate: (self) => {
            scene.state.scroll = self.progress;
          },
        });
      }
    });

    return () => {
      cancelled = true;
      trigger?.kill();
      dispose?.();
    };
  }, []);

  return <canvas ref={ref} className="pa-scene" aria-hidden="true" />;
}
