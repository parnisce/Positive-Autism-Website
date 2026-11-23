import { useState, type FormEvent } from "react";
import { usePrefs } from "./prefs";

type Status = "idle" | "sending" | "done" | "error" | "unconfigured";

/** "Stay connected" sign-up: parents and readers get notified about new ebook releases. */
export function SubscribeForm() {
  const { t, lang } = usePrefs();
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("company")) return; // honeypot: bots fill this hidden field
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), lang, company: data.get("company") }),
      });
      if (res.status === 503) return setStatus("unconfigured");
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const s = t.subscribe;
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
      <input className="pa-hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? s.sending : s.button}
      </button>
      <p className="pa-subscribe-note" role="status" aria-live="polite">
        {status === "done" && s.done}
        {status === "error" && s.error}
        {status === "unconfigured" && s.unconfigured}
      </p>
    </form>
  );
}
