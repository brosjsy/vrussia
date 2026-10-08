/* A small, reusable engine for "fill in the website" processes.
   A Flow is a list of steps; each step has typed fields with validation. Nothing real is collected: all data is fictional. */
import type { State, Outcome } from './engine';

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

export const digits = (n: number) => (v: string): string | null => (new RegExp(`^\\d{${n}}$`).test(v.replace(/\s/g, '')) ? null : `Enter exactly ${n} digits.`);
export const oneOf = (list: string[]) => (v: string): string | null => (list.includes(v) ? null : 'Please choose a valid option.');
