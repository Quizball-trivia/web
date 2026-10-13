import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';

// Public, signed-out audit only. Never reads a Vercel/Railway/private auth key.
const baseSha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(baseSha ?? '')) throw Error('Expected exact baseline commit');
if (process.version !== 'v22.22.2') throw Error('Use pinned Node 22.22.2');
const cli = process.env.QB_LIGHTHOUSE_CLI;
if (!cli || !fs.existsSync(cli)) throw Error('Pinned Lighthouse CLI missing');
const outputRoot = process.env.QB_BENCHMARK_OUTPUT;
if (!outputRoot || fs.existsSync(outputRoot)) throw Error('Use a new explicit output directory');
const output = path.join(outputRoot, 'raw');
fs.mkdirSync(output, { recursive: true });
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quizball-word-benchmark-'));
const baseline = path.join(taskDir, 'baseline');
const candidate = process.cwd();
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const servers = [];
const routes = [
  ['en-chain', '/en/football-games/football-name-chain'],
  ['en-shared', '/en/football-games/played-for-both-clubs'],
  ['es-chain', '/es/juegos-de-futbol/cadena-de-futbolistas'],
  ['es-shared', '/es/juegos-de-futbol/jugador-en-comun'],
  ['tr-chain', '/tr/futbol-oyunlari/son-harfle-futbolcu'],
  ['tr-shared', '/tr/futbol-oyunlari/ortak-futbolcu-oyunu'],
  ['ka-chain', '/ka/football-games/football-name-chain'],
  ['ka-shared', '/ka/football-games/played-for-both-clubs'],
  ['hub-control', '/en'], ['settings-control', '/settings'],
];
const rows = [];
let publicAnon;
const allowedOrigins = new Set(['http://127.0.0.1:4995', 'http://127.0.0.1:4996', 'https://api-staging.quizball.io', 'https://nsdfiprfmhdqhbfxfwpv.supabase.co']);
const blockedProduction = ['https://quizball.io/*', 'https://www.quizball.io/*', 'https://api.quizball.io/*', 'https://lfbwhxvwubzeqkztghok.supabase.co/*'];
const median = numbers => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];
function localeEntryAssets(root) {
  const chunkRoot = path.join(root, '.next/static/chunks');
  const assets = [];
  const found = new Set();
  for (const file of fs.readdirSync(chunkRoot, { recursive: true }).filter(file => file.endsWith('.js.map'))) {
    const map = JSON.parse(fs.readFileSync(path.join(chunkRoot, file)));
    const sources = (map.sources ?? []).filter(source => /\/src\/app\/locale-asset-providers\.(es|tr|ka)\.tsx$/.test(source));
    if (sources.length) { sources.forEach(source => found.add(source)); assets.push(`/_next/static/chunks/${file.slice(0, -4)}`); }
  }
  if (found.size !== 3) throw Error('Locale entry source-map coverage incomplete');
  return assets;
}
function runtimeIssues(report) {
  const network = report.audits['network-requests'].details.items;
  const errors = (report.audits['errors-in-console'].details?.items ?? []).map(item => String(item.description ?? item.message ?? JSON.stringify(item))
    .replace(/127\.0\.0\.1:499[56]/g, '[local]').replace(/\/_next\/static\/chunks\/[^\s:)]+/g, '/_next/static/chunks/[asset]'));
  return { errors, fatal: errors.some(error => /content.security|\bcsp\b|refused to (load|execute)|hydrat|minified.react.error.#4\d\d/i.test(error)),
    failedScripts: network.filter(x => x.resourceType === 'Script' && x.statusCode !== 200 && x.statusCode !== 304).map(x => ({ path: new URL(x.url).pathname, status: x.statusCode })),
  };
}
function sanitizeArtifacts() {
  const safe = path.join(outputRoot, 'safe'); fs.mkdirSync(safe, { recursive: true });
  const omit = /^(headers|requestHeaders|responseHeaders|headersText|cookies|associatedCookies|postData|postDataEntries)$/i;
  const clean = value => Array.isArray(value) ? value.map(clean) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !omit.test(key)).map(([key, item]) => [key, clean(item)])) : value;
  let files = 0;
  for (const name of fs.readdirSync(output)) {
    if (!/\.(json|log)$/.test(name)) continue;
    let text = fs.readFileSync(path.join(output, name), 'utf8');
    if (name.endsWith('.json')) text = JSON.stringify(clean(JSON.parse(text)), null, 2);
    text = text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]');
    if (publicAnon && text.includes(publicAnon)) throw Error('Artifact privacy scan failed');
    fs.writeFileSync(path.join(safe, name), text); files++;
  }
  fs.writeFileSync(path.join(safe, 'artifact-policy.json'), JSON.stringify({ files, headersCookiesAndPostDataRemoved: true, jwtRedacted: true, rawNeverUploaded: true }));
}
function publicText(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://staging.quizball.io') throw Error('Only staging public assets allowed');
  return execFileSync('curl', ['--fail', '--silent', '--show-error', '--max-time', '30', url], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function stagingPublicKey() {
  const html = publicText('https://staging.quizball.io/en/football-games/football-name-chain');
  const scripts = [...new Set([...html.matchAll(/<script[^>]*src="([^"]+)/g)].map(match =>
    new URL(match[1].replaceAll('&amp;', '&'), 'https://staging.quizball.io').href))];
  for (const url of scripts) for (const value of publicText(url).match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try {
      const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url'));
      if (claims.role === 'anon' && claims.ref === 'nsdfiprfmhdqhbfxfwpv') return value;
    } catch { /* not an anonymous staging key */ }
  }
  throw Error('Verified public staging configuration unavailable');
}
function runNode(cwd, args, env, log) {
  const fd = fs.openSync(path.join(output, log), 'w');
  try {
    const run = spawnSync(process.execPath, args, { cwd, env, stdio: ['ignore', fd, fd], timeout: args[0] === cli ? 120_000 : 600_000 });
    if (run.status !== 0) throw Error(`${log} failed; inspect the non-sensitive log`);
  } finally { fs.closeSync(fd); }
}
async function startServer(cwd, port, env, label) {
  const fd = fs.openSync(path.join(output, `${label}-server.log`), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd, env, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd); servers.push(server);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw Error(`${label} server exited`);
    try { if ((await fetch(`http://127.0.0.1:${port}/en/football-games/football-name-chain`)).status === 200) return; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error(`${label} server unavailable`);
}
try {
  execFileSync('git', ['worktree', 'add', '--detach', baseline, baseSha], { stdio: 'pipe' });
  for (const file of ['package.json', 'package-lock.json']) {
    if (!fs.readFileSync(path.join(baseline, file)).equals(fs.readFileSync(path.join(candidate, file)))) throw Error('Dependency drift requires separate matching installs');
  }
  fs.symlinkSync(path.join(candidate, 'node_modules'), path.join(baseline, 'node_modules'), 'dir');
  const env = { ...process.env, VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'staging',
    NEXT_PUBLIC_API_URL: 'https://api-staging.quizball.io', NEXT_PUBLIC_SITE_URL: 'https://staging.quizball.io',
    NEXT_PUBLIC_SUPABASE_URL: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: publicAnon = stagingPublicKey(),
    NEXT_PUBLIC_POSTHOG_KEY: '', NEXT_PUBLIC_POSTHOG_HOST: '',
  };
  const off = { ...env, QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: '0', QB_EXPERIMENTAL_LOCALE_ASSET_SEED: '0' };
  const on = { ...env, QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: '1', QB_EXPERIMENTAL_LOCALE_ASSET_SEED: '1' };
  const method = { baseSha, headSha, node: process.version, lighthouse: '13.5.0', chrome: execFileSync('google-chrome', ['--version'], { encoding: 'utf8' }).trim(),
    target: 'local production-mode webpack builds with staging PUBLIC configuration; not hosted-staging certification',
    profile: 'default simulated mobile; 412x823 DPR1.75 Slow4G 4xCPU; fresh browser per CLI run',
    repeats: 3, order: 'baseline/candidate alternate; second block reversed', retainAllValidLows: true,
    invalid: 'nonzero CLI/runtimeError stops the job; never replaces a valid low', noProductionTracking: true, warmWireTransfer: 'not measured',
  };
  fs.writeFileSync(path.join(output, 'method.json'), JSON.stringify(method, null, 2));
  runNode(baseline, ['node_modules/next/dist/bin/next', 'build', '--webpack'], off, 'baseline-build.log');
  runNode(candidate, ['node_modules/next/dist/bin/next', 'build', '--webpack'], on, 'candidate-build.log');
  await startServer(baseline, 4995, off, 'baseline'); await startServer(candidate, 4996, on, 'candidate');
  const variants = [['baseline', 4995], ['candidate', 4996]];
  for (const [, port] of variants) for (const [, route] of routes) { const r = await fetch(`http://127.0.0.1:${port}${route}`); if (r.status !== 200) throw Error(`Warmup HTTP${r.status}`); await r.text(); }
  for (let repeat = 1; repeat <= 3; repeat++) for (const [name, route] of routes) for (const [variant, port] of repeat === 2 ? [...variants].reverse() : variants) {
    const report = path.join(output, `${variant}-${name}-${repeat}.json`);
    runNode(candidate, [cli, `http://127.0.0.1:${port}${route}`, '--chrome-flags=--headless', '--throttling-method=simulate',
      '--only-categories=performance,accessibility,best-practices,seo', '--max-wait-for-load=30000', '--output=json', `--output-path=${report}`, '--save-assets', '--quiet',
      '--blocked-url-patterns', ...blockedProduction], env, `${variant}-${name}-${repeat}.log`);
    const r = JSON.parse(fs.readFileSync(report)); if (r.runtimeError) throw Error(r.runtimeError.code);
    const net = r.audits['network-requests'].details.items;
    const issues = runtimeIssues(r);
    const unexpectedOrigins = [...new Set(net.filter(x => /^https?:/.test(x.url) && !allowedOrigins.has(new URL(x.url).origin)).map(x => new URL(x.url).origin))];
    if (unexpectedOrigins.length) throw Error(`Unexpected audit origin: ${unexpectedOrigins.join(', ')}`);
    const row = { name, route, variant, repeat, score: r.categories.performance.score * 100,
      lcp: r.audits['largest-contentful-paint'].numericValue, cls: r.audits['cumulative-layout-shift'].numericValue,
      a11y: r.categories.accessibility.score * 100, bestPractices: r.categories['best-practices'].score * 100,
      consoleErrors: r.audits['errors-in-console'].details?.items?.length ?? 0,
      issues,
      scriptBytes: net.filter(x => x.resourceType === 'Script').reduce((n, x) => n + x.transferSize, 0),
      documentBytes: net.filter(x => x.resourceType === 'Document').reduce((n, x) => n + x.transferSize, 0),
      scriptRequests: net.filter(x => x.resourceType === 'Script').length,
      totalBytes: net.reduce((n, x) => n + x.transferSize, 0), hostLoad: os.loadavg(), report: path.basename(report),
    };
    rows.push(row); fs.writeFileSync(path.join(output, 'measurements.json'), JSON.stringify(rows, null, 2)); console.log(JSON.stringify(row));
  }
  const gates = routes.map(([name, route]) => {
    const a = rows.filter(x => x.name === name && x.variant === 'baseline'), b = rows.filter(x => x.name === name && x.variant === 'candidate');
    const word = !name.endsWith('control'), before = median(a.map(x => x.lcp)), after = median(b.map(x => x.lcp));
    const quality = b.every((x, i) => x.cls <= a[i].cls && x.a11y >= a[i].a11y && x.bestPractices >= a[i].bestPractices
      && !x.issues.fatal && !x.issues.failedScripts.length && x.issues.errors.every(error => a[i].issues.errors.includes(error)));
    const bytes = b.every((x, i) => x.scriptRequests <= a[i].scriptRequests && (word
      ? x.totalBytes <= a[i].totalBytes && x.scriptBytes + x.documentBytes <= a[i].scriptBytes + a[i].documentBytes
      : x.scriptBytes + x.documentBytes - a[i].scriptBytes - a[i].documentBytes <= 4096));
    const score = median(b.map(x => x.score)), baselineScore = median(a.map(x => x.score));
    const causal = !word || baselineScore >= 90 || (before - after >= 200 && (before - after) / before >= 0.05 && b.filter((x, i) => x.lcp < a[i].lcp).length >= 2);
    return { name, route, baselineScores: a.map(x => x.score), candidateScores: b.map(x => x.score), median: score,
      lcpBefore: before, lcpAfter: after, quality, bytes, causal, pass: quality && bytes && causal && after - before <= 200 && (after - before) / before <= 0.05 && (!word || score >= 90) };
  });
  const summary = { method, gates, allEight90: gates.filter(x => !x.name.endsWith('control')).every(x => x.median >= 90), coldGatePassed: gates.every(x => x.pass),
    remaining: ['Hosted staging exact SHA all8 three-run matrix', 'Actual warm transfer gate', 'Real staging returning session/login/guest play and analytics exclusion'] };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary));
  // Verify the operational kill switch on the same source commit, not just
  // against the clean parent. Unused built chunks need not disappear; they
  // must not be requested and the original Flight dictionary must return.
  const stopped = servers.map(server => new Promise(resolve => server.exitCode !== null || server.signalCode !== null ? resolve() : server.once('exit', resolve)));
  for (const server of servers) server.kill('SIGTERM');
  await Promise.all(stopped); servers.length = 0;
  runNode(candidate, ['node_modules/next/dist/bin/next', 'build', '--webpack'], off, 'rollback-off-build.log');
  await startServer(candidate, 4996, off, 'rollback-off');
  const inactiveEntries = localeEntryAssets(candidate);
  const rollback = [];
  for (const [name, route] of routes.filter(([name]) => /^(es|tr|ka)-/.test(name))) {
    const html = await (await fetch(`http://127.0.0.1:4996${route}`)).text();
    const flight = [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].map(match => { try { const item = JSON.parse(match[1]); return item[0] === 1 ? item[1] : ''; } catch { return ''; } }).join('');
    rollback.push({ name, serializedDictionaryRestored: flight.includes('"initialMessages":{'), localeAssetSeedOff: flight.includes('"localeAssetSeed":false') });
  }
  fs.writeFileSync(path.join(output, 'rollback-off.json'), JSON.stringify({ headSha, rollback }, null, 2));
  if (rollback.some(x => !x.serializedDictionaryRestored || !x.localeAssetSeedOff)) throw Error('Rollback delivery check failed');
  const rollbackTraffic = [];
  for (const [name, route] of routes.filter(([name]) => ['es-chain', 'tr-chain', 'ka-chain'].includes(name))) {
    const report = path.join(output, `rollback-off-${name}.json`);
    runNode(candidate, [cli, `http://127.0.0.1:4996${route}`, '--chrome-flags=--headless', '--throttling-method=simulate',
      '--only-categories=performance,best-practices', '--output=json', `--output-path=${report}`, '--quiet', '--blocked-url-patterns', ...blockedProduction], env, `rollback-off-${name}.log`);
    const r = JSON.parse(fs.readFileSync(report)); if (r.runtimeError) throw Error(r.runtimeError.code);
    const requests = r.audits['network-requests'].details.items.filter(x => x.resourceType === 'Script').map(x => new URL(x.url).pathname);
    const issues = runtimeIssues(r);
    rollbackTraffic.push({ name, requestedInactiveEntries: requests.filter(url => inactiveEntries.includes(url)), issues });
  }
  fs.writeFileSync(path.join(output, 'rollback-off-traffic.json'), JSON.stringify({ inactiveEntries, rollbackTraffic }, null, 2));
  if (rollbackTraffic.some(x => x.requestedInactiveEntries.length || x.issues.fatal || x.issues.failedScripts.length)) throw Error('Rollback browser request check failed');
  if (!summary.coldGatePassed) process.exitCode = 1;
} catch (error) {
  console.error(error.message); fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, completedRuns: rows.length })); process.exitCode = 1;
} finally {
  for (const server of servers) server.kill('SIGTERM');
  try { sanitizeArtifacts(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  // Runner is ephemeral; preserve its exact baseline/builds until job teardown.
}
