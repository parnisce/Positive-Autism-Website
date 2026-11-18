import { createFileRoute } from "@tanstack/react-router";

import { AdminApp } from "../admin/AdminApp";

/** /admin: the owner's control panel (sign in with the ADMIN_PASSWORD secret). */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Positive Autism" },
      { name: "robots", content: "noindex, nofollow" },
      // dark-mode browser extensions: leave this page alone
      { name: "color-scheme", content: "only light" },
      { name: "darkreader-lock" },
    ],
    styles: [{ children: "html,body{background:#f3f7f7 !important;color:#12333a;color-scheme:only light}" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: AdminApp,
});
