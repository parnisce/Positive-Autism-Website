import { createFileRoute } from "@tanstack/react-router";

/** GET /api/img/<id>: pictures uploaded on the admin page (ebook covers, blog images). */
export const Route = createFileRoute("/api/img/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const store = await import("../admin/store.server");
        const row = /^[a-f0-9]{16}$/.test(params.id) ? await store.getImage(params.id).catch(() => null) : null;
        if (!row) return new Response("Not found", { status: 404 });
        const bin = atob(row.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Response(bytes, { headers: { "content-type": row.mime, "cache-control": "public, max-age=31536000, immutable" } });
      },
    },
  },
});
