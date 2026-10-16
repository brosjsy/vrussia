/* E-mail: what is sent (templates with a brand) and how (a sender that can be swapped).
   - EmailSender is the only thing the rest of the server knows. Three come with it: 'smtp' (nodemailer; works with any provider that offers
     SMTP: Amazon SES, Postmark, Mailgun, SendGrid, Brevo, a company server...), 'console' (development: prints the e-mail) and 'memory'
     (tests). Another provider (an HTTP API) is one more class with a `send` method.
   - Templates are plain files: <name>.subject, <name>.html (the middle of the e-mail) and <name>.txt, put into layout.html / layout.txt.
     {{placeholders}} are filled in, HTML-escaped in the HTML version; a placeholder without a value is an error, never an empty gap.
     A folder given in TEMPLATE_DIR can replace any of the files (same names), so the wording and the look change without touching code. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Config } from './config.js';

export interface Email { to: string; subject: string; html: string; text: string }
export interface EmailSender { send(m: Email): Promise<void> }

export class MemorySender implements EmailSender {
  readonly sent: Email[] = [];
  async send(m: Email): Promise<void> { this.sent.push(m); }
  /** The last e-mail to an address (tests). */
  last(to: string): Email | undefined { return [...this.sent].reverse().find(m => m.to === to); }
}
export class ConsoleSender implements EmailSender {
  constructor(private readonly log: (msg: string) => void) {}
  async send(m: Email): Promise<void> { this.log(`[e-mail, not sent: console transport] to=${m.to} subject=${JSON.stringify(m.subject)}\n${m.text}`); }
}
export class SmtpSender implements EmailSender {
  private readonly t: Transporter;
  constructor(private readonly from: string, opts: { host: string; port: number; secure: boolean; user?: string; pass?: string }) {
    this.t = nodemailer.createTransport({ host: opts.host, port: opts.port, secure: opts.secure, requireTLS: !opts.secure, auth: opts.user ? { user: opts.user, pass: opts.pass ?? '' } : undefined, connectionTimeout: 10_000, socketTimeout: 20_000 });
  }
  async send(m: Email): Promise<void> { await this.t.sendMail({ from: this.from, to: m.to, subject: m.subject, html: m.html, text: m.text }); }
}
export function senderFrom(c: Config, log: (msg: string) => void): EmailSender {
  if (c.EMAIL_TRANSPORT === 'smtp') return new SmtpSender(c.EMAIL_FROM, { host: c.SMTP_HOST!, port: c.SMTP_PORT!, secure: c.SMTP_SECURE, user: c.SMTP_USER, pass: c.SMTP_PASS });
  if (c.EMAIL_TRANSPORT === 'memory') return new MemorySender();
  return new ConsoleSender(log);
}

/* ---------- templates ---------- */
export type TemplateName = 'verify' | 'reset' | 'password-changed' | 'signup-exists' | 'account-deleted';
export const TEMPLATES: TemplateName[] = ['verify', 'reset', 'password-changed', 'signup-exists', 'account-deleted'];
export interface Brand { name: string; color: string; logoUrl?: string; supportEmail?: string; footer: string; appUrl: string }
export const brandFrom = (c: Config): Brand => ({ name: c.BRAND_NAME, color: c.BRAND_COLOR, logoUrl: c.BRAND_LOGO_URL, supportEmail: c.BRAND_SUPPORT_EMAIL, footer: c.BRAND_FOOTER, appUrl: c.APP_URL });

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILT_IN = [join(HERE, '../templates'), join(HERE, '../../templates'), join(process.cwd(), 'templates'), join(process.cwd(), 'server/templates')].find(d => existsSync(join(d, 'layout.html'))) ?? join(HERE, '../templates');   // from src/ or from dist/src/
const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

export class Templates {
  private readonly cache = new Map<string, string>();
  constructor(private readonly brand: Brand, private readonly overrideDir?: string, private readonly builtInDir = BUILT_IN) {}
  private file(name: string): string {
    const hit = this.cache.get(name); if (hit !== undefined) return hit;
    const own = this.overrideDir ? join(this.overrideDir, name) : null;
    const path = own && existsSync(own) ? own : join(this.builtInDir, name);
    const text = readFileSync(path, 'utf8'); this.cache.set(name, text); return text;
  }
  private fill(tpl: string, vars: Record<string, string>, html: boolean, file: string): string {
    return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_m, k: string) => {
      if (k === 'content') return vars.content ?? '';                 // the inner part, already filled in and escaped
      if (!(k in vars)) throw new Error(`Template ${file} uses {{${k}}}, which has no value`);
      return html ? escapeHtml(vars[k]) : vars[k];
    });
  }
  /** Builds one e-mail. `vars` are the message's own values (a link, a name); the brand's are added. */
  render(name: TemplateName, to: string, vars: Record<string, string>): Email {
    const b = this.brand;
    const all: Record<string, string> = { brand_name: b.name, brand_color: b.color, logo_url: b.logoUrl ?? '', support_email: b.supportEmail ?? '', footer: b.footer, app_url: b.appUrl, year: String(new Date().getUTCFullYear()), ...vars };
    const subject = this.fill(this.file(`${name}.subject`), all, false, `${name}.subject`).trim().replace(/[\r\n]+/g, ' ');
    const htmlInner = this.fill(this.file(`${name}.html`), all, true, `${name}.html`);
    const textInner = this.fill(this.file(`${name}.txt`), all, false, `${name}.txt`);
    const logo = b.logoUrl ? `<img src="${escapeHtml(b.logoUrl)}" alt="${escapeHtml(b.name)}" height="40" style="display:block;border:0;height:40px">` : `<span style="font-size:20px;font-weight:700;color:#ffffff">${escapeHtml(b.name)}</span>`;
    const support = b.supportEmail ? `<a href="mailto:${escapeHtml(b.supportEmail)}" style="color:#5b6478">${escapeHtml(b.supportEmail)}</a>` : '';
    const html = this.fill(this.file('layout.html'), { ...all, content: htmlInner }, true, 'layout.html').replace('<!--logo-->', logo).replace('<!--support-->', support);
    const text = this.fill(this.file('layout.txt'), { ...all, content: textInner }, false, 'layout.txt');
    return { to, subject, html, text };
  }
}
