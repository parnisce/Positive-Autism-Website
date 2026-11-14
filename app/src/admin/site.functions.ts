import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Everything the public pages need from the database, fetched by the root route. */
export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadSiteData } = await import("./data.server");
  return loadSiteData();
});

export type PostCard = { slug: string; title: string; excerpt: string; cover: string; created_at: string };
export type PostFull = PostCard & { body: string; updated_at: string };

export const getPosts = createServerFn({ method: "GET" }).handler(async (): Promise<PostCard[]> => {
  const { getDb } = await import("./db.server");
  const db = await getDb();
  if (!db) return [];
  const r = await db
    .prepare("SELECT slug, title, excerpt, cover, created_at FROM posts WHERE published = 1 ORDER BY created_at DESC LIMIT 100")
    .all<PostCard>();
  return r.results;
});

export const getPost = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }): Promise<PostFull | null> => {
    const { getDb } = await import("./db.server");
    const db = await getDb();
    if (!db) return null;
    return db
      .prepare("SELECT slug, title, excerpt, cover, body, created_at, updated_at FROM posts WHERE slug = ? AND published = 1")
      .bind(data.slug)
      .first<PostFull>();
  });
