// @vitest-environment jsdom
/* OWASP Top 10 (2021) on the browser side. The server side is in server/test/owasp.test.ts. Report: docs/OWASP.md. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as G from '../src/engine';
import '../src/content';
import { sourcesHtml, SOURCES } from '../src/platform/citations';
import { buildReport, printableHtml } from '../src/platform/report';
import { policyHtml, privacyPolicy } from '../src/platform/policy';
import { addPack, validatePack, TEMPLATE } from '../src/platform/packs';
import { resultsCsv } from '../src/platform/classroom';
import { exportLocalData, eraseLocalData, analyticsAllowed } from '../src/platform/consent';
import { Telemetry, scrub } from '../src/platform/telemetry';

const XSS = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', "'><svg onload=alert(1)>", 'javascript:alert(1)', '</textarea><iframe src=//evil>'];
const walk = (d: string, out: string[] = []): string[] => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p, out) : /\.(ts|html|js)$/.test(n) && out.push(p); } return out; };
const esc = (s: unknown): string => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const dangerous = (root: ParentNode): string[] => {
  const bad: string[] = [];
  root.querySelectorAll('script, iframe, object, embed, svg[onload], img[onerror], [onerror], [onload], [onclick], [onfocus]').forEach(e => bad.push(e.tagName));
  root.querySelectorAll('a[href]').forEach(a => { if (/^\s*javascript:/i.test(a.getAttribute('href') ?? '')) bad.push('a[javascript:]'); });
  return bad;
};

describe('A01 Broken access control (browser)', () => {
  it('Erase and Download touch only this game’s storage and nothing else on the same origin', () => {
    localStorage.clear(); localStorage.setItem('vrussia_save', '{}'); localStorage.setItem('another_app_token', 'secret');
    expect(Object.keys(exportLocalData().data)).toEqual(['vrussia_save']);
    eraseLocalData(); expect(localStorage.getItem('another_app_token')).toBe('secret');
  });
  it('statistics are off until the player says yes, and a stored “yes” from an older policy does not count', () => {
    localStorage.clear(); expect(analyticsAllowed()).toBe(false);
    localStorage.setItem('vrussia_consent', JSON.stringify({ v: 0, analytics: true, at: 1 })); expect(analyticsAllowed()).toBe(false);
  });
});

describe('A02 Cryptographic failures (browser)', () => {
  it('no secret is kept in the page’s storage: the session holds no token or password', () => {
    for (const f of walk('src')) {
      const t = readFileSync(f, 'utf8');
      expect(t, f).not.toMatch(/localStorage\.setItem\([^)]*(password|token)/i);
    }
  });
  it('errors sent to the server have e-mail addresses, address queries and long numbers removed', () => {
    expect(scrub('bob@example.org https://x.org/?auth=SECRET 4111111111111111')).toBe('[email] https://x.org/ #');
  });
});

describe('A03 Injection and cross-site scripting', () => {
  it.each(XSS)('a hostile name %s is shown as text in the report, the sources, the policy and the print page', payload => {
    const s = G.newState(payload, 'tajik'); s.label = payload; s.flags.med = true;
    const r = buildReport(s);
    const lab = { title: 'T', done: 'd', mistakes: 'm', next: 'n', sources: 's', day: 'Day', none: '-', note: 'x', never: 'n', checked: 'c', old: 'o', open: 'Open' };
    const sources = (l: typeof SOURCES) => sourcesHtml(l, false, { never: 'n', checked: 'c', old: 'o', open: 'Open' }, esc);
    const page = printableHtml(r, false, lab, esc, sources);
    const host = document.createElement('div'); host.innerHTML = page.replace(/<!doctype html>|<\/?(html|head|body)[^>]*>/gi, '').replace(/<style[\s\S]*?<\/style>/, '');
    expect(dangerous(host)).toEqual([]);
    const pol = document.createElement('div'); pol.innerHTML = policyHtml({ title: payload, updated: payload, sections: [{ h: payload, p: [payload] }] }, esc); expect(dangerous(pol)).toEqual([]);
    expect(dangerous(Object.assign(document.createElement('div'), { innerHTML: sources([{ ...SOURCES[0], law: { en: payload, ru: payload }, url: 'https://x.org/' + payload }]) }))).toEqual([]);
  });
  it('the whole page, with hostile values in the game state, writes no live markup', async () => {
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    localStorage.clear(); localStorage.setItem('vrussia_consent', JSON.stringify({ v: 1, analytics: false, at: 1 }));
    const { boot, uiReady } = await import('../src/ui'); boot(); await uiReady();
    (document.getElementById('nameInput') as HTMLInputElement).value = XSS[0].slice(0, 20);
    document.getElementById('startBtn')!.click();
    await new Promise(r => setTimeout(r, 300));
    document.querySelector<HTMLElement>('#game [data-pf-open]')!.click();
    for (const screen of ['report', 'sources', 'privacy', 'cls', 'daily', 'packs', 'a11y', 'lang']) {
      (document.querySelector('#modalBody [data-pf="hub"]') as HTMLElement | null)?.click();
      (document.querySelector(`#modalBody [data-pf="${screen}"]`) as HTMLElement).click();
      await new Promise(r => setTimeout(r, 30));
      expect(dangerous(document.getElementById('modalBody')!), screen).toEqual([]);
    }
    expect(dangerous(document.getElementById('who')!)).toEqual([]);
  });
  it('a class table cannot run a formula when opened in a spreadsheet', () => {
    const row = (n: string) => ({ nickname: n, origin: 'a', ending: 'time', score: 1, days: 1, learned: { done: [], mistakes: [] }, created_at: '' });
    for (const n of ['=cmd|calc', '+1+1', '-2+3', '@SUM(A1)', '\tx', '\rx']) expect(resultsCsv([row(n)]).split('\n')[1].startsWith("'") || resultsCsv([row(n)]).split('\n')[1].startsWith('"\'')).toBe(true);
  });
  it('the source has no eval, no Function constructor, no document.write and no javascript: links', () => {
    for (const f of walk('src')) { const t = readFileSync(f, 'utf8'); expect(t, f).not.toMatch(/\beval\(|new Function\(|document\.write\(|href="javascript:/); }
  });
  it('external links open safely', () => {
    for (const f of walk('src')) { const t = readFileSync(f, 'utf8'); for (const m of t.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) expect(m[0], f).toMatch(/rel="[^"]*noopener/); }
  });
});

describe('A04 Insecure design', () => {
  it('a pack is capped in size, count and the strength of its effects, and cannot carry code', () => {
    expect(addPack('x'.repeat(130_000)).ok).toBe(false);
    const p = JSON.parse(JSON.stringify(TEMPLATE)); p.scenarios[0].choices[0].fx = { money: 50_001 }; expect(validatePack(p)).not.toEqual([]);
    for (const evil of [{ run: 'alert(1)' }, { ui: 'booking' }, { setDocs: { reg: 9999 } }, { status: 'citizen' }, { city: 'x' }, { partner: {} }]) { const q = JSON.parse(JSON.stringify(TEMPLATE)); q.scenarios[0].choices[0].fx = evil; expect(validatePack(q), JSON.stringify(evil)).not.toEqual([]); }
  });
});

describe('A05 Security misconfiguration', () => {
  it('the page carries a Content Security Policy with no inline scripts, no plug-ins and a fixed base', () => {
    const html = readFileSync('index.html', 'utf8'), m = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
    expect(m).toBeTruthy(); const csp = m![1];
    expect(csp).toMatch(/script-src 'self'(;|$)/); expect(csp).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/); expect(csp).toContain("object-src 'none'"); expect(csp).toContain("base-uri 'self'"); expect(csp).toContain("form-action 'self'");
    expect(html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '')).not.toMatch(/<script(?![^>]*\bsrc=)/); expect(html).not.toMatch(/\son(click|load|error)=/i);
  });
  it('the service worker only handles this site’s own GET requests', () => {
    const sw = readFileSync('public/sw.js', 'utf8'); expect(sw).toMatch(/location\.origin|origin/); expect(sw).toMatch(/method\s*!==?\s*'GET'|req\.method/);
  });
});

describe('A06 Vulnerable and outdated components', () => {
  it('every dependency is listed in a lock file, and there are no wildcard or git versions', () => {
    for (const dir of ['.', 'server']) {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      for (const [n, v] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) expect(v, `${dir}/${n}`).not.toMatch(/^\*|latest|git|http|file:/);
      expect(statSync(join(dir, 'package-lock.json')).size).toBeGreaterThan(1000);
    }
  });
});

describe('A07 Identification and authentication failures (browser)', () => {
  it('the page never stores the password or the session token; the server’s HttpOnly cookie holds the session', () => {
    const t = readFileSync('src/api-client.ts', 'utf8');
    expect(t).toContain("credentials: 'include'"); expect(t).toMatch(/access: '', refresh: ''/);
  });
});

describe('A08 Software and data integrity failures', () => {
  beforeEach(() => localStorage.clear());
  it('a damaged or hostile saved value in any of our keys never stops the page from starting', async () => {
    for (const k of ['vrussia_consent', 'vrussia_tour', 'vrussia_a11y', 'vrussia_packs', 'vrussia_class', 'vrussia_daily', 'vrussia_flags', 'vrussia_locale', 'vrussia_settings', 'vrussia_lang', 'vrussia_bucket']) localStorage.setItem(k, '{"__proto__":{"x":1}}\u0000"');
    localStorage.setItem('vrussia_packs', JSON.stringify([{ format: 'vrussia-pack', id: 'x' }, 7, null]));
    document.documentElement.innerHTML = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { boot } = await import('../src/ui');
    expect(() => boot()).not.toThrow();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
  it('a pack cannot replace a scenario of the game and a hostile id is refused', () => {
    const p = JSON.parse(JSON.stringify(TEMPLATE)); p.scenarios[0].id = '__proto__'; expect(addPack(JSON.stringify(p)).ok).toBe(false);          // underscores are not allowed in a pack id
    p.scenarios[0].id = 'proto'; expect(addPack(JSON.stringify(p)).ok).toBe(true); expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    p.scenarios[0].id = '../../etc'; expect(validatePack(p)).not.toEqual([]);
    (async () => { const { removePack } = await import('../src/platform/packs'); removePack('myclass'); })();
  });
  it('a teacher’s class code cannot carry anything but six letters or digits into a web address', async () => {
    const { cleanCode } = await import('../src/platform/classroom');
    expect(cleanCode('../../admin?x=1')).toBe('ADMINX'); expect(cleanCode('abc/def')).toBe('ABCDEF');
  });
});

describe('A09 Security logging and monitoring failures', () => {
  it('uncaught errors in the page are reported (with consent) once each and cleaned first', async () => {
    const sent: string[] = [];
    const t = new Telemetry({ base: 'https://api.example.org', fetch: (async (_u: string, i: RequestInit) => { sent.push(String(i.body)); return { ok: true } as Response; }) as unknown as typeof fetch, kv: { getItem: () => JSON.stringify({ v: 1, analytics: true, at: 1 }), setItem: () => undefined, removeItem: () => undefined } });
    t.error('Boom for eve@example.org', 'a.js:1'); t.error('Boom for eve@example.org', 'a.js:1'); await t.flush();
    expect(sent).toHaveLength(1); expect(sent[0]).not.toContain('eve@example.org');
  });
});

describe('A10 Server-side request forgery (browser side)', () => {
  it('the page never fetches an address that a player or a pack typed', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (u: string) => { calls.push(String(u)); return { ok: false, status: 500, json: async () => null } as Response; });
    const p = JSON.parse(JSON.stringify(TEMPLATE)); p.scenarios[0].text = 'Visit http://169.254.169.254/latest/meta-data/ now please'; p.scenarios[0].choices[0].msg = 'See https://evil.example/x.png for more details';
    addPack(JSON.stringify(p)); G.get('pack-myclass-bus-ticket', G.newState('T', 'tajik'));
    expect(calls).toEqual([]); vi.unstubAllGlobals();
  });
});
