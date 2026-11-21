/* ===========================================================
   GLSL — ditulis gaya WebGL1 (varying / gl_FragColor / texture2D); three.js otomatis menerjemahkan ke WebGL2.
   =========================================================== */

export const RIPPLES = 48; // jumlah riak air aktif maksimum (jejak kursor)

/* ---------- BACKGROUND: grid melengkung + aurora warna-warni kelap-kelip + genangan air ---------- */
export const BG_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const BG_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;        // 0..1 (halus)
uniform vec4  uRip[${RIPPLES}];   // xy = posisi (x*aspect, y), z = waktu lahir, w = kekuatan
uniform float uCalm;         // 0 = hero (paling hidup) .. 1 = section konten (lebih tenang)
uniform float uHue;          // geser warna (mengikuti kartu aktif)
uniform float uScroll;
uniform float uPulse;        // 1 = kelap-kelip aktif, 0 = mati (prefers-reduced-motion)

const vec3 C0 = vec3(0.13, 0.17, 1.00);   // indigo
const vec3 C1 = vec3(0.58, 0.22, 1.00);   // violet
const vec3 C2 = vec3(1.00, 0.26, 0.78);   // magenta
const vec3 C3 = vec3(0.10, 0.82, 1.00);   // cyan
const vec3 C4 = vec3(0.16, 0.44, 1.00);   // biru

vec3 pal(float t) {
  t = fract(t) * 5.0;
  vec3 c = mix(C0, C1, smoothstep(0.0, 1.0, t));
  c = mix(c, C2, smoothstep(1.0, 2.0, t));
  c = mix(c, C3, smoothstep(2.0, 3.0, t));
  c = mix(c, C4, smoothstep(3.0, 4.0, t));
  c = mix(c, C0, smoothstep(4.0, 5.0, t));
  return c;
}
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; }
  return v;
}

