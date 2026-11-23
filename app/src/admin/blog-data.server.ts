/**
 * Server-only: what the public blog shows. The articles imported from the previous site ship with the
 * code (src/data/articles.json) and appear straight away; once the owner imports them into the database
 * (Admin → Blog), the database copy is used instead and can be edited.
 */
import seed from "../data/articles.json";
import * as store from "./store.server";

export type Cat = { slug: string; name: string; parent: string; description: string };
export type CatWithCount = Cat & { count: number };
export type Card = { slug: string; title: string; excerpt: string; cover: string; created_at: string; cats: string[] };
export type Full = Card & { body: string; updated_at: string };
type SeedPost = { slug: string; title: string; excerpt: string; body: string; cover: string; date: string; cats: string[] };
export const SEED = seed as unknown as { categories: Cat[]; posts: SeedPost[] };

const toCard = (p: SeedPost): Card => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, cover: p.cover, created_at: p.date, cats: p.cats });

async function seedActive() {
  try {
    return !(await store.getSeedImported());
  } catch {
    return true;
  }
}

export async function publicPosts(): Promise<Card[]> {
  let db: Card[] = [];
  try {
    db = await store.listPublished();
  } catch {
    /* tables or the new column are missing: show the starter articles */
  }
  const have = new Set(db.map((p) => p.slug));
  const extra = (await seedActive()) ? SEED.posts.filter((p) => !have.has(p.slug)).map(toCard) : [];
  return [...db, ...extra].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function publicPost(slug: string): Promise<Full | null> {
  try {
    const p = await store.getPublished(slug);
    if (p) return p;
  } catch {
    /* fall through to the starter articles */
  }
  if (!(await seedActive())) return null;
  const p = SEED.posts.find((x) => x.slug === slug);
  return p ? { ...toCard(p), body: p.body, updated_at: p.date } : null;
}

/** The category list (database first, then the starter list) with how many posts each one holds, sub-categories included. */
export async function publicCategories(posts?: Card[]): Promise<CatWithCount[]> {
  let cats: Cat[] = [];
  try {
    cats = await store.getCategories();
  } catch {
    /* fall back */
  }
  if (!cats.length) cats = SEED.categories;
  const list = posts ?? (await publicPosts());
  const kids = new Map<string, string[]>();
  for (const c of cats) kids.set(c.parent, [...(kids.get(c.parent) ?? []), c.slug]);
  const subtree = (slug: string): Set<string> => {
    const out = new Set([slug]);
    for (const k of kids.get(slug) ?? []) for (const x of subtree(k)) out.add(x);
    return out;
  };
  return cats.map((c) => {
    const set = subtree(c.slug);
    return { ...c, count: list.filter((p) => p.cats.some((x) => set.has(x))).length };
  });
}
