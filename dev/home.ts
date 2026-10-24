/* A development page (not part of the game or its build): one home seen from a corner, to judge it by eye.
   Open /dev/home.html?o=tajik (origin: moscow, region, tajik, student...) &h=rented|flat|village|house &reno=1 to see a renovated one. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as G from '../src/engine';
import '../src/content';
import { designOf, renovate } from '../src/homes';
import { buildRoom } from '../src/rooms3d';
import { moveTo } from '../src/housing';

const q = new URLSearchParams(location.search);
const s = G.newState('Walker', q.get('o') ?? 'moscow'); s.housing = q.get('h') ?? 'rented'; s.money = 1e7;
if (q.get('rent')) { s.job = 'courier'; moveTo(s, q.get('rent') as never); }      // &rent=kommunalka|khrush|studio|eurotwo|tworoom
if (q.get('reno')) { renovate(s, 'floor', 'checker'); renovate(s, 'wall', '#d6b97a'); renovate(s, 'light', 'shade'); renovate(s, 'windows', 'blinds'); }
const it = designOf(s);
document.getElementById('msg')!.textContent = `${it.title} (${it.w} x ${it.d} m)`;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#bfe3ff');
scene.add(new THREE.HemisphereLight('#ffffff', '#b8a680', 0.95)); const sun = new THREE.DirectionalLight('#fff3d8', 1.0); sun.position.set(8, 16, 10); sun.castShadow = true; scene.add(sun);
const slot = Number(q.get('slot') ?? 1); if (slot === 2) { scene.background = new THREE.Color('#2a3350'); sun.intensity = 0.25; (scene.children[0] as THREE.HemisphereLight).intensity = 0.45; }
const room = buildRoom(it, slot); scene.add(room.group);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 300); const R = Math.max(it.w, it.d);
camera.position.set(R * 0.9, R * 1.05, R * 1.25); const c = new OrbitControls(camera, renderer.domElement); c.target.set(0, 0.8, 0);
renderer.setAnimationLoop(() => { c.update(); renderer.render(scene, camera); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