float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(11.7, 5.3); a *= 0.5; }
  return v;
}
// genangan air: tiap sentuhan kursor = kubah air kecil + cincin gelombang yang melebar dan memudar.
// grad = kemiringan permukaan (untuk pembiasan & kilau), wet = kebasahan (kilap genangan)
void water(vec2 p, out vec2 grad, out float wet) {
  grad = vec2(0.0); wet = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRip[i];
    float age = uTime - r.z;
    float sw = step(5.0, r.w);                          // strength >= 5 -> tetesan tunggal: SATU gelombang besar (loader -> halaman)
    float str = r.w - 10.0 * sw;
    if (str > 0.0 && age > 0.0 && age < 3.4) {
      vec2 d = p - r.xy;
      float life = 1.0 - age / 3.4;
      float fade = life * life * str;
      float front = 0.03 + age * (0.17 + 0.2 * sw);    // radius gelombang terdepan
      float w = (0.05 + age * 0.012) * (1.0 + 0.7 * sw); // lebar paket gelombang
      float lim = max(front + w * 2.6, 0.30);
      float d2 = dot(d, d);
      if (d2 < lim * lim) {
        float dist = sqrt(d2);
        // genangan: kubah lembut di titik jatuh
        float s = 0.010 + age * 0.004;
        float dome = exp(-d2 / s) * fade;
        wet += dome;
        grad += d * (-2.0 / s) * dome * 0.9;
        // cincin gelombang (sin teredam gaussian)
        float x = dist - front;
        if (abs(x) < w * 2.6) {
          float k = 62.0;
          float env = exp(-(x * x) / (w * w));
          float dh = (k * cos(k * x) - sin(k * x) * 2.0 * x / (w * w)) * env;
          float d1 = -2.0 * x / (w * w) * env * 0.5;                 // satu punggung gelombang saja, tanpa riak susulan
          dh = mix(dh, d1, sw);
          grad += (d / max(dist, 1e-4)) * dh * fade * (0.7 / (1.0 + front * 5.0));
        }
      }
    }
  }
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(vUv.x * asp, vUv.y);              // koordinat riak (sama dengan JS)
  vec2 gr; float wet; water(p, gr, wet);
  vec2 q = (vUv - 0.5) * vec2(asp, 1.0);
  float r2 = dot(q, q);
  vec2 qc = q * (1.0 - 0.32 * r2);                // lengkung cekung: tengah menggunduk ke BELAKANG
  qc -= gr * 0.0009;                              // refraksi: garis grid ikut bergelombang oleh air
  qc += (uMouse - 0.5) * 0.035;
  float t = uTime;
  float hueT = t * 0.035 + uHue;

  // aurora yang mengalir
  vec2 fp = qc * 1.45 + vec2(t * 0.040, -t * 0.028) + vec2(0.0, uScroll * 0.15);
  float n  = fbm(fp + fbm(fp * 1.3 + t * 0.05) * 0.9);
  float n2 = fbm(fp * 0.8 - vec2(t * 0.03, t * 0.02) + 4.0);
  float bA = smoothstep(0.30, 0.85, n), bB = smoothstep(0.36, 0.88, n2);
  // kelap-kelip lembut: periode 2.7 dtk & 2.3 dtk, fase beda tiap area (bukan kedip serentak), looping mulus
  float pA = 0.5 + 0.5 * sin(t * 6.28318 / 2.7 + n * 5.0);
  float pB = 0.5 + 0.5 * sin(t * 6.28318 / 2.3 + n2 * 5.0 + 1.7);
  bA *= mix(1.0, 0.62 + 0.75 * pA, uPulse);
  bB *= mix(1.0, 0.68 + 0.65 * pB, uPulse);
  float hs = 0.08 * sin(t * 6.28318 / 2.9 + n * 3.0) * uPulse;         // warna ikut bergeser, periode 2.9 dtk
  vec3 cA = pal(n * 0.55 + hueT + hs), cB = pal(n2 * 0.6 + hueT + 0.38 - hs);
  vec3 col = vec3(0.010, 0.012, 0.045);
  col += cA * bA * 1.35 + cB * bB * 0.95;

  // panel / grid
  float cell = 0.16;
  vec2 g = qc / cell;
  vec2 id = floor(g), f = fract(g);
  float pw = 1.4 / (cell * uRes.y);
  vec2 fw = max(fwidth(g), vec2(1e-5));                          // garis HD: anti-alias per piksel
  vec2 dl = min(f, 1.0 - f) / fw;
  float line = 1.0 - smoothstep(0.35, 1.25, min(dl.x, dl.y));
  float h = hash(id);
  float lit = step(0.5, h) * mix(0.7, 0.5 + 0.5 * sin(t * 2.4 + h * 40.0), uPulse);   // panel berkelip ~2.6 dtk
  float spk = pow(0.5 + 0.5 * sin(t * 2.1 + h * 91.0), 6.0) * step(0.88, h) * uPulse;   // beberapa panel berkilau
  vec3 tile = pal(h * 0.7 + hueT + 0.15) * lit * 0.85 * (0.30 + bA + bB * 0.8);
  col += tile + pal(h + hueT) * spk * 0.55;
  col *= mix(1.0, 0.32, step(h, 0.16));                         // beberapa panel gelap
  col += vec3(0.6, 0.7, 1.0) * line * (0.16 + 0.22 * (bA + bB));
  // tanda plus di sudut grid
  vec2 f2 = fract(g + 0.5) - 0.5;
  float plus = (step(abs(f2.x), pw) * step(abs(f2.y), 0.10) + step(abs(f2.y), pw) * step(abs(f2.x), 0.10)) * step(0.94, hash(floor(g + 0.5) + 3.7));
  col += vec3(0.8, 0.9, 1.0) * plus * 0.5;

  // air: kilau pada lereng gelombang, tepi cincin yang terang, dan kilap genangan
  vec3 nrm = normalize(vec3(-gr * 0.03, 1.0));
  vec3 Hh = normalize(normalize(vec3(-0.4, 0.55, 0.75)) + vec3(0.0, 0.0, 1.0));
  float spec = max(pow(max(dot(nrm, Hh), 0.0), 70.0) - 0.007, 0.0);
  col += vec3(0.75, 0.88, 1.0) * spec * 1.2;
  col += vec3(0.20, 0.38, 0.75) * clamp(length(gr) * 0.02, 0.0, 0.6) * 0.5;
  col += vec3(0.07, 0.12, 0.25) * clamp(wet, 0.0, 1.0);

  col *= mix(1.0, 0.52, uCalm);
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(lum), uCalm * 0.15);
  float vg = 1.0 - smoothstep(0.45, 1.2, length(q));
  col *= 0.30 + 0.70 * vg;
  col = 1.0 - exp(-col * 1.3);
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;     // dither: cegah banding
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- Salin hasil background (render target) ke layar ---------- */
export const COPY_FRAG = `
precision highp float;
uniform sampler2D uBg; varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(uBg, vUv).rgb, 1.0); }`;

