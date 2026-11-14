import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, ORIGINAL, productHref, slugify, type Product, type ProductEdit } from "../shop/catalog";
import { api, money, uploadImage } from "./api";

type Row = Product & { hidden: boolean; edited: boolean; custom: boolean; file: string; paras?: string[]; tags?: string[] };

/** The imported catalogue with the admin's edits on top, plus ebooks added on the admin page. */
export function mergeProducts(edits: ProductEdit[]): Row[] {
  const map = new Map(edits.map((e) => [e.id, e]));
  const rows: Row[] = ORIGINAL.map((o) => {
    const e = map.get(o.id);
    return {
      ...o,
      title: e?.title || o.title,
      subtitle: e?.subtitle ?? o.subtitle,
      desc: e?.desc ?? o.desc,
      price: typeof e?.price === "number" ? e.price : o.price,
      cats: e?.cats?.length ? e.cats : o.cats,
      img: e?.img || o.img,
      hidden: !!e?.hidden,
      edited: !!e,
      custom: false,
      file: e?.file ?? "",
      paras: e?.paras,
      tags: e?.tags,
    };
  });
  const added: Row[] = edits
    .filter((e) => e.custom)
    .map((e) => ({
      id: e.id,
      slug: e.slug || `${slugify(e.title || "ebook")}-${e.id}`,
      title: e.title || "Untitled ebook",
      subtitle: e.subtitle || "",
      desc: e.desc || "",
      price: e.price ?? 0,
      cats: e.cats?.length ? e.cats : [CATEGORIES[0].slug],
      img: e.img || "",
      hidden: !!e.hidden,
      edited: true,
      custom: true,
      file: e.file ?? "",
      paras: e.paras,
      tags: e.tags,
    }))
    .sort((a, b) => b.id - a.id);
  return [...added, ...rows];
}

type Filter = "all" | "edited" | "hidden" | "new";
const PAGE = 30;

