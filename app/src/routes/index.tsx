import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { HeroScene } from "../components/pa/HeroScene";
import { InfoCards } from "../components/pa/InfoCards";
import { PrefsProvider, usePrefs } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import Magnet from "../components/react-bits/Magnet";
import SpotlightCard from "../components/react-bits/SpotlightCard";
import TiltedCard from "../components/react-bits/TiltedCard";
import { EBOOKS } from "../ebooks";
import { ARTICLE_IMAGES, LINKS } from "../i18n";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const Route = createFileRoute("/")({
  head: () => ({
    scripts: [{ children: THEME_BOOT }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

const NEWS_IMAGES = [
  "/assets/img/news-anxiety.webp",
  "/assets/img/news-reading.webp",
  "/assets/img/news-mealtime.webp",
  "/assets/img/news-daily.webp",
];

function useMotion(rootRef: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      // ---- side rail: highlights the section you are in (works with or without motion) ----
      const railTargets = gsap.utils.toArray<HTMLElement>("[data-rail]", root);
      const railLinks = gsap.utils.toArray<HTMLAnchorElement>(".pa-rail a", root);
      const inView = new Set<HTMLElement>();
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? inView.add(e.target as HTMLElement) : inView.delete(e.target as HTMLElement)));
          const cur = [...inView].sort((p, q) => railTargets.indexOf(p) - railTargets.indexOf(q)).pop();
          railLinks.forEach((l) => l.classList.toggle("is-active", !!cur && l.getAttribute("href") === `#${cur.id}`));
        },
        { rootMargin: "-45% 0px -50% 0px" },
      );
      railTargets.forEach((s) => io.observe(s));

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync ----
        const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, anchors: true });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        // ---- top progress bar + solid header once scrolled ----
        gsap.to(".pa-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
        ScrollTrigger.create({
          start: 24,
          end: "max",
          onToggle: (self) => root.classList.toggle("pa-scrolled", self.isActive),
        });

        // ---- intro: counter loader slides away, then the hero builds in (fades and scales only) ----
        const heroIn = gsap
          .timeline({ paused: true, defaults: { ease: "power3.out" } })
          .from(".pa-header-in > *", { autoAlpha: 0, duration: 0.8, stagger: 0.08 })
          .from(".pa-eyebrow, .pa-hero h1, .pa-lead", { autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.1)
          .from(".pa-hero-actions > *", { autoAlpha: 0, scale: 0.9, duration: 0.7, stagger: 0.1 }, "-=0.5")
          .from(".pa-rail", { autoAlpha: 0, x: 24, duration: 0.8 }, "-=0.4");
        let started = false;
        const html = document.documentElement;
        const begin = () => {
          if (started) return;
          started = true;
          root.classList.remove("pa-loading");
          html.classList.remove("pa-lock");
          lenis.start();
          heroIn.play();
        };
        const loader = root.querySelector<HTMLElement>(".pa-loader");
        let seen = false;
        try {
          seen = sessionStorage.getItem("pa-loaded") === "1";
        } catch {
          /* storage blocked: just show the loader */
        }
        if (loader && !seen) {
          html.classList.add("pa-lock");
          lenis.stop();
          const num = loader.querySelector<HTMLElement>(".pa-loader-n");
          const bar = loader.querySelector<HTMLElement>(".pa-loader-bar");
          const counter = { v: 0 };
          gsap
            .timeline()
            .to(counter, {
              v: 100,
              duration: 1.5,
              ease: "power2.inOut",
              onUpdate: () => {
                if (num) num.textContent = `${Math.round(counter.v)}%`;
                if (bar) bar.style.transform = `scaleX(${counter.v / 100})`;
              },
            })
            .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.15")
            .add(() => {
              loader.style.display = "none";
              try {
                sessionStorage.setItem("pa-loaded", "1");
              } catch {
                /* ignore */
              }
            }, ">")
            .add(begin, "-=0.35");
        } else {
          if (loader) loader.style.display = "none";
          begin();
        }
        const failsafe = window.setTimeout(() => {
          if (loader) loader.style.display = "none";
          begin();
        }, 6000);

        // ---- cards, images and panels rise into view ----
        gsap.set(".pa-reveal", { autoAlpha: 0 });
        ScrollTrigger.batch(".pa-reveal", {
          start: "top 92%",
          once: true,
          onEnter: (els) =>
            gsap.fromTo(
              els,
              { autoAlpha: 0, y: 56, scale: 0.96 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.12, overwrite: true },
            ),
        });

        // ---- image parallax inside their frames ----
        gsap.utils.toArray<HTMLElement>(".pa-panel img, .pa-news-card img, .pa-article-img img").forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -6 },
            { yPercent: 6, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } },
          );
        });
        gsap.utils.toArray<HTMLElement>(".pa-strip img").forEach((img, i) => {
          gsap.to(img, {
            yPercent: i % 2 ? 14 : -14,
            ease: "none",
            scrollTrigger: { trigger: ".pa-strip", start: "top bottom", end: "bottom top", scrub: true },
          });
        });
        gsap.fromTo(
          ".pa-video-thumb img",
          { scale: 1.2 },
          { scale: 1, ease: "none", scrollTrigger: { trigger: ".pa-video-thumb", start: "top bottom", end: "bottom 40%", scrub: true } },
        );

        // ---- decorative shapes straddling the seams between sections drift as you scroll ----
        gsap.utils.toArray<HTMLElement>(".pa-seam").forEach((seam, i) => {
          gsap.fromTo(
            seam,
            { yPercent: 40, rotate: i % 2 ? -20 : 20 },
            { yPercent: -60, rotate: i % 2 ? 25 : -25, ease: "none", scrollTrigger: { trigger: seam.parentElement, start: "top bottom", end: "top top", scrub: true } },
          );
        });

        return () => {
          window.clearTimeout(failsafe);
          html.classList.remove("pa-lock");
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      });

      // ---- desktop: sections slide up OVER the previous one; the covered section stays pinned, shrinks and dims ----
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const layers = gsap.utils.toArray<HTMLElement>(".pa-layer", root);
        const track = root.querySelector<HTMLElement>(".pa-h-track");
        layers.forEach((el, i) => {
          const next = layers[i + 1];

          // resources: pinned horizontal scroll
          if (el.classList.contains("pa-hscroll") && track) {
            el.classList.add("pa-h-on");
            const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
            const art = el.querySelector<HTMLElement>(".pa-hscroll-bg img");
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: () => `+=${dist()}`,
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            });
            tl.to(track, { x: () => -dist() }, 0);
            if (art) tl.to(art, { xPercent: -8, scale: 1.08 }, 0);
            return;
          }

          if (!next || el.hasAttribute("data-flat") || next.hasAttribute("data-flat")) return;
          // tall sections are only dimmed (cheap); shrinking them forces a costly repaint every frame
          const tall = el.offsetHeight > window.innerHeight * 1.2;
          ScrollTrigger.create({
            trigger: el,
            start: () => (el.offsetHeight > window.innerHeight ? "bottom bottom" : "top top"),
            end: () => `+=${window.innerHeight}`,
            pin: true,
            pinSpacing: false,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          });
          gsap.fromTo(
            el,
            { "--s": 1, "--cover": 0 },
            {
              "--s": tall ? 1 : 0.94,
              "--cover": 0.55,
              ease: "none",
              scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true },
            },
          );
        });
        return () => root.querySelector(".pa-hscroll")?.classList.remove("pa-h-on");
      });

      return () => {
        io.disconnect();
        mm.revert();
      };
    },
    { scope: rootRef },
  );
}

