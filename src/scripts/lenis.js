import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
lenis.stop(); // dijalankan lagi setelah loader selesai (ui.js)
export default lenis;