export function ProductsTab() {
  const [edits, setEdits] = useState<ProductEdit[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const load = () => api<{ edits: ProductEdit[] }>("products.list").then((r) => setEdits(r.edits));
  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => (edits ? mergeProducts(edits) : []), [edits]);
  const list = rows.filter((r) => {
    if (filter === "edited" && !(r.edited && !r.custom)) return false;
    if (filter === "hidden" && !r.hidden) return false;
    if (filter === "new" && !r.custom) return false;
    if (cat && !r.cats.includes(cat)) return false;
    return !q || `${r.title} ${r.subtitle}`.toLowerCase().includes(q.toLowerCase());
  });
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);

  if (!edits) return <div className="ad-page"><p className="ad-note">Loading ebooks…</p></div>;
  if (editing)
    return (
      <Editor
        row={editing === "new" ? null : editing}
        onClose={async (changed) => {
          if (changed) await load();
          setEditing(null);
        }}
      />
    );

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <h1>Ebooks</h1>
          <p>
            {rows.filter((r) => !r.hidden).length} ebooks in the shop. Change prices and descriptions, hide ebooks, add download links, or add a new ebook.
          </p>
        </div>
        <button className="ad-btn" onClick={() => setEditing("new")}>
          + Add ebook
        </button>
      </header>
      <div className="ad-filters">
        <input className="ad-in" placeholder="Search ebooks…" value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} />
        <select className="ad-in" value={cat} onChange={(e) => (setCat(e.target.value), setPage(0))}>
          <option value="">All topics</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="ad-seg">
          {(["all", "edited", "hidden", "new"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => (setFilter(f), setPage(0))}>
              {f === "all" ? "All" : f === "edited" ? "Changed" : f === "hidden" ? "Hidden" : "Added by me"}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-list">
        {list.slice(cur * PAGE, cur * PAGE + PAGE).map((r) => (
          <button key={r.id} className="ad-row click" onClick={() => setEditing(r)}>
            <div className="ad-thumb">{r.img ? <img src={r.img} alt="" loading="lazy" /> : "✦"}</div>
            <div className="ad-row-main">
              <strong>{r.title}</strong>
              <small>{r.cats.map((c) => CATEGORIES.find((x) => x.slug === c)?.name ?? c).join(", ")}</small>
            </div>
            {r.custom && <span className="ad-pill ok">New</span>}
            {r.hidden && <span className="ad-pill">Hidden</span>}
            {r.edited && !r.custom && !r.hidden && <span className="ad-pill warn">Changed</span>}
            {r.file && <span className="ad-pill">File</span>}
            <b className="ad-price">{money(r.price)}</b>
          </button>
        ))}
        {!list.length && <p className="ad-empty">No ebooks match.</p>}
      </div>
      {pages > 1 && (
        <div className="ad-pager">
          <button className="ad-btn ghost sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
            ← Previous
          </button>
          <span>
            Page {cur + 1} of {pages}
          </span>
          <button className="ad-btn ghost sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function Editor({ row, onClose }: { row: Row | null; onClose: (changed: boolean) => void }) {
  const isNew = !row;
  const [f, setF] = useState({
    title: row?.title ?? "",
    subtitle: row?.subtitle ?? "",
    desc: row?.desc ?? "",
    price: row ? String((row.price / 100).toFixed(2)) : "0.00",
    cats: row?.cats ?? [CATEGORIES[0].slug],
    img: row?.img ?? "",
    paras: (row?.paras ?? []).join("\n\n"),
    tags: (row?.tags ?? []).join(", "),
    file: row?.file ?? "",
    hidden: row?.hidden ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  // the long description of an imported ebook lives in a separate file; show it so it can be edited
  useEffect(() => {
    if (!row || row.custom || row.paras?.length) return;
    import("../data/details.json").then((m) => {
      const d = (m.default as unknown as Record<string, { paras: string[]; tags: string[] }>)[String(row.id)];
      if (d) setF((x) => ({ ...x, paras: x.paras || d.paras.join("\n\n"), tags: x.tags || d.tags.join(", ") }));
    });
  }, [row]);

  async function save() {
    if (!f.title.trim()) return setMsg("Add a title first.");
    setBusy(true);
    setMsg("");
    try {
      await api("products.save", {
        edit: {
          id: row?.id,
          custom: isNew || row?.custom,
          title: f.title,
          subtitle: f.subtitle,
          desc: f.desc,
          price: Math.round((parseFloat(f.price) || 0) * 100),
          cats: f.cats,
          img: f.img,
          paras: f.paras.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
          tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
          file: f.file,
          hidden: f.hidden,
        },
      });
      onClose(true);
    } catch (e) {
      setMsg(e instanceof Error && e.message === "bad_url" ? "Cover and file addresses must start with https:// (cover may also start with /)." : "Could not save. Try again.");
      setBusy(false);
    }
  }

  async function reset() {
    if (!row || !confirm(row.custom ? "Delete this ebook for good?" : "Put this ebook back to how it was imported?")) return;
    await api("products.reset", { id: row.id });
    onClose(true);
  }

  async function pick(file?: File) {
    if (!file) return;
    setMsg("Uploading picture…");
    try {
      set("img", await uploadImage(file));
      setMsg("");
    } catch {
      setMsg("That picture could not be uploaded.");
    }
  }

  return (
    <div className="ad-page">
      <header className="ad-head">
        <div>
          <button className="ad-link" onClick={() => onClose(false)}>
            ← All ebooks
          </button>
          <h1>{isNew ? "Add an ebook" : row.title}</h1>
        </div>
        <div className="ad-actions">
          {row && (
            <a className="ad-btn ghost" href={productHref(row)} target="_blank" rel="noreferrer">
              View on site
            </a>
          )}
          {row && (row.custom || row.edited) && (
            <button className="ad-btn danger ghost" onClick={reset}>
              {row.custom ? "Delete" : "Reset to original"}
            </button>
          )}
          <button className="ad-btn" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save ebook"}
          </button>
        </div>
      </header>
      {msg && <p className="ad-note">{msg}</p>}
      <div className="ad-form two">
        <div className="ad-col">
          <label>
            <span>Title</span>
            <input className="ad-in" value={f.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label>
            <span>Subtitle (optional)</span>
            <input className="ad-in" value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </label>
          <label>
            <span>Short description (shown on cards and in search)</span>
            <textarea className="ad-in" rows={3} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          </label>
          <label>
            <span>Full description (empty line between paragraphs)</span>
            <textarea className="ad-in" rows={10} value={f.paras} onChange={(e) => set("paras", e.target.value)} />
          </label>
          <label>
            <span>Tags (separated by commas)</span>
            <input className="ad-in" value={f.tags} onChange={(e) => set("tags", e.target.value)} />
          </label>
        </div>
        <div className="ad-col">
          <label>
            <span>Price in Canadian dollars (0 = free)</span>
            <input className="ad-in" type="number" min="0" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} />
          </label>
          <div>
            <span className="ad-lbl">Topics</span>
            <div className="ad-checks">
              {CATEGORIES.map((c) => (
                <label key={c.slug}>
                  <input
                    type="checkbox"
                    checked={f.cats.includes(c.slug)}
                    onChange={(e) => set("cats", e.target.checked ? [...f.cats, c.slug] : f.cats.filter((x) => x !== c.slug))}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div className="ad-cover">
            <span className="ad-lbl">Cover picture</span>
            <div className="ad-cover-row">
              <div className="ad-thumb big">{f.img ? <img src={f.img} alt="" /> : "✦"}</div>
              <div>
                <input className="ad-in" placeholder="https://… or upload" value={f.img} onChange={(e) => set("img", e.target.value)} />
                <label className="ad-btn ghost sm">
                  Upload picture
                  <input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
                </label>
              </div>
            </div>
          </div>
          <label>
            <span>Download link (given to the buyer after paying)</span>
            <input className="ad-in" placeholder="https://… link to the PDF" value={f.file} onChange={(e) => set("file", e.target.value)} />
          </label>
          <label className="ad-check">
            <input type="checkbox" checked={f.hidden} onChange={(e) => set("hidden", e.target.checked)} />
            Hide this ebook from the shop
          </label>
        </div>
      </div>
    </div>
  );
}
