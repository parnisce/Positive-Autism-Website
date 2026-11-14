import raw from "../data/products.json";
import type { Lang } from "../i18n";

/**
 * The ebook catalogue (src/data/products.json) was imported from the previous store:
 * titles, descriptions, categories, prices (in cents, CAD) and cover images (public/assets/shop).
 * Full text and tags for the single ebook pages live in src/data/details.json (loaded on demand).
 * Prices are always re-read from this file on the server when a checkout is created.
 */
export type Product = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  desc: string;
  /** minor units (cents) */
  price: number;
  cats: string[];
  img: string;
};
export type Category = { slug: string; name: string; count: number };
export type Details = { paras: string[]; tags: string[] };

export const CATALOG = raw as unknown as { currency: string; categories: Category[]; products: Product[] };
export const PRODUCTS = CATALOG.products;
export const CATEGORIES = CATALOG.categories;
export const CURRENCY = CATALOG.currency; // "CAD"

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id: number) => byId.get(id);
export const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

export const productHref = (p: Product) => `/shop/ebook/${p.slug}`;
/** Slugs end with the product id ("leos-conversation-at-school-10786"). */
export const productFromSlug = (slug: string) => {
  const id = Number(slug.match(/-(\d+)$/)?.[1]);
  return Number.isFinite(id) ? getProduct(id) : undefined;
};

/** Each topic gets one of six brand colour washes (defined in positive-autism.css). */
export const tintFor = (catSlug: string | undefined) => {
  const i = Math.max(0, CATEGORIES.findIndex((c) => c.slug === catSlug));
  return `var(--pa-tint-${(i % 6) + 1})`;
};

export async function loadDetails(id: number): Promise<Details | undefined> {
  const m = await import("../data/details.json");
  return (m.default as unknown as Record<string, Details>)[String(id)];
}

export function formatPrice(cents: number, lang: Lang, freeLabel: string) {
  if (cents <= 0) return freeLabel;
  return new Intl.NumberFormat(lang === "es" ? "es-CA" : "en-CA", { style: "currency", currency: CURRENCY }).format(cents / 100);
}
