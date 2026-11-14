import { useEffect, useState } from "react";
import { PrefsProvider } from "../components/pa/prefs";
import { SiteFooter, SiteHeader } from "../components/pa/SiteChrome";
import "./shop.css";
import { CartProvider, useCart } from "./cart";
import { useShopCopy } from "./ShopPage";

type Status =
  | { state: "loading" }
  | { state: "error"; notConfigured?: boolean }
  | { state: "done"; paid: boolean; email: string | null; items: { id: number; title: string; img: string; download: string | null }[] };

function Success({ sessionId }: { sessionId: string }) {
  const s = useShopCopy();
  const { clear } = useCart();
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { code?: string; paid?: boolean; email?: string | null; items?: never[] };
        if (cancelled) return;
        if (!res.ok) return setStatus({ state: "error", notConfigured: data.code === "not_configured" });
        setStatus({ state: "done", paid: !!data.paid, email: data.email ?? null, items: (data.items ?? []) as never });
        if (data.paid) clear();
      })
      .catch(() => !cancelled && setStatus({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [sessionId, clear]);

  const x = s.success;
  return (
    <main id="main" className="pa-shop pa-success">
      <div className="pa-wrap">
        {status.state === "loading" && <p className="pa-shop-note">{x.checking}</p>}
        {status.state === "error" && <p className="pa-shop-note">{status.notConfigured ? x.notConfigured : x.unpaid}</p>}
        {status.state === "done" && !status.paid && <p className="pa-shop-note">{x.unpaid}</p>}
        {status.state === "done" && status.paid && (
          <>
            <h1>{x.title}</h1>
            <p className="pa-success-lead">{x.paid}</p>
            <p>{status.email ? x.deliver.replace("{email}", status.email) : x.deliverNoEmail}</p>
            <p>{x.receipt}</p>
            {status.items.length > 0 && (
              <>
                <h2>{x.items}</h2>
                <ul className="pa-drawer-list pa-success-list">
                  {status.items.map((i) => (
                    <li key={i.id}>
                      <img src={i.img} alt="" width={64} height={64} />
                      <div>
                        <strong>{i.title}</strong>
                      </div>
                      {i.download && (
                        <a className="pa-prod-btn" href={i.download} download>
                          {x.download}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <a className="pa-back" href="/shop">
          ← {x.shopMore}
        </a>
      </div>
    </main>
  );
}

export function SuccessPage({ sessionId }: { sessionId: string }) {
  return (
    <PrefsProvider>
      <CartProvider>
        <div className="pa-root pa-scrolled pa-page">
          <SiteHeader />
          <Success sessionId={sessionId} />
          <SiteFooter />
        </div>
      </CartProvider>
    </PrefsProvider>
  );
}
