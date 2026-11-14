import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
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

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // top progress bar + solid header once scrolled
        gsap.to(".pa-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
        ScrollTrigger.create({
          start: 24,
          end: "max",
          onToggle: (self) => root.classList.toggle("pa-scrolled", self.isActive),
        });

        // hero entrance: fades and scales only, the words themselves stay put
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".pa-header-in > *", { autoAlpha: 0, duration: 0.8, stagger: 0.08 })
          .from(".pa-eyebrow, .pa-hero h1, .pa-lead", { autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.1)
          .from(".pa-hero-actions > *", { autoAlpha: 0, scale: 0.9, duration: 0.7, stagger: 0.1 }, "-=0.5");

        // cards, images and panels rise into view
        gsap.set(".pa-reveal", { autoAlpha: 0 });
        ScrollTrigger.batch(".pa-reveal", {
          start: "top 90%",
          once: true,
          onEnter: (els) =>
            gsap.fromTo(
              els,
              { autoAlpha: 0, y: 56, scale: 0.96 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.12, overwrite: true },
            ),
        });

        // bloom strip parallax
        gsap.utils.toArray<HTMLElement>(".pa-strip img").forEach((img, i) => {
          gsap.to(img, {
            yPercent: i % 2 ? 14 : -14,
            ease: "none",
            scrollTrigger: { trigger: ".pa-strip", start: "top bottom", end: "bottom top", scrub: true },
          });
        });

        // film thumbnail slowly zooms as it crosses the screen
        gsap.fromTo(
          ".pa-video-thumb img",
          { scale: 1.2 },
          { scale: 1, ease: "none", scrollTrigger: { trigger: ".pa-video-thumb", start: "top bottom", end: "bottom 40%", scrub: true } },
        );
      });

      // resources: pinned horizontal scroll on desktop
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const section = root.querySelector<HTMLElement>(".pa-hscroll");
        const track = root.querySelector<HTMLElement>(".pa-h-track");
        if (!section || !track) return;
        section.classList.add("pa-h-on");
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
        const art = section.querySelector<HTMLElement>(".pa-hscroll-bg img");
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
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
        return () => section.classList.remove("pa-h-on");
      });

      return () => mm.revert();
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
    <div className="pa-root" ref={rootRef}>
      <div className="pa-progress" aria-hidden="true" />
      <a className="pa-skip" href="#main">
        {t.skip}
      </a>

      <SiteHeader home />

      <main id="main">
        <section className="pa-hero" id="top">
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

        <section className="pa-section" id="autism-info">
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

        <section className="pa-section" id="audience">
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

        <section className="pa-hscroll" id="resources">
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

        <section className="pa-section pa-ebooks" id="ebooks">
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

        <section className="pa-section" id="film">
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

        <section className="pa-section pa-news" id="news">
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

        <section className="pa-section" id="neurodiversity">
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

        <section className="pa-section pa-about" id="about">
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

        <section className="pa-section" id="community">
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
