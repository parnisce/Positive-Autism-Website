import { useState, type FormEvent } from "react";
import { SUBSCRIBE_ENDPOINT } from "../../subscribe";

type Status = "idle" | "sending" | "done" | "error" | "unconfigured";

/** "Stay connected" sign-up: parents and readers get notified about new ebook releases. */
export function SubscribeForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("company")) return; // honeypot: bots fill this hidden field
    if (!SUBSCRIBE_ENDPOINT) {
      setStatus("unconfigured");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(SUBSCRIBE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="pa-subscribe-form" onSubmit={onSubmit} noValidate={false}>
      <div className="pa-subscribe-fields">
        <label>
          <span className="pa-sr">Name</span>
          <input type="text" name="name" placeholder="Name" autoComplete="name" required />
        </label>
        <label>
          <span className="pa-sr">Email</span>
          <input type="email" name="email" placeholder="Email" autoComplete="email" required />
        </label>
      </div>
      <input className="pa-hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Subscribing..." : "Subscribe"}
      </button>
      <p className="pa-subscribe-note" role="status" aria-live="polite">
        {status === "done" && "Thank you! We will email you when a new ebook is released."}
        {status === "error" && "Something went wrong. Please try again in a moment."}
        {status === "unconfigured" && "Sign-ups are not connected yet. Please check back soon."}
      </p>
    </form>
  );
}
