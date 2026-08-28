import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import { requireAuth } from "../../../middleware/auth.middleware";
import { requireUuidParam } from "../../../lib/require-uuid-param";
import type { RequestContainer } from "../../../di/container";
import type { AssetModel } from "./domain/asset.model";

type Env = InferdiHonoScopeEnv<RequestContainer>;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Deny-by-default, not "anything image/*" — image/svg+xml satisfies that
// prefix but an SVG can carry a <script> that executes when the R2 object
// is opened directly (served back as Content-Type: image/svg+xml under
// the app's own asset domain). Raster formats have no such risk, so an
// explicit allow-list is the only safe way to accept "an image."
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function serializeAsset(asset: AssetModel) {
  return {
    id: asset.id,
    projectId: asset.projectId,
    url: asset.url,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

// Mounted at /projects/:projectId/assets by the parent router, same
// path-param sharing as pageRoutes (see that file's own comment on the
// `c.req.param("projectId") as string` cast).
export const assetRoutes = new Hono<Env>()
  .use("*", requireAuth)
  .post(
    "/",
    // Rejects an oversized request at the framework level, before the body
    // is ever buffered into memory — the MAX_UPLOAD_BYTES check below runs
    // only after c.req.parseBody() has already read the whole thing, which
    // is too late to bound memory use for a request that never should have
    // been accepted in the first place.
    bodyLimit({ maxSize: MAX_UPLOAD_BYTES, onError: (c) => c.json({ error: "File exceeds the 10MB upload limit" }, 413) }),
    async (c) => {
      const body = await c.req.parseBody();
      const file = body.file;

      if (!(file instanceof File)) return c.json({ error: "Missing file" }, 400);
      if (!ALLOWED_MIME_TYPES.has(file.type)) return c.json({ error: "Only PNG, JPEG, GIF, or WebP images are supported" }, 400);
      if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: "File exceeds the 10MB upload limit" }, 400);

      const command = await c.var.di.getAsync("uploadAssetCommand");
      const buffer = Buffer.from(await file.arrayBuffer());
      const { data } = await command.execute({
        projectId: requireUuidParam(c.req.param("projectId"), "projectId"),
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        buffer,
      });
      return c.json(serializeAsset(data), 201);
    },
  )
  .get("/", async (c) => {
    const query = await c.var.di.getAsync("listAssetsQuery");
    const assets = await query.execute({ projectId: requireUuidParam(c.req.param("projectId"), "projectId") });
    return c.json(assets.map(serializeAsset));
  })
  .delete("/:assetId", async (c) => {
    const command = await c.var.di.getAsync("deleteAssetCommand");
    await command.execute({ assetId: requireUuidParam(c.req.param("assetId"), "assetId") });
    return c.body(null, 204);
  });
