import { readFileSync } from "node:fs";
import { join } from "node:path";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/client";
import { assets, pages, projects } from "../db/schema";
import { AssetModel } from "../modules/projects/assets/domain/asset.model";
import { AssetMapper } from "../modules/projects/assets/mappers/asset.mapper";
import { PageModel } from "../modules/projects/pages/domain/page.model";
import { PageMapper } from "../modules/projects/pages/mappers/page.mapper";
import { ProjectModel } from "../modules/projects/domain/project.model";
import { ProjectMapper } from "../modules/projects/mappers/project.mapper";
import { buildSeedScene } from "./seed-scene";
import { createR2ClientFromEnv, getR2PublicUrl } from "./r2-client";

const SEED_IMAGE_PATH = join(import.meta.dirname, "../assets/seed-image.jpeg");

// Called from a Better Auth databaseHooks.user.create.after hook — that
// runs outside any HTTP request, so there's no RequestContext to resolve
// "who's asking" the way every *Command/*Query already does. The userId
// is already known here, so this goes straight at Drizzle instead of
// through the DI container.
//
// Inserts directly via each Mapper rather than through the normal
// Drizzle*Repository classes — those are typed to accept the root
// Database, which isn't structurally assignable from a transaction handle
// (it's missing a `$client` property transactions don't carry), and
// widening that type across every repository just for this one
// transactional call site would be a much bigger, riskier change than
// this function needs. Using each Mapper directly still keeps row-shape
// mapping in one place (the same Mapper the repository itself calls).
export async function provisionExampleProject(userId: string): Promise<void> {
  // Validated up front, before the R2 upload's real side effect happens —
  // getR2PublicUrl() throwing AFTER a successful putObject would leave an
  // orphaned object in the bucket with nothing in Postgres ever
  // referencing it.
  const publicUrl = getR2PublicUrl();
  const r2Client = createR2ClientFromEnv();
  const imageBuffer = readFileSync(SEED_IMAGE_PATH);

  const projectId = uuidv7();
  const assetId = uuidv7();
  const key = `${projectId}/${assetId}.jpeg`;
  await r2Client.putObject({ key, body: imageBuffer, contentType: "image/jpeg" });

  // The R2 upload above can't itself be part of this transaction (it's a
  // separate external service, not Postgres) — if the transaction below
  // fails, that object is orphaned in the bucket. But wrapping the three
  // Postgres writes means we never end up with a project that has no
  // page, or an asset row with no owning project, which is the more
  // likely and more confusing failure mode of the two.
  await db.transaction(async (tx) => {
    const project = ProjectModel.create({ id: projectId, name: "Example Project", ownerId: userId });
    await tx.insert(projects).values(new ProjectMapper().toPersistence(project));

    const asset = AssetModel.create({
      id: assetId,
      projectId: project.id,
      key,
      url: `${publicUrl}/${key}`,
      fileName: "seed-image.jpeg",
      mimeType: "image/jpeg",
      size: imageBuffer.length,
    });
    await tx.insert(assets).values(new AssetMapper().toPersistence(asset));

    const page = PageModel.create({
      id: uuidv7(),
      projectId: project.id,
      name: "Page 1",
      sceneGraph: buildSeedScene(asset.url),
    });
    await tx.insert(pages).values(new PageMapper().toPersistence(page));
  });
}
