/**
 * Apple skin.
 *
 * The three exposed gloss parameters are not arbitrary shader knobs. Neurons in
 * the monkey inferior temporal cortex are selectively tuned to gloss along
 * exactly three physical reflectance parameters — specular reflectance (rhoS),
 * diffuse reflectance (rhoD) and the spread of the specular lobe (alpha) — and
 * the population's tuning is biased toward *increasing* gloss.
 *   research/papers/gloss-perception-.../2012-neural-selectivity-and...md
 *   research/papers/gloss-perception-.../2014-perceptual-gloss-param...md
 *
 * So act II drives these three, by name, instead of "roughness/metalness".
 * The bias toward more gloss is our licence to push slightly past the physical
 * measurement without it reading as fake.
 *
 * The wax is a real layer, not a stylisation: the fruit cuticle is an active
 * organ that deactivates UV radiation non-radiatively — it converts sunlight
 * into heat rather than damage.
 *   research/papers/fruit-cuticle-.../2022-radiationless-mechanis...md
 *   research/papers/fruit-cuticle-.../2019-shelf-life-potential-a...md
 */

export const appleSkinVertex = /* glsl */ `
  attribute vec3 aSphere;
  attribute float aCavity;

  varying vec3 vSphere;
  varying float vCavity;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vSphere = aSphere;
    vCavity = aCavity;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
  }
`

