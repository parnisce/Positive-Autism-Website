import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { getPost } from "../admin/site.functions";
import { BlogPost } from "../blog/BlogPages";
import { THEME_BOOT } from "../theme-boot";

export const Route = createFileRoute("/blog_/$slug")({
  loader: ({ params }) => getPost({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} | Positive Autism` : "Blog | Positive Autism" },
      ...(loaderData?.excerpt ? [{ name: "description", content: loaderData.excerpt }] : []),
      ...(loaderData?.cover ? [{ property: "og:image", content: loaderData.cover }] : []),
    ],
    scripts: [{ children: THEME_BOOT }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: () => <BlogPost post={Route.useLoaderData()} />,
});
