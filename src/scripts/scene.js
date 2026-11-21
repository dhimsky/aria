import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import lenis from './lenis.js';
import { RIPPLES, BG_VERT, BG_FRAG, COPY_FRAG, TEXT_VERT, TEXT_FRAG, LOGO_VERT, LOGO_FRAG } from './shaders.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (x) => x * x * (3 - 2 * x);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() * 0.001;

/* ---------- Satu kanvas, dua tahap: (1) background dirender ke tekstur (resolusi adaptif), (2) background + teks ARIA + logo kaca digambar ke layar.
   Logo kaca membaca tekstur background itu, jadi warnanya selalu mengikuti background di belakangnya. ---------- */
const R = new THREE.WebGLRenderer({ canvas: $('bg'), antialias: true, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.autoClear = false;
const DPR = Math.min(devicePixelRatio || 1, 1.5);   // background HD: resolusi native (maks 1.5x), turun otomatis bila GPU lambat
let bgScale = innerWidth < 768 ? 0.7 : 1;
const bgRT = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });

const bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
const bgU = {
  uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(.5, .5) },
  uRip: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
  uCalm: { value: 0 }, uHue: { value: 0 }, uScroll: { value: 0 }, uPulse: { value: reduced ? 0 : 1 },
};
const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: bgU, depthTest: false, depthWrite: false }));
bgMesh.frustumCulled = false; bgScene.add(bgMesh);

const fgScene = new THREE.Scene();
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: COPY_FRAG, uniforms: { uBg: { value: bgRT.texture } }, depthTest: false, depthWrite: false }));
bgQuad.frustumCulled = false; bgQuad.renderOrder = -20; fgScene.add(bgQuad);
const camera = new THREE.PerspectiveCamera(55, 1, .1, 100);

/* ---------- Genangan air dari kursor (riak dikirim ke shader background lewat uRip) ---------- */
let ripIdx = 0;
function addRipple(cx, cy, strength = 1) {
  const asp = innerWidth / innerHeight;
  bgU.uRip.value[ripIdx].set((cx / innerWidth) * asp, 1 - cy / innerHeight, now(), strength);
  ripIdx = (ripIdx + 1) % RIPPLES;
}

/* ---------- Logo segitiga berlubang ----------
   Bentuk dibuat sendiri (Shape -> ExtrudeGeometry) karena three.js tidak punya bentuk liquid bawaan.
   Efek kaca/cair murni GLSL (LOGO_FRAG): normal bergelombang, pembiasan teks di belakang, dispersi warna, pantulan. */
const logo = new THREE.Group(); logo.position.z = -6; fgScene.add(logo);
let logoFit = 1;
const logoU = { uText: { value: null }, uBg: { value: bgRT.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uOpacity: { value: 1 }, uTextOn: { value: 1 } };

function buildA() {
  // segitiga dengan lubang segitiga di tengah, sudut dibulatkan
  const W = 4.8, H = 4.2, k = 0.4;
  const outer = [[0, H / 2], [-W / 2, -H / 2], [W / 2, -H / 2]];
  const cy = -H / 6;                                                         // titik berat
  const inner = outer.map(([x, y]) => [x * k, cy + (y - cy) * k]);
  const round = (path, pts, r) => {
    const n = pts.length;
    pts.forEach((p1, i) => {
      const p0 = pts[(i + n - 1) % n], p2 = pts[(i + 1) % n];
      const to = (q) => { const dx = q[0] - p1[0], dy = q[1] - p1[1], l = Math.hypot(dx, dy); return [p1[0] + dx / l * r, p1[1] + dy / l * r]; };
      const a = to(p0), b = to(p2);
      i === 0 ? path.moveTo(a[0], a[1]) : path.lineTo(a[0], a[1]);
      path.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
    });
    path.closePath();
  };
  const sh = new THREE.Shape(); round(sh, outer, 0.5);
  const hole = new THREE.Path(); round(hole, inner, 0.22); sh.holes.push(hole);
  let geo = new THREE.ExtrudeGeometry(sh, { depth: 0.8, curveSegments: 24, bevelEnabled: true, bevelThickness: 0.26, bevelSize: 0.2, bevelSegments: 10 });
  geo.center();
  geo = toCreasedNormals(geo, Math.PI / 3);
  const mk = (back) => new THREE.ShaderMaterial({
    vertexShader: LOGO_VERT, fragmentShader: LOGO_FRAG, transparent: true, depthWrite: false, depthTest: false,
    side: back ? THREE.BackSide : THREE.FrontSide, uniforms: { ...logoU, uBack: { value: back ? 1 : 0 } },
  });
  const bk = new THREE.Mesh(geo, mk(true)), fr = new THREE.Mesh(geo, mk(false));
  bk.renderOrder = -6; fr.renderOrder = -5; logo.add(bk, fr);
}
buildA();

// teks ARIA: kanvas 2D layar penuh -> tekstur -> quad di belakang logo (dibiaskan oleh kaca)
const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: TEXT_VERT, fragmentShader: TEXT_FRAG, transparent: true, depthTest: false, depthWrite: false, uniforms: { uText: logoU.uText, uOpacity: logoU.uTextOn } }));
textMesh.frustumCulled = false; textMesh.renderOrder = -10; fgScene.add(textMesh);

