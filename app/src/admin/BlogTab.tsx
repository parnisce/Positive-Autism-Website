import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "../blog/BlogPages";
import { api, uploadImage } from "./api";
import { SchemaNotice, treeOrder, useCategories, type Cat } from "./CategoriesTab";
import { Card } from "./ui";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string;
  published: number;
  created_at: string;
  updated_at: string;
  cats: string[];
};
const blank: Post = { id: 0, slug: "", title: "", excerpt: "", body: "", cover: "", published: 0, created_at: "", updated_at: "", cats: [] };
const PAGE = 25;

export function BlogTab({ schema }: { schema: boolean }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [msg, setMsg] = useState("");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const cl = useCategories();

  const load = () =>
    api<{ posts: Post[] }>("posts.list")
      .then((r) => setPosts(r.posts))
      .catch(() => setMsg("Could not load posts."));
  useEffect(() => {
    void load();
  }, []);

  const names = useMemo(() => new Map((cl.d?.categories ?? []).map((c) => [c.slug, c.name])), [cl.d]);
  const order = useMemo(() => treeOrder(cl.d?.categories ?? []), [cl.d]);
  // a category filter includes its sub-categories
  const within = useMemo(() => {
    if (!cat || !cl.d) return null;
    const out = new Set([cat]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of cl.d.categories) if (out.has(c.parent) && !out.has(c.slug)) (out.add(c.slug), (grew = true));
    }
    return out;
  }, [cat, cl.d]);
  const list = (posts ?? []).filter((p) => (!within || p.cats.some((c) => within.has(c))) && (!q || p.title.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);

  async function importSeed() {
    if (!confirm(`Copy the ${cl.d?.seed.posts} articles from the previous site into your database? You can then edit, delete or recategorise each one.`)) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ imported: number }>("posts.import");
      setMsg(`Imported ${r.imported} articles.`);
      await Promise.all([load(), cl.reload()]);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setMsg(m.includes("schema") ? "Run the one-time database update first (shown above)." : `Could not import: ${m || "unknown error"}`);
    }
    setBusy(false);
  }

  if (edit) {
    return (
      <Editor
        post={edit}
        cats={cl.d?.categories ?? []}
        onClose={() => {
          setEdit(null);
          void load();
          void cl.reload();
        }}
      />
    );
  }
  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Blog posts</h1>
          <p>Write articles that appear on the /blog page, and file them under categories. Drafts stay hidden until you publish them.</p>
        </div>
        <button className="ad-btn" onClick={() => setEdit({ ...blank })}>
          + New post
        </button>
      </header>
      {!schema && <SchemaNotice />}
      {cl.d?.seed.active && (
        <Card title={`${cl.d.seed.posts} articles from the previous site are live`}>
          <p className="ad-fine">
            They already appear on your Blog page, sorted into categories. Import them to edit, delete or recategorise them here.
          </p>
          <button className="ad-btn" disabled={busy || !schema} onClick={importSeed}>
            {busy ? "Importing…" : `Import ${cl.d.seed.posts} articles`}
          </button>
        </Card>
      )}
      {msg && <p className="ad-note">{msg}</p>}
      <div className="ad-filters">
        <input className="ad-in" placeholder="Search posts…" value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} />
        <select className="ad-in" value={cat} onChange={(e) => (setCat(e.target.value), setPage(0))} aria-label="Category">
          <option value="">All categories</option>
          {order.map(({ cat: c, depth }) => (
            <option key={c.slug} value={c.slug}>
              {"— ".repeat(depth)}
              {c.name}
            </option>
          ))}
        </select>
        <span className="ad-fine">{posts ? `${list.length} post${list.length === 1 ? "" : "s"}` : ""}</span>
      </div>
      {posts && posts.length === 0 && <p className="ad-empty">No posts in your database yet. Write one with “New post”{cl.d?.seed.active ? ", or import the previous site's articles above" : ""}.</p>}
      <div className="ad-list">
        {list.slice(cur * PAGE, cur * PAGE + PAGE).map((p) => (
          <div key={p.id} className="ad-row">
            <div className="ad-thumb">{p.cover ? <img src={p.cover} alt="" loading="lazy" /> : "✦"}</div>
            <div className="ad-row-main">
              <strong>{p.title}</strong>
              <small>
                {p.cats.map((c) => names.get(c) ?? c).join(", ") || "No category"} · {new Date(p.created_at).toLocaleDateString()}
              </small>
            </div>
            <span className={`ad-pill ${p.published ? "ok" : ""}`}>{p.published ? "Published" : "Draft"}</span>
            {p.published ? (
              <a className="ad-btn ghost sm" href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                View
              </a>
            ) : null}
            <button className="ad-btn ghost sm" onClick={() => setEdit(p)}>
              Edit
            </button>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="ad-pager">
          <button className="ad-btn ghost sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
            ← Previous
          </button>
          <span>
            Page {cur + 1} of {pages}
          </span>
          <button className="ad-btn ghost sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function Editor({ post, cats, onClose }: { post: Post; cats: Cat[]; onClose: () => void }) {
  const [p, setP] = useState<Post>(post);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);
  const body = useRef<HTMLTextAreaElement>(null);
  const set = (k: keyof Post, v: string | number | string[]) => setP((x) => ({ ...x, [k]: v }));
  const order = useMemo(() => treeOrder(cats), [cats]);

  function wrap(before: string, after = "", fallback = "text") {
    const el = body.current;
    if (!el) return;
    const [a, b] = [el.selectionStart, el.selectionEnd];
    const sel = p.body.slice(a, b) || fallback;
    set("body", p.body.slice(0, a) + before + sel + after + p.body.slice(b));
    requestAnimationFrame(() => el.focus());
  }

  async function pick(file: File | undefined, then: (url: string) => void) {
    if (!file) return;
    setMsg("Uploading picture…");
    try {
      then(await uploadImage(file));
      setMsg("");
    } catch {
      setMsg("That picture could not be uploaded.");
    }
  }

  async function save(publish?: boolean) {
    if (!p.title.trim()) return setMsg("Add a title first.");
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ id: number; slug: string }>("posts.save", { ...p, published: publish === undefined ? p.published : publish ? 1 : 0 });
      setP((x) => ({ ...x, id: r.id, slug: r.slug, published: publish === undefined ? x.published : publish ? 1 : 0 }));
      setMsg("Saved.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setMsg(m === "bad_cover" ? "The cover address must start with https:// or /." : m === "schema" ? "Run the one-time database update first (see the Blog or Categories page)." : "Could not save. Try again.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!p.id || !confirm("Delete this post for good?")) return;
    await api("posts.delete", { id: p.id });
    onClose();
  }

  const toggleCat = (slug: string) => set("cats", p.cats.includes(slug) ? p.cats.filter((c) => c !== slug) : [...p.cats, slug]);

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <button className="ad-link" onClick={onClose}>
            ← All posts
          </button>
          <h1>{p.id ? "Edit post" : "New post"}</h1>
        </div>
        <div className="ad-actions">
          {p.id > 0 && (
            <button className="ad-btn danger ghost" onClick={remove}>
              Delete
            </button>
          )}
          <button className="ad-btn ghost" disabled={busy} onClick={() => save()}>
            Save
          </button>
          <button className="ad-btn" disabled={busy} onClick={() => save(!p.published)}>
            {p.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </header>
      {msg && <p className="ad-note">{msg}</p>}
      <div className="ad-form two">
        <div className="ad-col">
          <label>
            <span>Title</span>
            <input className="ad-in" value={p.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <div>
            <div className="ad-tool">
              <span>Article</span>
              <button type="button" onClick={() => wrap("## ", "", "Heading")}>
                Heading
              </button>
              <button type="button" onClick={() => wrap("**", "**")}>
                Bold
              </button>
              <button type="button" onClick={() => wrap("[", "](https://)", "link text")}>
                Link
              </button>
              <button type="button" onClick={() => wrap("- ", "", "List item")}>
                List
              </button>
              <label>
                Picture
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pick(e.target.files?.[0], (u) => set("body", `${p.body}${p.body ? "\n\n" : ""}![](${u})\n\n`))}
                />
              </label>
              <button type="button" className={preview ? "on" : ""} onClick={() => setPreview(!preview)}>
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="ad-preview pa-blog-text">
                <Markdown text={p.body || "Nothing to preview yet."} />
              </div>
            ) : (
              <textarea
                ref={body}
                className="ad-in ad-body"
                rows={20}
                placeholder={"Write here. Leave an empty line between paragraphs.\n\n## A heading\n\n- a list item"}
                value={p.body}
                onChange={(e) => set("body", e.target.value)}
              />
            )}
          </div>
        </div>
        <div className="ad-col">
          <div>
            <span className="ad-lbl">Categories</span>
            <div className="ad-checks ad-catchecks">
              {order.length === 0 && <small>No categories yet. Add some on the Categories page.</small>}
              {order.map(({ cat, depth }) => (
                <label key={cat.slug} style={{ paddingLeft: depth * 18 }}>
                  <input type="checkbox" checked={p.cats.includes(cat.slug)} onChange={() => toggleCat(cat.slug)} />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>
          <label>
            <span>Web address (leave empty to create it from the title)</span>
            <input className="ad-in" placeholder="my-article" value={p.slug} onChange={(e) => set("slug", e.target.value)} />
          </label>
          <label>
            <span>Short summary (shown on the blog page)</span>
            <textarea className="ad-in" rows={3} value={p.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </label>
          <div className="ad-cover">
            <span className="ad-lbl">Cover picture</span>
            <div className="ad-cover-row">
              <div className="ad-thumb big">{p.cover ? <img src={p.cover} alt="" /> : "✦"}</div>
              <div>
                <input className="ad-in" placeholder="https://… or upload" value={p.cover} onChange={(e) => set("cover", e.target.value)} />
                <label className="ad-btn ghost sm">
                  Upload picture
                  <input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0], (u) => set("cover", u))} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
