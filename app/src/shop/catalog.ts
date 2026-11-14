import raw from "../data/products.json";
import type { Lang } from "../i18n";

/**
 * The ebook catalogue (src/data/products.json) was imported from the previous store:
 * titles, descriptions, categories, prices (in cents, CAD) and cover images (public/assets/shop).
 * Prices are always re-read from this file on the server when a checkout is created.
 */
export type Product = {
  id: number;
  title: string;
  subtitle: string;
  desc: string;
  /** minor units (cents) */
  price: number;
  cats: string[];
  img: string;
};
export type Category = { slug: string; name: string; count: number };

export const CATALOG = raw as unknown as { currency: string; categories: Category[]; products: Product[] };
export const PRODUCTS = CATALOG.products;
export const CATEGORIES = CATALOG.categories;
export const CURRENCY = CATALOG.currency; // "CAD"

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id: number) => byId.get(id);
export const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

export function formatPrice(cents: number, lang: Lang, freeLabel: string) {
  if (cents <= 0) return freeLabel;
  return new Intl.NumberFormat(lang === "es" ? "es-CA" : "en-CA", { style: "currency", currency: CURRENCY }).format(cents / 100);
}
