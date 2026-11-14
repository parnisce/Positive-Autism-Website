import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { getSiteData } from "../admin/site.functions";
import { applyProductEdits, loadDetails, productFromSlug } from "../shop/catalog";
import { ProductNotFound, ProductPage } from "../shop/ProductPage";

/** /shop/ebook/<name>-<id>: one page with everything about a single ebook. */
export const Route = createFileRoute("/shop_/ebook/$slug")({
  loader: async ({ params }) => {
    // on the server the page loader can run before the root loader: load the admin's edits first
    if (typeof window === "undefined") applyProductEdits((await getSiteData()).products);
    const product = productFromSlug(params.slug);
    if (!product) return { product: null, details: null };
    return { product, details: (await loadDetails(product.id)) ?? null };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.product ? `${loaderData.product.title} | Positive Autism` : "Ebook | Positive Autism" },
      ...(loaderData?.product ? [{ name: "description", content: loaderData.product.desc }] : []),
    ],
    scripts: [{ children: THEME_BOOT }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: EbookRoute,
});

function EbookRoute() {
  const { product, details } = Route.useLoaderData();
  return product ? <ProductPage product={product} details={details} /> : <ProductNotFound />;
}
