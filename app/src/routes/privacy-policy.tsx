import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { LegalPage } from "../components/pa/LegalPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    scripts: [{ children: THEME_BOOT }],
    meta: [{ title: "Privacy Policy | Positive Autism" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => <LegalPage doc="privacy" />,
});
