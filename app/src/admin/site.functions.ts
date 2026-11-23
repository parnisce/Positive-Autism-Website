import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Everything the public pages need from the database, fetched by the root route. */
export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadSiteData } = await import("./data.server");
  return loadSiteData();
});

export type PostCard = { slug: string; title: string; excerpt: string; cover: string; created_at: string; cats: string[] };
export type PostFull = PostCard & { body: string; updated_at: string };
export type BlogCategory = { slug: string; name: string; parent: string; description: string; count: number };

/** All published posts (newest first) and the category tree with post counts, in one call. */
export const getBlog = createServerFn({ method: "GET" }).handler(async (): Promise<{ posts: PostCard[]; categories: BlogCategory[] }> => {
  const { publicPosts, publicCategories } = await import("./blog-data.server");
  const posts = await publicPosts();
  return { posts, categories: await publicCategories(posts) };
});

export const getPost = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(160) }))
  .handler(async ({ data }): Promise<{ post: PostFull | null; related: PostCard[]; categories: BlogCategory[] }> => {
    const { publicPosts, publicPost, publicCategories } = await import("./blog-data.server");
    const post = await publicPost(data.slug);
    if (!post) return { post: null, related: [], categories: [] };
    const all = await publicPosts();
    const related = all.filter((p) => p.slug !== post.slug && p.cats.some((c) => post.cats.includes(c))).slice(0, 3);
    return { post, related, categories: await publicCategories(all) };
  });
