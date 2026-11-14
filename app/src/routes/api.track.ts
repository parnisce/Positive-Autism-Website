import { createFileRoute } from "@tanstack/react-router";

/** POST /api/track: counts a page view or an add-to-cart (no cookies, no personal data). */
export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { recordHit } = await import("../admin/track.server");
          await recordHit(request);
        } catch (e) {
          console.error("track", e);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
