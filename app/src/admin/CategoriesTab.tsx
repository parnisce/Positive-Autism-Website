import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { UPDATE_SQL } from "./schema-sql";
import { Card } from "./ui";

export type Cat = { slug: string; name: string; parent: string; description: string };
export type CatList = { categories: Cat[]; counts: Record<string, number>; fromSeed: boolean; seed: { active: boolean; posts: number } };

/** Categories in tree order, each with how deep it sits. */
export function treeOrder(cats: Cat[]): { cat: Cat; depth: number }[] {
  const out: { cat: Cat; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string, depth: number) => {
    for (const c of cats.filter((x) => x.parent === parent)) {
      if (seen.has(c.slug)) continue;
      seen.add(c.slug);
      out.push({ cat: c, depth });
      walk(c.slug, depth + 1);
    }
  };
  walk("", 0);
  for (const c of cats) if (!seen.has(c.slug)) out.push({ cat: c, depth: 0 }); // orphans
  return out;
}

export function useCategories() {
  const [d, setD] = useState<CatList | null>(null);
  const [err, setErr] = useState("");
  const load = () =>
    api<CatList>("categories.list")
      .then((r) => (setD(r), setErr("")))
      .catch(() => setErr("Could not load the categories."));
  useEffect(() => {
    void load();
  }, []);
  return { d, err, reload: load };
}

/** Shown when the database still needs the one-time update that adds blog categories. */
export function SchemaNotice() {
  return (
    <Card title="One-time database update needed">
      <p className="ad-fine">
        Blog categories need one small change in Supabase. Open <b>SQL Editor → New query</b>, paste this and press <b>Run</b>. It is safe to run again.
      </p>
      <pre className="ad-code">{UPDATE_SQL}</pre>
      <button type="button" className="ad-btn ghost sm" onClick={() => navigator.clipboard.writeText(UPDATE_SQL)}>
        Copy update script
      </button>
    </Card>
  );
}

const blank = { name: "", slug: "", parent: "", description: "" };

/** Create and organise the categories blog posts belong to (same idea as WordPress categories). */
export function CategoriesTab({ schema }: { schema: boolean }) {
  const { d, err, reload } = useCategories();
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const order = useMemo(() => treeOrder(d?.categories ?? []), [d]);
  const shown = order.filter(({ cat }) => !q || `${cat.name} ${cat.slug} ${cat.description}`.toLowerCase().includes(q.toLowerCase()));
  // a category cannot be moved under itself or its own children
  const blocked = useMemo(() => {
    if (!editing || !d) return new Set<string>();
    const out = new Set<string>([editing]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of d.categories) if (out.has(c.parent) && !out.has(c.slug)) (out.add(c.slug), (grew = true));
    }
    return out;
  }, [editing, d]);

  function edit(c: Cat) {
    setEditing(c.slug);
    setF({ name: c.name, slug: c.slug, parent: c.parent, description: c.description });
    setMsg("");
    window.scrollTo(0, 0);
    document.querySelector(".ad-main")?.scrollTo(0, 0);
  }
  function reset() {
    setEditing(null);
    setF(blank);
  }

  async function save() {
    if (!f.name.trim()) return setMsg("Give the category a name.");
    setBusy(true);
    setMsg("");
    try {
      await api("categories.save", { oldSlug: editing ?? "", ...f });
      reset();
      await reload();
      setMsg(editing ? "Category updated." : "Category added.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setMsg(m === "slug_taken" ? "Another category already uses that slug." : m === "bad_parent" ? "A category cannot be placed inside itself." : "Could not save. Try again.");
    }
    setBusy(false);
  }

  async function remove(c: Cat) {
    if (!confirm(`Delete “${c.name}”? Its sub-categories move up a level and posts simply lose this category.`)) return;
    await api("categories.delete", { slug: c.slug }).catch(() => setMsg("Could not delete."));
    await reload();
  }

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Categories</h1>
          <p>Organise blog posts into categories and sub-categories, then pick them when you write a post. Visitors can browse each category on the Blog page.</p>
        </div>
      </header>
      {!schema && <SchemaNotice />}
      {err && <p className="ad-note">{err}</p>}
      {d?.fromSeed && <p className="ad-note">These are the categories that came with the site. Changing any of them saves the whole list to your database.</p>}
      {msg && <p className="ad-note ok">{msg}</p>}
      <div className="ad-cats">
        <Card title={editing ? "Edit category" : "Add category"} className="ad-catform">
          <div className="ad-form">
            <label>
              <span>Name</span>
              <input className="ad-in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <small>The name is how it appears on your site.</small>
            </label>
            <label>
              <span>Slug</span>
              <input className="ad-in" placeholder="made from the name if left empty" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
              <small>The “slug” is the web-address version of the name: lowercase letters, numbers and hyphens.</small>
            </label>
            <label>
              <span>Parent category</span>
              <select className="ad-in" value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })}>
                <option value="">None</option>
                {order
                  .filter(({ cat }) => !blocked.has(cat.slug))
                  .map(({ cat, depth }) => (
                    <option key={cat.slug} value={cat.slug}>
                      {"— ".repeat(depth)}
                      {cat.name}
                    </option>
                  ))}
              </select>
              <small>Categories can have a hierarchy: for example “Autism Info” with “For Parents” inside it. Optional.</small>
            </label>
            <label>
              <span>Description</span>
              <textarea className="ad-in" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              <small>Shown under the category title on the Blog page. Optional.</small>
            </label>
            <div className="ad-actions">
              <button className="ad-btn" disabled={busy} onClick={save}>
                {editing ? "Update category" : "Add category"}
              </button>
              {editing && (
                <button className="ad-btn ghost" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Card>

        <div>
          <div className="ad-filters">
            <input className="ad-in" placeholder="Search categories…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="ad-fine">{d ? `${d.categories.length} items` : ""}</span>
          </div>
          <Card>
            {!d ? (
              <p className="ad-empty">Loading…</p>
            ) : (
              <div className="ad-scroll">
                <table className="ad-table ad-cattable">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Slug</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ cat, depth }) => (
                      <tr key={cat.slug}>
                        <td>
                          <b>
                            {"— ".repeat(depth)}
                            {cat.name}
                          </b>
                          <span className="ad-rowact">
                            <button className="ad-link" onClick={() => edit(cat)}>
                              Edit
                            </button>
                            <i>|</i>
                            <button className="ad-link danger" onClick={() => remove(cat)}>
                              Delete
                            </button>
                            <i>|</i>
                            <a href={`/blog/category/${cat.slug}`} target="_blank" rel="noreferrer">
                              View
                            </a>
                          </span>
                        </td>
                        <td>{cat.description || "—"}</td>
                        <td>{cat.slug}</td>
                        <td>{d.counts[cat.slug] ?? 0}</td>
                      </tr>
                    ))}
                    {shown.length === 0 && (
                      <tr>
                        <td colSpan={4} className="ad-empty">
                          No categories yet. Add the first one on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
