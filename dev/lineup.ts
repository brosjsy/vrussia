/* A development page (not part of the game or its build): a row of people seen close up, front and back, to judge the 3D models by eye.
   Open /dev/lineup.html while `npm run dev` is running. Add ?pose=walk|talk|idle and ?a=<angle in degrees> to look from another side. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCharacter, setPose, CHAR_SCALE } from '../src/characters3d';
import { GROUPS, lookFromSeed, wornFor } from '../src/avatar';
import type { Pose } from '../src/characters3d';

const q = new URLSearchParams(location.search);
const pose = (q.get('pose') ?? 'idle') as Pose, angle = Number(q.get('a') ?? 20) * Math.PI / 180;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#bfe3ff');
scene.add(new THREE.HemisphereLight('#ffffff', '#8aa070', 0.9)); const sun = new THREE.DirectionalLight('#ffffff', 1.1); sun.position.set(6, 10, 8); sun.castShadow = true; scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#9fb88a' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const people: ReturnType<typeof buildCharacter>[] = [];
const ids = GROUPS.map(g => g.id);
const n = Math.min(8, Number(q.get('n') ?? 6));
for (let i = 0; i < n; i++) {
  const g = ids[i % ids.length], female = i % 2 === 1, seed = `lineup${i}`;
  const c = buildCharacter(lookFromSeed(seed, { group: g, female, beardable: !female }), wornFor(seed, g, female, 4));
  c.root.position.set((i - (n - 1) / 2) * 1.6 * CHAR_SCALE, 0, 0); scene.add(c.root); people.push(c);
}
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 200);
const span = n * 1.6 * CHAR_SCALE;
camera.position.set(Math.sin(angle) * span * 0.9, 2.6, Math.cos(angle) * span * 0.9); 
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1.6, 0);
let t = 0;
renderer.setAnimationLoop(() => { t += 0.016; people.forEach((c, i) => setPose(c, pose, t * 5 + i, t + i)); controls.update(); renderer.render(scene, camera); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
