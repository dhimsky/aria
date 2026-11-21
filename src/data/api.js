import { dummy } from './dummy.js';
// Satu pintu untuk semua data yang nantinya berasal dari API.
// TODO: ganti dengan fetch sungguhan, mis. `const r = await fetch(`${API_BASE}/dashboard/${slug}`); return r.json();`
export async function getView(name) {
  await new Promise((r) => setTimeout(r, 120)); // simulasi latensi jaringan
  return dummy[name] ?? { rows: [] };
}
