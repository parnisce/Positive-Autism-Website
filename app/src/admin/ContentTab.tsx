import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { flattenCopy, type ContentOverrides } from "./site-data";
import type { Lang } from "../i18n";

const GROUPS: Record<string, string> = {
  General: "General and buttons",
  nav: "Menu",
  blog: "Blog page",
  hero: "Home: top banner",
  info: "Autism Info",
  audience: "Who it is for",
  resources: "Resources",
  ebooks: "Home: ebooks",
  film: "Film",
  news: "News",
  neuro: "Neurodiversity",
  about: "About Us",
  community: "Follow along",
  footer: "Footer",
  subscribe: "Stay connected form",
};
const label = (path: string) => path.split(".").slice(-2).join(" › ").replace(/([A-Z])/g, " $1").toLowerCase();

export function ContentTab() {
  const [lang, setLang] = useState<Lang>("en");
  const [saved, setSaved] = useState<ContentOverrides>({ en: {}, es: {} });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [group, setGroup] = useState("hero");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<{ content: ContentOverrides }>("content.get")
      .then((r) => setSaved({ en: r.content.en ?? {}, es: r.content.es ?? {} }))
      .catch(() => setMsg("Could not load saved text."));
  }, []);

  const fields = useMemo(() => flattenCopy(lang).map((f) => ({ ...f, group: f.path.includes(".") ? f.group : "General" })), [lang]);
  const groups = useMemo(() => [...new Set(fields.map((f) => f.group))], [fields]);
  const shown = fields.filter((f) => (q ? (f.value + f.path + (saved[lang][f.path] ?? "")).toLowerCase().includes(q.toLowerCase()) : f.group === group));
  const dirty = Object.keys(draft).length;

  const value = (p: string, orig: string) => draft[p] ?? saved[lang][p] ?? orig;

  async function save(changes: { path: string; value: string | null }[]) {
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ content: ContentOverrides }>("content.save", { changes: changes.map((c) => ({ lang, ...c })) });
      setSaved({ en: r.content.en ?? {}, es: r.content.es ?? {} });
      setDraft({});
      setMsg("Saved. The live site shows it within a few seconds.");
    } catch {
      setMsg("Could not save. Try again.");
    }
    setBusy(false);
  }

  const saveDraft = () =>
    save(
      Object.entries(draft).map(([path, v]) => {
        const orig = fields.find((f) => f.path === path)?.value;
        return { path, value: v === orig ? null : v };
      }),
    );

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Pages and text</h1>
          <p>Change any wording on the website. Pick a section, edit the text and save. English and Spanish are edited separately.</p>
        </div>
        <div className="ad-seg" role="group" aria-label="Language">
          {(["en", "es"] as const).map((l) => (
            <button key={l} className={lang === l ? "on" : ""} onClick={() => (setLang(l), setDraft({}))}>
              {l === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>
      </header>
      <div className="ad-split">
        <nav className="ad-side" aria-label="Sections">
          <input className="ad-in" placeholder="Search all text…" value={q} onChange={(e) => setQ(e.target.value)} />
          {groups.map((g) => (
            <button key={g} className={!q && group === g ? "on" : ""} onClick={() => (setQ(""), setGroup(g))}>
              {GROUPS[g] ?? g}
            </button>
          ))}
        </nav>
        <div className="ad-fields">
          {shown.map((f) => {
            const edited = saved[lang][f.path] !== undefined;
            const v = value(f.path, f.value);
            return (
              <label key={f.path} className={`ad-field${draft[f.path] !== undefined ? " dirty" : ""}`}>
                <span>
                  {label(f.path)}
                  {edited && <b className="ad-badge">edited</b>}
                </span>
                <textarea
                  className="ad-in"
                  rows={Math.min(7, Math.max(1, Math.ceil(v.length / 70)))}
                  value={v}
                  onChange={(e) => setDraft({ ...draft, [f.path]: e.target.value })}
                />
                {edited && (
                  <button type="button" className="ad-link" onClick={() => save([{ path: f.path, value: null }])}>
                    Reset to original
                  </button>
                )}
              </label>
            );
          })}
          {!shown.length && <p className="ad-empty">Nothing matches.</p>}
        </div>
      </div>
      <div className={`ad-savebar${dirty ? " on" : ""}`}>
        <span>{dirty ? `${dirty} unsaved change${dirty > 1 ? "s" : ""}` : msg}</span>
        {dirty > 0 && (
          <>
            <button className="ad-btn ghost" onClick={() => setDraft({})}>
              Discard
            </button>
            <button className="ad-btn" disabled={busy} onClick={saveDraft}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