function buildText() {
  const k = Math.min(devicePixelRatio || 1, 1.5), W = Math.round(innerWidth * k), H = Math.round(innerHeight * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), font = (px) => `800 ${px}px Outfit, 'Helvetica Neue', Arial, sans-serif`;
  g.font = font(100);
  const w100 = g.measureText('ARIA').width;
  const fs = Math.min((W * (innerWidth < 768 ? 0.94 : 0.86) / w100) * 100, H * 0.6);
  g.font = font(fs); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const cap = g.measureText('ARIA').actualBoundingBoxAscent || fs * 0.7;
  g.fillText('ARIA', W / 2, H * 0.42 + cap / 2);                              // dinaikkan sedikit agar tidak bertabrakan dengan headline
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  logoU.uText.value?.dispose(); logoU.uText.value = tex;
}
document.fonts?.load('800 100px Outfit').then(buildText).catch(() => {});

/* ---------- Pointer ---------- */
const m = { x: innerWidth / 2, y: innerHeight / 2 }, ms = { x: .5, y: .5 };
let lastRip = { x: -999, y: -999, t: 0 }, lrx = 0, lry = 0, HP = 0;
addEventListener('pointermove', (e) => {
  m.x = e.clientX; m.y = e.clientY;
  if (reduced) return;
  const t = performance.now(), dist = Math.hypot(m.x - lastRip.x, m.y - lastRip.y), dt = t - lastRip.t;
  if (dist > 30 && dt > 85) { addRipple(m.x, m.y, clamp(.3 + (dist / Math.max(dt, 16)) * .4, .3, .85)); lastRip = { x: m.x, y: m.y, t }; }   // jejak genangan
}, { passive: true });
addEventListener('pointerdown', (e) => { if (!reduced) for (let i = 0; i < 2; i++) setTimeout(() => addRipple(e.clientX + (Math.random() - .5) * 14 * i, e.clientY + (Math.random() - .5) * 14 * i, 1.25 - i * .3), i * 150); });   // tetesan air

addEventListener('aria:drop', (e) => { if (!reduced) addRipple(e.detail.x * innerWidth, e.detail.y * innerHeight, 11.6); });   // tetesan 1 gelombang saat masuk halaman

function resize() {
  const w = Math.ceil(innerWidth * DPR * bgScale), h = Math.ceil(innerHeight * DPR * bgScale);
  bgRT.setSize(w, h); bgU.uRes.value.set(w, h);
  R.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  logoFit = clamp(camera.aspect * 0.95, .45, .9);
  R.getDrawingBufferSize(logoU.uRes.value);
  buildText();
}
addEventListener('resize', resize); resize();

