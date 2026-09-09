/**
 * Геометрия фирменного знака PharmaGO.
 *
 * Знак — пиксельный крест на сетке 7×7 плюс «шлейф» из двух затухающих
 * квадратов справа от каждой строки. На этой же сетке построены все
 * анимации бренда (лоадер, галочка, крестик, пустое состояние, таймер),
 * поэтому геометрия живёт в одном месте.
 */

export const GRID = 7
const STEP = 40
const SIZE = 28

/** Холст со шлейфом (лоадер, логотип, пустое состояние). */
export const VIEWBOX_WIDE = '0 0 360 280'
/** Холст только под крест (галочка, крестик, таймер). */
export const VIEWBOX_SQUARE = '0 0 280 280'

export interface Cell { x: number, y: number, s: number }

export const inCross = (c: number, r: number): boolean =>
  (r >= 2 && r <= 4 && c >= 0 && c <= 6) || (c >= 2 && c <= 4 && r >= 0 && r <= 6)

/** Клетка целиком внутри креста — её не рисуем, знак остаётся контурным. */
export const isInterior = (c: number, r: number): boolean =>
  [-1, 0, 1].every(dx => [-1, 0, 1].every(dy => inCross(c + dx, r + dy)))

/** Координаты квадрата в клетке (c, r), масштаб k центрируется в клетке. */
export function cell(c: number, r: number, k = 1): Cell {
  const s = SIZE * k
  const offset = (SIZE - s) / 2
  return {
    x: 20 + c * STEP - SIZE / 2 + offset,
    y: 20 + r * STEP - SIZE / 2 + offset,
    s,
  }
}

/** Колонка, за которой начинается шлейф для строки r. */
export const edgeCol = (r: number): number => (r >= 2 && r <= 4 ? 6 : 4)

/** transform-origin в центре квадрата — чтобы масштаб шёл из середины. */
export const cellOrigin = (p: Cell): string =>
  `${p.x + p.s / 2}px ${p.y + p.s / 2}px`

type Coord = [number, number]

/** Контур креста, упорядоченный по углу — по нему бежит подсветка лоадера. */
export const OUTLINE: Coord[] = (() => {
  const cells: Coord[] = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (inCross(c, r) && !isInterior(c, r)) cells.push([c, r])
    }
  }
  return cells.sort(
    (a, b) => Math.atan2(a[1] - 3, a[0] - 3) - Math.atan2(b[1] - 3, b[0] - 3),
  )
})()

/** Все клетки креста, включая внутренние — сплошная заливка. */
export const FILLED: Coord[] = (() => {
  const cells: Coord[] = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (inCross(c, r)) cells.push([c, r])
    }
  }
  return cells
})()

/** Клетки креста по часовой стрелке от 12 часов — порядок «стекания» таймера. */
export const CLOCKWISE: Coord[] = [...FILLED].sort((a, b) => {
  const angle = ([c, r]: Coord) =>
    (Math.atan2(r - 3, c - 3) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)
  return angle(a) - angle(b)
})

/** Диагональ галочки. */
export const CHECK_PATH: Coord[] = [[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2]]
/** Перекрестье для состояния ошибки. */
export const FAIL_PATH: Coord[] = [[2, 2], [3, 3], [4, 4], [2, 4], [4, 2]]

/** Квадраты шлейфа для всех строк: смещение 1 и 2 с уменьшением. */
export function trailCells(): { cell: Cell, depth: 1 | 2 }[] {
  const out: { cell: Cell, depth: 1 | 2 }[] = []
  for (let r = 0; r < GRID; r++) {
    const e = edgeCol(r)
    out.push({ cell: cell(e + 1, r, 0.8), depth: 1 })
    out.push({ cell: cell(e + 2, r, 0.6), depth: 2 })
  }
  return out
}
