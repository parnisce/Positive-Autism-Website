import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { SchemaNotice } from "./CategoriesTab";
import { Card, downloadCsv, num, when } from "./ui";

type Sub = { id: number; email: string; name: string; lang: string; source: string; created_at: string };

/** Everyone who signed up for ebook-release news with the "Stay connected" form. */
export function SubscribersTab({ schema }: { schema: boolean }) {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const load = () =>
    api<{ subscribers: Sub[] }>("subscribers.list")
      .then((r) => (setSubs(r.subscribers), setErr("")))
      .catch(() => setErr("Could not load the list. If you have not yet, run the one-time database update."));
  useEffect(() => {
    void load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const list = useMemo(() => (subs ?? []).filter((s) => !q || `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase())), [subs, q]);
  const week = (subs ?? []).filter((s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000).length;
  const es = (subs ?? []).filter((s) => s.lang === "es").length;

  async function remove(s: Sub) {
    if (!confirm(`Remove ${s.email} from the list?`)) return;
    await api("subscribers.delete", { id: s.id }).catch(() => {});
    void load();
  }

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Email list</h1>
          <p>People who asked to hear about new ebooks through the “Stay connected” form in your site footer.</p>
        </div>
        <button
          className="ad-btn"
          disabled={!list.length}
          onClick={() => downloadCsv("subscribers.csv", [["Name", "Email", "Language", "Signed up"], ...list.map((s) => [s.name, s.email, s.lang, new Date(s.created_at).toISOString()])])}
        >
          Export CSV
        </button>
      </header>
      {!schema && <SchemaNotice />}
      {err && <p className="ad-note">{err}</p>}
      <div className="ad-kpis">
        <div className="ad-kpi">
          <small>Subscribers</small>
          <strong>{subs ? num(subs.length) : "…"}</strong>
          <span>on your list</span>
        </div>
        <div className="ad-kpi">
          <small>New this week</small>
          <strong>{subs ? num(week) : "…"}</strong>
          <span>last 7 days</span>
        </div>
        <div className="ad-kpi">
          <small>Spanish</small>
          <strong>{subs ? num(es) : "…"}</strong>
          <span>signed up in Spanish</span>
        </div>
      </div>
      <div className="ad-filters">
        <input className="ad-in" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        {list.length === 0 ? (
          <p className="ad-empty">{subs?.length ? "No one matches." : "No sign-ups yet. They appear here as visitors use the form in your footer."}</p>
        ) : (
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Language</th>
                  <th>Signed up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name || "—"}</td>
                    <td>
                      <a href={`mailto:${s.email}`}>{s.email}</a>
                    </td>
                    <td>{s.lang === "es" ? "Español" : "English"}</td>
                    <td>{when(new Date(s.created_at).getTime())}</td>
                    <td>
                      <button className="ad-link danger" onClick={() => remove(s)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
