// Adaptation 004: isolated, deterministic learning-response selection pilot.
// No imports, external services, clock reads, or filesystem access in the engine.
export const ID = 'adaptation-004-pilot-1';
export const CONFIG = Object.freeze({
  inputs: 2, hidden: 32, population: 4, rounds: 16, phaseRounds: 4,
  learningRate: 0.04, warmup: 128, ordinaryTraining: 1024, responseTraining: 784,
  selectionExamples: 56, probeTraining: 56, probeValidation: 56,
  presentLossTolerance: 0.03, mutationRate: 0.05, mutationScale: 0.05,
  auditExamples: 128, auditTraining: 256,
});
export const SEEDS = Object.freeze(Array.from({ length: 8 }, (_, i) => 24001 + i));
export const METHODS = Object.freeze([
  'response-pair', 'response-individual', 'current-pair', 'current-individual', 'continual',
]);
export const FAMILIES = Object.freeze(['linear', 'xor', 'radial']);
export const PAIRS = Object.freeze([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
export const FORWARD_MACS = 96;
export const TRAIN_MACS = 224;
export const ROUND_MACS = 939008;
export const ALGORITHM_MACS = 15138816;
export const AUDIT_MACS = 6815744;
export const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
export const clone = x => JSON.parse(JSON.stringify(x));

export function seedFor(...parts) {
  let h = 2166136261;
  for (const c of parts.join(':')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
export function makeWeights(seed) {
  const r = rng(seed);
  return {
    a: Array.from({ length: 64 }, () => (r() * 2 - 1) * Math.sqrt(6 / 34)),
    b: Array(32).fill(0),
    c: Array.from({ length: 32 }, () => (r() * 2 - 1) * Math.sqrt(6 / 33)), d: [0],
  };
}
export function forward(w, x) {
  const h = new Array(32);
  let z = w.d[0];
  for (let j = 0; j < 32; j++) {
    h[j] = Math.tanh(w.b[j] + w.a[2 * j] * x[0] + w.a[2 * j + 1] * x[1]);
    z += w.c[j] * h[j];
  }
  return { h, p: 1 / (1 + Math.exp(-z)) };
}
export function loss(p, y) {
  const q = Math.max(1e-12, Math.min(1 - 1e-12, p));
  return -(y * Math.log(q) + (1 - y) * Math.log(1 - q));
}
export function gradients(w, e) {
  const { h, p } = forward(w, e.x), delta = p - e.y;
  const b = h.map((v, j) => delta * w.c[j] * (1 - v * v));
  return { a: b.flatMap(v => e.x.map(x => v * x)), b, c: h.map(v => delta * v), d: [delta] };
}
export function train(w, e) {
  const { h, p } = forward(w, e.x), delta = p - e.y, rate = CONFIG.learningRate;
  // Calculate each hidden derivative using its OLD output weight.
  for (let j = 0; j < 32; j++) {
    const dh = delta * w.c[j] * (1 - h[j] * h[j]);
    w.a[2 * j] -= rate * dh * e.x[0];
    w.a[2 * j + 1] -= rate * dh * e.x[1];
    w.b[j] -= rate * dh;
    w.c[j] -= rate * delta * h[j];
  }
  w.d[0] -= rate * delta;
}
export function task(seed, family) {
  if (![...FAMILIES, 'wave'].includes(family)) throw Error('Unknown task family');
  const r = rng(seed);
  return { family, angle: r() * 2 * Math.PI, offset: (r() * 2 - 1) * 0.3,
    cx: (r() * 2 - 1) * 0.25, cy: (r() * 2 - 1) * 0.25,
    radius: 0.65 + r() * 0.35, axis: 1 + r() * 0.6, phase: r() * 2 * Math.PI };
}
export function label(t, x) {
  const c = Math.cos(t.angle), s = Math.sin(t.angle);
  const u = c * x[0] + s * x[1], v = -s * x[0] + c * x[1];
  const uc = c * (x[0] - t.cx) + s * (x[1] - t.cy);
  const vc = -s * (x[0] - t.cx) + c * (x[1] - t.cy);
  if (t.family === 'linear') return +(u > t.offset);
  if (t.family === 'xor') return +(uc * vc >= 0);
  if (t.family === 'radial') return +(uc * uc + (vc * t.axis) ** 2 < t.radius ** 2);
  return +(Math.sin(3 * u + t.phase) + 0.5 * v > 0);
}
export function examples(t, seed, n) {
  const r = rng(seed);
  return Array.from({ length: n }, () => { const x = [r() * 2 - 1, r() * 2 - 1]; return { x, y: label(t, x) }; });
}
export function score(probabilities, es) {
  return { loss: mean(es.map((e, i) => loss(probabilities[i], e.y))),
    accuracy: mean(es.map((e, i) => +(+(probabilities[i] >= 0.5) === e.y))) };
}
export function scorePair(predictions, es, pair) {
  return score(es.map((_, i) => mean(pair.map(j => predictions[j][i]))), es);
}
export function choosePair(method, currentPredictions, currentExamples, probes = []) {
  if (!METHODS.includes(method)) throw Error('Unknown method');
  const currentIndividual = currentPredictions.map(ps => score(ps, currentExamples).loss);
  const candidate = PAIRS.map(pair => ({ pair: [...pair],
    currentLoss: scorePair(currentPredictions, currentExamples, pair).loss,
    currentIndividualLoss: mean(pair.map(j => currentIndividual[j])),
  }));
  const bestCurrent = Math.min(...candidate.map(c => c.currentLoss));
  const response = method.startsWith('response-');
  if (response && probes.length !== 3) throw Error('Three development probes required');
  for (const c of candidate) {
    c.eligible = !response || c.currentLoss <= bestCurrent + CONFIG.presentLossTolerance;
    if (response) {
      c.responsePairLoss = mean(probes.map(p => scorePair(p.predictions, p.examples, c.pair).loss));
      c.responseIndividualLoss = mean(probes.flatMap(p => c.pair.map(j => score(p.predictions[j], p.examples).loss)));
    }
    c.objective = method === 'response-pair' ? c.responsePairLoss
      : method === 'response-individual' ? c.responseIndividualLoss
      : method === 'current-individual' ? c.currentIndividualLoss : c.currentLoss;
  }
  // Array order is lexicographic; explicit tie-break remains stable across runtimes.
  const eligible = candidate.filter(c => c.eligible).sort((a, b) =>
    a.objective - b.objective || a.pair[0] - b.pair[0] || a.pair[1] - b.pair[1]);
  return { pair: eligible[0].pair, candidate, bestCurrent };
}
function ledger() { return { currentTraining: 0, selectionForward: 0, probeTraining: 0, probeForward: 0, macs: 0 }; }
function trainCounted(w, es, counts, key) {
  for (const e of es) train(w, e);
  counts[key] += es.length; counts.macs += es.length * TRAIN_MACS;
}
function predictCounted(w, es, counts, key) {
  counts[key] += es.length; counts.macs += es.length * FORWARD_MACS;
  return es.map(e => forward(w, e.x).p);
}
export function mutate(w, seed) {
  const out = clone(w), r = rng(seed);
  let changed = 0;
  for (const key of ['a', 'b', 'c', 'd']) for (let i = 0; i < out[key].length; i++) {
    if (r() < CONFIG.mutationRate) { out[key][i] += (r() * 2 - 1) * CONFIG.mutationScale; changed++; }
  }
  return { weights: out, changed };
}

// This function has no access to future task examples or outcome scores.
export function runPopulation(seed, { rounds = CONFIG.rounds, methods = METHODS } = {}) {
  const firstTask = task(seedFor(seed, 'current-task', 0), 'linear');
  const warmup = examples(firstTask, seedFor(seed, 'warmup'), CONFIG.warmup);
  const arms = Object.fromEntries(methods.map(method => {
    if (!METHODS.includes(method)) throw Error('Unknown method');
    const counts = ledger();
    const agents = Array.from({ length: 4 }, (_, slot) => {
      const weights = makeWeights(seedFor(seed, 'founder', slot));
      trainCounted(weights, warmup, counts, 'currentTraining');
      return { id: `${method}-${slot}`, parent: null, generation: 0, born: 0, weights };
    });
    return [method, { agents, counts, nextId: 4, selections: [], births: [], snapshots: [] }];
  }));
  for (let round = 1; round <= rounds; round++) {
    const phase = Math.floor((round - 1) / CONFIG.phaseRounds);
    const currentTask = task(seedFor(seed, 'current-task', phase), FAMILIES[phase % 3]);
    const stream = examples(currentTask, seedFor(seed, 'current-training', round), CONFIG.ordinaryTraining);
    const selection = examples(currentTask, seedFor(seed, 'current-selection', round), CONFIG.selectionExamples);
    const developments = FAMILIES.map(family => {
      const t = task(seedFor(seed, 'development-task', round, family), family);
      return { family, training: examples(t, seedFor(seed, 'development-training', round, family), CONFIG.probeTraining),
        validation: examples(t, seedFor(seed, 'development-validation', round, family), CONFIG.probeValidation) };
    });
    for (const method of methods) {
      const arm = arms[method], startMacs = arm.counts.macs, response = method.startsWith('response-');
      const length = response ? CONFIG.responseTraining : CONFIG.ordinaryTraining;
      for (const a of arm.agents) trainCounted(a.weights, stream.slice(0, length), arm.counts, 'currentTraining');
      const predictions = arm.agents.map(a => predictCounted(a.weights, selection, arm.counts, 'selectionForward'));
      const probes = response ? developments.map(d => ({ examples: d.validation, predictions: arm.agents.map(a => {
        const temp = clone(a.weights);
        trainCounted(temp, d.training, arm.counts, 'probeTraining');
        return predictCounted(temp, d.validation, arm.counts, 'probeForward');
      }) })) : [];
      const choice = choosePair(method, predictions, selection, probes);
      if (arm.counts.macs - startMacs !== ROUND_MACS) throw Error('Unequal round compute');
      const selected = choice.pair.map(i => arm.agents[i]);
      const measurement = scorePair(predictions, selection, choice.pair);
      arm.selections.push({ round, family: currentTask.family, pair: choice.pair,
        parents: selected.map(a => a.id), generations: selected.map(a => a.generation),
        current: measurement, candidate: choice.candidate, counts: clone(arm.counts) });
      if (round % 4 === 0) arm.snapshots.push({ round, method, selected: clone(selected), counts: clone(arm.counts) });
      if (method !== 'continual' && round < rounds) {
        const retired = [0, 1, 2, 3].filter(i => !choice.pair.includes(i));
        for (let k = 0; k < 2; k++) {
          const parent = selected[k], old = arm.agents[retired[k]];
          const child = mutate(parent.weights, seedFor(seed, 'mutation', round, k));
          const a = { id: `${method}-${arm.nextId++}`, parent: parent.id,
            generation: parent.generation + 1, born: round, weights: child.weights };
          arm.births.push({ round, slot: retired[k], retired: old.id, child: a.id,
            parent: a.parent, generation: a.generation, changed: child.changed });
          arm.agents[retired[k]] = a;
        }
      }
    }
  }
  return { seed, rounds, arms };
}

// Sealed measurement stage: operates only on deep copies, after population selection ends.
export function evaluatePopulation(population) {
  const { seed } = population;
  const outcomes = {};
  for (const [method, arm] of Object.entries(population.arms)) {
    const counts = { training: 0, forward: 0, macs: 0 }, rows = [];
    for (const snapshot of arm.snapshots) {
      for (const family of [...FAMILIES, 'wave']) for (let n = 0; n < 2; n++) {
        const t = task(seedFor(seed, 'future-task', family, n), family);
        const training = examples(t, seedFor(seed, 'future-training', family, n), CONFIG.auditTraining);
        const audit = examples(t, seedFor(seed, 'future-audit', family, n), CONFIG.auditExamples);
        const copies = snapshot.selected.map(a => clone(a.weights));
        const stages = []; let trained = 0;
        for (const step of [0, 16, 64, 256]) {
          for (const w of copies) trainCounted(w, training.slice(trained, step), counts, 'training');
          trained = step;
          const ps = copies.map(w => predictCounted(w, audit, counts, 'forward'));
          const pair = scorePair(ps, audit, [0, 1]), individual = ps.map(p => score(p, audit));
          stages.push({ examplesPerModel: step, ...pair, individual,
            betterThanBoth: pair.loss < Math.min(...individual.map(i => i.loss)),
            advantageOverBestMember: Math.min(...individual.map(i => i.loss)) - pair.loss });
        }
        rows.push({ round: snapshot.round, family, taskIndex: n, stages });
      }
    }
    const summarize = predicate => {
      const stages = rows.filter(predicate).flatMap(row => row.stages.filter(s => s.examplesPerModel > 0));
      return { loss: mean(stages.map(s => s.loss)), accuracy: mean(stages.map(s => s.accuracy)),
        bothContributionRate: mean(stages.map(s => +s.betterThanBoth)),
        advantageOverBestMember: mean(stages.map(s => s.advantageOverBestMember)) };
    };
    outcomes[method] = { primary: summarize(row => row.family !== 'wave'),
      withheldFamily: summarize(row => row.family === 'wave'), counts, rows };
    if (population.rounds === 16 && (counts.macs !== AUDIT_MACS || arm.counts.macs !== ALGORITHM_MACS)) {
      throw Error('Unexpected full-run budget');
    }
  }
  return { seed, outcomes };
}

export function pairedSummary(values) {
  const avg = mean(values), n = values.length;
  const sd = Math.sqrt(values.reduce((s, x) => s + (x - avg) ** 2, 0) / (n - 1));
  // Fixed pilot: eight independent worlds, descriptive t interval, df=7.
  if (n !== 8) throw Error('Pilot summary requires all eight worlds');
  const margin = 2.364624251 * sd / Math.sqrt(n);
  return { mean: avg, sd, interval95: [avg - margin, avg + margin], values };
}
export function summarizePilot(worlds) {
  if (worlds.length !== 8 || worlds.some((w, i) => w.seed !== SEEDS[i])) throw Error('Missing or reordered pilot worlds');
  const methods = Object.fromEntries(METHODS.map(method => [method, {
    loss: pairedSummary(worlds.map(w => w.outcomes[method].primary.loss)),
    accuracy: pairedSummary(worlds.map(w => w.outcomes[method].primary.accuracy)),
    withheldFamilyLoss: pairedSummary(worlds.map(w => w.outcomes[method].withheldFamily.loss)),
    bothContributionRate: mean(worlds.map(w => w.outcomes[method].primary.bothContributionRate)),
    advantageOverBestMember: mean(worlds.map(w => w.outcomes[method].primary.advantageOverBestMember)),
  }]));
  const contrasts = Object.fromEntries(METHODS.filter(m => m !== 'response-pair').map(method => {
    const differences = worlds.map(w => w.outcomes['response-pair'].primary.loss - w.outcomes[method].primary.loss);
    return [method, { ...pairedSummary(differences), wins: differences.filter(d => d < 0).length }];
  }));
  const advance = ['current-pair', 'response-individual'].every(m => contrasts[m].mean <= -0.005 && contrasts[m].wins >= 6)
    && contrasts.continual.mean <= 0.005;
  return { methods, contrasts, decision: { advance, rule: 'Protocol 1 screening gate; exploratory, not confirmatory.' } };
}
