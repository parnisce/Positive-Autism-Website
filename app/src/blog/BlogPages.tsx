import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PrefsProvider, usePrefs } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import type { BlogCategory, PostCard, PostFull } from "../admin/site.functions";
import "./blog.css";

const safeUrl = (u: string) => (/^(https?:\/\/|\/|mailto:|#)/i.test(u) ? u : "#");

/** **bold**, *italic* and [links](url) inside one line of text. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("*")) out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    else {
      const [, label, url] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/) ?? [];
      out.push(
        <a key={i++} href={safeUrl(url || "")} {...(/^https?:/i.test(url || "") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label}
        </a>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const plain = (t: string) => t.replace(/\*\*?|__/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
const idOf = (t: string) => plain(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
export type Heading = { id: string; text: string; level: 2 | 3 };
/** The headings of a Markdown text (for the "On this page" list); ids match the ones Markdown puts on the headings. */
export function headingsOf(text: string): Heading[] {
  const seen = new Map<string, number>();
  const out: Heading[] = [];
  for (const b of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const h = b.split("\n")[0].match(/^(#{1,3})\s+(.*)$/);
    if (!h) continue;
    const base = idOf(h[2]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ id: n ? `${base}-${n + 1}` : base, text: plain(h[2]), level: h[1].length >= 3 ? 3 : 2 });
  }
  return out;
}
/** Drops a first heading that just repeats the post title. */
export function withoutTitle(text: string, title: string) {
  const m = text.match(/^\s*#{1,3}\s+(.*)\n+/);
  return m && plain(m[1]).toLowerCase() === plain(title).toLowerCase() ? text.slice(m[0].length) : text;
}

/** A small, safe Markdown subset: ## headings, - lists, > quotes, ![images](url), paragraphs. No raw HTML. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  const heads = headingsOf(text);
  let hi = 0;
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        const first = lines[0];
        const h = first.match(/^(#{1,3})\s+(.*)$/);
        if (h) {
          const id = heads[hi++]?.id;
          return h[1].length <= 2 ? (
            <h2 key={i} id={id}>
              {inline(h[2])}
            </h2>
          ) : (
            <h3 key={i} id={id}>
              {inline(h[2])}
            </h3>
          );
        }
        const img = first.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
        if (img) return <img key={i} src={safeUrl(img[2])} alt={img[1]} loading="lazy" />;
        if (lines.every((l) => /^[-*]\s+/.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+[.)]\s+/.test(l)))
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        if (lines.every((l) => l.startsWith(">")))
          return <blockquote key={i}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</blockquote>;
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** Category helpers: a category includes everything in its sub-categories. */
function useTree(categories: BlogCategory[]) {
  return useMemo(() => {
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    const kids = new Map<string, BlogCategory[]>();
    for (const c of categories) kids.set(c.parent, [...(kids.get(c.parent) ?? []), c]);
    const subtree = (slug: string): Set<string> => {
      const out = new Set([slug]);
      for (const k of kids.get(slug) ?? []) for (const x of subtree(k.slug)) out.add(x);
      return out;
    };
    const path = (slug: string) => {
      const out: BlogCategory[] = [];
      let c = bySlug.get(slug);
      while (c) {
        out.unshift(c);
        c = c.parent ? bySlug.get(c.parent) : undefined;
      }
      return out;
    };
    return { bySlug, kids, subtree, path };
  }, [categories]);
}

const PAGE = 12;
const tintOf = (i: number) => ({ "--tint": `var(--pa-tint-${(i % 6) + 1})` }) as CSSProperties;

function Card({ p, i, categories }: { p: PostCard; i: number; categories: Map<string, BlogCategory> }) {
  const { lang } = usePrefs();
  const first = p.cats.map((c) => categories.get(c)).find(Boolean);
  return (
    <Link className="pa-blog-card" to="/blog/$slug" params={{ slug: p.slug }} style={tintOf(i)}>
      <span className="pa-blog-img">{p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <i aria-hidden="true">✦</i>}</span>
      <span className="pa-blog-body">
        <time>
          {new Date(p.created_at).toLocaleDateString(lang === "es" ? "es-CA" : "en-CA", { year: "numeric", month: "short", day: "numeric" })}
          {first ? ` · ${first.name}` : ""}
        </time>
        <strong>{p.title}</strong>
        {p.excerpt && <span>{p.excerpt}</span>}
      </span>
    </Link>
  );
}

function IndexBody({ posts, categories, active }: { posts: PostCard[]; categories: BlogCategory[]; active?: string }) {
  const { t } = usePrefs();
  const tree = useTree(categories);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const cat = active ? tree.bySlug.get(active) : undefined;
  const path = active ? tree.path(active) : [];
  const set = active ? tree.subtree(active) : null;
  const list = useMemo(
    () =>
      posts.filter(
        (p) => (!set || p.cats.some((c) => set.has(c))) && (!q || `${p.title} ${p.excerpt}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [posts, set, q],
  );
  const top = tree.kids.get("") ?? [];
  // sub-categories shown under the top row: those of the active branch's top-level category
  const root = path[0];
  const subs = root ? (tree.kids.get(root.slug) ?? []) : [];
  const deeper = cat && (tree.kids.get(cat.slug) ?? []).length ? (tree.kids.get(cat.slug) ?? []) : [];
  const catMap = tree.bySlug;
  return (
    <div className="pa-root pa-scrolled pa-page">
      <SiteHeader />
      <main id="main" className="pa-legal pa-blog">
        <div className="pa-wrap">
          {cat && (
            <nav className="pa-blog-crumbs" aria-label="Breadcrumb">
              <Link to="/blog">{t.nav.blog}</Link>
              {path.map((c) => (
                <span key={c.slug}>
                  {" / "}
                  {c.slug === cat.slug ? c.name : <Link to="/blog/category/$slug" params={{ slug: c.slug }}>{c.name}</Link>}
                </span>
              ))}
            </nav>
          )}
          <h1>{cat ? cat.name : t.blog.h1}</h1>
          <p className="pa-blog-sub">{cat?.description || t.blog.sub}</p>

          <div className="pa-blog-tools">
            <div className="pa-blog-cats" role="list">
              <Link className={!active ? "on" : ""} to="/blog" role="listitem">
                {t.blog.all} <em>{posts.length}</em>
              </Link>
              {top.map((c) => (
                <Link key={c.slug} className={root?.slug === c.slug ? "on" : ""} to="/blog/category/$slug" params={{ slug: c.slug }} role="listitem">
                  {c.name} <em>{c.count}</em>
                </Link>
              ))}
            </div>
            <input className="pa-blog-search" type="search" placeholder={t.blog.search} value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} aria-label={t.blog.search} />
          </div>
          {subs.length > 0 && (
            <div className="pa-blog-cats is-sub" role="list">
              {subs.map((c) => (
                <Link key={c.slug} className={path.some((x) => x.slug === c.slug) ? "on" : ""} to="/blog/category/$slug" params={{ slug: c.slug }} role="listitem">
                  {c.name} <em>{c.count}</em>
                </Link>
              ))}
            </div>
          )}
          {deeper.length > 0 && !subs.some((s) => s.slug === cat?.slug) && (
            <div className="pa-blog-cats is-sub" role="list">
              {deeper.map((c) => (
                <Link key={c.slug} to="/blog/category/$slug" params={{ slug: c.slug }} role="listitem">
                  {c.name} <em>{c.count}</em>
                </Link>
              ))}
            </div>
          )}

          {list.length === 0 ? (
            <p className="pa-blog-empty">{posts.length === 0 ? t.blog.empty : t.blog.none}</p>
          ) : (
            <>
              <p className="pa-blog-count">{t.blog.count.replace("{n}", String(list.length))}</p>
              <div className="pa-blog-grid">
                {list.slice(0, shown).map((p, i) => (
                  <Card key={p.slug} p={p} i={i} categories={catMap} />
                ))}
              </div>
              {shown < list.length && (
                <div className="pa-blog-more">
                  <button type="button" className="pa-btn-watch" onClick={() => setShown(shown + PAGE)}>
                    {t.blog.more}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function BlogIndex(props: { posts: PostCard[]; categories: BlogCategory[]; active?: string }) {
  return (
    <PrefsProvider>
      <IndexBody key={props.active ?? "all"} {...props} />
    </PrefsProvider>
  );
}

const minutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 210));

function ShareBar({ title, url }: { title: string; url: string }) {
  const { t } = usePrefs();
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="pa-share" id="share">
      <span>{t.blog.share}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1800)));
        }}
      >
        {copied ? t.blog.copied : t.blog.copy}
      </button>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a href={`https://wa.me/?text=${enc(title + " " + url)}`} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>Email</a>
    </div>
  );
}

function PostBody({ post, related, categories, prev, next }: { post: PostFull | null; related: PostCard[]; categories: BlogCategory[]; prev: PostCard | null; next: PostCard | null }) {
  const { t, lang } = usePrefs();
  const tree = useTree(categories);
  const text = useMemo(() => (post ? withoutTitle(post.body, post.title) : ""), [post]);
  const heads = useMemo(() => headingsOf(text), [text]);
  // the summary is only shown as an intro when the article does not already open with the same words
  const lead = useMemo(() => {
    const n = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const first = text.split(/\n{2,}/).find((b) => !/^#/.test(b.trim())) ?? "";
    return post?.excerpt && n(first).slice(0, 40) !== n(post.excerpt).slice(0, 40) ? post.excerpt : "";
  }, [text, post]);
  const [active, setActive] = useState("");
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  // reading progress bar, and the "On this page" item that matches what is on screen
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, total))));
      let cur = "";
      for (const h of heads) {
        const e = document.getElementById(h.id);
        if (e && e.getBoundingClientRect().top < 140) cur = h.id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [heads]);

  const path = post ? post.cats.map((c) => tree.path(c)).sort((a, b) => b.length - a.length)[0] ?? [] : [];
  const url = typeof window !== "undefined" && post ? `${window.location.origin}/blog/${post.slug}` : "";
  const date = post ? new Date(post.created_at).toLocaleDateString(lang === "es" ? "es-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" }) : "";
  return (
    <div className="pa-root pa-scrolled pa-page">
      <div className="pa-readbar" aria-hidden="true">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <SiteHeader />
      <main id="main" className="pa-legal pa-blog">
        <div className="pa-wrap">
          {post ? (
            <>
              <header className="pa-post-head">
                <nav className="pa-blog-crumbs" aria-label="Breadcrumb">
                  <Link to="/blog">{t.nav.blog}</Link>
                  {path.map((c) => (
                    <span key={c.slug}>
                      {" / "}
                      <Link to="/blog/category/$slug" params={{ slug: c.slug }}>
                        {c.name}
                      </Link>
                    </span>
                  ))}
                </nav>
                <h1>{post.title}</h1>
                {lead && <p className="pa-post-lead">{lead}</p>}
                <div className="pa-post-meta">
                  <span className="pa-post-by">
                    <img src="/assets/img/logo.png" alt="" width={34} height={34} />
                    Positive Autism
                  </span>
                  <time>{date}</time>
                  <span>{t.blog.minutes.replace("{n}", String(minutes(text)))}</span>
                </div>
                <aside className="pa-post-facts" aria-label={t.blog.facts}>
                  <dl>
                    <dt>{t.blog.pubOn}</dt>
                    <dd>{date}</dd>
                    <dt>{t.blog.readTime}</dt>
                    <dd>{t.blog.minutes.replace("{n}", String(minutes(text)))}</dd>
                    {post.cats.length > 0 && (
                      <>
                        <dt>{t.blog.filed}</dt>
                        <dd className="is-cats">
                          {post.cats.map((c) => tree.bySlug.get(c)).filter((c): c is BlogCategory => !!c).map((c) => (
                            <Link key={c.slug} to="/blog/category/$slug" params={{ slug: c.slug }}>
                              {c.name}
                            </Link>
                          ))}
                        </dd>
                      </>
                    )}
                  </dl>
                  <a className="pa-facts-cta" href="#share">
                    {t.blog.share} ↓
                  </a>
                </aside>
                {post.cover && (
                  <figure className="pa-post-cover">
                    <img src={post.cover} alt="" />
                  </figure>
                )}
              </header>

              <div className="pa-post-grid">
                <aside className="pa-post-toc" aria-label={t.blog.onPage}>
                  {heads.length > 1 && (
                    <>
                      <h2>{t.blog.onPage}</h2>
                      <ol>
                        {heads.map((h) => (
                          <li key={h.id} className={`${h.level === 3 ? "is-sub" : ""}${active === h.id ? " on" : ""}`}>
                            <a href={`#${h.id}`}>{h.text}</a>
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </aside>

                <article ref={articleRef} className="pa-post-article">
                  <div className="pa-blog-text">
                    <Markdown text={text} />
                  </div>
                  {post.cats.length > 0 && (
                    <div className="pa-blog-cats is-post">
                      {post.cats.map((c) => tree.bySlug.get(c)).filter((c): c is BlogCategory => !!c).map((c) => (
                        <Link key={c.slug} to="/blog/category/$slug" params={{ slug: c.slug }}>
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  <ShareBar title={post.title} url={url} />
                  {(prev || next) && (
                    <nav className="pa-post-nav" aria-label="More articles">
                      {prev ? (
                        <Link to="/blog/$slug" params={{ slug: prev.slug }} className="is-prev">
                          <small>← {t.blog.older}</small>
                          <strong>{prev.title}</strong>
                        </Link>
                      ) : (
                        <span />
                      )}
                      {next ? (
                        <Link to="/blog/$slug" params={{ slug: next.slug }} className="is-next">
                          <small>{t.blog.newer} →</small>
                          <strong>{next.title}</strong>
                        </Link>
                      ) : (
                        <span />
                      )}
                    </nav>
                  )}
                </article>

                <aside className="pa-post-side">
                  <div className="pa-post-card">
                    <h2>{t.blog.stay}</h2>
                    <p>{t.subscribe.text}</p>
                    <a className="pa-btn-explore" href="/#stay-connected">
                      {t.subscribe.button}
                    </a>
                  </div>
                  <div className="pa-post-card">
                    <h2>{t.blog.topics}</h2>
                    <div className="pa-blog-cats is-post">
                      {(tree.kids.get("") ?? []).map((c) => (
                        <Link key={c.slug} to="/blog/category/$slug" params={{ slug: c.slug }}>
                          {c.name} <em>{c.count}</em>
                        </Link>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>

              {related.length > 0 && (
                <section className="pa-blog-related">
                  <h2>{t.blog.related}</h2>
                  <div className="pa-blog-grid">
                    {related.map((p, i) => (
                      <Card key={p.slug} p={p} i={i} categories={tree.bySlug} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              <Link className="pa-back" to="/blog">
                ← {t.blog.back}
              </Link>
              <p className="pa-blog-empty">{t.blog.notFound}</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function BlogPost(props: { post: PostFull | null; related: PostCard[]; categories: BlogCategory[]; prev: PostCard | null; next: PostCard | null }) {
  return (
    <PrefsProvider>
      <PostBody {...props} />
    </PrefsProvider>
  );
}
