import { GLSL_NOISE } from './glslNoise'

/**
 * The broken apple.
 *
 * Every fragment's rigid motion is computed in the VERTEX SHADER from its cell
 * attributes and a single burst uniform. There is no solver and no per-fragment
 * mesh: one draw call, no CPU work per frame, and — because the motion is a
 * pure function of the burst value — the break scrubs backwards perfectly and
 * reassembles itself exactly.
 *
 * uTurgor is the act. It is not a look, it is the physics:
 *
 *   high (crisp) — the crack runs THROUGH the cells. They rupture, so the cut
 *     faces are smooth planes wet with the contents of burst cells, the break
 *     is fast and energetic, and there is juice.
 *   low (mealy)  — the crack runs BETWEEN the cells, along the middle lamella.
 *     They separate intact, so the faces are a dry granular mosaic of whole
 *     cells, the break is a slow crumble, and nothing is released.
 *
 *   research/papers/turgor-pressure-.../1999-comparison-of-softenin...md
 */

export const appleBurstVertex = /* glsl */ `
  attribute vec3 aSphere;
  attribute float aFlesh;
  attribute float aIsCut;
  attribute vec3 aCellCentre;
  attribute float aCellSeed;

  uniform float uBurst;    // 0 = whole, 1 = fully apart
  uniform float uTurgor;   // 0 = mealy, 1 = crisp
  uniform vec3  uOrigin;   // where the break started, object space

  varying vec3 vSphere;
  varying float vFlesh;
  varying float vIsCut;
  varying float vCellSeed;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  ${GLSL_NOISE}

  void main() {
    vSphere = aSphere;
    vFlesh = aFlesh;
    vIsCut = aIsCut;
    vCellSeed = aCellSeed;

    float t = uBurst;
    vec3 rnd = hash33(vec3(aCellSeed * 91.7, aCellSeed * 41.3 + 5.0, aCellSeed * 17.1 + 9.0));

    // Direction away from the strike, scattered a little so the burst is not a
    // clean radial star.
    vec3 dir = normalize(aCellCentre - uOrigin * 0.55 + rnd * 0.38);

    // A crisp fruit stores elastic energy in turgid cells and releases it; a
    // mealy one has nothing to release and simply falls apart.
    float energy = mix(0.42, 1.55, uTurgor) * (0.55 + 0.9 * fract(aCellSeed * 7.31));
    // Fragments near the strike leave fastest.
    energy *= 0.45 + 1.25 * exp(-length(aCellCentre - uOrigin) * 1.15);

    vec3 offset = dir * energy * t * 0.95;
    offset.y -= 2.5 * t * t * (0.45 + 0.95 * fract(aCellSeed * 13.17)); // gravity

    // Spin about the fragment's own centre. Rotating the normal with it is what
    // keeps the shard lit correctly as it tumbles.
    vec3 axis = normalize(rnd + vec3(0.0031, 0.0017, 0.0023));
    float ang = t * (1.8 + 6.5 * fract(aCellSeed * 3.77)) * mix(0.45, 1.0, uTurgor);

    vec3 local = rotAxis(position - aCellCentre, axis, ang);
    csm_Position = aCellCentre + local + offset;
    csm_Normal = rotAxis(normal, axis, ang);

    vec4 wp = modelMatrix * vec4(csm_Position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * csm_Normal);
  }
`

