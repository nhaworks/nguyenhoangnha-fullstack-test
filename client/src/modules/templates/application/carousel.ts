export function getNextIndex(currentIndex: number, total: number): number {
  if (total === 0) return 0;
  return (currentIndex + 1) % total;
}

export function getPreviousIndex(currentIndex: number, total: number): number {
  if (total === 0) return 0;
  return (currentIndex - 1 + total) % total;
}
