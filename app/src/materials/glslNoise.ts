/**
 * Shared GLSL noise. Written from the definitions rather than pulled from a
 * library so the project carries no third-party obligation for it — which
 * matters here, because the hackathon requires rights to every included asset
 * and this whole piece is built out of generated content.
 */
export const GLSL_NOISE = /* glsl */ `
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

  /** Distance to the nearest cell centre — a mosaic of cells, not a pattern. */
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

  /** Rodrigues rotation. Used to spin fragments about their own centre. */
  vec3 rotAxis(vec3 v, vec3 axis, float a) {
    float c = cos(a), s = sin(a);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }
`
