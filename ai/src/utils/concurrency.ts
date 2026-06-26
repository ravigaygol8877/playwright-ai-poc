/**
 * pMap — run an array of async tasks with a concurrency cap.
 *
 * Like Promise.all() but never runs more than `limit` tasks at once.
 * Results are returned in the same order as the input array.
 *
 * Example:
 *   const results = await pMap(requirements, r => generator.generate(r), 8);
 */
export async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  limit = 8,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]!, i);
    }
  }

  const concurrency = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
