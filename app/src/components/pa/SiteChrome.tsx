import type { MouseEvent } from "react";
import { LINKS } from "../../i18n";
import { Controls } from "./Controls";
import { usePrefs } from "./prefs";
import { SubscribeForm } from "./SubscribeForm";

/** Close the mobile menu after choosing a link. */
const closeMenu = (e: MouseEvent<HTMLElement>) => {
  e.currentTarget.closest("details")?.removeAttribute("open");
};

/** `home` is true on the main page (links are same-page anchors); elsewhere they lead back to "/#section". */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const { t } = usePrefs();
  const base = home ? "" : "/";
  const nav = [
    { href: `${base}#autism-info`, label: t.nav.info },
    { href: `${base}#resources`, label: t.nav.resources },
    { href: `${base}#ebooks`, label: t.nav.ebooks },
    { href: `${base}#news`, label: t.nav.news },
    { href: `${base}#neurodiversity`, label: t.nav.neuro },
    { href: `${base}#about`, label: t.nav.about },
  ];
  return (
    <header className="pa-header">
      <div className="pa-wrap pa-header-in">
        <a className="pa-logo" href={home ? "#top" : "/"} aria-label={t.homeLabel}>
          <img src="/assets/img/logo.png" alt="Positive Autism" width={236} height={60} />
        </a>
        <nav className="pa-nav" aria-label={t.mainNav}>
          {nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="pa-header-right">
          <Controls />
          <a className="pa-contact-btn" href={`${base}#ebooks`}>
            {t.shop}
          </a>
        </div>
        <details className="pa-menu">
          <summary>{t.menu}</summary>
          <div className="pa-menu-list">
            {nav.map((n) => (
              <a key={n.href} href={n.href} onClick={closeMenu}>
                {n.label}
              </a>
            ))}
            <a href={`${base}#ebooks`} onClick={closeMenu}>
              {t.shop}
            </a>
            <Controls className="pa-menu-ctrl" />
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ home = false }: { home?: boolean }) {
  const { t } = usePrefs();
  const base = home ? "" : "/";
  const f = t.footer;
  return (
    <footer className="pa-footer pa-layer">
      <div className="pa-wrap">
        <div className="pa-subscribe" id="stay-connected">
          <div>
            <h3>{t.subscribe.h3}</h3>
            <p>{t.subscribe.text}</p>
          </div>
          <SubscribeForm />
        </div>
        <div className="pa-footer-grid">
          <div>
            <img src="/assets/img/logo.png" alt="Positive Autism" width={173} height={44} />
            <p>{f.tagline}</p>
            <p className="pa-made">{f.made}</p>
          </div>
          <div>
            <h4>{f.explore}</h4>
            <ul>
              <li><a href={`${base}#autism-info`}>{t.nav.info}</a></li>
              <li><a href={`${base}#resources`}>{t.nav.resources}</a></li>
              <li><a href={`${base}#ebooks`}>{t.nav.ebooks}</a></li>
              <li><a href={`${base}#news`}>{t.nav.news}</a></li>
            </ul>
          </div>
          <div>
            <h4>{f.learn}</h4>
            <ul>
              <li><a href={`${base}#neurodiversity`}>{t.nav.neuro}</a></li>
              <li><a href={`${base}#film`}>{f.film}</a></li>
              <li><a href={`${base}#about`}>{t.nav.about}</a></li>
            </ul>
          </div>
          <div>
            <h4>{f.connect}</h4>
            <ul>
              <li><a href={`${base}${LINKS.subscribe}`}>{t.community.contact}</a></li>
              <li><a href={LINKS.facebook}>Facebook</a></li>
              <li><a href={LINKS.youtube}>YouTube</a></li>
            </ul>
          </div>
          <div>
            <h4>{f.legal}</h4>
            <ul>
              <li><a href="/user-data-management">{f.userData}</a></li>
              <li><a href="/terms-and-conditions">{f.terms}</a></li>
              <li><a href="/privacy-policy">{f.privacy}</a></li>
            </ul>
          </div>
        </div>
        <small className="pa-copy">{f.credit}</small>
      </div>
    </footer>
  );
}
