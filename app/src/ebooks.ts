/**
 * Ebook catalogue. The three titles below are PLACEHOLDERS: replace title, blurb and cover,
 * and set `checkoutUrl` to the product link from your checkout provider (Stripe, Gumroad,
 * Payhip, Shopify...). While `checkoutUrl` is empty the button sends people to the contact page.
 */
export type Ebook = {
  slug: string;
  title: string;
  audience: string;
  blurb: string;
  cover: string;
  price?: string;
  checkoutUrl?: string;
};

export const EBOOKS: Ebook[] = [
  {
    slug: "learning-at-home",
    title: "Learning at Home",
    audience: "For parents",
    blurb: "Gentle, step-by-step ideas for building skills with your child.",
    cover: "/assets/img/bloom-5.webp",
  },
  {
    slug: "communication-guide",
    title: "Communication Guide",
    audience: "For everyone",
    blurb: "Practical activities that support language and conversation.",
    cover: "/assets/img/bloom-2.webp",
  },
  {
    slug: "my-strengths",
    title: "My Strengths",
    audience: "For autistic people",
    blurb: "A workbook for understanding your strengths, needs and goals.",
    cover: "/assets/img/bloom-4.webp",
  },
];
