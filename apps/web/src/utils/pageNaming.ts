// Same scan-for-next-number approach as nodeNaming.ts's nextDefaultName, just
// over page names instead of node names — no counter persisted anywhere, so
// renaming or deleting pages can never leave the store out of sync with
// what's actually in the pages list.
export function nextPageName(existingNames: readonly string[], baseName: string): string {
  const pattern = new RegExp(`^${baseName} (\\d+)$`);
  let highest = 0;

  for (const name of existingNames) {
    const match = pattern.exec(name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  return `${baseName} ${highest + 1}`;
}
