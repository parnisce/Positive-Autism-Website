import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

/** Sends one tiny, cookie-free message per page view (and per add-to-cart) so the admin page can show analytics. */
function send(data: Record<string, unknown>) {
  try {
    if (localStorage.getItem("pa-notrack")) return; // the site owner's own browser is not counted
    void fetch("/api/track", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  } catch {
    /* storage or network blocked: skip */
  }
}

export const trackEvent = (e: { e: "cart"; id: number }) => {
  if (typeof window !== "undefined") send(e);
};

export function Tracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (path.startsWith("/admin") || path.startsWith("/api")) return;
    let first = false;
    try {
      first = !sessionStorage.getItem("pa-sid");
      if (first) sessionStorage.setItem("pa-sid", "1");
    } catch {
      /* ignore */
    }
    let ref = "";
    if (first && document.referrer) {
      try {
        const h = new URL(document.referrer).hostname;
        if (h && h !== location.hostname) ref = h.replace(/^www\./, "");
      } catch {
        /* ignore */
      }
    }
    send({ p: path, u: first ? 1 : 0, r: ref });
  }, [path]);
  return null;
}
