import { createFileRoute } from "@tanstack/react-router";

import "../positive-autism.css";
import { THEME_BOOT } from "../theme-boot";
import { LegalPage } from "../components/pa/LegalPage";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    scripts: [{ children: THEME_BOOT }],
    meta: [{ title: "Terms and Conditions | Positive Autism" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Lexend:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => <LegalPage doc="terms" />,
});
