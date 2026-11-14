/**
 * Where each ebook file lives, so buyers can download it from the order-complete page.
 * Map a product id (see src/data/products.json) to the file's URL, for example:
 *
 *   export const DOWNLOADS: Record<number, string> = {
 *     10786: "https://your-file-host.example/leos-conversation-at-school.pdf",
 *   };
 *
 * Links are only sent to the browser after Stripe confirms the payment. Until a product has a
 * link here, the order-complete page tells the buyer the files will be emailed to them.
 */
export const DOWNLOADS: Record<number, string> = {};
