/**
 * World art direction. Each world keeps the same readable grid but gets its
 * own ground, obstacle and backdrop colours. Kept as data (not CSS classes)
 * because the board is drawn as SVG.
 */
export interface WorldTheme {
  key: 'island' | 'garden'
  /** Page backdrop behind the board (CSS background). */
  backdrop: string
  /** Board frame (the "island" or "garden bed" the grid sits on). */
  frame: string
  frameEdge: string
  tileA: string
  tileB: string
  tileLine: string
  obstacle: 'crate' | 'bush'
  obstacleTop: string
  obstacleSide: string
  obstacleMark: string
  water: string
  deco: string
}

export const WORLD_THEMES: Record<1 | 2, WorldTheme> = {
  1: {
    key: 'island',
    backdrop: 'radial-gradient(120% 80% at 50% 0%, #e3f1ff 0%, #cfe6ff 45%, #b9dcff 100%)',
    frame: '#f4dca8',
    frameEdge: '#d9b878',
    tileA: '#fffaf0',
    tileB: '#fdf1d8',
    tileLine: '#ecd9b0',
    obstacle: 'crate',
    obstacleTop: '#c98a4b',
    obstacleSide: '#9b6232',
    obstacleMark: '#e7b47a',
    water: '#8fc8ff',
    deco: '#7cc98f',
  },
  2: {
    key: 'garden',
    backdrop: 'radial-gradient(120% 80% at 50% 0%, #eafbf3 0%, #d6f4e6 45%, #c2ecd8 100%)',
    frame: '#8fd3a8',
    frameEdge: '#5fb383',
    tileA: '#f6fff9',
    tileB: '#e6f8ee',
    tileLine: '#c5ead4',
    obstacle: 'bush',
    obstacleTop: '#3fae74',
    obstacleSide: '#2b8558',
    obstacleMark: '#8fe0b0',
    water: '#9ad8ff',
    deco: '#ff9ec4',
  },
}

export const themeFor = (world: 1 | 2) => WORLD_THEMES[world]
