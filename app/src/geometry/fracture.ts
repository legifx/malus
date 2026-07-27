import * as THREE from 'three'
import { makeAppleGeometry } from './apple'
import { rng } from '../lib/noise'

/**
 * Fracture.
 *
 * Written from scratch rather than taken off the shelf, for two reasons. The
 * obvious library (`three-pinata`) ships with no licence file, which makes it
 * all-rights-reserved and unusable under the hackathon's asset rules. And more
 * importantly, a generic shatter cannot express the thing this act is about.
 *
 * The science: crisp and mealy are not degrees of freshness, they are two
 * different fracture paths. In a crisp apple the crack runs THROUGH the cells,
 * which burst under turgor pressure and release their contents — that is the
 * juice, and that is the noise. In a mealy one the crack runs BETWEEN them,
 * along the middle lamella, so the cells separate intact and dry.
 *   research/papers/turgor-pressure-.../1999-comparison-of-softenin...md
 *   research/papers/fracture-mechanics-plant-tissue-.../
 *
 * Real-time fracture solvers (boundary-element, phase-field) are offline tools.
 * The tractable version: partition the surface into Voronoi cells, close each
 * one with a cap toward an interior apex, and let a single turgor uniform
 * reshape the cut faces and the burst. Everything after that happens on the
 * GPU, so the whole break stays a pure function of scroll and scrubs backwards.
 */

export interface FractureParams {
  seed?: number
  /** Base apple subdivision. 22 ≈ 10.6k triangles, plenty once broken up. */
  detail?: number
  /** Number of fragments. */
  cells?: number
  /** Unit vector: where the break starts. Fragments are finer near it. */
  origin?: THREE.Vector3
  character?: number
}

/** Interior facets per fragment. Three to five reads as broken; one is a cone. */
const APEX_GROUPS = 4

export interface FractureResult {
  geometry: THREE.BufferGeometry
  cellCount: number
  /** Half-height of the source apple, for placing it on a surface. */
  restY: number
}

