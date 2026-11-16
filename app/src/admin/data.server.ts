/** Server-only: reads the admin's text and product edits from the database. */
import { applyContent, EMPTY_SITE, type ContentOverrides, type SiteData } from "./site-data";
import { applyProductEdits, type ProductEdit } from "../shop/catalog";
import * as store from "./store.server";

let cache: { at: number; data: SiteData } | null = null;
export const bustSiteData = () => {
  cache = null;
};

/** Text overrides and product edits (cached for a few seconds). Falls back to "no edits" if the database is unavailable. */
export async function loadSiteData(): Promise<SiteData> {
  if (cache && Date.now() - cache.at < 8000) return cache.data;
  let data: SiteData = EMPTY_SITE;
  try {
    const [c, products] = await Promise.all([store.getContent(), store.listProductEdits()]);
    data = { content: { en: c?.en ?? {}, es: c?.es ?? {} }, products };
  } catch (e) {
    console.error("site data", e);
  }
  cache = { at: Date.now(), data };
  return data;
}

/** Loads the edits and applies them to this server's catalogue and wording (for routes that run without the page loader). */
export async function syncSite(): Promise<SiteData> {
  const d = await loadSiteData();
  applyContent(d.content);
  applyProductEdits(d.products);
  return d;
}
