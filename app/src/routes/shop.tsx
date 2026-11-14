import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { ShopPage } from "../shop/ShopPage";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>) => ({
    // undefined keeps empty values out of the address bar
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    checkout: typeof search.checkout === "string" && search.checkout ? search.checkout : undefined,
  }),
  head: () => ({
    meta: [{ title: "Ebook shop | Positive Autism" }],
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
  component: ShopRoute,
});

function ShopRoute() {
  const { q, checkout } = Route.useSearch();
  return <ShopPage initialQ={q ?? ""} cancelled={checkout === "cancelled"} />;
}
