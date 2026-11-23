import { createFileRoute } from "@tanstack/react-router";

const hits = new Map<string, number[]>();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** POST /api/subscribe: adds an email to the "Stay connected" list. */
export const Route = createFileRoute("/api/subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let b: { name?: unknown; email?: unknown; lang?: unknown; t?: unknown };
        try {
          b = (await request.json()) as typeof b;
        } catch {
          return json({ code: "bad_request" }, 400);
        }
        if (typeof b.t === "number" && b.t < 700) return json({ ok: true }); // far too fast for a person: ignore quietly
        const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
        const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ code: "bad_email" }, 400);
        // at most 5 sign-ups a minute per visitor
        const ip = request.headers.get("cf-connecting-ip") || "local";
        const now = Date.now();
        const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60000);
        if (recent.length >= 5) return json({ code: "slow_down" }, 429);
        hits.set(ip, [...recent, now]);
        try {
          const store = await import("../admin/store.server");
          await store.addSubscriber(email, name, b.lang === "es" ? "es" : "en", "footer");
          return json({ ok: true });
        } catch (e) {
          console.error("subscribe", e);
          return json({ code: "not_configured" }, 503);
        }
      },
    },
  },
});
