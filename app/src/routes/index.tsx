import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import "../positive-autism.css";
import { HeroScene } from "../components/pa/HeroScene";
import { SubscribeForm } from "../components/pa/SubscribeForm";
import Magnet from "../components/react-bits/Magnet";
import SpotlightCard from "../components/react-bits/SpotlightCard";
import TiltedCard from "../components/react-bits/TiltedCard";
import { EBOOKS } from "../ebooks";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SITE = "https://positiveautism.org";

export const Route = createFileRoute("/")({
  head: () => ({
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

const NAV = [
  { href: "#audience", label: "Autism info" },
  { href: "#resources", label: "Learning" },
  { href: "#ebooks", label: "Ebooks" },
  { href: "#news", label: "News" },
  { href: "#neurodiversity", label: "Neurodiversity" },
];


const RESOURCES = [
  "Social and emotional skills",
  "Communication and language",
  "Conversation skills",
  "Intelligence and potential development",
  "Attention and focus",
  "Imaginative play and creativity",
  "Independence and life skills",
  "Gross and fine motor skills",
  "Anxiety and tolerance to change",
  "Learning videos",
  "Information for parents",
  "For autistic people",
];

const NEWS = [
  {
    date: "Nov 3, 2026",
    img: "/assets/img/news-anxiety.webp",
    alt: "A child feeling overstimulated in a classroom",
    title: "When an Autistic Person Cannot Explain Their Anxiety",
    text: "How can anxiety be recognized when a person cannot put it into words?",
  },
  {
    date: "Oct 16, 2026",
    img: "/assets/img/news-reading.webp",
    alt: "Illustration about reading comprehension",
    title: "Reading Comprehension in Autistic People: Which Strategies Work",
    text: "For people who read words easily but struggle with their meaning.",
  },
  {
    date: "Oct 5, 2026",
    img: "/assets/img/news-mealtime.webp",
    alt: "A sensory-friendly mealtime with healthy foods",
    title: "When Eating Becomes a Sensory Experience",
    text: "Understanding mealtime difficulties for some autistic children and adults.",
  },
  {
    date: "Sep 29, 2026",
    img: "/assets/img/news-daily.webp",
    alt: "A person practicing a daily living skill",
    title: "Daily Living Skills May Play an Important Role",
    text: "A study that follows autistic people from childhood into adulthood.",
  },
];

function useMotion(rootRef: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // top progress bar + compact header
        gsap.to(".pa-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
        ScrollTrigger.create({
          start: 24,
          end: "max",
          onToggle: (self) => root.classList.toggle("pa-scrolled", self.isActive),
        });

        // hero entrance: fades and scales only, the words themselves stay put
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".pa-eyebrow, .pa-hero h1, .pa-lead", { autoAlpha: 0, duration: 1, stagger: 0.12 })
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

      // learning section: pinned horizontal scroll on desktop
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const section = root.querySelector<HTMLElement>(".pa-hscroll");
        const track = root.querySelector<HTMLElement>(".pa-h-track");
        if (!section || !track) return;
        section.classList.add("pa-h-on");
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
        gsap.to(track, {
          x: () => -dist(),
          ease: "none",
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
        return () => section.classList.remove("pa-h-on");
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );
}

function Index() {
  const rootRef = useRef<HTMLDivElement>(null);
  useMotion(rootRef);
  return (
    <div className="pa-root" ref={rootRef}>
      <div className="pa-progress" aria-hidden="true" />
      <a className="pa-skip" href="#main">
        Skip to content
      </a>

      <header className="pa-header">
        <div className="pa-wrap pa-header-in">
          <a className="pa-logo" href="#top" aria-label="Positive Autism home">
            <img src="/assets/img/logo.png" alt="Positive Autism" width={173} height={44} />
          </a>
          <nav className="pa-nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <a className="pa-contact-btn" href="#ebooks">
            Shop ebooks
          </a>
          <details className="pa-menu">
            <summary>Menu</summary>
            <div className="pa-menu-list">
              {NAV.map((n) => (
                <a key={n.href} href={n.href}>
                  {n.label}
                </a>
              ))}
              <a href={`${SITE}/contact/`}>Contact us</a>
            </div>
          </details>
        </div>
      </header>

      <main id="main">
        <section className="pa-hero" id="top">
          <HeroScene />
          <div className="pa-wrap pa-hero-grid">
            <div>
              <p className="pa-eyebrow">Autism learning, resources and ebooks</p>
              <h1>
                Autism, understood with <em>hope.</em>
              </h1>
              <p className="pa-lead">
                Learn at your own pace with practical guides, research news and ebooks for autistic people,
                parents and the teachers who support them.
              </p>
              <div className="pa-hero-actions">
                <Magnet padding={60} magnetStrength={3}>
                  <a className="pa-btn-explore" href="#resources">
                    Start learning
                  </a>
                </Magnet>
                <Magnet padding={60} magnetStrength={3}>
                  <a className="pa-btn-news" href="#ebooks">
                    Browse ebooks
                  </a>
                </Magnet>
              </div>
            </div>
          </div>
        </section>

        <section className="pa-section" id="audience">
          <div className="pa-wrap">
            <h2 className="pa-h2">Information for every journey</h2>
            <p className="pa-sub">
              Clear, positive explanations of autism, written for the people who live it and the people who
              love them.
            </p>
            <div className="pa-feature pa-reveal">
              <TiltedCard
                imageSrc="/assets/img/hero.webp"
                altText="A paper-craft heart blossom with two figures holding hands at its center"
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
              <article className="pa-panel pa-reveal">
                <img src="/assets/img/bloom-5.webp" alt="Two paper figures standing together inside a blossom" />
                <div className="pa-panel-copy">
                  <h3>For autistic people</h3>
                  <p>Understand your strengths, your needs and the skills that help you thrive every day.</p>
                  <a className="pa-panel-link" href={`${SITE}/`}>
                    Explore resources
                  </a>
                </div>
              </article>
              <article className="pa-panel alt pa-reveal">
                <img src="/assets/img/together.webp" alt="A paper boy and girl holding hands in a heart-shaped garden" />
                <div className="pa-panel-copy">
                  <h3>For parents</h3>
                  <p>Gentle strategies, research updates and ideas to support your child at home and at school.</p>
                  <a className="pa-panel-link" href={`${SITE}/`}>
                    Explore resources
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="pa-hscroll" id="resources">
          <div className="pa-wrap pa-h-head">
            <h2 className="pa-h2">Learning that builds skills</h2>
            <p className="pa-sub">
              Activities and guides organized by the area of development you want to support. Keep scrolling
              to explore them all.
            </p>
          </div>
          <div className="pa-h-viewport">
            <div className="pa-h-track">
              {RESOURCES.map((r, i) => (
                <SpotlightCard
                  key={r}
                  className="pa-res-card"
                  theme="light"
                  spotlightColor="var(--pa-orange)"
                  intensity={0.5}
                  spotlightSize={320}
                  style={{ "--spotlight-card-surface": "var(--pa-white)" } as React.CSSProperties}
                >
                  <span className="pa-res-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{r}</h3>
                  <a className="pa-res-link" href={`${SITE}/`}>
                    Explore <span aria-hidden="true">→</span>
                  </a>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section pa-ebooks" id="ebooks">
          <div className="pa-wrap">
            <h2 className="pa-h2">Autism learning ebooks</h2>
            <p className="pa-sub">
              Guides you can keep, print and come back to. Download instantly and learn at your own pace.
            </p>
            <div className="pa-book-row">
              {EBOOKS.map((b) => (
                <article key={b.slug} className="pa-book pa-reveal">
                  <div className="pa-book-cover">
                    <TiltedCard
                      imageSrc={b.cover}
                      altText={`Cover of the ebook ${b.title}`}
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
                          <small>{b.audience}</small>
                          {b.title}
                        </span>
                      }
                      displayOverlayContent
                    />
                  </div>
                  <p>{b.blurb}</p>
                  <Magnet padding={50} magnetStrength={4}>
                    <a className="pa-btn-buy" href={b.checkoutUrl ?? `${SITE}/contact/`}>
                      {b.checkoutUrl ? `Buy ebook${b.price ? ` · ${b.price}` : ""}` : "Get notified"}
                    </a>
                  </Magnet>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section" id="film">
          <div className="pa-wrap pa-video">
            <a className="pa-video-thumb pa-reveal" href={`${SITE}/`} aria-label="Watch the film Accepted As I Am">
              <img src="/assets/img/video.webp" alt="Still from the film Accepted As I Am" />
              <span className="pa-play" aria-hidden="true" />
            </a>
            <div>
              <h2 className="pa-h2">Accepted As I Am</h2>
              <p className="pa-sub">
                A short film made to raise acceptance of autism. Share it with autistic people, parents,
                teachers, therapists and friends, and talk about it together.
              </p>
              <a className="pa-btn-watch" href={`${SITE}/`}>
                Watch the film
              </a>
            </div>
          </div>
        </section>

        <section className="pa-section pa-news" id="news">
          <div className="pa-wrap">
            <h2 className="pa-h2">Positive news and research</h2>
            <p className="pa-sub">The latest on what is moving in the world of autism.</p>
            <div className="pa-news-row">
              {NEWS.map((n) => (
                <a key={n.title} className="pa-news-card pa-reveal" href={`${SITE}/`}>
                  <img src={n.img} alt={n.alt} loading="lazy" />
                  <div className="pa-news-body">
                    <time>{n.date}</time>
                    <h3>{n.title}</h3>
                    <p>{n.text}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="pa-section" id="neurodiversity">
          <div className="pa-wrap pa-neuro">
            <div className="pa-neuro-card pa-reveal">
              <h2 className="pa-h2">Every mind grows in its own way</h2>
              <p>
                Neurodiversity is the idea that brains work in many different ways, and that those
                differences deserve respect. We share information that focuses on strengths, dignity and
                real support.
              </p>
              <a className="pa-neuro-link" href={`${SITE}/`}>
                Learn about neurodiversity
              </a>
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

        <section className="pa-section" id="community">
          <div className="pa-wrap pa-community">
            <div>
              <h2 className="pa-h2">Stay connected</h2>
              <p className="pa-sub">
                Follow Positive Autism for news and announcements, or reach out with a question.
              </p>
              <div className="pa-socials">
                <a href="https://www.facebook.com/PositiveAutism.org/">Facebook</a>
                <a href="https://www.youtube.com/channel/UCgMx6kRjfPaXH6XFvsTFd8A">YouTube</a>
                <a href={`${SITE}/`}>Español</a>
              </div>
            </div>
            <Magnet padding={70} magnetStrength={3}>
              <a className="pa-btn-contact" href={`${SITE}/contact/`}>
                Contact us
              </a>
            </Magnet>
          </div>
        </section>
      </main>

      <footer className="pa-footer">
        <div className="pa-wrap">
          <div className="pa-subscribe">
            <div>
              <h3>Stay Connected</h3>
              <p>Be the first to know when a new ebook is released.</p>
            </div>
            <SubscribeForm />
          </div>
          <div className="pa-footer-grid">
            <div>
              <img src="/assets/img/logo.png" alt="Positive Autism" width={173} height={44} />
              <p>Positive information and resources about autism.</p>
            </div>
            <div>
              <h4>Explore</h4>
              <ul>
                <li><a href="#audience">Autism info</a></li>
                <li><a href="#resources">Learning</a></li>
                <li><a href="#ebooks">Ebooks</a></li>
                <li><a href="#news">News</a></li>
              </ul>
            </div>
            <div>
              <h4>Learn</h4>
              <ul>
                <li><a href="#neurodiversity">Neurodiversity</a></li>
                <li><a href="#film">Accepted As I Am</a></li>
              </ul>
            </div>
            <div>
              <h4>Connect</h4>
              <ul>
                <li><a href={`${SITE}/contact/`}>Contact us</a></li>
                <li><a href="https://www.facebook.com/PositiveAutism.org/">Facebook</a></li>
                <li><a href="https://www.youtube.com/channel/UCgMx6kRjfPaXH6XFvsTFd8A">YouTube</a></li>
              </ul>
            </div>
          </div>
          <small>Positive Autism. Content and articles courtesy of positiveautism.org.</small>
        </div>
      </footer>
    </div>
  );
}
