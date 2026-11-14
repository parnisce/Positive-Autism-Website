import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COPY, type Copy, type Lang } from "../../i18n";

export type Theme = "light" | "dark";

type Prefs = {
  lang: Lang;
  theme: Theme;
  t: Copy;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
};

const Ctx = createContext<Prefs | null>(null);

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be blocked; the choice just won't persist */
  }
};

/** Holds the visitor's language and light/dark choice, remembered between visits. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  // Server render and first paint use English + light, then the saved/system choice is applied.
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedLang = read("pa-lang");
    if (savedLang === "en" || savedLang === "es") setLangState(savedLang);
    else if (navigator.language?.toLowerCase().startsWith("es")) setLangState("es");

    const savedTheme = read("pa-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write("pa-lang", l);
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === "dark" ? "light" : "dark";
      write("pa-theme", next);
      return next;
    });
  }, []);

  const value = useMemo<Prefs>(
    () => ({ lang, theme, t: COPY[lang], setLang, toggleTheme }),
    [lang, theme, setLang, toggleTheme],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
