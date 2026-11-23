/** Browser side of /api/admin. */
export type Setup = { password: boolean; db: boolean; schema: boolean; lists?: boolean; adminKey: boolean; keyProblem?: boolean; stripe: "test" | "live" | null };
export type Status = { auth: boolean; setup: Setup };

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
  }
}

export async function api<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(String(data.error || "error"), typeof data.message === "string" ? data.message : undefined);
  return data as T;
}

export async function getStatus(): Promise<Status> {
  const res = await fetch("/api/admin", { cache: "no-store" });
  return (await res.json()) as Status;
}

/** Shrinks a picture in the browser (max 900px, JPEG) and uploads it. Returns the public URL. */
export async function uploadImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.86;
  let data = c.toDataURL("image/jpeg", q).split(",")[1];
  while (data.length > 1_300_000 && q > 0.4) {
    q -= 0.12;
    data = c.toDataURL("image/jpeg", q).split(",")[1];
  }
  const r = await api<{ url: string }>("upload", { mime: "image/jpeg", data });
  return r.url;
}

export const money = (cents: number) => (cents <= 0 ? "Free" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100));
