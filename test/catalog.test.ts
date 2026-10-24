import { it, expect } from 'vitest';
import { existsSync, writeFileSync } from 'node:fs';
import { CATALOG, counts } from '../src/catalog';

it('the activity catalogue: every built entry names a real file, ids are unique, and docs/ACTIVITIES.md is written from it', () => {
  const ids = CATALOG.flatMap(c => c.items.map(a => a.id)); expect(new Set(ids).size).toBe(ids.length);
  for (const c of CATALOG) for (const a of c.items) if (a.status === 'sys') { expect(a.where, a.id).toBeTruthy(); expect(existsSync(a.where!), `${a.id}: ${a.where}`).toBe(true); }
  const n = counts(), total = n.sys + n.scene + n.todo, mark = { sys: '✅ built', scene: '🎭 scenes only', todo: '⬜ to build' } as const;
  const md = [`# What people do in daily life, and what the game has`, '',
    `Written by test/catalog.test.ts from src/catalog.ts. **${total} activities**: ${n.sys} built (a feature the player can use whenever they choose), ${n.scene} only in the life scenes (it happens to the player in one of the 4,000+ scene cards), ${n.todo} to build. Built in batches, a category at a time.`, '',
    ...CATALOG.flatMap(c => { const k = { sys: 0, scene: 0, todo: 0 }; c.items.forEach(a => k[a.status]++); return [`## ${c.name} (${k.sys} built, ${k.scene} scenes, ${k.todo} to build)`, '', '| Activity | Status | Where |', '|---|---|---|', ...c.items.map(a => `| ${a.name} | ${mark[a.status]} | ${a.where ? '`' + a.where + '`' : ''} |`), '']; })].join('\n');
  writeFileSync('docs/ACTIVITIES.md', md);
  expect(total).toBeGreaterThan(150);
});
