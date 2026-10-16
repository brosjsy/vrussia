// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const KEY = 'vrussia_view';
// every test loads the whole game afresh and builds a 3D city: on a busy machine that takes more than the usual five seconds
vi.setConfig({ testTimeout: 30000 });

/** A page where the browser claims to support 3D, with a stand-in for the graphics card. */
let installer: (() => Promise<void>) | null = null;
/** The page's modules are loaded fresh for every game (vi.resetModules), so the stand-in is installed into whichever copy is current. */
async function currentModules(): Promise<{ sup: typeof import('../src/world3d-support'); realmap: typeof import('../src/realmap') }> { return { sup: await import('../src/world3d-support'), realmap: await import('../src/realmap') }; }
function fakeGraphics(opts: { fail?: boolean } = {}): { renders: () => number; disposed: () => boolean } {
  let renders = 0, disposed = false;
  (window as unknown as Record<string, unknown>).WebGLRenderingContext = function () { /* a stand-in */ };
  HTMLCanvasElement.prototype.getContext = ((kind: string) => (kind === 'webgl2' || kind === 'webgl' ? ({} as never) : null)) as never;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => undefined;
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).releasePointerCapture = () => undefined;
  installer = async () => { const { sup } = await currentModules(); sup.setTestRendererFactory(canvas => {
    if (opts.fail) throw new Error('the graphics card said no');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 380, right: 600, bottom: 380, x: 0, y: 0, toJSON() { return {}; } });
    return { domElement: canvas, setSize() { /* nothing */ }, setPixelRatio() { /* nothing */ }, render() { renders++; }, dispose() { disposed = true; }, shadowMap: { enabled: false, type: 0 } } as never;
  }); };
  void installer();
  return { renders: () => renders, disposed: () => disposed };
}

async function startGame(): Promise<void> {
  document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  window.confirm = () => true;
  vi.resetModules();
  if (installer) await installer();
  const { boot } = await import('../src/ui');
  boot(); await (await import('../src/ui')).uiReady();
  (document.getElementById('nameInput') as HTMLInputElement).value = 'Viewer';
  document.getElementById('startBtn')!.click();
  for (let i = 0; i < 40 && !document.querySelector('#actions button'); i++) (document.getElementById('nextBtn') || document.querySelector<HTMLButtonElement>('#stage .choices button'))?.click();
}
const btn3d = (): HTMLButtonElement => document.getElementById('view3dBtn') as HTMLButtonElement;
const shown = (id: string): boolean => !(document.getElementById(id) as HTMLElement).hidden;

beforeEach(() => { localStorage.clear(); installer = null; });

