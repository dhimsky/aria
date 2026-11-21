import { animate, stagger } from 'animejs';
import lenis from './lenis.js';
import { getView } from '../data/api.js';
import { sfx } from './audio.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
history.scrollRestoration = 'manual'; scrollTo(0, 0);

/* ---------- Loader (Anime.js) -> Lenis aktif -> intro hero ---------- */
const loader = $('#loader'), prog = { v: 0 };
const drawEls = $$('#loader [data-draw]'), fadeEls = $$('#loader [data-fade]');
drawEls.forEach((el) => { if (!el.getAttribute('stroke-dasharray')) { el.style.strokeDasharray = '1'; el.style.strokeDashoffset = '1'; } });
fadeEls.forEach((el) => (el.style.opacity = '0'));
animate(prog, {
  v: 100, duration: reduced ? 1 : 3000, ease: 'inOutSine',
  onUpdate: () => {
    $('#load-n').textContent = Math.round(prog.v); $('#load-bar').style.transform = `scaleX(${prog.v / 100})`;
    const p = prog.v / 100, win = (el) => clamp((p - +el.dataset.s) / (+el.dataset.e - +el.dataset.s));
    drawEls.forEach((el) => { el.style.strokeDashoffset = String(1 - win(el)); });
    fadeEls.forEach((el) => { el.style.opacity = String(win(el)); });
  },
  onComplete: () => { if (!reduced) { dispatchEvent(new CustomEvent('aria:drop', { detail: { x: .5, y: .5 } })); sfx.drop(); } animate(loader, {
    opacity: 0, duration: reduced ? 1 : 900, delay: reduced ? 0 : 250, ease: 'outQuad',
    onComplete: () => { loader.style.display = 'none'; lenis.start(); sfx.whoosh(); animate('[data-in]', { opacity: [0, 1], translateY: [28, 0], delay: stagger(110), duration: 1000, ease: 'outExpo' }); },
  }); },
});

/* ---------- Navigasi: scroll halus Lenis, menu mobile, link aktif ---------- */
const menu = $('#menu'), menuBtn = $('#menu-btn');
const setMenu = (open) => { menu.classList.toggle('hidden', !open); menu.classList.toggle('flex', open); menuBtn.textContent = open ? 'Close' : 'Menu'; menuBtn.setAttribute('aria-expanded', open); open ? lenis.stop() : lenis.start(); };
menuBtn.addEventListener('click', () => setMenu(menu.classList.contains('hidden')));
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll]'); if (!a) return;
  e.preventDefault();
  if (!menu.classList.contains('hidden')) setMenu(false);
  const id = a.dataset.scroll;
  lenis.scrollTo(id === 'top' ? 0 : '#' + id, { duration: 1.6 });
});
const sections = ['features', 'how-it-works', 'protection', 'dashboard', 'faq'].map((id) => $('#' + id));
const links = $$('[data-nav]');
function markActive() {
  const cur = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= innerHeight * .35 && r.bottom > innerHeight * .35; });
  links.forEach((l) => l.classList.toggle('active', !!cur && l.dataset.nav === cur.id));
}

/* ---------- Reveal + counter (Anime.js) ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  const el = en.target; io.unobserve(el);
  if (el.hasAttribute('data-reveal')) animate(el, { opacity: [0, 1], translateY: [34, 0], duration: reduced ? 1 : 1000, ease: 'outExpo' });
  const c = el.querySelector('[data-count]');
  if (c) { const o = { v: 0 }; animate(o, { v: +c.dataset.count, duration: reduced ? 1 : 1600, ease: 'outExpo', onUpdate: () => (c.textContent = Math.round(o.v)) }); }
}), { threshold: .15 });
$$('[data-reveal]').forEach((el) => io.observe(el));

/* ---------- Spotlight kartu ---------- */
$$('[data-spot]').forEach((el) => el.addEventListener('pointermove', (e) => {
  const r = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
}));

/* ---------- How it works: sticky, dikendalikan progres scroll ---------- */
const hw = $('[data-hw]');
let hwCur = -1;
function hwUpdate() {
  if (!hw) return;
  const r = hw.getBoundingClientRect(), steps = JSON.parse(hw.dataset.steps);
  const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
  $('[data-hw-arc]').style.strokeDashoffset = String(1 - p);
  $('[data-hw-orbit]').style.transform = `rotate(${p * 360}deg)`;
  const i = Math.min(steps.length - 1, Math.floor(p * steps.length));
  if (i === hwCur) return;
  hwCur = i; sfx.chime(i);
  $('[data-hw-idx]').textContent = `${pad(i + 1)} / ${pad(steps.length)}`;
  $('[data-hw-title]').textContent = steps[i][0]; $('[data-hw-text]').textContent = steps[i][1]; $('[data-hw-center]').textContent = steps[i][0];
  $$('[data-hw-node]').forEach((n, k) => n.classList.toggle('on', k <= i));
  $$('[data-hw-lab]').forEach((n, k) => n.classList.toggle('on', k === i));
  animate('[data-hw-copy] > *', { opacity: [0, 1], translateY: [18, 0], delay: stagger(70), duration: reduced ? 1 : 700, ease: 'outExpo' });
}
lenis.on('scroll', () => { hwUpdate(); markActive(); });
hwUpdate();

