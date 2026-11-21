# ARIA Landing Page
Astro · Three.js (GLSL) · Lenis · Anime.js · Matter.js · Tailwind CSS v4

    npm install
    npm run dev      # http://localhost:4321
    npm run build

Edit konten di `src/data/site.js` (copy, FAQ, link CTA). Ganti `'#'` di `links` dengan URL asli
(dashboard, Telegram, GitHub, Health, HiveMind, Terms, Privacy, Risk Disclosure).

- `src/scripts/shaders.js`  GLSL: background aurora+grid kelap-kelip+genangan air, kaca cair huruf A (warnanya membaca background), tulisan ARIA
- `src/scripts/scene.js`    Three.js: bentuk A (Shape -> ExtrudeGeometry), teks ARIA, koreografi scroll
- `src/scripts/ui.js`       Anime.js (loader, reveal, counter, tab, FAQ)
- `src/scripts/audio.js`    musik ambient + efek suara (Web Audio, tanpa file); volume di MUSIC_VOL / SFX_VOL; tombol #sound-btn di header
- `src/scripts/lenis.js`    smooth scroll

## Data dummy / API
Panel Dashboard memakai data dummy (`src/data/dummy.js`) lewat `src/data/api.js`.
Saat API siap, cukup ganti isi `getView()` di `api.js` dengan `fetch(...)`.

## Catatan
- Tombol Join Telegram dikomentari di `src/pages/index.astro` (cari `Join Telegram`); hapus tanda komentar untuk mengaktifkan lagi.
- Chip teks jatuh (Matter.js) di footer/CTA sudah dihapus; paket `matter-js` di package.json boleh di-uninstall.
