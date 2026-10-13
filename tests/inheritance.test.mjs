import test from 'node:test';
import assert from 'node:assert/strict';
import {Study,CONFIG,PARAMETERS,FORWARD_MACS,TRAIN_MACS,POOLS,example,makeWeights,rng,forward,gradients,train,evaluate,clone} from '../src/inheritance.mjs';

test('training, selection and reporting inputs are disjoint; transformations compose in declared order',()=>{
  assert.equal(new Set(Object.values(POOLS).flat()).size,256);assert.equal(POOLS.train.length,192);assert.equal(POOLS.selection.length,32);assert.equal(POOLS.audit.length,32);
  assert.deepEqual(example(128,[1]).y,[0,0,0,0,0,0,0,1]);assert.deepEqual(example(128,[0,2]).y,[1,1,1,1,1,1,1,0]);assert.deepEqual(example(128,[3]).y,[1,0,0,0,0,0,0,1]);
});
test('backpropagation agrees with numerical derivatives in both layers and biases',()=>{
  const w=makeWeights(rng(3)),e=example(173,[3]),g=gradients(w,e),epsilon=1e-5;
  for(const [key,i] of [['a',5],['a',177],['b',7],['c',31],['c',99],['d',2]]){const old=w[key][i];w[key][i]=old+epsilon;const plus=evaluate(w,[e]).loss;w[key][i]=old-epsilon;const minus=evaluate(w,[e]).loss;w[key][i]=old;assert.ok(Math.abs(g[key][i]-(plus-minus)/(2*epsilon))<1e-7);}
});
test('weights learn an actual task with a decreasing supervised loss',()=>{const w=makeWeights(rng(8)),es=POOLS.train.map(n=>example(n,[2])),before=evaluate(w,es).loss;for(let t=0;t<20;t++)for(const e of es)train(w,e);const after=evaluate(w,es);assert.ok(after.loss<before*0.4);assert.ok(after.accuracy>0.95);assert.equal(Object.values(w).flat().length,PARAMETERS);});
test('all arms receive identical training and dense neural compute budgets',()=>{const s=new Study();s.step();for(const rep of s.state.replicates){const ledgers=Object.values(rep.arms).map(a=>a.ledger);assert.deepEqual(ledgers[0],ledgers[1]);assert.deepEqual(ledgers[1],ledgers[2]);assert.equal(ledgers[0].trainingExamples,2048);assert.equal(ledgers[0].macs,2048*TRAIN_MACS+832*FORWARD_MACS);assert.equal(rep.arms.inherit.agents.length,4);assert.equal(rep.arms.single.agents.length,1);}});
test('offspring inherit weights only in the inheritance arm, with a recorded parent',()=>{const s=new Study();s.step();for(const rep of s.state.replicates){const arm=rep.arms.inherit;for(const child of arm.agents.filter(a=>a.parent)){const parent=arm.agents.find(a=>a.id===child.parent);assert.ok(parent);const c=Object.values(child.weights).flat(),p=Object.values(parent.weights).flat();const changed=c.filter((v,i)=>v!==p[i]).length;assert.equal(changed,child.mutation.changed);assert.ok(changed<40);assert.equal(child.trainingExamples,parent.trainingExamples);}for(const child of rep.arms.reset.agents.filter(a=>a.parent))assert.equal(child.trainingExamples,0);}});
test('reporting-only evaluations cannot alter training, offspring or parent selection',()=>{const a=new Study(),b=new Study();for(let i=0;i<2;i++){a.step();b.step({auditFn:()=>({accuracy:0,transfer:1,exact:0,tasks:Array.from({length:4},()=>({accuracy:0}))})});}for(let r=0;r<3;r++)for(const arm of ['inherit','reset','single'])assert.deepEqual(a.state.replicates[r].arms[arm].agents,b.state.replicates[r].arms[arm].agents);});
test('saved continuation is exactly equivalent to uninterrupted execution',()=>{const a=new Study();a.step();const b=Study.restore(a.snapshot());a.step();b.step();assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.report(),b.report());});
test('inspection and forward evaluation never mutate weights',()=>{const w=makeWeights(rng(9)),before=clone(w);forward(w,example(22,[1]).x);assert.deepEqual(w,before);});
