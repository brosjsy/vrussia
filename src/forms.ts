/* A small, reusable engine for "fill in the website" processes.
   A Flow is a list of steps; each step has typed fields with validation. Nothing real is collected: all data is fictional. */
import type { State, Outcome, Note } from './engine';
import * as G from './engine';

export type FieldType = 'text' | 'select' | 'date' | 'checkbox' | 'radio' | 'code' | 'note';
export type Data = Record<string, string>;

export interface Field {
  id: string; label: string; type: FieldType;
  options?: [string, string][];          // [value, label]
  init?: string;                          // default value
  hint?: string; required?: boolean;
  check?: (value: string, s: State, data: Data) => string | null;   // return an error message, or null if valid
}
export interface Step { title: string; fields: (s: State, d: Data) => Field[] }
export interface Flow {
  id: string; icon: string; title: string; site: string; blurb: string;
  /** Return a reason why the service is unavailable, or null if the player may use it. */
  available: (s: State) => string | null;
  steps: Step[];
  finish: (s: State, d: Data) => Outcome;
}

export const flows: Flow[] = [];
export const addFlow = (f: Flow): Flow => { flows.push(f); return f; };

/** Validate the values typed into one step. Returns the first error message or null. */
export function validateStep(fields: Field[], values: Data, s: State, all: Data): string | null {
  for (const f of fields) {
    if (f.type === 'note') continue;
    const v = (values[f.id] ?? '').trim();
    if ((f.required ?? f.type !== 'checkbox') && !v) return `${f.label}: this field is required.`;
    if (f.type === 'code' && v !== all._code) return 'The SMS code is wrong. Check the message and try again.';
    if (f.check) { const e = f.check(v, s, { ...all, ...values }); if (e) return e; }
  }
  return null;
}

/** The SMS code a step asks for, made once per form. */
export function codeFor(fields: Field[], data: Data): void { if (fields.some(f => f.type === 'code') && !data._code) data._code = String(Math.floor(1000 + Math.random() * 9000)); }
/** Sends a completed form: its result, the journal line, the end of the game if it came, and the time it took. */
export function submitFlow(s: State, flow: Flow, data: Data): { msg: string; notes: Note[]; dayNotes: string[] } {
  const res = flow.finish(s, data);
  const notes: Note[] = G.apply(s, res.fx);
  s.log.unshift({ day: s.day, text: `${flow.title}: ${res.msg}` });
  G.checkEnd(s);
  return { msg: res.msg, notes, dayNotes: s.over ? [] : G.advance(s) };
}

export const digits = (n: number) => (v: string): string | null => (new RegExp(`^\\d{${n}}$`).test(v.replace(/\s/g, '')) ? null : `Enter exactly ${n} digits.`);
export const oneOf = (list: string[]) => (v: string): string | null => (list.includes(v) ? null : 'Please choose a valid option.');
