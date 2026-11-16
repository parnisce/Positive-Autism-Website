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
  const store = await import("./store.server");
  try {
    return await store.listPublished();
  } catch {
    return [];
  }
});

export const getPost = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }): Promise<PostFull | null> => {
    const store = await import("./store.server");
    try {
      return await store.getPublished(data.slug);
    } catch {
      return null;
    }
  });
