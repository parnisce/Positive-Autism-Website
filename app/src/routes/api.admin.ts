import { createFileRoute } from "@tanstack/react-router";

/** /api/admin: everything the admin page does (login, edits, blog, products, analytics). */
export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => (await import("../admin/admin.server")).handleAdmin(request),
      POST: async ({ request }) => (await import("../admin/admin.server")).handleAdmin(request),
    },
  },
});
