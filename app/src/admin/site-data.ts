/**
 * Text overrides made on the admin page. COPY (src/i18n.ts) holds the default wording of every page;
 * overrides are stored per language as { "hero.lead": "new text" } and applied on top of it.
 * Safe to import anywhere (server, browser, admin page).
 */
import { COPY, type Lang } from "../i18n";
import type { ProductEdit } from "../shop/catalog";

export type ContentOverrides = Record<Lang, Record<string, string>>;
export type SiteData = { content: ContentOverrides; products: ProductEdit[] };
export const EMPTY_SITE: SiteData = { content: { en: {}, es: {} }, products: [] };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** The wording as shipped in the code (never changes while the site runs). */
export const ORIGINAL_COPY: Record<Lang, unknown> = clone(COPY);

function deepAssign(target: unknown, src: unknown) {
  if (!target || !src || typeof target !== "object" || typeof src !== "object") return;
  const t = target as Record<string, unknown>;
  for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
    if (v && typeof v === "object") deepAssign(t[k], v);
    else t[k] = v;
  }
}

function setPath(root: unknown, path: string, value: string) {
  const keys = path.split(".");
  let cur = root as Record<string, unknown> | undefined;
  for (let i = 0; i < keys.length - 1 && cur; i++) cur = cur[keys[i]] as Record<string, unknown> | undefined;
  const last = keys[keys.length - 1];
  if (cur && typeof cur === "object" && typeof cur[last] === "string") cur[last] = value;
}

let lastKey = "";
/** Puts the admin's wording over the defaults (idempotent: pass the full set every time). */
export function applyContent(o: ContentOverrides) {
  const key = JSON.stringify(o);
  if (key === lastKey) return;
  lastKey = key;
  for (const lang of ["en", "es"] as const) {
    deepAssign(COPY[lang], ORIGINAL_COPY[lang]);
    for (const [path, val] of Object.entries(o[lang] ?? {})) setPath(COPY[lang], path, val);
  }
}

export type Field = { path: string; group: string; value: string };
/** Every editable string of the default wording, in page order. */
export function flattenCopy(lang: Lang): Field[] {
  const out: Field[] = [];
  const walk = (node: unknown, path: string, group: string) => {
    if (typeof node === "string") out.push({ path, group, value: node });
    else if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}.${i}`, group));
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, path ? `${path}.${k}` : k, group || k);
  };
  walk(ORIGINAL_COPY[lang], "", "");
  return out;
}
