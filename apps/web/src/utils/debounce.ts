export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  flush: () => void;
  cancel: () => void;
}

// Trailing-edge only: the last call within `delayMs` of quiet wins. `flush`
// invokes immediately with the most recent pending args (used to force a
// save through on tab close); `cancel` drops a pending call with no effect.
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;

  function run(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const args = pendingArgs;
    pendingArgs = null;
    if (args) fn(...args);
  }

  const debounced = ((...args: Args) => {
    pendingArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(run, delayMs);
  }) as Debounced<Args>;

  debounced.flush = run;
  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };

  return debounced;
}
