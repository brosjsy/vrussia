/* People as pictures, everywhere in the game: the same 3D person model (characters3d.ts) is drawn once into a small picture and shown in the
   creator, the header, the shop, dating, the phone, the flat map and the real map. The pictures are made when the device can draw 3D; until
   then (and wherever 3D is not possible) the flat drawn portrait from avatar.ts is shown, so nothing is ever missing.
   This file is small and light; the 3D part (portraits3d.ts) is loaded on demand together with the 3D library. */
import { avatarSvg, bodySvg, normalizeLook } from './avatar';
import type { Worn } from './avatar';
import { supportsWebGL } from './world3d-support';

export type FigureKind = 'bust' | 'body';
const urls = new Map<string, string>();
const keyOf = (kind: FigureKind, look: unknown, worn: Worn): string => kind + JSON.stringify(normalizeLook(look)) + JSON.stringify(worn ?? {});
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const attr = (t: string): string => t.replace(/[&<>"']/g, ch => ESC[ch]);
const altOf = (title: string): string => (title ? ` alt="${attr(title)}"` : ' alt="" aria-hidden="true"');

/** The picture is remembered once made, so later drawings of the same person are instant and do not flicker. */
export const cachedFigure = (kind: FigureKind, look: unknown, worn: Worn = {}): string | undefined => urls.get(keyOf(kind, look, worn));
export const rememberFigure = (kind: FigureKind, look: unknown, worn: Worn, url: string): void => { urls.set(keyOf(kind, look, worn), url); };
export const clearFigures = (): void => urls.clear();

const dataOf = (kind: FigureKind, look: unknown, worn: Worn, title: string): string =>
  `data-fig="${kind}" data-look="${attr(JSON.stringify(look ?? {}))}" data-worn="${attr(JSON.stringify(worn ?? {}))}" data-title="${attr(title)}"`;

/** A head-and-shoulders picture, as HTML for an element's innerHTML. Call upgradeFigures(parent) afterwards. */
export function bustHtml(look: unknown, worn: Worn = {}, title = 'Portrait'): string {
  const url = cachedFigure('bust', look, worn);
  const inner = url ? `<img class="avatar-svg fig3dimg" src="${url}"${altOf(title)}>` : avatarSvg(look, worn, title);
  return `<span class="fig" ${dataOf('bust', look, worn, title)}${url ? ' data-done="1"' : ''}>${inner}</span>`;
}
/** The whole person, as HTML. */
export function bodyHtml(look: unknown, worn: Worn = {}, title = 'Character'): string {
  const url = cachedFigure('body', look, worn);
  const inner = url ? `<img class="avatar-svg body fig3dimg" src="${url}"${altOf(title)}>` : bodySvg(look, worn, title);
  return `<span class="fig" ${dataOf('body', look, worn, title)}${url ? ' data-done="1"' : ''}>${inner}</span>`;
}
const SHADOW = '<ellipse cx="50" cy="196" rx="22" ry="3" fill="#0003"/>';
/** The whole person inside a flat SVG picture (the city map): the 100 x 200 box with the feet on y = 196. `flat` is the drawn fallback. */
export function bodyInSvg(look: unknown, worn: Worn, flat: string): string {
  const url = cachedFigure('body', look, worn);
  if (url) return `<g class="fig" data-done="1">${SHADOW}<image href="${url}" x="0" y="0" width="100" height="200"/></g>`;
  return `<g class="fig" ${dataOf('body', look, worn, '')}>${flat}</g>`;
}

let loading: Promise<typeof import('./portraits3d')> | null = null;
/** Turns the flat fallbacks inside `root` into 3D pictures (when the device can do 3D). Safe to call any number of times. */
export async function upgradeFigures(root: ParentNode): Promise<void> {
  const todo = Array.from(root.querySelectorAll<Element>('[data-fig]:not([data-done])'));
  if (!todo.length || !supportsWebGL()) return;
  let lib: typeof import('./portraits3d');
  try { lib = await (loading ??= import('./portraits3d')); } catch { loading = null; return; }
  for (const el of todo) {
    if (!el.isConnected || el.getAttribute('data-done')) continue;
    try {
      const kind = el.getAttribute('data-fig') as FigureKind, look = JSON.parse(el.getAttribute('data-look') ?? '{}'), worn = JSON.parse(el.getAttribute('data-worn') ?? '{}') as Worn, title = el.getAttribute('data-title') ?? '';
      let url = cachedFigure(kind, look, worn);
      if (!url) { url = lib.renderFigure(kind, look, worn); rememberFigure(kind, look, worn, url); }
      if (el instanceof SVGElement) el.innerHTML = `${SHADOW}<image href="${url}" x="0" y="0" width="100" height="200"/>`;
      else el.innerHTML = `<img class="avatar-svg${kind === 'body' ? ' body' : ''} fig3dimg" src="${url}"${altOf(title)}>`;
      el.setAttribute('data-done', '1');
    } catch { /* the flat picture stays */ }
  }
}
