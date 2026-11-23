import { useRef, useState, type FormEvent } from "react";
import { usePrefs } from "./prefs";

type Status = "idle" | "sending" | "done" | "error" | "unconfigured";

/** "Stay connected" sign-up: parents and readers get notified about new ebook releases. */
export function SubscribeForm() {
  const { t, lang } = usePrefs();
  const [status, setStatus] = useState<Status>("idle");
  const [sent, setSent] = useState("");
  const born = useRef(Date.now()); // bots submit instantly; people take a few seconds

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), lang, t: Date.now() - born.current }),
      });
      if (res.status === 503) return setStatus("unconfigured");
      if (!res.ok) throw new Error(String(res.status));
      setSent(String(data.get("email") ?? ""));
      form.reset();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const s = t.subscribe;
  // after signing up, the form is replaced by a clear confirmation
  if (status === "done")
    return (
      <div className="pa-subscribe-done" role="status" aria-live="polite">
        <span className="pa-subscribe-check" aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>{s.done}</strong>
          {sent && <small>{sent}</small>}
          <button type="button" onClick={() => setStatus("idle")}>
            {s.another}
          </button>
        </div>
      </div>
    );
  return (
    <form className="pa-subscribe-form" onSubmit={onSubmit}>
      <div className="pa-subscribe-fields">
        <label>
          <span className="pa-sr">{s.name}</span>
          <input type="text" name="name" placeholder={s.name} autoComplete="name" required />
        </label>
        <label>
          <span className="pa-sr">{s.email}</span>
          <input type="email" name="email" placeholder={s.email} autoComplete="email" required />
        </label>
      </div>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? s.sending : s.button}
      </button>
      <p className={`pa-subscribe-note${status === "error" || status === "unconfigured" ? " is-error" : ""}`} role="status" aria-live="polite">
        {status === "error" && s.error}
        {status === "unconfigured" && s.unconfigured}
      </p>
    </form>
  );
}
