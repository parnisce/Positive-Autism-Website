import { createFileRoute } from "@tanstack/react-router";

/** GET /api/checkout-status?session_id=...: confirms a paid session and lists what was bought. */
export const Route = createFileRoute("/api/checkout-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkoutStatus } = await import("../shop/checkout.server");
        return checkoutStatus(request);
      },
    },
  },
});