export const appleBurstFragment = /* glsl */ `
  varying vec3 vSphere;
  varying float vFlesh;
  varying float vIsCut;
  varying float vCellSeed;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  uniform float uTurgor;
  uniform float uRhoS;
  uniform float uAlpha;
  uniform float uRipeness;
  uniform float uBlush;
  uniform vec3  uSunDir;
  uniform float uSeed;

  ${GLSL_NOISE}

  void main() {
    vec3 s = normalize(vSphere);
    vec3 sp = s + vec3(uSeed);

    // ---- skin (same model as the intact fruit: anthocyanin over ground) ----
    float groundVar = fbm(sp * 2.1 + 17.0, 2) * 0.5 + 0.5;
    vec3 ground = mix(vec3(0.259, 0.310, 0.118), vec3(0.706, 0.647, 0.318),
                      clamp(uRipeness * (0.45 + 0.60 * groundVar), 0.0, 1.0));
    float sun = dot(s, normalize(uSunDir)) * 0.5 + 0.5;
    float patchy = fbm(sp * 1.55 + 3.0, 3) * 0.5 + 0.5;
    float cover = smoothstep(0.02, 0.74, pow(sun, 0.95) * (0.58 + 0.72 * patchy) * uBlush);
    vec3 blushCol = mix(vec3(0.678, 0.180, 0.114), vec3(0.310, 0.047, 0.063),
                        smoothstep(0.45, 1.0, cover));
    blushCol *= 0.78 + 0.38 * (fbm(sp * 5.2 + 29.0, 2) * 0.5 + 0.5);
    vec3 skin = mix(ground, blushCol, cover);

    // ---- flesh -------------------------------------------------------------
    // Parenchyma: pale, faintly yellow-green near the skin, wet when the cells
    // that made this face were ruptured.
    // Not white. Apple parenchyma is a warm cream with a green cast; pushed to
    // white it stops being tissue and starts being paper.
    vec3 fleshPale = vec3(0.729, 0.659, 0.451);
    vec3 fleshDeep = vec3(0.573, 0.510, 0.337);

    // The cell mosaic. This is the whole visual argument of the act: a mealy
    // break exposes INTACT cells, so the face is a granular mosaic. A crisp
    // break cuts straight through them and leaves a smooth wet plane.
    // Parenchyma cells are far too small to resolve — drawn at their true
    // scale they alias into glitter. This is the granularity the eye actually
    // reads on a broken face, roughly a millimetre.
    float cellSize = mix(20.0, 32.0, uTurgor);
    float cd = cellular(vWorldPos * cellSize + vCellSeed * 30.0);
    float mosaic = smoothstep(0.02, 0.30, cd);
    float grain = mix(mosaic, 0.5 + 0.5 * mosaic, uTurgor);

    vec3 fleshCol = mix(fleshDeep, fleshPale, grain);
    // Ruptured cells wet the surface, which darkens and saturates it.
    fleshCol = mix(fleshCol, fleshCol * vec3(0.86, 0.80, 0.66), uTurgor * 0.55);
    fleshCol *= 0.90 + 0.16 * (fbm(vWorldPos * 12.0 + 41.0, 2) * 0.5 + 0.5);

    // Vascular strands radiating from the core.
    float vein = smoothstep(0.86, 1.0, fbm(vWorldPos * vec3(5.0, 22.0, 5.0), 2) * 0.5 + 0.5);
    fleshCol = mix(fleshCol, vec3(0.741, 0.694, 0.545), vein * 0.5);

    // The peel, seen edge on. A real bitten apple shows a thin red line where
    // the skin meets the flesh; vFlesh is depth from that rim, so a hard
    // smoothstep over the first few percent gives exactly that band.
    float rim = 1.0 - smoothstep(0.0, 0.055, vFlesh);
    vec3 cutCol = mix(fleshCol, mix(skin, fleshCol, 0.35), rim);

    float isCut = step(0.5, vIsCut);
    csm_DiffuseColor = vec4(mix(skin, cutCol, isCut), 1.0);

    // Relief on the fracture faces. Without it they are flat polygons and read
    // as cardboard however good the colour is. The height field is the same
    // cell mosaic, so a mealy break is visibly bumpy — intact cells standing
    // proud of the surface — and a crisp one is nearly smooth.
    vec3 nrm = normalize(vWorldNormal);
    if (isCut > 0.5) {
      float relief = (1.0 - grain) * mix(1.0, 0.28, uTurgor)
                   + 0.35 * fbm(vWorldPos * 26.0 + 7.0, 2);
      vec3 dpx = dFdx(vWorldPos), dpy = dFdy(vWorldPos);
      float dhx = dFdx(relief), dhy = dFdy(relief);
      vec3 c1 = cross(dpy, nrm), c2 = cross(nrm, dpx);
      float det = dot(dpx, c1);
      vec3 grad = sign(det) * (dhx * c1 + dhy * c2);
      nrm = normalize(abs(det) * nrm - 0.0062 * grad);
      csm_FragNormal = normalize(mat3(viewMatrix) * nrm);
    }

    // ---- gloss -------------------------------------------------------------
    // Wet fracture faces are glossy; dry crumbly ones are not. This is the
    // single strongest read of the turgor difference at a glance.
    float skinRough = uAlpha;
    // Wet flesh has a broad soft sheen, not a lacquer. Pushed glossier it
    // stops looking wet and starts looking like crumpled foil.
    float cutRough = mix(0.94, 0.46, uTurgor) + (1.0 - uTurgor) * 0.20 * grain;
    csm_Roughness = clamp(mix(skinRough, cutRough, isCut), 0.05, 1.0);
    csm_Metalness = 0.0;
    csm_Clearcoat = uRhoS * (1.0 - isCut) + isCut * uTurgor * 0.16;
    csm_ClearcoatRoughness = clamp(uAlpha * 0.42 + isCut * 0.25, 0.02, 1.0);

    // Apple flesh is markedly translucent — a backlit slice glows. Kept on the
    // cut faces, where it does the most work.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - clamp(abs(dot(nrm, viewDir)), 0.0, 1.0), 2.6);
    csm_Emissive = mix(vec3(0.42, 0.055, 0.028) * 0.55,
                       vec3(0.52, 0.42, 0.22) * (0.35 + 0.5 * uTurgor), isCut) * fres;
  }
`

export const APPLE_BURST_DEFAULTS = {
  uBurst: 0,
  uTurgor: 1,
  uRhoS: 0.88,
  uAlpha: 0.26,
  uRipeness: 0.88,
  uBlush: 1.12,
  uSeed: 0.96,
}
