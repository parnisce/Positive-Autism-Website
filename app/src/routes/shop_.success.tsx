import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { SuccessPage } from "../shop/SuccessPage";

export const Route = createFileRoute("/shop_/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" && search.session_id ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [{ title: "Order complete | Positive Autism" }, { name: "robots", content: "noindex" }],
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
  component: SuccessRoute,
});

function SuccessRoute() {
  const { session_id } = Route.useSearch();
  return <SuccessPage sessionId={session_id ?? ""} />;
}
