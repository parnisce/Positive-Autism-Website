import { useEffect, useRef } from "react";

/** The film "Accepted As I Am" (YouTube id), played inside the site so visitors never leave it. */
export const FILM_ID = "5AanduBovyk";

/** Pop-up player: opens on a click (so it can autoplay with sound), closes with Esc, the backdrop or the close button. */
export function FilmModal({ open, onClose, title, closeLabel }: { open: boolean; onClose: () => void; title: string; closeLabel: string }) {
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("pa-film-open");
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("pa-film-open");
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="pa-film-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose} data-lenis-prevent>
      <div className="pa-film-box" onClick={(e) => e.stopPropagation()}>
        <button ref={closeBtn} type="button" className="pa-film-close" onClick={onClose} aria-label={closeLabel}>
          ✕
        </button>
        <div className="pa-film-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${FILM_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
