import type { Corners } from '../api/client'

// Corners covering the whole image: the starting point for adjusting by hand.
export function wholeImageCorners(width: number, height: number): Corners {
  return [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: 0, y: height - 1 },
  ]
}