export function makeFracturedApple({
  seed = 7,
  detail = 22,
  cells = 48,
  origin = new THREE.Vector3(0.35, 0.25, 0.9).normalize(),
  character = 0.38,
}: FractureParams = {}): FractureResult {
  const base = makeAppleGeometry({ seed, detail, character })
  const restY: number = base.userData.restY
  const bpos = base.attributes.position as THREE.BufferAttribute
  const bnrm = base.attributes.normal as THREE.BufferAttribute
  const bsph = base.attributes.aSphere as THREE.BufferAttribute
  const idx = base.index!
  const triCount = idx.count / 3

  const rand = rng(seed * 31 + 17)

  // --- 1. seeds ------------------------------------------------------------
  // Placed on the surface and biased toward the point of impact: impact
  // fracture produces fine fragments near the strike and coarse ones away
  // from it. Rejection sampling against that bias, then each is snapped to
  // the nearest actual vertex so no cell can come out empty.
  const seeds: THREE.Vector3[] = []
  const v = new THREE.Vector3()
  let guard = 0
  while (seeds.length < cells && guard++ < cells * 400) {
    const i = Math.floor(rand() * bpos.count)
    v.fromBufferAttribute(bpos, i)
    const dir = v.clone().normalize()
    // 1 at the impact point, ~0.18 on the far side.
    const bias = 0.18 + 0.82 * Math.pow(Math.max(0, dir.dot(origin)) , 1.5)
    if (rand() > bias) continue
    // Keep them apart, or clusters of tiny slivers appear.
    let tooClose = false
    for (const s of seeds) {
      if (s.distanceToSquared(v) < 0.055) { tooClose = true; break }
    }
    if (tooClose) continue
    seeds.push(v.clone())
  }
  const nCells = seeds.length

  // --- 2. assign each triangle to its nearest seed --------------------------
  const triCell = new Int32Array(triCount)
  const c0 = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3()
  const centroid = new THREE.Vector3()
  for (let t = 0; t < triCount; t++) {
    c0.fromBufferAttribute(bpos, idx.getX(t * 3))
    c1.fromBufferAttribute(bpos, idx.getX(t * 3 + 1))
    c2.fromBufferAttribute(bpos, idx.getX(t * 3 + 2))
    centroid.copy(c0).add(c1).add(c2).multiplyScalar(1 / 3)
    let best = 0, bestD = Infinity
    for (let s = 0; s < nCells; s++) {
      const d = seeds[s].distanceToSquared(centroid)
      if (d < bestD) { bestD = d; best = s }
    }
    triCell[t] = best
  }

  // --- 3. per-cell triangle lists and boundary edges -------------------------
  const cellTris: number[][] = Array.from({ length: nCells }, () => [])
  for (let t = 0; t < triCount; t++) cellTris[triCell[t]].push(t)

  // An edge is on a cell's boundary when only one of the two triangles that
  // share it belongs to that cell. The closed base mesh guarantees exactly two.
  //
  // Built once as edge -> owning triangles. Searching the triangle list per
  // edge instead would be O(triCount²) — around 335 million comparisons at
  // this subdivision, which is a hang, not a slow path.
  const ekey = (a: number, b: number) => (a < b ? a * 1e7 + b : b * 1e7 + a)
  const edgeTris = new Map<number, number[]>()
  for (let t = 0; t < triCount; t++) {
    const a = idx.getX(t * 3), b = idx.getX(t * 3 + 1), c = idx.getX(t * 3 + 2)
    for (const [x, y] of [[a, b], [b, c], [c, a]] as const) {
      const k = ekey(x, y)
      const arr = edgeTris.get(k)
      if (arr) arr.push(t)
      else edgeTris.set(k, [t])
    }
  }

  // --- 4. emit ---------------------------------------------------------------
  const positions: number[] = []
  const normals: number[] = []
  const spheres: number[] = []
  const flesh: number[] = []
  const isCut: number[] = []
  const cellCentre: number[] = []
  const cellSeed: number[] = []
  const cellIndex: number[] = []

  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3()
  const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3()
  const sa = new THREE.Vector3(), sb = new THREE.Vector3(), sc = new THREE.Vector3()
  const apex = new THREE.Vector3()
  const faceN = new THREE.Vector3()
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), toCom = new THREE.Vector3()

  for (let cell = 0; cell < nCells; cell++) {
    const tris = cellTris[cell]
    if (tris.length === 0) continue

    // The fragment's own centre of mass, and the apex its cut faces run to.
    // Pulling the apex toward the fruit's core is what gives the fragment a
    // wedge shape instead of a shell.
    const com = new THREE.Vector3()
    for (const t of tris) {
      c0.fromBufferAttribute(bpos, idx.getX(t * 3))
      c1.fromBufferAttribute(bpos, idx.getX(t * 3 + 1))
      c2.fromBufferAttribute(bpos, idx.getX(t * 3 + 2))
      com.add(c0).add(c1).add(c2)
    }
    com.multiplyScalar(1 / (tris.length * 3))

    // Several apexes, not one.
    //
    // Fanning every boundary edge to a single interior point makes a cone, and
    // a cone with flat-shaded facets reads as a folded paper fan — which is
    // exactly what the first build looked like. A real fracture surface is a
    // handful of flat facets meeting along edges, so the boundary loop is split
    // into APEX_GROUPS arcs and each arc runs to its own jittered apex.
    const axis = com.clone().normalize()
    const tanU = new THREE.Vector3(0, 1, 0)
    if (Math.abs(axis.dot(tanU)) > 0.9) tanU.set(1, 0, 0)
    const tanA = new THREE.Vector3().crossVectors(axis, tanU).normalize()
    const tanB = new THREE.Vector3().crossVectors(axis, tanA).normalize()

    const apexes: THREE.Vector3[] = []
    for (let k = 0; k < APEX_GROUPS; k++) {
      apexes.push(
        com.clone().multiplyScalar(0.30 + rand() * 0.16).add(
          tanA.clone().multiplyScalar((rand() - 0.5) * 0.13)
            .add(tanB.clone().multiplyScalar((rand() - 0.5) * 0.13)),
        ),
      )
    }

    const cs = rand()

    // isCut separates the two surface kinds. aFlesh alone cannot: it is 0 on
    // the skin AND 0 along the rim of every cut facet, because the rim vertices
    // ARE skin vertices. Inside a facet, aFlesh then reads as depth from that
    // rim, which is what gives the peel its thin visible edge.
    const push = (
      p: THREE.Vector3, n: THREE.Vector3, s: THREE.Vector3, f: number, cut: number,
    ) => {
      positions.push(p.x, p.y, p.z)
      normals.push(n.x, n.y, n.z)
      spheres.push(s.x, s.y, s.z)
      flesh.push(f)
      isCut.push(cut)
      cellCentre.push(com.x, com.y, com.z)
      cellSeed.push(cs)
      cellIndex.push(cell)
    }

    // Outer skin: the original triangles, with their smooth normals kept so
    // the skin still reads as skin on a tumbling shard.
    for (const t of tris) {
      const ia = idx.getX(t * 3), ib = idx.getX(t * 3 + 1), ic = idx.getX(t * 3 + 2)
      pa.fromBufferAttribute(bpos, ia); na.fromBufferAttribute(bnrm, ia); sa.fromBufferAttribute(bsph, ia)
      pb.fromBufferAttribute(bpos, ib); nb.fromBufferAttribute(bnrm, ib); sb.fromBufferAttribute(bsph, ib)
      pc.fromBufferAttribute(bpos, ic); nc.fromBufferAttribute(bnrm, ic); sc.fromBufferAttribute(bsph, ic)
      push(pa, na, sa, 0, 0)
      push(pb, nb, sb, 0, 0)
      push(pc, nc, sc, 0, 0)
    }

    // Cut faces: fan every boundary edge to the apex. Flat normals, because
    // these are fracture facets, not a smooth surface.
    // Cut faces, in two passes.
    //
    // Pass one collects the triangles of each facet group and accumulates one
    // area-weighted normal for the group. Pass two emits them all carrying that
    // SINGLE normal.
    //
    // This is the difference between a fracture and a folded paper fan. Giving
    // each fan triangle its own face normal makes every one of them shade
    // differently, and the interior comes out visibly pleated — the first build
    // looked like broken eggshell. A real fracture facet is flat, so it has to
    // shade as one surface even where it is geometrically a fan.
    const groupTris: Array<Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]>> =
      Array.from({ length: APEX_GROUPS }, () => [])
    const groupN: THREE.Vector3[] = Array.from({ length: APEX_GROUPS }, () => new THREE.Vector3())

    const inCell = new Set(tris)
    for (const t of tris) {
      const a = idx.getX(t * 3), b = idx.getX(t * 3 + 1), c = idx.getX(t * 3 + 2)
      for (const [x, y] of [[a, b], [b, c], [c, a]] as const) {
        const share = edgeTris.get(ekey(x, y))
        if (!share) continue
        const other = share[0] === t ? share[1] : share[0]
        if (other === undefined || inCell.has(other)) continue

        pa.fromBufferAttribute(bpos, x)
        pb.fromBufferAttribute(bpos, y)
        sa.fromBufferAttribute(bsph, x)
        sb.fromBufferAttribute(bsph, y)

        // Which facet this edge belongs to: its bearing around the fragment's
        // radial axis. Neighbouring edges land in the same group, so each facet
        // comes out as a contiguous arc rather than as scattered slivers.
        e1.copy(pa).add(pb).multiplyScalar(0.5).sub(com)
        const bearing = Math.atan2(e1.dot(tanB), e1.dot(tanA))
        const group = Math.min(
          APEX_GROUPS - 1,
          Math.floor(((bearing + Math.PI) / (Math.PI * 2)) * APEX_GROUPS),
        )
        apex.copy(apexes[group])

        e1.subVectors(pb, pa)
        e2.subVectors(apex, pa)
        faceN.crossVectors(e1, e2) // length is twice the area — the weight

        // The facet has to face away from the fragment body. If this winding
        // points it at the centre of mass instead, reverse both.
        toCom.subVectors(com, pa)
        const flip = faceN.dot(toCom) > 0
        if (flip) faceN.negate()
        groupN[group].add(faceN)

        groupTris[group].push(
          flip
            ? [pb.clone(), pa.clone(), apex.clone(), sb.clone(), sa.clone()]
            : [pa.clone(), pb.clone(), apex.clone(), sa.clone(), sb.clone()],
        )
      }
    }

    for (let gI = 0; gI < APEX_GROUPS; gI++) {
      if (groupTris[gI].length === 0) continue
      const n = groupN[gI].lengthSq() > 1e-9 ? groupN[gI].normalize() : new THREE.Vector3(0, 1, 0)
      for (const [v0, v1, v2, s0, s1] of groupTris[gI]) {
        push(v0, n, s0, 0, 1)
        push(v1, n, s1, 0, 1)
        push(v2, n, s0, 1, 1)
      }
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('aSphere', new THREE.Float32BufferAttribute(spheres, 3))
  g.setAttribute('aFlesh', new THREE.Float32BufferAttribute(flesh, 1))
  g.setAttribute('aIsCut', new THREE.Float32BufferAttribute(isCut, 1))
  g.setAttribute('aCellCentre', new THREE.Float32BufferAttribute(cellCentre, 3))
  g.setAttribute('aCellSeed', new THREE.Float32BufferAttribute(cellSeed, 1))
  g.setAttribute('aCellIndex', new THREE.Float32BufferAttribute(cellIndex, 1))
  // The fragments leave the origin, so a static bounding sphere would cull the
  // mesh the moment the break starts.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40)

  return { geometry: g, cellCount: nCells, restY }
}
