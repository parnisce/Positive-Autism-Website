import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KEY = "pa-cart";
const MAX_ITEMS = 50;

type Cart = {
  ids: number[];
  has: (id: number) => boolean;
  add: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<Cart | null>(null);

function read(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

/** Shopping cart kept in this browser (ebooks are digital, so each one is added once). */
export function CartProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(read());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* storage blocked: the cart just won't survive a reload */
    }
  }, [ids, ready]);

  const add = useCallback((id: number) => setIds((cur) => (cur.includes(id) || cur.length >= MAX_ITEMS ? cur : [...cur, id])), []);
  const remove = useCallback((id: number) => setIds((cur) => cur.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<Cart>(
    () => ({ ids, has: (id) => ids.includes(id), add, remove, clear, open, setOpen }),
    [ids, add, remove, clear, open],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