/* ---------- Dashboard: tab 11 view ---------- */
const dash = $('#dashboard'), views = JSON.parse(dash.dataset.views), tabs = $$('[data-tab]');
const bars = $$('[data-d-bars] i');
const tone = (v) => (/passed|running|online|^ok$|done|in range|^\+|active/i.test(v) ? 'text-[#5ce08a]' : /failed|out of|^-|unavailable/i.test(v) ? 'text-[#ff7a85]' : 'text-white/55');
const body = $('[data-d-body]'), barsBox = $('[data-d-bars]');
let viewTok = 0;
function renderBody(d) {
  const kpis = d.kpis ? `<div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr))]">${d.kpis.map(([l, v]) => `<div class="rounded-lg border border-white/10 bg-white/5 p-3"><p class="mono text-[.62rem] tracking-wider text-white/45">${l.toUpperCase()}</p><p class="mt-1 text-xl">${v}</p></div>`).join('')}</div>` : '';
  const rows = d.rows?.length ? `<ul class="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">${d.rows.map(([a, b, c]) => `<li class="grid grid-cols-[1fr_1.2fr_auto] items-center gap-3 px-4 py-2.5 text-sm"><span>${a}</span><span class="text-white/55">${b}</span><span class="mono text-xs ${tone(c)}">${c}</span></li>`).join('')}</ul>` : '';
  body.innerHTML = kpis + rows;
}
async function showView(i, first) {
  const tok = ++viewTok;
  tabs.forEach((t, k) => t.classList.toggle('on', k === i)); tabs[i].setAttribute('aria-selected', 'true');
  $('[data-d-title]').textContent = views[i][0]; $('[data-d-text]').textContent = views[i][1];
  $('[data-d-idx]').textContent = `VIEW ${pad(i + 1)} / ${pad(views.length)}`; $('[data-d-path]').textContent = `aria / ${views[i][0].toLowerCase().replace(' ', '-')}`;
  const d = await getView(views[i][0]);               // data dummy dulu; nanti dari API
  if (tok !== viewTok) return;
  renderBody(d); barsBox.style.display = d.chart ? '' : 'none';
  if (first) { bars.forEach((b, k) => (b.style.transform = `scaleY(${.2 + .8 * Math.abs(Math.sin(k * 1.7))})`)); return; }
  animate('[data-d-title], [data-d-text], [data-d-body] > *', { opacity: [0, 1], translateY: [16, 0], delay: stagger(70), duration: reduced ? 1 : 600, ease: 'outExpo' });
  if (d.chart) bars.forEach((b, k) => animate(b, { scaleY: [0.05, .2 + .8 * Math.abs(Math.sin(k * 1.7 + i * 2.3))], delay: k * 16, duration: reduced ? 1 : 800, ease: 'outExpo' }));
}
tabs.forEach((t, i) => t.addEventListener('click', () => { sfx.chime(i); showView(i); }));
showView(0, true);

/* ---------- FAQ accordion (kolom kanan) + kartu pendamping di kolom kiri ---------- */
const faqQ = $$('.faq-q'), faqTitle = $('[data-faq-title]'), faqIdx = $('[data-faq-idx]'), faqBar = $('[data-faq-bar]');
const faqSync = (i) => { faqTitle.textContent = faqQ[i].dataset.q; faqIdx.textContent = pad(i + 1); faqBar.style.transform = `scaleX(${(i + 1) / faqQ.length})`; };
faqQ.forEach((q, i) => q.addEventListener('click', () => {
  const open = q.getAttribute('aria-expanded') === 'true', a = $('#' + q.getAttribute('aria-controls'));
  if (!open) { $$('.faq-q[aria-expanded="true"]').forEach((o) => o !== q && o.click()); faqSync(i); sfx.chime(i); }
  q.setAttribute('aria-expanded', String(!open));
  const h = a.scrollHeight;
  animate(a, { height: open ? [h, 0] : [0, h], duration: reduced ? 1 : 450, ease: 'outExpo', onComplete: () => { a.style.height = open ? '0px' : 'auto'; } });
}));
if (faqQ[0]) { faqQ[0].setAttribute('aria-expanded', 'true'); $('#' + faqQ[0].getAttribute('aria-controls')).style.height = 'auto'; faqSync(0); }   // pertanyaan pertama terbuka
