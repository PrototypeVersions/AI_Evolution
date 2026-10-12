import test from 'node:test';
import assert from 'node:assert/strict';
import {World,inheritMemory,blankMemory} from '../src/engine.mjs';
import {analyze,assess,trialConfigs} from '../src/experiment.mjs';
test('a run can be resumed exactly, including future actions',()=>{
  const a=new World({seed:29});for(let i=0;i<90;i++)a.step();
  const b=World.restore(JSON.parse(JSON.stringify(a.snapshot())));a.finish();b.finish();assert.deepEqual(a.snapshot(),b.snapshot());
});
test('worlds with different future shift schedules are identical before the shift',()=>{
  const a=new World({shiftAt:120}),b=new World({shiftAt:0});
  for(let i=0;i<119;i++){a.step();b.step();}assert.deepEqual(a.history,b.history);assert.deepEqual(a.agents,b.agents);
  a.step();b.step();assert.notDeepEqual(a.recipes,b.recipes);
});
test('inheritance is copied, removed or shuffled without changing memory volume',()=>{
  const m=blankMemory();m[0]=[{q:.9,n:7},{q:.2,n:2},{q:.3,n:3}];
  const f=inheritMemory(m,'faithful',1,2);f[0][0].q=0;assert.equal(m[0][0].q,.9);
  assert.deepEqual(inheritMemory(m,'none',1,2),blankMemory());
  const s=inheritMemory(m,'scrambled',1,2);assert.notDeepEqual(s,m);
  assert.deepEqual(s[0].map(x=>x.n).sort(),m[0].map(x=>x.n).sort());
});
test('resource, space, genealogy and accounting invariants hold',()=>{
  for(const inheritance of ['none','faithful','scrambled']){
    const w=new World({inheritance,mutation:true});while(w.step()){
      assert(w.agents.length<=w.config.nodes);assert.equal(new Set(w.agents.map(a=>a.node)).size,w.agents.length);
      assert.equal(w.agents.length,w.config.founders+w.births-w.deaths);
      assert(w.nodes.every(n=>n.reserve>=0&&n.reserve<=3));
      assert(w.agents.every(a=>a.energy>0&&a.exploration>=.01&&a.exploration<=.8));
    }
    assert(w.lineage.every(a=>a.parent===null||a.parent<a.id));assert(w.result().occupancy>=0&&w.result().occupancy<=1);
  }
});
test('extinction contributes zero over the remaining fixed horizon',()=>{
  const w=new World();w.agents=[];w.tick=3;assert.equal(w.result().occupancy,0);
});
test('invalid or unbounded configurations are rejected',()=>{
  for(const input of [{nodes:100000},{seed:NaN},{mutation:'false'},{shiftAt:240},{inheritance:'shell'}])assert.throws(()=>new World(input));
});
test('analysis pairs independent seeds and excludes incomplete blocks',()=>{
  const rows=[];for(let seed=1;seed<=4;seed++)for(const shiftAt of [0,120])for(const arm of ['none','faithful','scrambled'])
    rows.push({seed,shiftAt,arm,occupancy:arm==='faithful'?(shiftAt?.5:.8):.4,survived:true,births:1});
  rows.push({seed:99,shiftAt:0,arm:'none',occupancy:1});
  const a=analyze(rows);assert.equal(a.completeSeeds,4);assert.equal(a.incompleteSeeds,1);assert(Math.abs(a.primary.mean+.3)<1e-10);
  assert.equal(assess(a,a).status,'Confirmed within this model');
  assert.equal([...trialConfigs()].length,144);
});
