import { createFileRoute } from "@tanstack/react-router";

/** POST /api/checkout: creates a Stripe Checkout Session for the cart and returns its URL. */
export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createCheckout } = await import("../shop/checkout.server");
        return createCheckout(request);
      },
    },
  },
});
