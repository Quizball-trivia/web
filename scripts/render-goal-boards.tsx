/**
 * Headless renderer for Guess the Goal boards — the visual half of the
 * content verifier. For each published goal it renders the FINISHED board
 * (t = full duration, every trail drawn) with the exact component players
 * see, and writes an SVG per slug. A wrapper converts these to PNG with
 * headless Chrome so a vision pass can compare board vs real footage.
 *
 *   DATABASE_URL=... npx tsx scripts/render-goal-boards.tsx <outDir> [slug...]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { execFileSync } from 'node:child_process';
import { TacticsBoard2D, BOARD_VIEW_W, BOARD_VIEW_H } from '../src/features/mini-games/components/TacticsBoard2D';
import { buildTimeline, type TacticsGoalDef } from '../src/features/mini-games/lib/tacticsEngine';

const [outDir, ...onlySlugs] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: render-goal-boards.tsx <outDir> [slug...]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const slugFilter = onlySlugs.length
  ? `AND slug IN (${onlySlugs.map((x) => `'${x.replace(/'/g, "''")}'`).join(',')})`
  : '';
const raw = execFileSync('psql', [
  process.env.DATABASE_URL!,
  '-Atc',
  `SELECT json_build_object('slug', slug, 'players', players, 'steps', steps)
     FROM goal_choreographies WHERE status='published' ${slugFilter} ORDER BY slug`,
], { encoding: 'utf8' });
const rows = raw.split('\n').filter(Boolean).map((line) => JSON.parse(line)) as Array<{
  slug: string; players: unknown; steps: unknown;
}>;

for (const row of rows) {
  const goal: TacticsGoalDef = {
    id: row.slug,
    title: '',
    options: [],
    answerIndex: -1,
    funFact: '',
    players: row.players as TacticsGoalDef['players'],
    steps: row.steps as TacticsGoalDef['steps'],
    bonus: { question: '', options: [], answerIndex: -1 },
  };
  const timeline = buildTimeline(goal);
  const svg = renderToStaticMarkup(
    React.createElement(TacticsBoard2D, {
      goal,
      timeline,
      t: timeline.duration,
      goalFlash: true,
    })
  );
  // Give the SVG explicit pixel dimensions so Chrome rasterizes it large.
  const sized = svg.replace('<svg', `<svg width="${BOARD_VIEW_W * 8}" height="${BOARD_VIEW_H * 8}"`);
  writeFileSync(join(outDir, `${row.slug}.svg`), sized);
  console.log(`✓ ${row.slug}`);
}
console.log(`rendered ${rows.length} board(s) to ${outDir}`);
