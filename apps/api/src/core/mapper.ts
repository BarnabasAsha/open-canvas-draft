// The one seam between a domain model and its Drizzle row shape — every
// module's mapper implements exactly these two directions, nothing else,
// so a repository never needs to know the domain model's internal props
// or the row's column names at the same time.
export abstract class Mapper<Domain, Row> {
  abstract toDomain(row: Row): Domain;
  abstract toPersistence(domain: Domain): Row;

  toDomainList(rows: Row[]): Domain[] {
    return rows.map((row) => this.toDomain(row));
  }
}
