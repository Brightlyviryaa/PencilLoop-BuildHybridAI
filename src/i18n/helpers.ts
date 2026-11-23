/** Shared helpers for the language files. */
export const pl = (n: number, one: string, many: string) => (n === 1 ? one : many)
export type Dir = 'left' | 'right'
export type Facing = 'N' | 'E' | 'S' | 'W'
