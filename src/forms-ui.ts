import * as G from './engine';
import type { State, Note } from './engine';
import { flows, validateStep } from './forms';
import type { Flow, Field, Data } from './forms';

const esc = (t: string): string => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const btn = (id: string, label: string, cls = ''): string => `<button id="${id}" class="${cls}">${label}</button>`;

/** List of available online services; picking one opens its form. */
export function openOnlineMenu(s: State, host: HTMLElement, onClose: () => void): void {
  host.innerHTML = `<div class="cat">Online services</div><h2>💻 What do you need to do online?</h2>
    <p class="sub">Each service is a website you fill in step by step. Mistakes cost time and money.</p>
    <div class="choices">${flows.map((f, i) => {
    const why = f.available(s);
    return `<button data-i="${i}" ${why ? 'disabled' : ''}>${f.icon} <b>${esc(f.title)}</b> <span class="sub">— ${esc(f.site)}</span><br><span class="sub">${esc(why ?? f.blurb)}</span></button>`;
  }).join('')}<button id="closeMenu" class="ghost">Close</button></div>`;
  host.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach(b => { b.onclick = () => openFlow(s, host, flows[Number(b.dataset.i)], onClose); });
  (document.getElementById('closeMenu') as HTMLElement).onclick = onClose;
}

export function openFlow(s: State, host: HTMLElement, flow: Flow, onClose: (done?: boolean) => void): void {
  const data: Data = {};
  let step = 0;
  let error = '';

  const render = (): void => {
    const st = flow.steps[step];
    const fields = st.fields(s, data);
    if (fields.some(f => f.type === 'code') && !data._code) data._code = String(Math.floor(1000 + Math.random() * 9000));
    const body = fields.map(f => fieldHtml(f, data)).join('');
    host.innerHTML = `<div class="cat">${esc(flow.site)}</div><div class="site"><div class="siteBar"><b>${flow.icon} ${esc(flow.title)}</b><span>${esc(st.title)} · step ${step + 1}/${flow.steps.length}</span></div>
      <div class="siteBody">${error ? `<div class="err">${esc(error)}</div>` : ''}${body}</div>
      <div class="siteBtns">${btn('ffBack', step === 0 ? 'Close the site' : 'Back', 'ghost')}${btn('ffNext', step === flow.steps.length - 1 ? 'Submit' : 'Continue', 'primary')}</div></div>`;
    error = '';
    (document.getElementById('ffBack') as HTMLElement).onclick = () => { if (step === 0) onClose(false); else { step--; render(); } };
    (document.getElementById('ffNext') as HTMLElement).onclick = () => {
      const values = collect(fields);
      const e = validateStep(fields, values, s, data);
      if (e) { error = e; render(); return; }
      Object.assign(data, values);
      if (step < flow.steps.length - 1) { step++; render(); } else submit();
    };
  };

  const collect = (fields: Field[]): Data => {
    const out: Data = {};
    for (const f of fields) {
      if (f.type === 'note') continue;
      if (f.type === 'radio') { const r = host.querySelector<HTMLInputElement>(`input[name="${f.id}"]:checked`); out[f.id] = r ? r.value : ''; }
      else if (f.type === 'checkbox') out[f.id] = (document.getElementById(f.id) as HTMLInputElement).checked ? 'yes' : '';
      else out[f.id] = (document.getElementById(f.id) as HTMLInputElement | HTMLSelectElement).value;
    }
    return out;
  };

  const submit = (): void => {
    const res = flow.finish(s, data);
    const notes: Note[] = G.apply(s, res.fx);
    s.log.unshift({ day: s.day, text: `${flow.title}: ${res.msg}` });
    G.checkEnd(s);
    const dayNotes = s.over ? [] : G.advance(s);
    host.innerHTML = `<div class="cat">${esc(flow.site)}</div><div class="site"><div class="siteBar"><b>${flow.icon} ${esc(flow.title)}</b><span>Result</span></div>
      <div class="siteBody"><p>${esc(res.msg)}</p>${notes.length ? '<div class="notes">' + notes.map(n => `<span class="note ${n.v < 0 && n.k !== 'stress' ? 'neg' : 'pos'}">${esc(n.label)} ${n.v ? (n.v > 0 ? '+' : '') + (n.k === 'money' ? G.money(n.v) : n.v) : ''}</span>`).join('') + '</div>' : ''}
      ${dayNotes.map(t => `<p class="sub">${esc(t)}</p>`).join('')}</div>
      <div class="siteBtns">${btn('ffDone', 'Done', 'primary')}</div></div>`;
    (document.getElementById('ffDone') as HTMLElement).onclick = () => onClose(true);
  };

  render();
}

function fieldHtml(f: Field, data: Data): string {
  const val = data[f.id] ?? f.init ?? '';
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  switch (f.type) {
    case 'note': return `<p class="hint">${esc(f.label)}</p>`;
    case 'select': return `<label>${esc(f.label)}<select id="${f.id}">${(f.options || []).map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${hint}</label>`;
    case 'radio': return `<div><div class="hint">${esc(f.label)}</div>${(f.options || []).map(([v, l], i) => `<label class="fare"><input type="radio" name="${f.id}" value="${esc(v)}" ${(val ? v === val : i === 0) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}${hint}</div>`;
    case 'checkbox': return `<label class="fare"><input type="checkbox" id="${f.id}" ${val ? 'checked' : ''}> ${esc(f.label)}</label>`;
    case 'code': return `<p class="sms">📱 SMS: “Your confirmation code is <b>${esc(data._code)}</b>. Never share it with anyone.”</p><label>${esc(f.label)}<input id="${f.id}" inputmode="numeric" maxlength="4" autocomplete="off" value=""></label>`;
    case 'date': return `<label>${esc(f.label)}<input id="${f.id}" type="date" value="${esc(val)}">${hint}</label>`;
    default: return `<label>${esc(f.label)}<input id="${f.id}" value="${esc(val)}" autocomplete="off">${hint}</label>`;
  }
}
