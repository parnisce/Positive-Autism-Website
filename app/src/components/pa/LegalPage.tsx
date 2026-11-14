import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "../../contact";
import { LINKS, type Lang } from "../../i18n";
import { LEGAL, type LegalKey } from "../../legal";
import { PrefsProvider, usePrefs } from "./prefs";
import { SiteFooter, SiteHeader } from "./SiteChrome";

/** Replace "{contact}" with the contact email, or a Facebook link while no email is configured. */
function withContact(text: string, lang: Lang): ReactNode {
  if (!text.includes("{contact}")) return text;
  const [before, after] = text.split("{contact}");
  const contact: ReactNode = CONTACT_EMAIL ? (
    <>
      {lang === "es" ? "a " : "at "}
      <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    </>
  ) : (
    <>
      {lang === "es" ? "a través de nuestra " : "through our "}
      <a href={LINKS.facebook}>{lang === "es" ? "página de Facebook" : "Facebook page"}</a>
    </>
  );
  return (
    <>
      {before}
      {contact}
      {after}
    </>
  );
}

function LegalBody({ doc }: { doc: LegalKey }) {
  const { lang, t } = usePrefs();
  const d = LEGAL[lang][doc];
  return (
    <div className="pa-root pa-scrolled pa-page">
      <a className="pa-skip" href="#main">
        {t.skip}
      </a>
      <SiteHeader />
      <main id="main" className="pa-legal">
        <div className="pa-wrap">
          <a className="pa-back" href="/">
            ← {t.legalBack}
          </a>
          <article className="pa-legal-doc">
            <h1>{d.title}</h1>
            <p className="pa-legal-date">{d.updated}</p>
            <p className="pa-legal-intro">{withContact(d.intro, lang)}</p>
            {d.sections.map((s, i) => (
              <section key={s.h}>
                <h2>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {s.h}
                </h2>
                {s.ul && (
                  <ul>
                    {s.ul.map((li) => (
                      <li key={li}>{withContact(li, lang)}</li>
                    ))}
                  </ul>
                )}
                {s.p?.map((p) => <p key={p}>{withContact(p, lang)}</p>)}
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** A full legal page (header, text, footer) with the visitor's saved language and theme. */
export function LegalPage({ doc }: { doc: LegalKey }) {
  return (
    <PrefsProvider>
      <LegalBody doc={doc} />
    </PrefsProvider>
  );
}