export const appleSkinFragment = /* glsl */ `
  varying vec3 vSphere;
  varying float vCavity;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  // --- the three gloss axes -------------------------------------------------
  uniform float uRhoS;    // specular reflectance
  uniform float uRhoD;    // diffuse reflectance
  uniform float uAlpha;   // spread of the specular lobe (0 = mirror, 1 = wide)

  // --- appearance -----------------------------------------------------------
  uniform float uRipeness;    // 0 = green and unripe, 1 = deep red
  uniform float uBlush;       // strength of the sun-facing red blush
  uniform vec3  uSunDir;      // which side of the fruit faced the sun
  uniform float uStripes;     // varietal striping strength
  uniform float uLenticels;   // density of the pale surface pores
  uniform float uRusset;      // brown corky texture, mostly in the cavities
  uniform float uWetness;     // 0 = dry, 1 = just washed
  uniform float uBump;          // strength of the surface relief
  uniform float uDetail;        // multiplies every procedural frequency
  uniform float uTranslucency;  // warm bleed of light through the skin
  uniform float uSeed;

  // Gradient noise. Written out rather than imported so the whole surface is
  // one self-contained, licence-free unit.
  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
  }

  float gnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
              dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
          mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
              dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
              dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
          mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
              dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
      u.z);
  }

  float fbm(vec3 p, int oct) {
    float s = 0.0, a = 0.5, n = 0.0;
    for (int i = 0; i < 5; i++) {
      if (i >= oct) break;
      s += a * gnoise(p);
      n += a;
      a *= 0.5;
      p *= 2.03;
    }
    return s / n;
  }

  // Cellular distance field — lenticels are scattered pores, not a pattern.
  float cellular(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    float md = 1.0;
    for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
    for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = hash33(i + g) * 0.5 + 0.5;
      md = min(md, length(g + o - f));
    }
    return md;
  }

  void main() {
    vec3 s = normalize(vSphere);
    // uDetail scales the whole procedural field at once. Act II moves the
    // camera in close, and detail tuned for a whole fruit becomes invisible
    // under magnification — the frequencies have to come with it.
    vec3 sp = (s + vec3(uSeed)) * uDetail;

    // --- ground colour -------------------------------------------------------
    // The red of an apple is an anthocyanin blush laid OVER a yellow-green
    // ground colour — it is not a gradient between green and red. Modelling it
    // as a gradient is what makes procedural fruit look like a peach.
    float groundVar = fbm(sp * 2.1 + 17.0, 3) * 0.5 + 0.5;
    vec3 ground = mix(vec3(0.259, 0.310, 0.118),
                      vec3(0.706, 0.647, 0.318),
                      clamp(uRipeness * (0.45 + 0.60 * groundVar), 0.0, 1.0));

    // --- blush coverage ------------------------------------------------------
    // Anthocyanin production is light-driven, so coverage follows the side that
    // faced the sun, broken up by the shade of leaves and neighbouring fruit.
    // On a well-exposed fruit the blush wraps most of the way round; only the
    // shaded cheek keeps its ground colour.
    float sun = dot(s, normalize(uSunDir)) * 0.5 + 0.5;
    float patchy = fbm(sp * 1.55 + 3.0, 4) * 0.5 + 0.5;
    float cover = smoothstep(0.02, 0.74, pow(sun, 0.95) * (0.58 + 0.72 * patchy) * uBlush);

    // --- varietal striping ---------------------------------------------------
    // Stripes run stem-to-blossom and only exist where there is blush to stripe.
    // Warped, irregular width — an even sine reads as a beach ball.
    float az = atan(s.z, s.x);
    float warp = fbm(sp * vec3(3.2, 0.9, 3.2) + 41.0, 3);
    float stripe = sin(az * 17.0 + warp * 9.5 + s.y * 2.2);
    stripe = smoothstep(0.10, 0.78, stripe);
    // Striping is a BAND phenomenon: invisible on bare ground colour, and
    // invisible again once the blush is solid. It lives in the transition,
    // which is exactly the zone that looks airbrushed without it.
    stripe *= smoothstep(0.04, 0.32, cover) * (1.0 - smoothstep(0.70, 1.0, cover));
    stripe *= 0.40 + 0.60 * (fbm(sp * vec3(1.1, 0.4, 1.1) + 11.0, 2) * 0.5 + 0.5);
    cover = clamp(cover + stripe * uStripes * 0.62, 0.0, 1.0);

    // --- blush colour --------------------------------------------------------
    // Deeper coverage goes darker and bluer, not simply more saturated.
    float depth_ = smoothstep(0.45, 1.0, cover);
    vec3 blushCol = mix(vec3(0.678, 0.180, 0.114), vec3(0.310, 0.047, 0.063), depth_);
    // Blotching. An evenly saturated red is the difference between fruit and
    // lacquer — pigment never lays down uniformly.
    float mottle = fbm(sp * 5.2 + 29.0, 3) * 0.5 + 0.5;
    blushCol *= 0.78 + 0.38 * mottle;
    vec3 base = mix(ground, blushCol, cover);

    // --- lenticels -----------------------------------------------------------
    // The pores an apple breathes through. Pale, small, sparse, and denser
    // toward the blossom end. They should read as freckles you notice on the
    // second look, never as a speckle pattern.
    float cell = cellular(sp * 15.0);
    float dot_ = 1.0 - smoothstep(0.020, 0.105, cell);
    float dens = mix(0.5, 1.0, smoothstep(0.4, -0.8, s.y));
    float pores = dot_ * dens * uLenticels;
    // Pale on red skin, barely there on the ground colour — the pore is the
    // fruit's own tissue showing through the pigment.
    vec3 poreCol = mix(vec3(0.86, 0.80, 0.62), vec3(0.94, 0.88, 0.70), cover);
    base = mix(base, poreCol, pores * 0.42);

    // --- cavities ------------------------------------------------------------
    // Both wells are darker, and russeting starts there.
    float cav = smoothstep(0.15, 0.95, vCavity);
    vec3 russet = vec3(0.322, 0.208, 0.129);
    float russetMask = cav * uRusset * (0.45 + 0.55 * (fbm(sp * 9.0 + 5.0, 3) * 0.5 + 0.5));
    base = mix(base, russet, clamp(russetMask, 0.0, 1.0));
    base *= 1.0 - cav * 0.42;

    // --- microscopic surface variation --------------------------------------
    base *= 0.955 + 0.09 * (fbm(sp * 13.0, 2) * 0.5 + 0.5);

    csm_DiffuseColor = vec4(base * uRhoD, 1.0);

    // --- surface relief ------------------------------------------------------
    // The single biggest realism lever. A real apple's reflections wobble as
    // they travel across the skin, because the skin is very slightly uneven.
    // Perfectly clean highlight arcs are the strongest "this is CG" signal
    // there is, and no amount of roughness variation removes them — only a
    // perturbed normal does.
    //
    // Derivative-based bump mapping, so the relief needs no UVs or tangents:
    // the height gradient is recovered from screen-space derivatives of the
    // height field and of world position.
    // Broad and shallow. The relief must only ever be visible as a wobble in
    // the edge of a travelling highlight — the moment it becomes readable as
    // texture, the fruit turns into an orange.
    float relief = 0.70 * fbm(sp * 3.4 + 60.0, 3)
                 + 0.20 * fbm(sp * 8.5 + 12.0, 2)
                 - 0.25 * pores;              // lenticels are shallow pits

    vec3 nrm = normalize(vWorldNormal);
    vec3 dpx = dFdx(vWorldPos);
    vec3 dpy = dFdy(vWorldPos);
    float dhx = dFdx(relief);
    float dhy = dFdy(relief);
    vec3 c1 = cross(dpy, nrm);
    vec3 c2 = cross(nrm, dpx);
    float det = dot(dpx, c1);
    vec3 grad = sign(det) * (dhx * c1 + dhy * c2);
    vec3 bumped = normalize(abs(det) * nrm - uBump * grad);
    // csm_FragNormal is the fragment-stage normal and lives in view space
    // (csm_Normal is the vertex-stage one and is not declared here).
    csm_FragNormal = normalize(mat3(viewMatrix) * bumped);

    // --- gloss ---------------------------------------------------------------
    // alpha is the spread of the specular lobe; roughness is exactly that.
    // Cavities are matte, lenticels break the highlight, water widens it.
    float rough = uAlpha;
    rough += cav * 0.30;
    rough += pores * 0.22;
    rough -= uWetness * 0.16;
    rough += 0.06 * fbm(sp * 15.0 + 21.0, 2);
    csm_Roughness = clamp(rough, 0.035, 1.0);
    csm_Metalness = 0.0;

    // The cuticle: a thin dielectric layer over the pigmented tissue. Wax is
    // smoother than the flesh beneath it, which is what makes an apple read as
    // "waxed" rather than "shiny plastic".
    csm_Clearcoat = clamp(uRhoS * (1.0 - cav * 0.7), 0.0, 1.0);
    csm_ClearcoatRoughness = clamp(uAlpha * 0.42 - uWetness * 0.12, 0.02, 1.0);

    // --- translucency ---------------------------------------------------------
    // Gloss and translucency are separate perceptual channels: light
    // transmission changes the glossiness cues rather than replacing them, and
    // opaque appearance models are known to fall short on translucent material.
    //   research/papers/subsurface-scattering-.../2020-survey-of-models-for-a...md
    // The skin is thin over wet tissue, so grazing angles pick up a warm bleed.
    // Kept low: at full strength this reads as a halo, not as flesh.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - clamp(abs(dot(nrm, viewDir)), 0.0, 1.0), 3.2);
    csm_Emissive = vec3(0.42, 0.055, 0.028) * fres * uTranslucency * (0.35 + 0.65 * cover);
  }
`

export const APPLE_SKIN_DEFAULTS = {
  uRhoS: 0.88,
  uRhoD: 1.0,
  uAlpha: 0.26,
  uRipeness: 0.88,
  uBlush: 1.12,
  uStripes: 0.70,
  uLenticels: 0.85,
  uRusset: 0.55,
  uWetness: 0.15,
  uBump: 0.006,
  uDetail: 1.0,
  uTranslucency: 0.55,
  uSeed: 0.0,
}
