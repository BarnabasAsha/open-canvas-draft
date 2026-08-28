import type { Mapper } from "./mapper";

// Every concrete repository (DrizzleProjectRepository, DrizzlePageRepository,
// ...) extends this and implements its own module-specific interface
// (ProjectRepository, PageRepository) on top — this base class only owns
// the mapper delegation, never any query logic itself, since query shape
// is entirely aggregate-specific.
export abstract class BaseRepository<Domain, Row> {
  protected readonly mapper: Mapper<Domain, Row>;

  constructor(mapper: Mapper<Domain, Row>) {
    this.mapper = mapper;
  }

  protected toDomain(row: Row): Domain {
    return this.mapper.toDomain(row);
  }

  protected toPersistence(domain: Domain): Row {
    return this.mapper.toPersistence(domain);
  }

  protected toDomainList(rows: Row[]): Domain[] {
    return this.mapper.toDomainList(rows);
  }
}
