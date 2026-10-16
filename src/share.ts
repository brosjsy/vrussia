/* A short plain-text summary of a finished game that the player can copy and paste anywhere.
   Plain data in, plain text out: no links are added and nothing is sent anywhere. */

export interface ShareData { name: string; label: string; ending: string; score: number; days: number; citizen: boolean; achievements: number; achievementsTotal: number; diff: string }

const ENDING: Record<string, string> = { time: 'made it through two years', hospital: 'ended in hospital', deported: 'was deported', debt: 'drowned in debt' };

export function shareText(d: ShareData): string {
  const name = d.name.trim().slice(0, 20) || 'Player';
  const end = ENDING[d.ending] ?? d.ending;
  return [
    `🇷🇺 V Russia: ${name}, ${d.label} (${d.diff})`,
    `Score ${Math.max(0, Math.round(d.score))} · ${d.days} days · ${end}${d.citizen ? ' · became a Russian citizen 🛂' : ''}`,
    `🏆 ${d.achievements} / ${d.achievementsTotal} achievements`,
  ].join('\n');
}

/** Copies text to the clipboard. Returns true on success; never throws. Falls back to a hidden textarea when the Clipboard API is missing. */
export async function copyText(text: string, doc: Document = document): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the old way */ }
  try {
    const ta = doc.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    doc.body.appendChild(ta); ta.select();
    const ok = typeof doc.execCommand === 'function' && doc.execCommand('copy');
    ta.remove();
    return !!ok;
  } catch { return false; }
}
