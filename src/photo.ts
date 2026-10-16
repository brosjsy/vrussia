/* Photo mode: the 3D view without the interface, a filter (film, snow, warm), a sticker and a small date stamp, saved as a PNG on the player's device.
   The filters are CSS filter strings, used both for the preview on screen and when the picture is drawn into the saved file. Nothing is uploaded. */
export type Filter = 'none' | 'film' | 'snow' | 'warm';
export const FILTERS: Record<Filter, string> = { none: 'none', film: 'sepia(0.35) contrast(1.1) saturate(0.8)', snow: 'brightness(1.12) saturate(0.65) hue-rotate(185deg) hue-rotate(-185deg)', warm: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)' };
export const STICKERS = ['', '🎄', '❄️', '❤️', '⭐', '🥞', '🌅'] as const;

/** Draws the final picture: the snapshot with the filter, the sticker in a corner and the caption at the bottom. Returns a PNG data address, or null
    when the browser cannot draw (then the plain snapshot can still be saved). */
export async function composePhoto(src: string, filter: Filter, sticker: string, caption: string, doc: Document = document): Promise<string | null> {
  const img = new Image(); img.src = src;
  try { await img.decode(); } catch { return null; }
  const c = doc.createElement('canvas'); c.width = img.naturalWidth || 1280; c.height = img.naturalHeight || 720;
  const g = c.getContext('2d'); if (!g) return null;
  g.filter = FILTERS[filter]; g.drawImage(img, 0, 0, c.width, c.height); g.filter = 'none';
  if (filter === 'film') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, c.width, c.height * 0.06); g.fillRect(0, c.height * 0.94, c.width, c.height * 0.06); }
  if (sticker) { g.font = `${Math.round(c.height * 0.12)}px serif`; g.textBaseline = 'top'; g.fillText(sticker, c.width * 0.03, c.height * 0.04); }
  if (caption) { const fs = Math.max(14, Math.round(c.height * 0.035)); g.font = `600 ${fs}px sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText(caption, c.width * 0.97 + 2, c.height * 0.96 + 2); g.fillStyle = '#ffffff'; g.fillText(caption, c.width * 0.97, c.height * 0.96); }
  try { return c.toDataURL('image/png'); } catch { return null; }
}
/** Saves a picture on the player's device. */
export function download(url: string, name: string, doc: Document = document): void { const a = doc.createElement('a'); a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove(); }
