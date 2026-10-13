import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { ID, CONFIG, SEEDS, METHODS, ALGORITHM_MACS, AUDIT_MACS,
  runPopulation, evaluatePopulation, summarizePilot } from '../src/adaptation.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] || 'work/adaptation-pilot');
const paths = ['src/adaptation.mjs', 'scripts/pilot-adaptation.mjs', 'docs/ADAPTATION_PILOT_PROTOCOL.md'];
const sources = Object.fromEntries(await Promise.all(paths.map(async p => [p, await readFile(resolve(root, p), 'utf8')])));
const sourceHash = createHash('sha256');
for (const [path, source] of Object.entries(sources)) sourceHash.update(path + '\0' + source + '\0');
const sourceSha256 = sourceHash.digest('hex');
try {
  await stat(resolve(out, 'pilot.json'));
  throw Error('Completed pilot already exists. Choose a new output directory to preserve the record.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(out, { recursive: true });
const startedAt = new Date().toISOString(), start = performance.now(), cpuStart = process.cpuUsage();
const worlds = [], populationRecords = [];
for (const seed of SEEDS) {
  const before = performance.now();
  const population = runPopulation(seed);
  // Serialize prior to any future measurement. The evaluator cannot feed back into selection.
  const sealed = JSON.stringify(population);
  await writeFile(resolve(out, `population-${seed}.json`), sealed + '\n');
  const outcomes = evaluatePopulation(population);
  if (JSON.stringify(population) !== sealed) throw Error('Evaluation mutated the sealed population');
  const trajectorySha256 = createHash('sha256').update(sealed).digest('hex');
  worlds.push({ ...outcomes, trajectorySha256, algorithm: Object.fromEntries(METHODS.map(m => [m, {
    counts: population.arms[m].counts, selections: population.arms[m].selections,
    births: population.arms[m].births,
  }])) });
  populationRecords.push({ seed, file: `population-${seed}.json`, sha256: trajectorySha256 });
  // Progress deliberately does not print rankings while the fixed run is incomplete.
  console.log(`World ${seed} complete; ${((performance.now() - before) / 1000).toFixed(2)}s; sealed ${trajectorySha256.slice(0, 12)}`);
}
const cpu = process.cpuUsage(cpuStart), summary = summarizePilot(worlds);
const report = { id: ID, protocolCommit: '738da7a86fd1ce89a1732441215df921d7878ad8',
  sourceSha256, startedAt, finishedAt: new Date().toISOString(), config: CONFIG, seeds: SEEDS, methods: METHODS,
  compute: { algorithmMacsPerMethodWorld: ALGORITHM_MACS, auditMacsPerMethodWorld: AUDIT_MACS,
    totalMacsPerMethodWorld: ALGORITHM_MACS + AUDIT_MACS,
    exclusions: 'Scalar activations, biases, RNG, copying, mutation, pair scoring and I/O; not exact hardware FLOPs.' },
  runtime: { seconds: (performance.now() - start) / 1000, cpuUserSeconds: cpu.user / 1e6,
    cpuSystemSeconds: cpu.system / 1e6, peakRssKiB: process.resourceUsage().maxRSS,
    node: process.version, platform: process.platform, arch: process.arch },
  populationRecords, summary, worlds };
await writeFile(resolve(out, 'pilot.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ sourceSha256, runtime: report.runtime, summary }, null, 2));
