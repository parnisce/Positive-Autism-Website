/**
 * Ebook catalogue (covers and checkout links). The visible titles, audiences and descriptions
 * live in src/i18n.ts under `ebooks.items`, keyed by `slug`, in English and Spanish.
 * The three ebooks are PLACEHOLDERS: replace them, and set `checkoutUrl` to the product link
 * from your checkout provider (Stripe, Gumroad, Payhip, Shopify...). While `checkoutUrl` is
 * empty the button sends people to the contact page.
 */
export type Ebook = {
  slug: string;
  cover: string;
  price?: string;
  checkoutUrl?: string;
};

export const EBOOKS: Ebook[] = [
  { slug: "learning-at-home", cover: "/assets/img/bloom-5.webp" },
  { slug: "communication-guide", cover: "/assets/img/bloom-2.webp" },
  { slug: "my-strengths", cover: "/assets/img/bloom-4.webp" },
];
