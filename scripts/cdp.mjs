// A small driver for Microsoft Edge or Google Chrome through the DevTools protocol, with no packages to install (Node 22+ has WebSocket).
// Used by scripts/e2e.mjs (plays the built game in a real browser, checks every feature and takes the screenshots in docs/screens/).
// The browser runs headless with its own empty profile in a temporary folder, so nothing of the person's own browser is touched.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
export const browserPath = () => BROWSERS.find(p => existsSync(p)) ?? null;
const sleep = ms => new Promise(ok => setTimeout(ok, ms));

/** Starts a headless browser and opens one page. Returns helpers to drive it. */
export async function launch({ width = 1280, height = 800, scale = 1 } = {}) {
  const exe = browserPath(); if (!exe) throw new Error('No Edge or Chrome found');
  const profile = mkdtempSync(join(tmpdir(), 'vr-cdp-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--disable-sync', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let port = 0;
  for (let i = 0; i < 100 && !port; i++) { await sleep(100); try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch { /* not yet */ } }
  if (!port) { proc.kill(); throw new Error('The browser did not start'); }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(t => t.type === 'page'); if (!page) throw new Error('No page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const waiting = new Map(), listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.bad(new Error(`${w.method}: ${m.error.message}`)) : w.ok(m.result); }
    else if (m.method) for (const l of listeners) l(m.method, m.params);
  };
  const send = (method, params = {}) => new Promise((ok, bad) => { const n = ++id; waiting.set(n, { ok, bad, method }); ws.send(JSON.stringify({ id: n, method, params })); });
  const errors = [], logs = [];
  listeners.push((method, p) => {
    if (method === 'Runtime.exceptionThrown') errors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? 'exception');
    if (method === 'Runtime.consoleAPICalled') { const text = (p.args ?? []).map(a => a.value ?? a.description ?? '').join(' '); (p.type === 'error' ? errors : logs).push(text); }
    if (method === 'Log.entryAdded' && p.entry?.level === 'error' && !/favicon/.test(p.entry.text)) errors.push(p.entry.text + (p.entry.url ? ` (${p.entry.url})` : ''));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });

  /** Runs an expression in the page (await is allowed) and returns its value. */
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error('In the page: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
    return r.result.value;
  };
  /** Waits until an expression is true (checked every 100 ms). */
  const until = async (expr, ms = 10_000, what = expr) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evaluate(`return !!(${expr})`)) return true; await sleep(100); } throw new Error('Timed out waiting for: ' + what); };
  const navigate = async (url) => { await send('Page.navigate', { url }); await sleep(300); await until('document.readyState === "complete"', 20_000, 'page load'); };
  /** A PNG of the page as it is now (the whole window). */
  const screenshot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64');
  const resize = async (w, h) => { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false }); };
  const close = async () => { try { ws.close(); } catch { /* closed */ } proc.kill(); await sleep(300); try { rmSync(profile, { recursive: true, force: true }); } catch { /* still locked: the temp folder is cleaned by the system */ } };
  return { send, evaluate, until, navigate, screenshot, resize, close, errors, logs, sleep };
}
