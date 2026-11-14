import { createFileRoute } from "@tanstack/react-router";

/** POST /api/checkout: creates a Stripe Checkout Session for the cart and returns its URL. */
export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async () => {
        const { checkoutDiagnostic } = await import("../shop/checkout.server");
        return checkoutDiagnostic();
      },
      POST: async ({ request }) => {
        const { createCheckout } = await import("../shop/checkout.server");
        return createCheckout(request);
      },
    },
  },
});
