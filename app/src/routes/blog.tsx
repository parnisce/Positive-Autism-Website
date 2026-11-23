import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { getBlog } from "../admin/site.functions";
import { BlogIndex } from "../blog/BlogPages";
import { THEME_BOOT } from "../theme-boot";

export const Route = createFileRoute("/blog")({
  loader: () => getBlog(),
  head: () => ({
    meta: [{ title: "Blog | Positive Autism" }, { name: "description", content: "Stories, tips and news about autism from Positive Autism." }],
    scripts: [{ children: THEME_BOOT }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Lexend:wght@400;500;600&display=swap" },
    ],
  }),
  component: () => {
    const d = Route.useLoaderData();
    return <BlogIndex posts={d.posts} categories={d.categories} />;
  },
});
