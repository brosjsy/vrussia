/* The player's settings, kept on this device: the graphics level (low, medium, high), a frame rate cap (30 or 60), colours that people with colour
   blindness can tell apart on the meters, and less motion. Reading never fails: a broken or blocked storage gives the defaults, and a weak device
   starts on low. Pure apart from the storage. */
export type Graphics = 'low' | 'medium' | 'high';
export interface Settings { graphics: Graphics; fps: 30 | 60; colourSafe: boolean; lessMotion: boolean }
const KEY = 'vrussia_settings';
/** The defaults: low graphics on a device that looks weak (few processor cores or little memory), medium otherwise; less motion if the system asks. */
export function defaults(nav: { hardwareConcurrency?: number; deviceMemory?: number } = typeof navigator !== 'undefined' ? navigator as never : {}, reduce = false): Settings {
  const weak = (nav.hardwareConcurrency ?? 8) <= 2 || ((nav as { deviceMemory?: number }).deviceMemory ?? 8) <= 2;
  return { graphics: weak ? 'low' : 'medium', fps: weak ? 30 : 60, colourSafe: false, lessMotion: reduce };
}
export function load(storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null, base: Settings = defaults()): Settings {
  try {
    const o = JSON.parse(storage?.getItem(KEY) ?? '{}') as Partial<Settings>;
    return { graphics: o.graphics === 'low' || o.graphics === 'medium' || o.graphics === 'high' ? o.graphics : base.graphics, fps: o.fps === 30 || o.fps === 60 ? o.fps : base.fps, colourSafe: typeof o.colourSafe === 'boolean' ? o.colourSafe : base.colourSafe, lessMotion: typeof o.lessMotion === 'boolean' ? o.lessMotion : base.lessMotion };
  } catch { return base; }
}
export function save(s: Settings, storage: Pick<Storage, 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null): void { try { storage?.setItem(KEY, JSON.stringify(s)); } catch { /* storage may be blocked */ } }
/** The meter colours: green, amber, red as usual; blue, orange and purple for colour-safe mode (told apart by people with red-green colour blindness). */
export const meterColours = (safe: boolean): [string, string, string] => (safe ? ['#2f6fd6', '#e69f00', '#7b3294'] : ['#3ec27a', '#f0b43c', '#e0373f']);
/** The keys of the game: what each does. */
export const HOTKEYS: [string, string][] = [['W A S D', 'walk (or the arrow keys); at a door a button goes in'], ['R', 'turn the view'], ['B', 'buy mode (at home) or the shop'], ['M', 'the metro map'], ['P', 'the phone'], ['H', 'hide or show the interface'], ['F', 'photo mode'], ['1–9', 'choose an option'], ['Enter', 'continue'], ['Esc', 'close a pop-up']];
