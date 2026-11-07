/* The shareable result card: a 1200 x 630 picture (the size social sites show) with the player's result. Nothing is uploaded: the picture is
   drawn on the device and saved as a PNG file, or the player copies the text. `cardSpec` is the plain data and is tested; `drawCard` draws it. */
import { BRAND } from '../brand';

export interface CardInput { name: string; label: string; ending: string; score: number; days: number; citizen: boolean; achievements: number; achievementsTotal: number; diff: string }
export interface CardSpec { w: number; h: number; headline: string; sub: string; lines: string[]; footer: string; accent: string }

export const CARD_W = 1200, CARD_H = 630;
const ENDING = {
  en: { time: 'Made it through two years', hospital: 'Ended up in hospital', deported: 'Was deported', debt: 'Drowned in debt' } as Record<string, string>,
  ru: { time: 'Прошёл(а) два года', hospital: 'Попал(а) в больницу', deported: 'Был(а) депортирован(а)', debt: 'Утонул(а) в долгах' } as Record<string, string>,
};

/** What the card says. A citizen gets “Became a Russian citizen”; the days are the days played, because the game does not record the day of the oath. */
export function cardSpec(i: CardInput, ru = false): CardSpec {
  const name = i.name.trim().slice(0, 20) || (ru ? 'Игрок' : 'Player');
  const end = (ru ? ENDING.ru : ENDING.en)[i.ending] ?? i.ending;
  const headline = i.citizen ? (ru ? `${name} получил(а) гражданство России` : `${name} became a Russian citizen`) : `${name}: ${end}`;
  const days = ru ? `${i.days} дн. в игре` : `${i.days} days played`;
  return {
    w: CARD_W, h: CARD_H, headline, sub: `${i.label} · ${i.diff}`,
    lines: [`${ru ? 'Очки' : 'Score'}: ${Math.max(0, Math.round(i.score))}`, days, `🏆 ${i.achievements} / ${i.achievementsTotal}`],
    footer: `${BRAND} — ${ru ? 'прожили свою жизнь в России' : 'live a life in Russia'}`, accent: i.citizen ? '#2e8b57' : i.ending === 'time' ? '#1f5fbf' : '#c33',
  };
}

/** Breaks a text into lines no wider than `max` pixels with the canvas's own measuring. */
export function wrapLines(ctx: Pick<CanvasRenderingContext2D, 'measureText'>, text: string, max: number): string[] {
  const out: string[] = []; let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export function drawCard(ctx: CanvasRenderingContext2D, c: CardSpec): void {
  const font = '"Nunito","Segoe UI",system-ui,Arial,sans-serif';
  ctx.fillStyle = '#10161f'; ctx.fillRect(0, 0, c.w, c.h);
  const bar = c.h / 3 / 3;                                       // the three stripes of the flag
  ['#ffffff', '#1c57a5', '#d52b1e'].forEach((col, k) => { ctx.fillStyle = col; ctx.fillRect(0, k * bar, c.w, bar); });
  ctx.fillStyle = c.accent; ctx.fillRect(0, c.h / 3, 18, c.h * 2 / 3);
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top';
  ctx.font = `800 64px ${font}`;
  let y = c.h / 3 + 40;
  for (const l of wrapLines(ctx, c.headline, c.w - 140).slice(0, 3)) { ctx.fillText(l, 70, y); y += 76; }
  ctx.fillStyle = '#b8c4d6'; ctx.font = `600 32px ${font}`; ctx.fillText(c.sub, 70, y + 4); y += 64;
  ctx.fillStyle = '#ffffff'; ctx.font = `700 40px ${font}`;
  for (const l of c.lines) { ctx.fillText(l, 70, y); y += 52; }
  ctx.fillStyle = '#8fa0b8'; ctx.font = `600 26px ${font}`; ctx.fillText(c.footer, 70, c.h - 50);
}

/** The card as a PNG, or null when the browser cannot draw it. */
export async function cardPng(c: CardSpec, doc: Document = document): Promise<Blob | null> {
  try {
    const cv = doc.createElement('canvas'); cv.width = c.w; cv.height = c.h;
    const ctx = cv.getContext('2d'); if (!ctx) return null;
    drawCard(ctx, c);
    return await new Promise<Blob | null>(res => cv.toBlob(b => res(b), 'image/png'));
  } catch { return null; }
}

export function download(blob: Blob | string, filename: string, doc: Document = document): void {
  const url = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
  const a = doc.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener'; doc.body.appendChild(a); a.click(); a.remove();
  if (typeof blob !== 'string') setTimeout(() => URL.revokeObjectURL(url), 5000);
}
