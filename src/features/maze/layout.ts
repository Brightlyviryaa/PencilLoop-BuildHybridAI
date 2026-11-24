/** Board chrome around the grid, as fractions of the outer size. */
export function boardLayout(size: number) {
  const pad = Math.max(5, Math.round(size * 0.04))
  const depth = Math.max(4, Math.round(size * 0.028))
  const grid = size - pad * 2 - depth
  return { pad, depth, grid, left: (size - grid) / 2, top: pad }
}