function Index() {
  return (
    <PrefsProvider>
      <Page />
    </PrefsProvider>
  );
}

function Page() {
  const { t, theme } = usePrefs();
  const rootRef = useRef<HTMLDivElement>(null);
  useMotion(rootRef);

  const panelLinks = [LINKS.resources, LINKS.resources];
  const panelImages = ["/assets/img/bloom-5.webp", "/assets/img/together.webp"];

  return (
    <div className="pa-root pa-loading" ref={rootRef}>
      <div className="pa-loader" aria-hidden="true">
        <div className="pa-loader-in">
          <img src="/assets/img/logo.png" alt="" width={236} height={60} />
          <span className="pa-loader-n">0%</span>
          <span className="pa-loader-bar" />
        </div>
      </div>
      <nav className="pa-rail" aria-label={t.mainNav}>
        {[
          ["top", t.nav.home],
          ["autism-info", t.nav.info],
          ["resources", t.nav.resources],
          ["ebooks", t.nav.ebooks],
          ["news", t.nav.news],
          ["neurodiversity", t.nav.neuro],
          ["about", t.nav.about],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-label={label}>
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="pa-progress" aria-hidden="true" />

      <a className="pa-skip" href="#main">
        {t.skip}
      </a>

      <SiteHeader home />

      <main id="main">
        <section className="pa-hero pa-layer" id="top" data-rail>
          <HeroScene />
          <div className="pa-wrap pa-hero-grid">
            <div>
              <p className="pa-eyebrow">{t.hero.eyebrow}</p>
              <h1>
                {t.hero.before}
                <em>{t.hero.em}</em>
              </h1>
              <p className="pa-lead">{t.hero.lead}</p>
              <div className="pa-hero-actions">
                <Magnet padding={60} magnetStrength={3}>
                  <a className="pa-btn-explore" href="#resources">
                    {t.hero.start}
                  </a>
                </Magnet>
                <Magnet padding={60} magnetStrength={3}>
                  <a className="pa-btn-news" href="#ebooks">
                    {t.hero.browse}
                  </a>
                </Magnet>
              </div>
            </div>
          </div>
        </section>

        <section className="pa-section pa-layer" id="autism-info" data-rail>
          <span className="pa-seam pa-seam-a" aria-hidden="true" />
          <div className="pa-wrap">
            <h2 className="pa-h2">{t.info.h2}</h2>
            <p className="pa-sub">{t.info.sub}</p>
            <div className="pa-info-grid">
              <div className="pa-info-lead pa-reveal">
                <img className="pa-info-img" src="/assets/img/together.webp" alt={t.info.imgAlt} loading="lazy" />
                <h3>{t.info.leadTitle}</h3>
                <p>{t.info.leadText}</p>
              </div>
              <InfoCards points={t.info.points} />
            </div>
            <div className="pa-articles">
              <h3>{t.info.articlesTitle}</h3>
              <ul className="pa-article-list">
                {t.info.articles.map((a, i) => (
                  <li key={a.title} className="pa-article pa-reveal">
                    <div className="pa-article-img">
                      <img src={ARTICLE_IMAGES[i]} alt="" loading="lazy" />
                    </div>
                    <div className="pa-article-body">
                      <time>{a.date}</time>
                      <h4>{a.title}</h4>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="pa-section pa-layer" id="audience">
          <span className="pa-seam pa-seam-b" aria-hidden="true" />
          <div className="pa-wrap">
            <h2 className="pa-h2">{t.audience.h2}</h2>
            <p className="pa-sub">{t.audience.sub}</p>
            <div className="pa-feature pa-reveal">
              <TiltedCard
                imageSrc="/assets/img/hero.webp"
                altText={t.audience.imgAlt}
                containerWidth="100%"
                containerHeight="100%"
                imageWidth="100%"
                imageHeight="100%"
                radius={32}
                rotateAmplitude={8}
                scaleOnHover={1.03}
                glare={0.25}
                shadow={0.5}
              />
            </div>
            <div className="pa-audience">
              {t.audience.panels.map((p, i) => (
                <article key={p.title} className={`pa-panel pa-reveal${i === 1 ? " alt" : ""}`}>
                  <img src={panelImages[i]} alt={p.alt} />
                  <div className="pa-panel-copy">
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                    <a className="pa-panel-link" href={panelLinks[i]}>
                      {p.cta}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-hscroll pa-layer" id="resources" data-rail data-flat>
          <div className="pa-hscroll-bg" aria-hidden="true">
            <img src="/assets/img/hero.webp" alt="" loading="lazy" />
          </div>
          <div className="pa-wrap pa-h-head">
            <h2 className="pa-h2">{t.resources.h2}</h2>
            <p className="pa-sub">{t.resources.sub}</p>
          </div>
          <div className="pa-h-viewport">
            <div className="pa-h-track">
              {t.resources.items.map((r, i) => (
                <SpotlightCard
                  key={i}
                  className="pa-res-card"
                  theme={theme}
                  spotlightColor="var(--pa-orange)"
                  intensity={0.5}
                  spotlightSize={320}
                  style={{ "--spotlight-card-surface": "var(--pa-surface)" } as React.CSSProperties}
                >
                  <span className="pa-res-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{r}</h3>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section pa-ebooks pa-layer" id="ebooks" data-rail>
          <span className="pa-seam pa-seam-c" aria-hidden="true" />
          <div className="pa-wrap">
            <h2 className="pa-h2">{t.ebooks.h2}</h2>
            <p className="pa-sub">{t.ebooks.sub}</p>
            <div className="pa-book-row">
              {EBOOKS.map((b) => {
                const copy = t.ebooks.items[b.slug];
                return (
                  <article key={b.slug} className="pa-book pa-reveal">
                    <div className="pa-book-cover">
                      <TiltedCard
                        imageSrc={b.cover}
                        altText={`${t.ebooks.coverAlt} ${copy.title}`}
                        containerWidth="100%"
                        containerHeight="100%"
                        imageWidth="100%"
                        imageHeight="100%"
                        radius={14}
                        rotateAmplitude={14}
                        scaleOnHover={1.06}
                        glare={0.3}
                        shadow={0.6}
                        overlayContent={
                          <span className="pa-book-title">
                            <small>{copy.audience}</small>
                            {copy.title}
                          </span>
                        }
                        displayOverlayContent
                      />
                    </div>
                    <p>{copy.blurb}</p>
                    <Magnet padding={50} magnetStrength={4}>
                      <a className="pa-btn-buy" href={b.checkoutUrl ?? LINKS.subscribe}>
                        {b.checkoutUrl ? `${t.ebooks.buy}${b.price ? ` · ${b.price}` : ""}` : t.ebooks.notify}
                      </a>
                    </Magnet>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pa-section pa-layer" id="film">
          <span className="pa-seam pa-seam-a" aria-hidden="true" />
          <div className="pa-wrap pa-video">
            <a className="pa-video-thumb pa-reveal" href={LINKS.film} aria-label={t.film.label}>
              <img src="/assets/img/video.webp" alt={t.film.alt} />
              <span className="pa-play" aria-hidden="true" />
            </a>
            <div>
              <h2 className="pa-h2">{t.film.h2}</h2>
              <p className="pa-sub">{t.film.sub}</p>
              <a className="pa-btn-watch" href={LINKS.film}>
                {t.film.cta}
              </a>
            </div>
          </div>
        </section>

        <section className="pa-section pa-news pa-layer" id="news" data-rail data-flat>
          <div className="pa-wrap">
            <h2 className="pa-h2">{t.news.h2}</h2>
            <p className="pa-sub">{t.news.sub}</p>
            <div className="pa-news-row">
              {t.news.items.map((n, i) => (
                <article key={n.title} className="pa-news-card pa-reveal">
                  <img src={NEWS_IMAGES[i]} alt={n.alt} loading="lazy" />
                  <div className="pa-news-body">
                    <time>{n.date}</time>
                    <h3>{n.title}</h3>
                    <p>{n.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section pa-layer" id="neurodiversity" data-rail>
          <span className="pa-seam pa-seam-c" aria-hidden="true" />
          <div className="pa-wrap pa-neuro">
            <div className="pa-neuro-card pa-reveal">
              <h2 className="pa-h2">{t.neuro.h2}</h2>
              <p>{t.neuro.text}</p>
            </div>
            <div className="pa-strip" aria-hidden="true">
              <img src="/assets/img/bloom-1.webp" alt="" loading="lazy" />
              <img src="/assets/img/bloom-2.webp" alt="" loading="lazy" />
              <img src="/assets/img/bloom-3.webp" alt="" loading="lazy" />
              <img src="/assets/img/bloom-4.webp" alt="" loading="lazy" />
              <img src="/assets/img/bloom-5.webp" alt="" loading="lazy" />
              <img src="/assets/img/bloom-6.webp" alt="" loading="lazy" />
            </div>
          </div>
        </section>

        <section className="pa-section pa-about pa-layer" id="about" data-rail>
          <span className="pa-seam pa-seam-a" aria-hidden="true" />
          <div className="pa-wrap pa-about-grid">
            <div className="pa-about-copy">
              <h2 className="pa-h2">{t.about.h2}</h2>
              <p className="pa-lead-quote">{t.about.quote}</p>
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
            </div>
            <div className="pa-values">
              {t.about.values.map((v) => (
                <article key={v.title} className="pa-value pa-reveal">
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section pa-layer" id="community">
          <span className="pa-seam pa-seam-b" aria-hidden="true" />
          <div className="pa-wrap pa-community">
            <div>
              <h2 className="pa-h2">{t.community.h2}</h2>
              <p className="pa-sub">{t.community.sub}</p>
              <div className="pa-socials">
                <a href={LINKS.facebook}>Facebook</a>
                <a href={LINKS.youtube}>YouTube</a>
              </div>
            </div>
            <Magnet padding={70} magnetStrength={3}>
              <a className="pa-btn-contact" href={LINKS.subscribe}>
                {t.community.contact}
              </a>
            </Magnet>
          </div>
        </section>
      </main>

      <SiteFooter home />
    </div>
  );
}
