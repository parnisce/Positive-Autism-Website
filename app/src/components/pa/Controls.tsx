import { usePrefs } from "./prefs";

/** English / Spanish switcher and light / dark toggle. */
export function Controls({ className = "" }: { className?: string }) {
  const { lang, setLang, theme, toggleTheme, t } = usePrefs();
  return (
    <div className={`pa-ctrl ${className}`.trim()}>
      <div className="pa-lang" role="group" aria-label={t.langLabel}>
        <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en">
          EN
        </button>
        <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")} lang="es">
          ES
        </button>
      </div>
      <button
        type="button"
        className="pa-theme"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? t.toLight : t.toDark}
        title={theme === "dark" ? t.toLight : t.toDark}
      >
        <svg className="pa-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
        <svg className="pa-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </div>
  );
}
