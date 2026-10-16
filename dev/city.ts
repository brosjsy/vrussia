/* A development page (not part of the game or its build): the 3D city full screen, with the real houses of ?city=Moscow loaded, to judge it by eye.
   Open /dev/city.html?city=Kazan while `npm run dev` is running. ?zoom=1 pulls the camera out as far as it goes. */
import * as G from '../src/engine';
import '../src/content';
import { mountWorld3d } from '../src/world3d';
import { loadBuildings } from '../src/osm';

const q = new URLSearchParams(location.search), city = q.get('city') ?? 'Moscow';
const s = G.newState('Walker', 'moscow'); s.city = city; s.queue = []; s.day = 4; s.slot = 1;
const msg = document.getElementById('msg') as HTMLElement;
const h = await mountWorld3d({ host: document.getElementById('host') as HTMLElement, s, onPlace: () => undefined, onNpc: () => undefined, onFail: m => { msg.textContent = 'failed: ' + m; } });
try { const c = await loadBuildings(city); h.setRealBuildings(c); msg.textContent = `${city}: ${c.buildings.length} real buildings, ${Object.keys(c.anchors).length} places on real buildings`; } catch (e) { msg.textContent = String((e as Error).message); }
if (q.get('zoom')) { const c = document.querySelector('canvas') as HTMLCanvasElement; for (let i = 0; i < 40; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, bubbles: true, cancelable: true })); }
if (q.get('top')) { const p = h.player(), low = q.get('top') === '2'; h.camera.position.set(p.x + 5, 4 + (low ? 55 : 100), p.z + (low ? 100 : 60)); h.tick(0.05); }
