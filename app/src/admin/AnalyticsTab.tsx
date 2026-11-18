import { useState } from "react";
import { ORIGINAL, productHref, type ProductEdit } from "../shop/catalog";
import { useEffect, useMemo } from "react";
import { api } from "./api";
import { mergeProducts } from "./ProductsTab";
import { BarChart, Card, Kpi, RankList, num, pct, ranked, shortDay, useStats } from "./ui";

const countryName = (cc: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc;
  } catch {
    return cc;
  }
};

/** Visits, page views, top pages, sources, devices, actions and campaigns (same layout as a classic analytics page). */
export function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const { s, err, reload } = useStats(days);
  const [edits, setEdits] = useState<ProductEdit[]>([]);
  useEffect(() => {
    api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits)).catch(() => {});
  }, []);
  const names = useMemo(() => new Map(mergeProducts(edits).map((p) => [p.id, p])), [edits]);
  const [track, setTrack] = useState(() => {
    try {
      return !localStorage.getItem("pa-notrack");
    } catch {
      return true;
    }
  });
  const flip = () => {
    try {
      if (track) localStorage.setItem("pa-notrack", "1");
      else localStorage.removeItem("pa-notrack");
    } catch {
      /* ignore */
    }
    setTrack(!track);
  };
  const pageLabel = (k: string) => {
    if (k === "/") return "/";
    const id = Number(k.match(/^\/shop\/ebook\/.*-(\d+)$/)?.[1]);
    const p = id ? (names.get(id) ?? ORIGINAL.find((o) => o.id === id)) : null;
    return p ? `/shop/ebook · ${p.title}` : k;
  };

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Analytics</h1>
          <p>Visits to your public site, saved in your own Supabase. No cookies and no IP addresses.</p>
        </div>
        <div className="ad-tools">
          <div className="ad-seg" role="group" aria-label="Period">
            {[7, 30, 90].map((d) => (
              <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>
                {d} days
              </button>
            ))}
          </div>
          <button className="ad-btn ghost" onClick={reload}>
            ↻ Refresh
          </button>
        </div>
      </header>
      {err && <p className="ad-note">{err}</p>}
      {!s && !err && <p className="ad-note">Loading…</p>}
      {s && (
        <>
          <div className="ad-kpis">
            <Kpi label="Visits" value={num(s.totals.visitors)} sub="one per browsing session" />
            <Kpi label="Page views" value={num(s.totals.views)} sub={`${s.totals.visitors ? (s.totals.views / s.totals.visitors).toFixed(1) : "0"} per visit`} />
            <Kpi label="Ebook page views" value={num(s.totals.productViews)} sub="product pages" />
            <Kpi label="Added to cart" value={num(s.totals.cart)} sub={pct(s.totals.cart, s.totals.productViews) + " of ebook views"} />
            <Kpi label="Started checkout" value={num(s.totals.buy)} sub={pct(s.totals.buy, s.totals.visitors) + " of visits"} />
          </div>

          <Card title="Page views per day" note="Bars are page views; the hover text also shows visits">
            <BarChart
              label="Page views per day"
              data={s.daily.map((d) => ({ key: d.day, v: d.views, tip: `${shortDay(d.day)}: ${d.views} views, ${d.visitors} visits` }))}
            />
            <div className="ad-axis">
              <span>{shortDay(s.daily[0].day)}</span>
              <span>{shortDay(s.daily[s.daily.length - 1].day)}</span>
            </div>
          </Card>

          <div className="ad-grid5">
            <Card title="Top pages">
              <RankList empty="No page views yet." rows={ranked(s.pages, pageLabel, (k) => k)} />
            </Card>
            <Card title="Where visitors came from">
              <RankList
                empty="No visits yet."
                rows={(() => {
                  const ext = s.refs.reduce((a, r) => a + r.n, 0);
                  const direct = Math.max(0, s.totals.visitors - ext);
                  return ranked([{ key: "Direct / none", n: direct }, ...s.refs].filter((r) => r.n > 0));
                })()}
              />
            </Card>
            <Card title="Devices">
              <RankList empty="No data yet." rows={ranked(s.devices)} />
            </Card>
            <Card title="Actions">
              <RankList empty="Clicks on links that leave your site show here." rows={ranked(s.actions)} />
            </Card>
            <Card title="Campaigns (UTM)">
              <RankList empty="No tagged links yet. Add ?utm_source=newsletter to a link you share." rows={ranked(s.utm)} />
            </Card>
          </div>

          <div className="ad-grid2">
            <Card title="Most viewed ebooks" note="Views, add to cart and checkout starts">
              {s.products.length === 0 ? (
                <p className="ad-empty">No ebook views yet.</p>
              ) : (
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Ebook</th>
                      <th>Views</th>
                      <th>Cart</th>
                      <th>Checkout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.products.map((p) => {
                      const info = names.get(p.id) ?? ORIGINAL.find((o) => o.id === p.id);
                      return (
                        <tr key={p.id}>
                          <td>
                            {info ? (
                              <a href={productHref(info)} target="_blank" rel="noreferrer">
                                {info.title}
                              </a>
                            ) : (
                              `Ebook ${p.id} (removed)`
                            )}
                          </td>
                          <td>{num(p.views)}</td>
                          <td>{num(p.cart)}</td>
                          <td>{num(p.buy)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Countries">
              <RankList empty="No data yet." rows={ranked(s.countries, countryName)} />
            </Card>
          </div>
        </>
      )}
      <label className="ad-check ad-foot">
        <input type="checkbox" checked={!track} onChange={flip} />
        Do not count visits from this browser
      </label>
      <p className="ad-fine">Keeps your own testing out of the numbers. Turn it off to test tracking yourself.</p>
    </div>
  );
}
