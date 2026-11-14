/** Creates a Stripe Checkout Session for these ebooks and sends the browser to Stripe's payment page. */
export async function startCheckout(ids: number[], lang: string): Promise<"redirected" | "not_configured" | "error"> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, lang }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; code?: string };
    if (res.ok && data.url) {
      window.location.href = data.url;
      return "redirected";
    }
    return data.code === "not_configured" ? "not_configured" : "error";
  } catch {
    return "error";
  }
}
