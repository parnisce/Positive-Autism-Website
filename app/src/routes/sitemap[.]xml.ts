import { createFileRoute } from "@tanstack/react-router";

import { PRODUCTS } from "../shop/catalog";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { syncSite } = await import("../admin/data.server");
        await syncSite();
        const { getDb } = await import("../admin/db.server");
        const db = await getDb();
        const posts = db ? (await db.prepare("SELECT slug FROM posts WHERE published = 1").all<{ slug: string }>()).results : [];
        const origin = new URL(request.url).origin;
        const today = new Date().toISOString().split("T")[0];
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          "  <url>",
          `    <loc>${origin}/</loc>`,
          `    <lastmod>${today}</lastmod>`,
          "    <changefreq>weekly</changefreq>",
          "    <priority>1.0</priority>",
          "  </url>",
          ...["shop", "blog", "privacy-policy", "terms-and-conditions", "user-data-management"].flatMap((p) => [
            "  <url>",
            `    <loc>${origin}/${p}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            "    <changefreq>yearly</changefreq>",
            "    <priority>0.3</priority>",
            "  </url>",
          ]),
          ...posts.flatMap((p) => [
            "  <url>",
            `    <loc>${origin}/blog/${p.slug}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            "  </url>",
          ]),
          ...PRODUCTS.flatMap((p) => [
            "  <url>",
            `    <loc>${origin}/shop/ebook/${p.slug}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            "    <changefreq>monthly</changefreq>",
            "    <priority>0.5</priority>",
            "  </url>",
          ]),
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
