import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { clone, makeWeights, forward, gradients, train, loss, task, examples, choosePair,
  mutate, runPopulation, evaluatePopulation, ROUND_MACS, TRAIN_MACS } from '../src/adaptation.mjs';

test('backpropagation agrees with numerical derivatives and the actual SGD update', () => {
  const w = makeWeights(91), e = { x: [0.37, -0.82], y: 1 }, g = gradients(w, e), before = clone(w);
  for (const key of ['a', 'b', 'c', 'd']) for (let i = 0; i < w[key].length; i++) {
    const v = w[key][i], h = 1e-5;
    w[key][i] = v + h; const plus = loss(forward(w, e.x).p, e.y);
    w[key][i] = v - h; const minus = loss(forward(w, e.x).p, e.y);
    w[key][i] = v;
    assert.ok(Math.abs((plus - minus) / (2 * h) - g[key][i]) < 1e-7);
  }
  train(w, e);
  for (const key of Object.keys(w)) for (let i = 0; i < w[key].length; i++) {
    assert.ok(Math.abs(w[key][i] - (before[key][i] - 0.04 * g[key][i])) < 1e-12);
  }
});

test('a learner actually generalizes on a separate sample of a simple linear task', () => {
  const t = task(792, 'linear'), w = makeWeights(793);
  const audit = examples(t, 794, 512);
  const averageLoss = () => audit.reduce((s, e) => s + loss(forward(w, e.x).p, e.y), 0) / audit.length;
  const initial = averageLoss();
  for (const e of examples(t, 795, 1500)) train(w, e);
  assert.ok(averageLoss() < initial * 0.5);
});

test('averaging predictions selects a complementary pair, rather than averaging individual losses', () => {
  const es = [{ y: 1 }, { y: 1 }];
  const ps = [[0.99, 0.2], [0.65, 0.65], [0.2, 0.99], [0.01, 0.01]];
  // Use a case where complementarity beats the strongest stand-alone candidate.
  const ps2 = [[0.99, 0.3], [0.6, 0.6], [0.3, 0.99], [0.01, 0.01]];
  assert.deepEqual(choosePair('current-pair', ps2, es).pair, [0, 2]);
  assert.notDeepEqual(choosePair('current-individual', ps, es).pair, [0, 2]);
});

test('response selection is driven by temporary learning and respects current competence', () => {
  const es = [{ y: 1 }, { y: 1 }], equal = Array.from({ length: 4 }, () => [0.6, 0.6]);
  const predictions = [[0.99, 0.3], [0.6, 0.6], [0.3, 0.99], [0.01, 0.01]];
  const probes = Array.from({ length: 3 }, () => ({ examples: es, predictions }));
  assert.deepEqual(choosePair('response-pair', equal, es, probes).pair, [0, 2]);
  const weakNow = [[0.01, 0.01], [0.8, 0.8], [0.01, 0.01], [0.8, 0.8]];
  assert.deepEqual(choosePair('response-pair', weakNow, es, probes).pair, [1, 3]);
});

test('mutation copies parents without altering their state', () => {
  const w = makeWeights(19), before = clone(w), child = mutate(w, 20);
  assert.deepEqual(w, before);
  assert.ok(child.changed > 0 && child.changed < 129);
  for (const key of Object.keys(w)) for (let i = 0; i < w[key].length; i++) {
    assert.ok(Math.abs(w[key][i] - child.weights[key][i]) <= 0.05);
  }
});

test('all methods pay identical neural compute; evaluation is isolated; births inherit recorded parents', () => {
  const population = runPopulation(81001, { rounds: 4 });
  const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
  const before = digest(population), outcomes = evaluatePopulation(population);
  assert.equal(digest(population), before);
  const macs = [];
  for (const [method, arm] of Object.entries(population.arms)) {
    assert.equal(arm.counts.macs, 512 * TRAIN_MACS + 4 * ROUND_MACS);
    assert.equal(arm.snapshots[0].selected.length, 2);
    assert.equal(arm.births.length, method === 'continual' ? 0 : 6);
    for (const birth of arm.births) {
      const selection = arm.selections[birth.round - 1];
      assert.ok(selection.parents.includes(birth.parent));
      assert.equal(birth.generation, selection.generations[selection.parents.indexOf(birth.parent)] + 1);
    }
    macs.push(outcomes.outcomes[method].counts.macs);
  }
  assert.equal(new Set(macs).size, 1);
  // Reordering methods cannot change RNG streams, selection or outcomes.
  const reversed = runPopulation(81001, { rounds: 4, methods: Object.keys(population.arms).reverse() });
  for (const method of Object.keys(population.arms)) assert.deepEqual(reversed.arms[method], population.arms[method]);
});
