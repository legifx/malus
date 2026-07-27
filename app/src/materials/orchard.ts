import { GLSL_NOISE } from './glslNoise'

/**
 * The orchard.
 *
 * Thousands of apples, and every one of them a different apple.
 *
 * That is not decoration. An apple grown from seed is never its parent — the
 * species is famously heterozygous, so each pip is a genuinely new individual.
 * The only way a named variety persists is by grafting: every tree of it is a
 * cutting of one original. So the field has to be visibly, individually varied
 * — a thousand copies of the same fruit tinted differently would be arguing the
 * opposite of what the act says.
 *
 * Everything varies from one per-instance seed: ground colour, how far the
 * blush wrapped, how striped it is, how ripe, how lopsided. Cheap by design —
 * this shades up to twelve thousand instances.
 *
 * uDark drives the second half. Each instance carries its own moment of going
 * out, and a few never do.
 */

export const orchardVertex = /* glsl */ `
  attribute vec3 aSphere;
  attribute float aSeed;

  varying vec3 vSphere;
  varying float vSeed;
  varying vec3 vWorldNormal;

  void main() {
    vSphere = aSphere;
    vSeed = aSeed;
    // Position is left alone: three already applies instanceMatrix on an
    // InstancedMesh, so overriding clip space here would only duplicate it.
    vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  }
`

export const orchardFragment = /* glsl */ `
  varying vec3 vSphere;
  varying float vSeed;
  varying vec3 vWorldNormal;

  uniform float uDark;      // 0 = the whole orchard lit, 1 = all but a few gone
  uniform vec3  uSunDir;

  ${GLSL_NOISE}

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    return fract(p * (p + p));
  }

  void main() {
    vec3 s = normalize(vSphere);

    // --- this apple's identity ----------------------------------------------
    float gRipe   = hash11(vSeed * 1.7 + 0.11);
    float gBlush  = hash11(vSeed * 3.1 + 0.37);
    float gStripe = hash11(vSeed * 5.3 + 0.61);
    float gHue    = hash11(vSeed * 7.9 + 0.83);
    float gDeath  = hash11(vSeed * 11.3 + 0.29);

    // Ground colour runs green through gold; the reds run crimson through
    // near-black. Real cultivars occupy that whole space, so this one should.
    vec3 ground = mix(vec3(0.243, 0.310, 0.106), vec3(0.745, 0.647, 0.286),
                      clamp(gRipe * 1.15, 0.0, 1.0));
    vec3 blush = mix(vec3(0.729, 0.216, 0.098), vec3(0.325, 0.035, 0.075), gHue);

    float sun = dot(s, normalize(uSunDir)) * 0.5 + 0.5;
    float patchy = fbm(s * 1.9 + vSeed * 13.0, 2) * 0.5 + 0.5;
    float cover = smoothstep(0.10, 0.85, pow(sun, 1.05) * (0.45 + 0.85 * patchy) * (0.25 + 1.35 * gBlush));

    // Azimuth changes arbitrarily fast near the poles, so a high-frequency
    // stripe aliases into speckle there. Lower frequency, gentler warp, and
    // faded out toward both ends where the coordinate breaks down.
    float az = atan(s.z, s.x);
    float poleFade = 1.0 - smoothstep(0.55, 0.95, abs(s.y));
    float stripe = smoothstep(0.25, 0.85, sin(az * 9.0 + fbm(s * 2.2 + vSeed, 2) * 4.5)) * poleFade;
    stripe *= smoothstep(0.05, 0.35, cover) * (1.0 - smoothstep(0.75, 1.0, cover));
    cover = clamp(cover + stripe * gStripe * 0.5, 0.0, 1.0);

    vec3 col = mix(ground, blush, cover);
    col *= 0.86 + 0.24 * (fbm(s * 6.0 + vSeed * 2.0, 2) * 0.5 + 0.5);

    // --- going out ----------------------------------------------------------
    // Each fruit has its own moment. A handful never reach it — the ones that
    // were kept, or found again.
    float survivor = step(0.965, hash11(vSeed * 17.7 + 0.5));
    float dead = smoothstep(gDeath - 0.05, gDeath + 0.05, uDark) * (1.0 - survivor);

    // Colour drains before the light does, so the field greys out rather than
    // simply switching off.
    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey * 0.16), dead);

    csm_DiffuseColor = vec4(col, 1.0);
    csm_Roughness = mix(0.30, 0.86, dead);
    csm_Metalness = 0.0;
    // The survivors hold a little warmth of their own once the rest is dark.
    csm_Emissive = blush * 0.05 * survivor * smoothstep(0.35, 1.0, uDark);
  }
`

export const ORCHARD_DEFAULTS = {
  uDark: 0,
}
