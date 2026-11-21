/* ===========================================================
   Audio — musik ambient + efek suara UI, semuanya dibuat langsung oleh Web Audio API (tanpa file audio).
   - Default: menyala. Browser memblokir suara sebelum ada interaksi, jadi musik otomatis mulai
     begitu pengunjung pertama kali klik / tap / menekan tombol (aturan browser, tidak bisa dilewati).
   - Tombol #sound-btn di header: nyala / mati. Pilihan "mati" diingat (localStorage).
   =========================================================== */
const KEY = 'aria-sound';
const MUSIC_VOL = 0.5;      // volume musik (0..1)  <- kecilkan kalau terlalu keras
const SFX_VOL = 0.8;        // volume efek suara

let wantOn = true;
try { wantOn = localStorage.getItem(KEY) !== 'off'; } catch {}

const AC = window.AudioContext || window.webkitAudioContext;
let ctx, master, musicBus, sfxBus, noiseBuf, musicOn = false, chordT = 0, sparkT = 0, chordI = 0;

function init() {
  if (ctx || !AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = 0; master.connect(comp); comp.connect(ctx.destination);
  // reverb sederhana: noise yang meluruh
  const len = Math.floor(ctx.sampleRate * 2.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.3 * MUSIC_VOL; musicBus.connect(master); musicBus.connect(verb);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9 * SFX_VOL; sfxBus.connect(master);
  const send = ctx.createGain(); send.gain.value = 0.4; sfxBus.connect(send); send.connect(verb);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  ctx.onstatechange = sync;
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const running = () => !!ctx && ctx.state === 'running';
const ramp = (v, s = 0.6) => { if (!master) return; const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(v, t, s / 3); };

/* ---------- Musik: pad lembut berganti akor tiap 8 dtk + lonceng pentatonik jarang ---------- */
const CHORDS = [[45, 52, 55, 59, 60], [41, 48, 52, 57, 60], [48, 55, 59, 62, 64], [43, 50, 52, 57, 62]];   // Am9 · Fmaj7 · Cmaj9 · G6/9
const PENT = [69, 72, 74, 76, 79, 81, 84];

function pad(m, t, dur) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 2.4); g.gain.setValueAtTime(0.05, t + dur - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 3);
  lp.connect(g); g.connect(musicBus);
  [['sine', -5], ['triangle', 6]].forEach(([type, det]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(m); o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 3.2);
  });
}
function bell(m, t, vol, bus = musicBus) {
  const f = mtof(m);
  [[1, 1], [2.01, 0.28], [3.98, 0.1]].forEach(([k, a]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * k;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * a, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / k + 0.3);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 3);
  });
}
function chord() {
  if (!musicOn) return;
  if (!running()) { chordT = setTimeout(chord, 500); return; }   // tab disembunyikan / konteks ditunda: coba lagi nanti
  const t = ctx.currentTime + 0.05, ch = CHORDS[chordI++ % CHORDS.length];
  ch.forEach((m, i) => pad(m, t + i * 0.12, 8));
  chordT = setTimeout(chord, 8000);
}
function sparkle() {
  if (!musicOn) return;
  if (!running()) { sparkT = setTimeout(sparkle, 700); return; }
  bell(PENT[Math.floor(Math.random() * PENT.length)], ctx.currentTime + 0.02, 0.11);
  sparkT = setTimeout(sparkle, 2600 + Math.random() * 3200);
}
function startMusic() { if (musicOn) return; musicOn = true; chord(); sparkT = setTimeout(sparkle, 2500); }
function stopMusic() { musicOn = false; clearTimeout(chordT); clearTimeout(sparkT); }

/* ---------- Efek suara (tipis & pendek) ---------- */
const can = () => wantOn && running();
function blip(f, dur, vol, type = 'sine', to, delay = 0) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
}
let lastTick = 0, lastDrop = 0;
export const sfx = {
  tick() { const n = performance.now(); if (!can() || n - lastTick < 70) return; lastTick = n; blip(1900, 0.06, 0.03, 'sine', 2300); },
  click() { if (!can()) return; blip(520, 0.12, 0.07, 'sine', 780); blip(1040, 0.08, 0.025, 'sine', 1300, 0.02); },
  drop() { const n = performance.now(); if (!can() || n - lastDrop < 90) return; lastDrop = n; blip(1200, 0.18, 0.08, 'sine', 260); blip(720, 0.14, 0.03, 'sine', 210, 0.09); },   // tetesan air
  chime(i = 0) { if (!can()) return; bell(PENT[((i % PENT.length) + PENT.length) % PENT.length] - 12, ctx.currentTime + 0.01, 0.07, sfxBus); },
  whoosh() {
    if (!can()) return; const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 1.1);
  },
};

/* ---------- Tombol header + sinkronisasi status ---------- */
const btn = document.getElementById('sound-btn'), hint = document.getElementById('loader-hint');
function ui() {
  const state = !wantOn ? 'off' : (running() || document.hidden ? 'on' : 'pending');
  if (btn) {
    btn.dataset.state = state; btn.setAttribute('aria-pressed', String(wantOn));
    btn.setAttribute('aria-label', wantOn ? 'Matikan musik' : 'Nyalakan musik');
    btn.title = state === 'off' ? 'Sound off' : state === 'pending' ? 'Klik di mana saja untuk memulai suara' : 'Sound on';
  }
  if (hint && (state !== 'pending')) hint.style.display = 'none';
}
function sync() {
  if (ctx && wantOn && running()) { ramp(1); startMusic(); }
  ui();
}
function setOn(on) {
  wantOn = on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
  init(); if (!ctx) return ui();
  if (on) { ctx.resume().catch(() => {}); sync(); if (running()) sfx.chime(2); }
  else { ramp(0, 0.4); stopMusic(); setTimeout(() => { if (!wantOn && ctx.state === 'running') ctx.suspend(); }, 700); ui(); }
}
btn?.addEventListener('click', () => setOn(!wantOn));

/* ---------- Buka kunci audio pada interaksi pertama + efek suara global ---------- */
const unlock = (e) => {
  if (e.target.closest?.('#sound-btn')) return;
  if (wantOn) { init(); if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
};
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { passive: true, capture: true }));

const INTERACTIVE = 'a, button, [role="tab"]';
let lastHover = null;
addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest?.(INTERACTIVE);
  if (el !== lastHover) { lastHover = el; if (el && !el.closest('#sound-btn')) sfx.tick(); }
}, { passive: true });
addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('#sound-btn')) return;
  e.target.closest?.(INTERACTIVE) ? sfx.click() : sfx.drop();
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { if (ctx.state === 'running') ctx.suspend(); } else if (wantOn) ctx.resume().catch(() => {});
});

if (wantOn) { init(); ctx?.resume().catch(() => {}); }   // coba langsung menyala; kalau diblokir browser, mulai di interaksi pertama
ui();
