import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  site: 'https://dhimsky.github.io',
  base: '/aria',
  vite: { plugins: [tailwindcss()] },
});
