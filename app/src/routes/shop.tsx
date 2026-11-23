import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { ShopPage } from "../shop/ShopPage";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): { q?: string; checkout?: string; cat?: string } => ({
    // undefined keeps empty values out of the address bar
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    checkout: typeof search.checkout === "string" && search.checkout ? search.checkout : undefined,
    cat: typeof search.cat === "string" && search.cat ? search.cat : undefined,
  }),
  head: () => ({
    meta: [{ title: "Ebook shop | Positive Autism" }],
    scripts: [{ children: THEME_BOOT }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Lexend:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: ShopRoute,
});

function ShopRoute() {
  const { q, checkout, cat } = Route.useSearch();
  // key: arriving from an ebook page with another topic or search re-mounts the page with those filters
  return <ShopPage key={`${q ?? ""}|${cat ?? ""}`} initialQ={q ?? ""} initialCat={cat ?? ""} cancelled={checkout === "cancelled"} />;
}
