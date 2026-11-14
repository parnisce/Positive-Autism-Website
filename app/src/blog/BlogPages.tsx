import { Fragment, type ReactNode } from "react";
import { PrefsProvider, usePrefs } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import type { PostCard, PostFull } from "../admin/site.functions";
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

function IndexBody({ posts }: { posts: PostCard[] }) {
  const { t, lang } = usePrefs();
  const date = (d: string) => new Date(d).toLocaleDateString(lang === "es" ? "es-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="pa-root pa-scrolled pa-page">
      <SiteHeader />
      <main id="main" className="pa-legal pa-blog">
        <div className="pa-wrap">
          <h1>{t.blog.h1}</h1>
          <p className="pa-blog-sub">{t.blog.sub}</p>
          {posts.length === 0 ? (
            <p className="pa-blog-empty">{t.blog.empty}</p>
          ) : (
            <div className="pa-blog-grid">
              {posts.map((p, i) => (
                <a key={p.slug} className="pa-blog-card" href={`/blog/${p.slug}`} style={{ "--tint": `var(--pa-tint-${(i % 6) + 1})` } as React.CSSProperties}>
                  <span className="pa-blog-img">{p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <i aria-hidden="true">✦</i>}</span>
                  <span className="pa-blog-body">
                    <time>{date(p.created_at)}</time>
                    <strong>{p.title}</strong>
                    {p.excerpt && <span>{p.excerpt}</span>}
                    <em>{t.blog.read} →</em>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function BlogIndex({ posts }: { posts: PostCard[] }) {
  return (
    <PrefsProvider>
      <IndexBody posts={posts} />
    </PrefsProvider>
  );
}

function PostBody({ post }: { post: PostFull | null }) {
  const { t, lang } = usePrefs();
  return (
    <div className="pa-root pa-scrolled pa-page">
      <SiteHeader />
      <main id="main" className="pa-legal pa-blog">
        <div className="pa-wrap pa-blog-post">
          <a className="pa-back" href="/blog">
            ← {t.blog.back}
          </a>
          {post ? (
            <article>
              <time>{new Date(post.created_at).toLocaleDateString(lang === "es" ? "es-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" })}</time>
              <h1>{post.title}</h1>
              {post.cover && <img className="pa-blog-cover" src={post.cover} alt="" />}
              <div className="pa-blog-text">
                <Markdown text={post.body} />
              </div>
            </article>
          ) : (
            <p className="pa-blog-empty">{t.blog.notFound}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function BlogPost({ post }: { post: PostFull | null }) {
  return (
    <PrefsProvider>
      <PostBody post={post} />
    </PrefsProvider>
  );
}
