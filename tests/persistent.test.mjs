import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Continuum} from '../src/persistent.mjs';
import {continueWorld} from '../scripts/continue-world.mjs';
import {applyDecision,consultDirector} from '../scripts/director.mjs';
test('saved populations resume exactly across changes and beyond the former horizon',()=>{
  const uninterrupted=new Continuum();for(let i=0;i<237;i++)uninterrupted.step();
  const resumed=Continuum.restore(JSON.parse(JSON.stringify(uninterrupted.snapshot())));
  uninterrupted.events=[];
  for(let i=237;i<740;i++){uninterrupted.step();resumed.step();}
  assert.equal(resumed.tick,740);assert.deepEqual(resumed.snapshot(),uninterrupted.snapshot());assert.deepEqual(resumed.events,uninterrupted.events);
  assert.equal(resumed.environmentChanges,1);assert(resumed.agents.length>0);
});
test('population, inheritance, island and finite-compute invariants survive generations',()=>{
  const w=new Continuum();assert.deepEqual(w.metrics().islands.map(x=>x.population),[6,6,6,6]);
  assert(w.nodes.every(n=>n.neighbors.every(i=>w.nodes[i].island===n.island)));
  for(let i=0;i<1200;i++){
    w.step();assert.equal(w.agents.length,24+w.births-w.deaths);assert.equal(new Set(w.agents.map(a=>a.node)).size,w.agents.length);
    assert(w.nodes.every(n=>n.reserve>=0&&n.reserve<=3));
    assert(w.agents.every(a=>a.policy.length<=24&&a.ancestry.length<=12&&a.memory.flat().every(c=>Number.isFinite(c.q)&&c.q>=0&&c.q<=1)));
  }
  assert(w.migrations>0);assert(w.transfers>0);assert(w.agents.some(a=>a.policy.length!==2));
  const a=w.agents[0],b=w.birth(0,a);b.memory[0][0].q=42;assert.notEqual(a.memory[0][0].q,42);
  if(b.policy.length&&a.policy.length){b.policy[0].weights[0]=42;assert.notEqual(a.policy[0].weights[0],42);}
});
test('extinction and invalid checkpoints cannot trigger a new genesis',()=>{
  const w=new Continuum();w.agents=[];const before=w.snapshot();assert.equal(w.step(),false);assert.deepEqual(w.snapshot(),before);
  assert.equal(Continuum.restore(before).step(),false);assert.throws(()=>Continuum.restore({...before,id:'different-world'}));
});
test('checkpoint commits form a hash chain, reject corruption, and skip duplicate run IDs',async()=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'evolution-test-'));const opts={dataDir:path.join(tmp,'data'),archiveRoot:path.join(tmp,'archives'),env:{}};
  try{
    await assert.rejects(()=>continueWorld(opts),/Checkpoint missing/);
    const genesis=await continueWorld({...opts,genesis:true});
    await assert.rejects(()=>continueWorld({...opts,genesis:true}),/already exists/);
    const one=await continueWorld({...opts,ticks:24,runId:'first'}),two=await continueWorld({...opts,ticks:30,runId:'second'});
    assert.equal(one.parentHash,genesis.checkpointHash);assert.equal(two.parentHash,one.checkpointHash);assert.equal(two.fromTick,24);assert.equal(two.toTick,54);
    assert.equal((await continueWorld({...opts,runId:'second'})).skipped,true);
    const file=path.join(opts.dataDir,'world-state.json'),state=JSON.parse(await readFile(file));state.state.tick++;await writeFile(file,JSON.stringify(state));
    await assert.rejects(()=>continueWorld(opts),/integrity/);
  }finally{await rm(tmp,{recursive:true,force:true});}
});
const decision={action:'shift_habitat',island:0,habitat:1,observation:'A measured pattern.',hypothesis:'A possible mechanism.',prediction:'A future change.',reason:'A limited test.'};
test('director decisions require explicit intervention mode and valid conditions',()=>{
  const w=new Continuum();for(let i=0;i<400;i++)w.step();const before=structuredClone(w.recipes);
  assert.equal(applyDecision(w,decision,false).applied,false);assert.deepEqual(w.recipes,before);
  assert.throws(()=>applyDecision(w,{...decision,action:'run_code'},true));
  assert.equal(applyDecision(w,decision,true).applied,true);assert.equal(w.events.at(-1).source,'GPT director');
  assert.equal(applyDecision(w,decision,true).applied,false);
});
test('GPT adapter makes no calls by default, validates output and observes its daily gate',async()=>{
  const w=new Continuum();let calls=0;const fetcher=async()=>{calls++;return {ok:true,json:async()=>({status:'completed',id:'test',model:'test',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...decision,action:'observe'})}]}]})};};
  await consultDirector(w,null,{env:{},fetcher});assert.equal(calls,0);
  const now=new Date('2026-10-13T11:00:00Z'),env={DIRECTOR_ENABLED:'true',OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
  const d=await consultDirector(w,null,{env,fetcher,now});assert.equal(calls,1);assert.equal(d.entry.outcome.applied,false);assert(!JSON.stringify(d).includes('test-key'));
  await consultDirector(w,d.day,{env,fetcher,now});assert.equal(calls,1);
});