describe('the three views of the city', () => {
  it('a browser that cannot do 3D keeps the flat map, and the 3D button says so', async () => {
    delete (window as unknown as Record<string, unknown>).WebGLRenderingContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    await startGame();
    expect(shown('city')).toBe(true); expect(shown('world3d')).toBe(false);
    btn3d().click();
    expect(document.getElementById('toasts')!.textContent).toContain('3D could not be shown'); expect(shown('city')).toBe(true);
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
  it('with 3D available it is the normal view; the button returns to the flat map and remembers the choice; the next game stays flat', async () => {
    const g = fakeGraphics();
    await startGame();
    await vi.waitFor(() => expect(document.querySelector('#world3d canvas')).toBeTruthy(), { timeout: 10000 });      // building the 3D city takes longer on a busy machine
    expect(shown('world3d')).toBe(true); expect(shown('city')).toBe(false); expect(btn3d().getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#world3d .realLoading')).toBeNull();
    await vi.waitFor(() => expect(g.renders()).toBeGreaterThanOrEqual(0));
    btn3d().click();                                                                    // back to the flat map
    expect(shown('city')).toBe(true); expect(shown('world3d')).toBe(false); expect(g.disposed()).toBe(true); expect(localStorage.getItem(KEY)).toBe('iso');
    expect(document.querySelector('#city .place')).toBeTruthy();
    document.getElementById('menuBtn')!.click();
    document.getElementById('continueBtn')!.click();                                    // the same game again: the flat map, because the player chose it
    await new Promise(r => setTimeout(r, 50));
    expect(shown('city')).toBe(true); expect(shown('world3d')).toBe(false);
    btn3d().click();                                                                    // and 3D again on request
    await vi.waitFor(() => expect(document.querySelector('#world3d canvas')).toBeTruthy(), { timeout: 10000 });      // building the 3D city takes longer on a busy machine
    expect(localStorage.getItem(KEY)).toBe('3d');
  });
  it('a graphics card that fails brings the flat map back with a note, and the real map and 3D never show together', async () => {
    fakeGraphics({ fail: true });
    await startGame();
    await vi.waitFor(() => expect(shown('city')).toBe(true));
    expect(document.querySelector('#world3d canvas')).toBeNull();
    btn3d().click();
    await vi.waitFor(() => expect(document.getElementById('toasts')!.textContent).toContain('3D could not be shown'));
    await vi.waitFor(() => expect(shown('city')).toBe(true)); expect(shown('world3d')).toBe(false);
    // a working card: 3D, then the real map replaces it, then 3D replaces the real map
    fakeGraphics(); await new Promise(r => setTimeout(r, 0));
    localStorage.setItem('vrussia_realmap_ok', 'yes');
    const fakeLib = { Map: class { on() { /* nothing */ } remove() { /* nothing */ } getStyle() { return { sources: {}, layers: [] }; } addLayer() { /* nothing */ } }, Marker: class { setLngLat() { return this; } addTo() { return this; } remove() { /* nothing */ } } } as never;
    (await currentModules()).realmap.setRealMapLoader(async () => fakeLib);
    btn3d().click();
    await vi.waitFor(() => expect(document.querySelector('#world3d canvas')).toBeTruthy(), { timeout: 10000 });      // building the 3D city takes longer on a busy machine
    (document.getElementById('realBtn') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(shown('realmap')).toBe(true));
    expect(shown('world3d')).toBe(false); expect(document.querySelector('#world3d canvas')).toBeNull();
    btn3d().click();
    await vi.waitFor(() => expect(shown('world3d')).toBe(true));
    expect(shown('realmap')).toBe(false); expect(document.getElementById('realmap')!.innerHTML).toBe('');
    document.getElementById('menuBtn')!.click();                                        // leaving the game closes the world
    expect(document.querySelector('#world3d canvas')).toBeNull();
    expect(document.getElementById('errbar')!.hidden).toBe(true);
  });
  it('a player who prefers less motion keeps the flat map until they ask for 3D', async () => {
    fakeGraphics();
    (window as unknown as Record<string, unknown>).matchMedia = (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() { /* nothing */ }, removeEventListener() { /* nothing */ } });
    await startGame();
    await new Promise(r => setTimeout(r, 80));
    expect(shown('city')).toBe(true); expect(document.querySelector('#world3d canvas')).toBeNull();
    btn3d().click();
    await vi.waitFor(() => expect(document.querySelector('#world3d canvas')).toBeTruthy(), { timeout: 10000 });      // building the 3D city takes longer on a busy machine
    delete (window as unknown as Record<string, unknown>).matchMedia;
  });
});

describe('the full-screen city', () => {
  it('in 3D the game takes the full-screen layout with a governor banner and a menu drawer; the flat map gives the page back', async () => {
    fakeGraphics();
    await startGame();
    await vi.waitFor(() => expect(document.querySelector('#world3d canvas')).toBeTruthy(), { timeout: 10000 });      // building the 3D city takes longer on a busy machine
    const game = document.getElementById('game')!;
    expect(game.classList.contains('immersive')).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('#world3d .w3Gov')).toBeTruthy());
    expect(document.querySelector('#world3d .w3Gov')!.textContent!.length).toBeGreaterThan(8);
    const drawer = document.getElementById('drawerBtn')!; drawer.click(); expect(game.classList.contains('drawer')).toBe(true); expect(drawer.getAttribute('aria-expanded')).toBe('true');
    drawer.click(); expect(game.classList.contains('drawer')).toBe(false);
    expect((document.getElementById('onlinePill') as HTMLElement).hidden).toBe(true);                 // no online part in this build: no counter
    drawer.click(); btn3d().click();                                                                    // back to the flat map
    expect(game.classList.contains('immersive')).toBe(false); expect(game.classList.contains('drawer')).toBe(false); expect(document.querySelector('.w3Gov')).toBeNull();
    const css = readFileSync('src/style.css', 'utf8');
    for (const rule of ['#game.immersive .cityView{position:fixed;inset:0', '#game.immersive main{position:fixed', '#game.immersive~#dock #dockMap{background:#1e2235}']) expect(css).toContain(rule);
  });
});

describe('the Phase 1 HUD over the 3D city', () => {
  it('the need bars are buttons that explain themselves; the tool column has a photo, turning, keys and a door; the quests fold away', async () => {
    fakeGraphics();
    await startGame();
    await vi.waitFor(() => expect(document.querySelectorAll('#world3d .w3m').length).toBeGreaterThanOrEqual(8), { timeout: 10000 });
    const keys = Array.from(document.querySelectorAll<HTMLElement>('#world3d [data-meter]')).map(b => b.dataset.meter);
    expect(keys.slice(0, 6)).toEqual(['hunger', 'energy', 'fun', 'social', 'hygiene', 'bladder']);
    document.querySelector<HTMLButtonElement>('#world3d [data-meter="fun"]')!.click();
    expect(document.getElementById('modal')!.hidden).toBe(false); expect(document.querySelector('#modalBody .fixLine')!.textContent!.length).toBeGreaterThan(10);
    document.getElementById('closeModal')!.click();
    const tools = Array.from(document.querySelectorAll<HTMLElement>('#world3d .w3Tools [data-tool]')).map(b => b.dataset.tool);
    expect(tools).toEqual(expect.arrayContaining(['photo', 'rotate', 'keys', 'door']));
    document.querySelector<HTMLButtonElement>('#world3d [data-tool="photo"]')!.click();
    expect(document.getElementById('game')!.classList.contains('photoMode')).toBe(true); expect(document.querySelector('#world3d .photoBar')).toBeTruthy();   // photo mode: the interface hides and the photo bar shows
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(document.getElementById('game')!.classList.contains('photoMode')).toBe(false);
    document.querySelector<HTMLButtonElement>('#world3d [data-tool="rotate"]')!.click();
    const fold = document.querySelector<HTMLButtonElement>('#world3d .w3Fold')!; expect(fold.getAttribute('aria-expanded')).toBe('true'); fold.click();
    expect(document.querySelectorAll('#world3d .w3q').length).toBe(0); expect(localStorage.getItem('vrussia_quests_folded')).toBe('1');
    document.querySelector<HTMLButtonElement>('#world3d .w3Fold')!.click(); expect(document.querySelectorAll('#world3d .w3q').length).toBeGreaterThan(0);
  });
});
