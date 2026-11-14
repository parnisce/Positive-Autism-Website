import { useEffect, useRef, useState } from "react";
import { Markdown } from "../blog/BlogPages";
import { api, uploadImage } from "./api";

type Post = { id: number; slug: string; title: string; excerpt: string; body: string; cover: string; published: number; created_at: string; updated_at: string };
const blank: Post = { id: 0, slug: "", title: "", excerpt: "", body: "", cover: "", published: 0, created_at: "", updated_at: "" };

export function BlogTab() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [msg, setMsg] = useState("");

  const load = () =>
    api<{ posts: Post[] }>("posts.list")
      .then((r) => setPosts(r.posts))
      .catch(() => setMsg("Could not load posts."));
  useEffect(() => {
    void load();
  }, []);

  if (edit) {
    return (
      <Editor
        post={edit}
        onClose={() => {
          setEdit(null);
          void load();
        }}
      />
    );
  }
  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Blog posts</h1>
          <p>Write articles that appear on the /blog page. Drafts stay hidden until you publish them.</p>
        </div>
        <button className="ad-btn" onClick={() => setEdit({ ...blank })}>
          + New post
        </button>
      </header>
      {msg && <p className="ad-note">{msg}</p>}
      {posts && posts.length === 0 && <p className="ad-empty">No posts yet. Write your first one with “New post”.</p>}
      <div className="ad-list">
        {posts?.map((p) => (
          <div key={p.id} className="ad-row">
            <div className="ad-thumb">{p.cover ? <img src={p.cover} alt="" /> : "✦"}</div>
            <div className="ad-row-main">
              <strong>{p.title}</strong>
              <small>
                /blog/{p.slug} · {new Date(p.created_at).toLocaleDateString()}
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
    </div>
  );
}

function Editor({ post, onClose }: { post: Post; onClose: () => void }) {
  const [p, setP] = useState<Post>(post);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);
  const body = useRef<HTMLTextAreaElement>(null);
  const set = (k: keyof Post, v: string | number) => setP((x) => ({ ...x, [k]: v }));

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
      setMsg(e instanceof Error && e.message === "bad_cover" ? "The cover address must start with https:// or /." : "Could not save. Try again.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!p.id || !confirm("Delete this post for good?")) return;
    await api("posts.delete", { id: p.id });
    onClose();
  }

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
      <div className="ad-form">
        <label>
          <span>Title</span>
          <input className="ad-in" value={p.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label>
          <span>Web address (leave empty to create it from the title)</span>
          <input className="ad-in" placeholder="my-article" value={p.slug} onChange={(e) => set("slug", e.target.value)} />
        </label>
        <label>
          <span>Short summary (shown on the blog page)</span>
          <textarea className="ad-in" rows={2} value={p.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
        </label>
        <div className="ad-cover">
          <span>Cover picture</span>
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
              rows={18}
              placeholder={"Write here. Leave an empty line between paragraphs.\n\n## A heading\n\n- a list item"}
              value={p.body}
              onChange={(e) => set("body", e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