/* ---------- HERO: tulisan ARIA (layar penuh) + logo "A" kaca cair ---------- */
// Tulisan digambar ke kanvas 2D (tekstur layar penuh). Dipakai dua kali: ditampilkan langsung, dan "dibiaskan" oleh logo kaca.
export const TEXT_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const TEXT_FRAG = `
precision highp float;
uniform sampler2D uText; uniform float uOpacity;
varying vec2 vUv;
void main() {
  float a = texture2D(uText, vUv).a * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(1.0, 1.0, 1.0, a);
}`;

export const LOGO_VERT = `
varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vP = position;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

export const LOGO_FRAG = `
precision highp float;
uniform sampler2D uText; uniform sampler2D uBg; uniform vec2 uRes;
uniform float uTime, uOpacity, uTextOn, uBack;
varying vec3 vN; varying vec3 vP; varying vec3 vV;

float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}

void main() {
  vec3 V = normalize(vV);
  vec3 n = normalize(vN);
  if (uBack > 0.5) n = -n;

  // permukaan "cair": normal diganggu noise yang bergerak pelan
  vec3 q = vP * 1.15; float t = uTime * 0.32;
  vec3 w = vec3(vn(q + vec3(t, 0.0, 0.0)), vn(q + vec3(0.0, t, 3.1)), vn(q + vec3(5.2, 1.3, t))) - 0.5;
  n = normalize(n + w * 0.4);
  // tekstur kaca: goresan halus + butiran (tetap tembus pandang)
  float g1 = vn(vP * vec3(7.0, 46.0, 7.0)), g2 = vn(vP * vec3(60.0));
  n = normalize(n + (vec3(g1, vn(vP * vec3(8.0, 50.0, 8.0) + 3.1), g2) - 0.5) * 0.22);

  float ndv = clamp(dot(n, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.4);
  vec2 uv = gl_FragCoord.xy / uRes;

  // kaca: warna diambil dari background di belakangnya (dibiaskan + dispersi), sedikit buram seperti kaca bertekstur
  vec2 off = n.xy * (0.04 + 0.07 * (1.0 - ndv));
  vec2 jit = (vec2(g1, g2) - 0.5) * 0.010;
  vec3 bgc = vec3(texture2D(uBg, uv - off + jit).r, texture2D(uBg, uv - off * 1.12 + jit).g, texture2D(uBg, uv - off * 1.26 + jit).b);
  vec2 o2 = uv - off * 0.7; float bl = 0.012;
  vec3 frost = (texture2D(uBg, o2 + vec2(bl, 0.0)).rgb + texture2D(uBg, o2 - vec2(bl, 0.0)).rgb + texture2D(uBg, o2 + vec2(0.0, bl)).rgb + texture2D(uBg, o2 - vec2(0.0, bl)).rgb) * 0.25;
  vec3 glass = mix(bgc, frost, 0.45);
  float lum = dot(glass, vec3(0.3, 0.59, 0.11));
  glass = mix(vec3(lum), glass, 1.3) * (0.95 + 0.25 * g1);

  // pantulan: ambil warna background juga (bukan warna tetap), kuat di tepi
  vec3 R = reflect(-V, n);
  vec3 rf = texture2D(uBg, clamp(uv + R.xy * 0.35, 0.0, 1.0)).rgb;
  vec3 refl = rf * (0.12 + 1.1 * fres);

  // kilau
  float s1 = pow(max(dot(R, normalize(vec3(-0.5, 0.8, 0.6))), 0.0), 55.0);
  float s2 = pow(max(dot(R, normalize(vec3(0.7, -0.4, 0.5))), 0.0), 38.0);
  vec3 spec = vec3(1.0) * s1 * 1.1 + vec3(0.8, 0.9, 1.0) * s2 * 0.7;

  // tulisan ARIA di belakang, dibiaskan
  vec3 refr = vec3(texture2D(uText, uv - off).a, texture2D(uText, uv - off * 1.14).a, texture2D(uText, uv - off * 1.3).a) * uTextOn;

  float gr = h3(vec3(gl_FragCoord.xy * 0.5, floor(uTime * 24.0)));
  vec3 col = glass + refl * 0.75 + spec * 0.85 + refr * 0.6 + (gr - 0.5) * 0.05;
  float rmax = max(refr.r, max(refr.g, refr.b));
  float a = clamp(0.9 + fres * 0.1 + rmax * 0.2, 0.0, 1.0);
  if (uBack > 0.5) { col *= 0.8; a *= 0.6; }
  a *= uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);
}`;
