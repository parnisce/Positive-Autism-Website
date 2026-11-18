export type OrderStatus = "paid" | "pending" | "expired" | "refunded" | "partial";

export type Order = {
  id: string;
  /** milliseconds since 1970 */
  created: number;
  status: OrderStatus;
  email: string;
  name: string;
  country: string;
  /** cents */
  total: number;
  discount: number;
  refunded: number;
  currency: string;
  items: { id: number | null; title: string; amount: number }[];
  pi: string | null;
  live: boolean;
  /** hidden by the owner (test or fake orders): left out of every total */
  hidden?: boolean;
};

/** Woo-style wording for each status. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Completed",
  pending: "Pending payment",
  expired: "Abandoned",
  refunded: "Refunded",
  partial: "Partly refunded",
};

/** Orders that brought in money (refunds are taken off separately). */
export const isSale = (o: Order) => o.status === "paid" || o.status === "refunded" || o.status === "partial";
