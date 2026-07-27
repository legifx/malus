import { GLSL_NOISE } from './glslNoise'

/**
 * The equatorial cut.
 *
 * Everything here is drawn in polar coordinates on a flat disc: flesh, the
 * vascular ring, five carpels with their papery lining and seeds, and the
 * figure that connects the carpel tips.
 *
 * The five-fold arrangement is the fruit's own: a pome carries five carpels,
 * and cutting across the equator is the only way to see them. The figure they
 * describe is a regular pentagram, in which the ratio of a diagonal to a side
 * is exactly the golden ratio — that is provable geometry, not a claim about
 * the world, which is why the act is allowed to say it out loud.
 */

export const cutFaceVertex = /* glsl */ `
  varying vec2 vP;
  varying vec3 vWorldPos;
  void main() {
    // The disc is built in the XY plane and laid flat by the mesh rotation, so
    // the local position is already the polar plane we want.
    vP = position.xy;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const cutFaceFragment = /* glsl */ `
  varying vec2 vP;
  varying vec3 vWorldPos;

  uniform float uRadius;    // outer radius of the cut, in local units
  uniform float uFigure;    // 0..1, how much of the pentagram has been drawn
  uniform float uBrown;     // 0 = fresh, 1 = fully oxidised (act V borrows this)
  uniform float uSeed;
  uniform vec3  uFleshPale;
  uniform vec3  uFleshDeep;

  ${GLSL_NOISE}

  const float TAU5 = 1.2566370614;  // 2π/5

  vec2 carpelTip(int k) {
    float a = float(k) * TAU5 - 1.5707963;
    return vec2(cos(a), sin(a)) * 0.52;
  }

  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec2 p = vP / max(uRadius, 1e-4);   // normalised: 1.0 at the skin
    float r = length(p);
    if (r > 1.0) discard;

    float ang = atan(p.y, p.x);

    // ---- flesh -------------------------------------------------------------
    float cd = cellular(vec3(p * 26.0, uSeed * 12.0));
    float grain = smoothstep(0.02, 0.30, cd);
    vec3 col = mix(uFleshDeep, uFleshPale, grain);
    col *= 0.92 + 0.14 * (fbm(vec3(p * 9.0, uSeed), 2) * 0.5 + 0.5);

    // Flesh is denser and paler just under the skin, looser toward the core.
    col = mix(col * 0.93, col * 1.06, smoothstep(0.35, 0.95, r));

    // ---- vascular ring -----------------------------------------------------
    // The faint ring of bundles you can see in any cut apple, ten of them,
    // sitting between the core and the skin.
    float ringA = mod(ang + 3.14159265, TAU5 * 0.5);
    float ringD = min(ringA, TAU5 * 0.5 - ringA) * 0.62;
    float ring = (1.0 - smoothstep(0.0, 0.055, length(vec2(ringD, r - 0.615))));
    // Plus the faint line the bundles trace between them.
    float ringLine = (1.0 - smoothstep(0.010, 0.030, abs(r - 0.615))) * 0.30;
    col = mix(col, vec3(0.478, 0.416, 0.290), clamp(ring * 0.85 + ringLine, 0.0, 1.0));

    // ---- carpels -----------------------------------------------------------
    float carpel = 0.0, lining = 0.0, seedM = 0.0;
    for (int k = 0; k < 5; k++) {
      float a = float(k) * TAU5 - 1.5707963;
      vec2 d = vec2(cos(a), sin(a));
      vec2 n = vec2(-d.y, d.x);
      float x = dot(p, d) - 0.30;   // radial offset from the chamber centre
      float y = dot(p, n);

      float u = x / 0.235;
      // Parabolic half-width: full in the middle, coming to a point at each
      // end. An ellipse would give rounded ends and the star would not close.
      float halfW = 0.098 * max(0.0, 1.0 - u * u);
      float inner = max(abs(y) / max(halfW, 1e-4), abs(u));
      carpel = max(carpel, 1.0 - smoothstep(0.88, 1.02, inner));
      lining = max(lining, (1.0 - smoothstep(0.72, 1.06, inner)) * smoothstep(0.55, 1.0, inner));

      // Seeds: two per chamber, tucked toward the core end, teardrop-ish.
      for (int j = 0; j < 2; j++) {
        float off = (float(j) - 0.5) * 0.105;
        vec2 c = d * (0.30 - 0.055) + n * off;
        vec2 q = p - c;
        float qx = dot(q, d) * 1.55, qy = dot(q, n) * 2.5;
        // Squeeze one end so it reads as a pip rather than a bead.
        qx *= 1.0 + 0.9 * smoothstep(0.0, 0.06, dot(q, d));
        seedM = max(seedM, 1.0 - smoothstep(0.034, 0.048, length(vec2(qx, qy))));
      }
    }

    // Chamber cavity: darker, and slightly translucent where the lining is.
    // The chamber is a cavity, so it has to read as darker and deeper than the
    // flesh, with the papery carpel wall catching light at its edge.
    col = mix(col, vec3(0.310, 0.267, 0.184), carpel * 0.92);
    col = mix(col, vec3(0.949, 0.918, 0.812), lining * 0.85);
    col = mix(col, vec3(0.216, 0.129, 0.075), seedM);

    // ---- skin rim ----------------------------------------------------------
    float rim = smoothstep(0.955, 0.998, r);
    col = mix(col, vec3(0.451, 0.086, 0.078), rim);

    // ---- oxidation ---------------------------------------------------------
    // Act V drives uBrown. Browning starts at the cut and at wounds, so it
    // rides the same grain field the flesh does.
    float bias = 0.55 + 0.45 * (fbm(vec3(p * 5.5, uSeed + 4.0), 3) * 0.5 + 0.5);
    float brown = clamp(uBrown * 1.35 - (1.0 - bias) * 0.5, 0.0, 1.0);
    col = mix(col, mix(vec3(0.478, 0.361, 0.216), vec3(0.278, 0.180, 0.106), brown), brown * 0.9);

    // ---- the figure --------------------------------------------------------
    // Drawn segment by segment, connecting every second carpel tip. Five
    // strokes, and it closes exactly — which is the whole point.
    float fig = 0.0;
    for (int i = 0; i < 5; i++) {
      float t0 = float(i) / 5.0;
      float prog = clamp((uFigure - t0) * 5.0, 0.0, 1.0);
      if (prog <= 0.0) continue;
      vec2 a = carpelTip(i);
      vec2 b = carpelTip(int(mod(float(i) + 2.0, 5.0)));
      float dseg = segDist(p, a, mix(a, b, prog));
      fig = max(fig, 1.0 - smoothstep(0.0016, 0.0052, dseg));
    }
    // Warm and thin. A thick white stroke turns a botanical fact into a slide.
    col += vec3(1.0, 0.82, 0.52) * fig * 0.72 * uFigure;

    csm_DiffuseColor = vec4(col, 1.0);
    csm_Roughness = clamp(0.62 - 0.22 * carpel + 0.20 * brown, 0.08, 1.0);
    csm_Metalness = 0.0;
    // A cut face is wet. It dulls as it oxidises.
    csm_Clearcoat = 0.30 * (1.0 - brown);
    csm_ClearcoatRoughness = 0.42;
    csm_Emissive = vec3(1.0, 0.82, 0.52) * fig * 0.42;
  }
`

export const CUT_FACE_DEFAULTS = {
  uRadius: 1.0,
  uFigure: 0,
  uBrown: 0,
  uSeed: 0.7,
}
