import { NotFoundError } from "../../../core";
import type { ProjectRepository } from "../repositories/project.repository";
import type { PageModel } from "./domain/page.model";
import type { PageRepository } from "./repositories/page.repository";

// Every Page command/query beyond create needs this same two-hop lookup
// (Page has no ownerId of its own — only projectId, see the "Aggregate
// boundary" note in the plan) — one shared function instead of four
// near-identical copies inline in each command/query.
export async function loadOwnedPage(
  pageRepository: PageRepository,
  projectRepository: ProjectRepository,
  pageId: string,
  userId: string,
): Promise<PageModel> {
  const page = await pageRepository.findById(pageId);
  if (!page) throw new NotFoundError("Page not found");

  const project = await projectRepository.findById(page.projectId);
  if (!project) throw new NotFoundError("Page not found");
  project.assertOwnedBy(userId);

  return page;
}