/* ---------- Loop ---------- */
const heroUi = $('hero-ui'), ctaEl = $('cta'), ctaStage = $('cta-stage');
const lerp = (a, b, k) => a + (b - a) * k;
let CP = 0;   // 0..1: seberapa dekat halaman ke bagian CTA (logo pindah ke kanan)
let last = performance.now(), slow = 0;
function frame(time) {
  lenis.raf(time);
  const t = now(), dtMs = time - last; last = time;
  slow = dtMs > 36 ? slow + 1 : Math.max(0, slow - 1);                         // kualitas adaptif untuk GPU lambat
  if (slow > 50 && bgScale > .45) { bgScale = Math.max(.45, bgScale - .1); slow = 0; resize(); }

  const sy = lenis.scroll, vh = innerHeight;
  const page = clamp(sy / Math.max(1, document.documentElement.scrollHeight - vh));
  // hero di-pin PIN x tinggi layar: (1) teks memudar, (2) segitiga + tulisan ARIA saja, makin scroll makin berputar, (3) segitiga mengecil -> section berikutnya
  const PIN = 1.6, s = clamp(sy / (vh * PIN));                                  // harus sama dengan tinggi #hero = (1 + PIN) x 100svh
  HP += (sstep(clamp((s - .72) / .28)) - HP) * .1;                             // 0 = hero, 1 = konten

  // background: hidup di hero, lebih tenang di konten; warna bergeser sepanjang halaman
  bgU.uCalm.value += (.1 + .6 * HP - bgU.uCalm.value) * .06;
  bgU.uHue.value += (page * .55 - bgU.uHue.value) * .03;
  bgU.uTime.value = t; bgU.uScroll.value = sy * .002;
  ms.x += (m.x / innerWidth - ms.x) * .05; ms.y += (1 - m.y / innerHeight - ms.y) * .05; bgU.uMouse.value.set(ms.x, ms.y);

  // huruf A: besar & tegak di hero -> mengecil, memudar, melayang kiri/kanan di belakang konten sambil berputar mengikuti scroll
  const nx = m.x / innerWidth - .5, ny = m.y / innerHeight - .5;
  lrx += (-ny * .3 - lrx) * .06; lry += (nx * .6 - lry) * .06;
  const tOn = 1 - HP;
  logoU.uTextOn.value = tOn * tOn * (3 - 2 * tOn);
  logoU.uTime.value = t;
  // bagian CTA: logo kaca pindah ke kotak #cta-stage di sebelah kanan, ukurannya mengikuti kotak itu
  const cr = ctaEl.getBoundingClientRect();
  CP += (sstep(clamp((vh * .95 - cr.top) / (vh * .6))) - CP) * .12;
  let tx = 0, ty = 0, ts = 1;
  if (CP > .001) {
    const sr = ctaStage.getBoundingClientRect(), dist = 6, hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    tx = ((sr.left + sr.width / 2) / innerWidth - .5) * 2 * hh * camera.aspect;
    ty = -((sr.top + sr.height / 2) / vh - .5) * 2 * hh;
    ts = (Math.min(sr.width, sr.height) / vh * 2 * hh) / 5.2 * 1.02;
  }
  const drift = Math.sin(page * Math.PI * 5) * 2.4 * HP;
  const bx = drift * clamp(camera.aspect * .8, .3, 1), by = .5 * (1 - HP), bs = logoFit * (1 - .38 * HP);
  logoU.uOpacity.value = lerp(1 - .72 * HP, .97, CP);
  logo.position.set(lerp(bx, tx, CP), lerp(by, ty, CP), -6 - HP * 2.5 * (1 - CP));
  logo.scale.setScalar(lerp(bs, ts, CP));
  const raw = Math.min(sy, vh * PIN) * .0065 + Math.max(0, sy - vh * PIN) * .0022, front = Math.round(raw / (Math.PI * 2)) * Math.PI * 2;   // di CTA: berputar halus lalu menghadap depan
  logo.rotation.set(lrx + Math.sin(page * 9) * .3 * HP * (1 - CP), lry + Math.sin(t * .4) * .16 + lerp(raw, front, CP) + Math.sin(t * .6) * .35 * CP, 0);
  textMesh.visible = HP < .98;
  camera.rotation.y += (-nx * .12 - camera.rotation.y) * .05; camera.rotation.x += (-ny * .06 - camera.rotation.x) * .05;

  if (heroUi) { const o = clamp(1 - s / .15); heroUi.style.opacity = o; heroUi.style.visibility = o < .01 ? 'hidden' : 'visible'; }
  if (!document.hidden) {
    R.setRenderTarget(bgRT); R.clear(); R.render(bgScene, bgCam);      // 1) background -> tekstur
    R.setRenderTarget(null); R.clear(); R.render(fgScene, camera);     // 2) layar: background + teks + logo kaca
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
