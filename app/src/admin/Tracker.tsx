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

export const trackEvent = (e: { e: "cart"; id: number } | { e: "act"; k: string }) => {
  if (typeof window !== "undefined") send(e);
};

/** Counts clicks on links that leave the site. */
function useOutsideLinks() {
  useEffect(() => {
    const on = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.protocol === "mailto:") return trackEvent({ e: "act", k: "Email link clicked" });
      if (/^https?:$/.test(a.protocol) && a.hostname !== location.hostname)
        trackEvent({ e: "act", k: `Outside link clicked · ${a.hostname.replace(/^www\./, "")}`.slice(0, 80) });
    };
    document.addEventListener("click", on, { passive: true });
    return () => document.removeEventListener("click", on);
  }, []);
}

export function Tracker() {
  useOutsideLinks();
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
    let m = "";
    if (first) {
      const q = new URLSearchParams(location.search);
      const src = q.get("utm_source");
      if (src) m = [src, q.get("utm_medium"), q.get("utm_campaign")].filter(Boolean).join(" / ");
    }
    send({ p: path, u: first ? 1 : 0, r: ref, m });
  }, [path]);
  return null;
}
