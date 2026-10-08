import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('installable app files', () => {
  it('has a valid manifest with the required fields and an existing icon', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    for (const k of ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color']) expect(m[k], k).toBeTruthy();
    for (const icon of m.icons) expect(existsSync('public/' + icon.src), icon.src).toBe(true);
  });

  it('index.html links the manifest and the service worker file exists', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="theme-color"');
    expect(existsSync('public/sw.js')).toBe(true);
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(sw).toContain("addEventListener('fetch'");
    expect(sw).toContain("req.mode === 'navigate'");
  });
});
