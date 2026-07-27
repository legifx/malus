/**
 * Deterministic 3D gradient noise + fBm.
 *
 * Written from the definition of gradient noise (integer lattice, hashed
 * gradient vectors, quintic fade, trilinear blend) so the project carries no
 * third-party licence obligations for something this small.
 *
 * Used for the organic irregularity of the apple silhouette and skin — a
 * perfectly symmetric apple reads as CG instantly.
 */

/** 32-bit integer hash. Cheap, well-distributed enough for lattice gradients. */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393) ^ (y * 668265263) ^ (z * 2147483647) ^ (seed * 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

/** 12 gradient directions on the edges of a cube — the classic Perlin set. */
const GRAD: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

function gradDot(ix: number, iy: number, iz: number, dx: number, dy: number, dz: number, seed: number) {
  const g = GRAD[hash3(ix, iy, iz, seed) % 12]
  return g[0] * dx + g[1] * dy + g[2] * dz
}

/** Quintic fade — C² continuous, avoids the visible creases of a cubic fade. */
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Gradient noise in roughly [-1, 1]. */
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz
  const u = fade(fx), v = fade(fy), w = fade(fz)

  const n000 = gradDot(ix, iy, iz, fx, fy, fz, seed)
  const n100 = gradDot(ix + 1, iy, iz, fx - 1, fy, fz, seed)
  const n010 = gradDot(ix, iy + 1, iz, fx, fy - 1, fz, seed)
  const n110 = gradDot(ix + 1, iy + 1, iz, fx - 1, fy - 1, fz, seed)
  const n001 = gradDot(ix, iy, iz + 1, fx, fy, fz - 1, seed)
  const n101 = gradDot(ix + 1, iy, iz + 1, fx - 1, fy, fz - 1, seed)
  const n011 = gradDot(ix, iy + 1, iz + 1, fx, fy - 1, fz - 1, seed)
  const n111 = gradDot(ix + 1, iy + 1, iz + 1, fx - 1, fy - 1, fz - 1, seed)

  return lerp(
    lerp(lerp(n000, n100, u), lerp(n010, n110, u), v),
    lerp(lerp(n001, n101, u), lerp(n011, n111, u), v),
    w,
  )
}

/** Fractal Brownian motion — stacked octaves, each finer and weaker. */
export function fbm3(x: number, y: number, z: number, octaves = 4, seed = 0): number {
  let sum = 0, amp = 0.5, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq, seed + i * 101)
    norm += amp
    amp *= 0.5
    freq *= 2.03 // slightly off 2.0 so octaves don't align into visible grids
  }
  return sum / norm
}

/** Deterministic pseudo-random stream — same seed, same apple, every reload. */
export function rng(seed: number) {
  let s = (seed | 0) || 1
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822519)
    s = (s + 0x9e3779b9) | 0
    return ((s >>> 8) & 0xffffff) / 0xffffff
  }
}
