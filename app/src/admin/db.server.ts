/** Server-only helpers shared by the admin code: environment variables and dates. */

const g = globalThis as unknown as { __paEnv?: Record<string, unknown>; process?: { env?: Record<string, string | undefined> } };

/** Reads a variable or secret from the request env, the Workers env module or process.env. */
export async function envVar(name: string): Promise<string | undefined> {
  const pick = (o: unknown) => {
    const v = o && typeof o === "object" ? (o as Record<string, unknown>)[name] : undefined;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const v = pick(g.__paEnv);
  if (v) return v;
  try {
    const { bindings } = await import("../lib/bindings.server");
    const w = pick(bindings());
    if (w) return w;
  } catch {
    /* not inside Workers (local dev) */
  }
  return pick(g.process?.env);
}

export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
