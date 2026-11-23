import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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

/** A small, safe Markdown subset: ## headings, - lists, > quotes, ![images](url), paragraphs. No raw HTML. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        const first = lines[0];
        const h = first.match(/^(#{1,3})\s+(.*)$/);
        if (h) return h[1].length === 1 ? <h2 key={i}>{inline(h[2])}</h2> : h[1].length === 2 ? <h2 key={i}>{inline(h[2])}</h2> : <h3 key={i}>{inline(h[2])}</h3>;
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

function PostBody({ post, related, categories }: { post: PostFull | null; related: PostCard[]; categories: BlogCategory[] }) {
  const { t, lang } = usePrefs();
  const tree = useTree(categories);
  return (
    <div className="pa-root pa-scrolled pa-page">
      <SiteHeader />
      <main id="main" className="pa-legal pa-blog">
        <div className="pa-wrap pa-blog-post">
          <Link className="pa-back" to="/blog">
            ← {t.blog.back}
          </Link>
          {post ? (
            <>
              <article>
                <time>{new Date(post.created_at).toLocaleDateString(lang === "es" ? "es-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" })}</time>
                <h1>{post.title}</h1>
                {post.cats.length > 0 && (
                  <div className="pa-blog-cats is-post">
                    {post.cats.map((c) => tree.bySlug.get(c)).filter((c): c is BlogCategory => !!c).map((c) => (
                      <Link key={c.slug} to="/blog/category/$slug" params={{ slug: c.slug }}>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
                {post.cover && <img className="pa-blog-cover" src={post.cover} alt="" />}
                <div className="pa-blog-text">
                  <Markdown text={post.body} />
                </div>
              </article>
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
            <p className="pa-blog-empty">{t.blog.notFound}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function BlogPost(props: { post: PostFull | null; related: PostCard[]; categories: BlogCategory[] }) {
  return (
    <PrefsProvider>
      <PostBody {...props} />
    </PrefsProvider>
  );
}
