export function hashToNumber(value: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const range = Math.max(1, max - min + 1);
  return min + Math.abs(hash) % range;
}
