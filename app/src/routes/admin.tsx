import { createFileRoute } from "@tanstack/react-router";

import { AdminApp } from "../admin/AdminApp";

/** /admin: the owner's control panel (sign in with the ADMIN_PASSWORD secret). */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Positive Autism" },
      { name: "robots", content: "noindex, nofollow" },
      // dark-mode browser extensions: leave this page alone
      { name: "color-scheme", content: "light dark" },
      { name: "darkreader-lock" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Lexend:wght@400;500;600&display=swap" },
    ],
  }),
  component: AdminApp,
});
