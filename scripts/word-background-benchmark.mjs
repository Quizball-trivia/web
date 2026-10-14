/** CI-only, offline, browser-cold diagnostic. Never deploys or activates a feature. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const inside = process.argv[2] === '--inside';
const baseSha = process.argv[inside ? 3 : 2];
const headSha = inside ? process.argv[4] : execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const output = process.env.QB_BENCHMARK_OUTPUT;
const cli = process.env.QB_LIGHTHOUSE_CLI;
const tempRoot = process.env.RUNNER_TEMP;
if (process.platform !== 'linux' || process.version !== 'v22.22.2' || process.env.GITHUB_ACTIONS !== 'true'
  || process.env.CI !== 'true' || root !== process.env.GITHUB_WORKSPACE || !root.startsWith('/home/runner/work/')
  || ![baseSha, headSha].every(x => /^[a-f0-9]{40}$/.test(x ?? ''))
  || !output || !tempRoot || !path.resolve(output).startsWith(path.resolve(tempRoot) + path.sep)
  || !cli || !path.resolve(cli).startsWith(path.resolve(tempRoot) + path.sep)) throw Error('CI-only benchmark configuration invalid');
const raw = path.join(output, 'raw'), safe = path.join(output, 'safe');
const log = data => console.log(JSON.stringify(data));
const write = (name, value) => fs.writeFileSync(path.join(safe, name), JSON.stringify(value, null, 2));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const pathname = value => { try { return new URL(value).pathname; } catch { return ''; } };
const fingerprint = html => createHash('sha256').update(JSON.stringify({
  lang: html.match(/<html[^>]*\blang="([^"]*)"/)?.[1] ?? null,
  title: html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? null,
  h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(x => x[1]),
  metadata: [...html.matchAll(/<(?:link|meta)\b[^>]*>/g)].map(x => x[0]).filter(x => /canonical|hreflang|name="robots"/.test(x)),
  structuredData: [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]),
})).digest('hex');
const pages = [
  ['en-chain', '/en/football-games/football-name-chain'], ['en-shared', '/en/football-games/played-for-both-clubs'],
  ['es-chain', '/es/juegos-de-futbol/cadena-de-futbolistas'], ['es-shared', '/es/juegos-de-futbol/jugador-en-comun'],
  ['tr-chain', '/tr/futbol-oyunlari/son-harfle-futbolcu'], ['tr-shared', '/tr/futbol-oyunlari/ortak-futbolcu-oyunu'],
  ['ka-chain', '/ka/football-games/football-name-chain'], ['ka-shared', '/ka/football-games/played-for-both-clubs'],
  ['hub-control', '/en'], ['settings-control', '/settings'],
];
async function publicKey() {
  const origin = 'https://staging.quizball.io';
  const get = async url => {
    const target = new URL(url, origin);
    if (target.origin !== origin) throw Error('Public staging asset origin invalid');
    const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error('Public staging configuration unavailable');
    const text = await response.text();
    if (Buffer.byteLength(text) > 4 * 1024 * 1024) throw Error('Public asset size invalid');
    return text;
  };
  const html = await get('/en/football-games/football-name-chain');
  const scripts = [...new Set([...html.matchAll(/<script[^>]*src="([^"]+)/g)].map(m => m[1].replaceAll('&amp;', '&')))];
  if (scripts.length > 70) throw Error('Public script inventory invalid');
  for (const script of scripts) for (const token of (await get(script)).match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try { const value = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')); if (value.ref === 'nsdfiprfmhdqhbfxfwpv' && value.role === 'anon') return token; } catch { /* not the public staging key */ }
  }
  throw Error('Verified public staging configuration missing');
}
if (!inside) {
  if (fs.existsSync(output)) throw Error('Refusing to overwrite benchmark output');
  fs.mkdirSync(raw, { recursive: true }); fs.mkdirSync(safe, { recursive: true });
  const identity = os.userInfo();
  if (identity.username !== 'runner' || identity.uid <= 0 || identity.gid <= 0) throw Error('Hosted nonroot runner required');
  const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  Object.assign(env, {
    CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: root, RUNNER_TEMP: tempRoot,
    QB_BENCHMARK_OUTPUT: output, QB_LIGHTHOUSE_CLI: cli, QB_PARENT_NETNS: fs.readlinkSync('/proc/self/ns/net'),
    QB_RUNNER_UID: String(identity.uid), QB_RUNNER_GID: String(identity.gid),
    VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'staging', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SITE_URL: 'https://staging.quizball.io', NEXT_PUBLIC_API_URL: 'https://api-staging.quizball.io',
    NEXT_PUBLIC_SUPABASE_URL: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: await publicKey(),
    NEXT_PUBLIC_POSTHOG_KEY: '', NEXT_PUBLIC_POSTHOG_HOST: '',
    QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: '0', QB_EXPERIMENTAL_LOCALE_ASSET_SEED: '0',
  });
  // The only privileged step creates an isolated network and then permanently
  // drops privileges/groups/capabilities before any application code executes.
  const command = 'ip link set lo up; exec setpriv --reuid="$1" --regid="$2" --clear-groups --no-new-privs --bounding-set=-all --inh-caps=-all --ambient-caps=-all "$3" "$4" --inside "$5" "$6"';
  const result = spawnSync('sudo', ['--non-interactive', '-E', 'unshare', '--net', '--', 'sh', '-c', command, 'qb-offline',
    String(identity.uid), String(identity.gid), process.execPath, fileURLToPath(import.meta.url), baseSha, headSha], { env, stdio: 'inherit', timeout: 42 * 60 * 1000 });
  if (result.status !== 0) { write('infrastructure.json', { completed: false, reason: 'isolated-process-failed', status: result.status }); process.exitCode = 1; }
  } else {
  const servers = [], rows = [], preflight = [];
  try {
    const interfaces = JSON.parse(execFileSync('ip', ['-j', 'link', 'show'], { encoding: 'utf8' }));
    if (interfaces.length !== 1 || interfaces[0].ifname !== 'lo'
      || JSON.parse(execFileSync('ip', ['-j', 'route', 'show', 'default'], { encoding: 'utf8' })).length
      || JSON.parse(execFileSync('ip', ['-j', '-6', 'route', 'show', 'default'], { encoding: 'utf8' })).length
      || fs.readlinkSync('/proc/self/ns/net') === process.env.QB_PARENT_NETNS
      || os.userInfo().uid !== Number(process.env.QB_RUNNER_UID) || os.userInfo().uid === 0
      || !/NoNewPrivs:\s+1/.test(fs.readFileSync('/proc/self/status', 'utf8'))) throw Error('network-isolation-invalid');
    for (const name of ['package.json', 'package-lock.json']) if (git(['show', `${baseSha}:${name}`]) !== git(['show', `${headSha}:${name}`])) throw Error('dependency-drift');
    if (fs.existsSync(path.join(root, '.next')) || git(['status', '--porcelain', '--untracked-files=no']).trim()) throw Error('checkout-not-clean');
    const version = JSON.parse(fs.readFileSync(path.resolve(cli, '../../package.json'))).version;
    if (version !== '13.5.0') throw Error('lighthouse-version-invalid');
    const seed = createHash('sha256').update(baseSha + headSha).digest('hex').slice(0, 8);
    let state = Number.parseInt(seed, 16); const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
    const shuffle = values => { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; };
    const method = { baseSha, headSha, node: process.version, lighthouse: version, chrome: execFileSync('google-chrome', ['--version'], { encoding: 'utf8' }).trim(),
      offline: true, onlyLoopback: true, unprivileged: true, noNewPrivileges: true, childEnvAllowlisted: true,
      identicalBuildCwd: true, eachSnapshotOwnsSourcePublicAndBuild: true, profile: 'unmodified Lighthouse13.5 simulated mobile; fresh browser profile per run',
      cacheMeaning: 'BROWSER-COLD only; warmed SSR servers and OS caches; no claim of full-stack coldness',
      samplesEach: 5, seed, order: 'seeded shuffled page blocks; paired A/B reversed in alternating blocks', allValidLowsRetained: true, retries: 0,
      limitations: ['offline diagnostic only', 'external dependencies invalidate results', 'not hosted-staging90 certification', 'no authentication/guest-play/tracking delivery certification'] };
    write('method.json', method);
    const environments = [false, true].map(on => ({ ...process.env, NODE_ENV: 'production', QB_EXPERIMENTAL_WORD_BACKGROUND: on ? '1' : '0' }));
    const snapshots = [];
    for (const [index, ref] of [baseSha, headSha].entries()) {
      git(['checkout', '--detach', ref]);
      const fd = fs.openSync(path.join(raw, `build-${index}.log`), 'w');
      const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], { cwd: root, env: environments[index], stdio: ['ignore', fd, fd], timeout: 600000 }); fs.closeSync(fd);
      if (result.status !== 0) throw Error('application-build-failed');
      if (git(['status', '--porcelain', '--untracked-files=no']).trim()) throw Error('generated-tracked-source-drift');
      const snapshot = path.join(output, `snapshot-${index}`); fs.mkdirSync(snapshot);
      const archive = spawn('git', ['archive', ref], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
      const extract = spawn('tar', ['-x', '-C', snapshot], { stdio: ['pipe', 'ignore', 'ignore'] }); archive.stdout.pipe(extract.stdin);
      await Promise.all([archive, extract].map(p => new Promise((resolve, reject) => p.on('error', reject).on('exit', code => code === 0 ? resolve() : reject(Error('snapshot-failed'))))));
      fs.renameSync(path.join(root, '.next'), path.join(snapshot, '.next'));
      fs.symlinkSync(path.join(root, 'node_modules'), path.join(snapshot, 'node_modules'), 'dir'); snapshots.push(snapshot);
    }
    for (const [index, snapshot] of snapshots.entries()) {
      const port = 4995 + index, fd = fs.openSync(path.join(raw, `server-${index}.log`), 'w');
      const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: snapshot, env: environments[index], stdio: ['ignore', fd, fd] }); fs.closeSync(fd); servers.push(child);
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(`http://127.0.0.1:${port}${pages[0][1]}`, { signal: AbortSignal.timeout(2000) })).status === 200) { ready = true; break; } } catch { /* startup */ } await new Promise(resolve => setTimeout(resolve, 100)); }
      if (!ready) throw Error('server-unavailable');
      for (const [name, route] of pages) {
        const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(20000) });
        if (response.status !== 200) throw Error('preflight-http-failed');
        const html = await response.text();
        const entry = { name, variant: index ? 'candidate' : 'baseline', status: response.status, fingerprint: fingerprint(html),
          cacheControl: response.headers.get('cache-control'),
          cspFingerprint: createHash('sha256').update((response.headers.get('content-security-policy') ?? '').replace(/'nonce-[^']+'/g, "'nonce-redacted'")).digest('hex') };
        if (index) {
          const previous = preflight.find(x => x.name === name && x.variant === 'baseline');
          if (entry.fingerprint !== previous.fingerprint || entry.cacheControl !== previous.cacheControl || entry.cspFingerprint !== previous.cspFingerprint) throw Error('semantic-or-header-drift');
        }
        preflight.push(entry); write('preflight.json', preflight);
      }
    }
    for (let repeat = 1; repeat <= 5; repeat++) for (const [name, route] of shuffle(pages)) for (const index of repeat % 2 ? [0, 1] : [1, 0]) {
      const started = Date.now(), file = path.join(raw, `${index}-${name}-${repeat}.json`), fd = fs.openSync(file + '.log', 'w');
      if (fs.existsSync(file)) throw Error('measurement-already-exists');
      const run = spawnSync(process.execPath, [cli, `http://127.0.0.1:${4995 + index}${route}`, '--chrome-flags=--headless', '--throttling-method=simulate',
        '--only-categories=performance,accessibility,best-practices,seo', '--max-wait-for-load=30000', '--output=json', `--output-path=${file}`, '--quiet'],
      { env: environments[index], stdio: ['ignore', fd, fd], timeout: 120000 }); fs.closeSync(fd);
      const report = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null;
      const network = report?.audits?.['network-requests']?.details?.items ?? [];
      const external = network.filter(item => /^https?:/.test(item.url) && !['http://127.0.0.1:4995', 'http://127.0.0.1:4996'].includes(new URL(item.url).origin));
      const failedScripts = network.filter(x => x.resourceType === 'Script' && (!x.finished || !x.statusCode || x.statusCode >= 400)).length;
      const metrics = [report?.categories?.performance?.score, report?.categories?.accessibility?.score, report?.categories?.['best-practices']?.score,
        report?.audits?.['largest-contentful-paint']?.numericValue, report?.audits?.['cumulative-layout-shift']?.numericValue];
      const valid = run.status === 0 && report && !report.runtimeError && external.length === 0 && failedScripts === 0 && metrics.every(Number.isFinite);
      const bytes = type => network.filter(x => x.resourceType === type).reduce((sum, x) => sum + x.transferSize, 0);
      const row = { name, variant: index ? 'candidate' : 'baseline', repeat, sequence: rows.length + 1, startedUTC: new Date(started).toISOString(), elapsedMs: Date.now() - started,
        valid: Boolean(valid), invalidReason: valid ? null : external.length ? 'external-rendering-dependency' : failedScripts ? 'failed-script-request' : 'cli-or-runtime-or-missing-metric', externalRequestCount: external.length,
        failedScriptRequests: failedScripts,
        score: valid ? report.categories.performance.score * 100 : null, LCP: valid ? report.audits['largest-contentful-paint'].numericValue : null,
        CLS: valid ? report.audits['cumulative-layout-shift'].numericValue : null, a11y: valid ? report.categories.accessibility.score * 100 : null,
        bestPractices: valid ? report.categories['best-practices'].score * 100 : null, consoleErrors: valid ? report.audits['errors-in-console'].details?.items?.length ?? 0 : null,
        scriptRequests: network.filter(x => x.resourceType === 'Script').length, scriptBytes: bytes('Script'), cssBytes: bytes('Stylesheet'), documentBytes: bytes('Document'), imageBytes: bytes('Image'),
        totalBytes: network.reduce((sum, x) => sum + x.transferSize, 0), originalBackgroundRequests: network.filter(x => /\/bg-pattern\.[a-f0-9]+\.avif$/.test(pathname(x.url))).length,
        candidateBackgroundRequests: network.filter(x => /\/bg-pattern-mobile-1080\.[a-f0-9]+\.avif$/.test(pathname(x.url))).length, hostLoad: os.loadavg() };
      rows.push(row); write('measurements.json', rows); log(row);
      if (!valid) throw Error('measurement-invalid');
    }
    const gates = pages.map(([name]) => {
      const a = rows.filter(x => x.name === name && x.variant === 'baseline'), b = rows.filter(x => x.name === name && x.variant === 'candidate');
      const before = median(a.map(x => x.LCP)), after = median(b.map(x => x.LCP)), word = !name.endsWith('control');
      const quality = b.every((x, i) => x.CLS <= a[i].CLS && x.a11y >= a[i].a11y && x.bestPractices >= a[i].bestPractices && x.consoleErrors <= a[i].consoleErrors);
      const budget = b.every((x, i) => x.scriptRequests <= a[i].scriptRequests && x.scriptBytes + x.cssBytes + x.documentBytes - a[i].scriptBytes - a[i].cssBytes - a[i].documentBytes <= 1024
        && (!word || (x.totalBytes <= a[i].totalBytes - 6500 && x.originalBackgroundRequests === 0 && x.candidateBackgroundRequests === 1)));
      return { name, baselineScores: a.map(x => x.score), candidateScores: b.map(x => x.score), median: median(b.map(x => x.score)), LCPBefore: before, LCPAfter: after,
        quality, budget, noRegression: after - before <= 200 && (after - before) / before <= 0.05 };
    });
    const summary = { method, gates, diagnosticGatePass: gates.every(x => x.quality && x.budget && x.noRegression), allEightCI90: gates.filter(x => !x.name.endsWith('control')).every(x => x.median >= 90),
      hostedStageVerified: false, productionPromotionAuthorized: false, next: 'Hosted staging and functional gates remain mandatory; no activation/deploy from this job' };
    write('summary.json', summary); log(summary);
    if (!summary.diagnosticGatePass) process.exitCode = 1;
  } catch (error) {
    const known = ['network-isolation-invalid', 'dependency-drift', 'checkout-not-clean', 'lighthouse-version-invalid', 'application-build-failed',
      'generated-tracked-source-drift', 'snapshot-failed', 'server-unavailable', 'preflight-http-failed', 'semantic-or-header-drift', 'measurement-already-exists', 'measurement-invalid'];
    write('failure.json', { completed: false, completedRuns: rows.length, reason: known.includes(error?.message) ? error.message : 'benchmark-or-infrastructure-gate-failed', noDeploymentPerformed: true }); process.exitCode = 1;
  } finally {
    for (const child of servers) child.kill('SIGTERM');
    try { git(['checkout', '--detach', headSha]); } catch { process.exitCode = 1; }
  }
}
