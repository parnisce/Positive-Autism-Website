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
/** The imported catalogue exactly as shipped (the admin page starts from this). */
export const ORIGINAL: Product[] = JSON.parse(JSON.stringify(CATALOG.products));
/** The live list: the imported catalogue plus whatever the admin page changed (see applyProductEdits). */
export const PRODUCTS = CATALOG.products;
export const CATEGORIES = CATALOG.categories;
export const CURRENCY = CATALOG.currency; // "CAD"

/** A change made on the admin page. For an imported ebook it is a patch; for a new ebook (custom) it is the whole record. */
export type ProductEdit = Partial<Omit<Product, "id">> & {
  id: number;
  custom?: boolean;
  hidden?: boolean;
  paras?: string[];
  tags?: string[];
  /** where the buyer downloads the file after paying */
  file?: string;
};

let byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id: number) => byId.get(id);
let version = 0;
/** Changes whenever the admin edits are applied, so cached lists can refresh. */
export const catalogVersion = () => version;
const EXTRA = new Map<number, ProductEdit>();
export const productFile = (id: number) => EXTRA.get(id)?.file || "";
export const slugify = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "ebook";

let lastEdits = "";
/** Rebuilds PRODUCTS from the imported catalogue and the admin edits (safe to call on every request). */
export function applyProductEdits(edits: ProductEdit[]) {
  const key = JSON.stringify(edits);
  if (key === lastEdits) return;
  lastEdits = key;
  const map = new Map(edits.map((e) => [e.id, e]));
  const next: Product[] = [];
  for (const e of edits) {
    if (!e.custom || e.hidden) continue;
    next.push({
      id: e.id,
      slug: e.slug || `${slugify(e.title || "ebook")}-${e.id}`,
      title: e.title || "Untitled ebook",
      subtitle: e.subtitle || "",
      desc: e.desc || "",
      price: Math.max(0, Math.round(e.price ?? 0)),
      cats: e.cats?.length ? e.cats : [CATEGORIES[0]?.slug ?? ""],
      img: e.img || "/assets/img/logo.png",
    });
  }
  next.sort((a, b) => b.id - a.id);
  for (const o of ORIGINAL) {
    const e = map.get(o.id);
    if (e?.hidden) continue;
    next.push(
      e
        ? {
            ...o,
            title: e.title || o.title,
            subtitle: e.subtitle ?? o.subtitle,
            desc: e.desc ?? o.desc,
            price: typeof e.price === "number" ? Math.max(0, Math.round(e.price)) : o.price,
            cats: e.cats?.length ? e.cats : o.cats,
            img: e.img || o.img,
          }
        : o,
    );
  }
  PRODUCTS.splice(0, PRODUCTS.length, ...next);
  byId = new Map(PRODUCTS.map((p) => [p.id, p]));
  EXTRA.clear();
  for (const e of edits) EXTRA.set(e.id, e);
  for (const c of CATEGORIES) c.count = PRODUCTS.filter((p) => p.cats.includes(c.slug)).length;
  version++;
}
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
  const base = (m.default as unknown as Record<string, Details>)[String(id)];
  const e = EXTRA.get(id);
  if (!e) return base;
  return { paras: e.paras?.length ? e.paras : (base?.paras ?? []), tags: e.tags ?? base?.tags ?? [] };
}

export function formatPrice(cents: number, lang: Lang, freeLabel: string) {
  if (cents <= 0) return freeLabel;
  return new Intl.NumberFormat(lang === "es" ? "es-CA" : "en-CA", { style: "currency", currency: CURRENCY }).format(cents / 100);
}
