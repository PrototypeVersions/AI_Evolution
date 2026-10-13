import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Symbiosis,circuit,LIMITS} from '../src/symbiosis.mjs';
import {advance} from '../scripts/advance-symbiosis.mjs';
import {reviewWorld} from '../scripts/symbiosis-director.mjs';
function run(w,ticks){for(let i=0;i<ticks;i++){if(!w.step())break;w.events=[];}return w;}
test('new ecology resumes exactly, including decisions, seasons, resource construction and RNG',()=>{
  const a=run(new Symbiosis(101),730),b=run(Symbiosis.restore(run(new Symbiosis(101),291).snapshot()),439);assert.deepEqual(b.snapshot(),a.snapshot());
});
test('ecology preserves spatial, population, inventory, circuit and demographic invariants',()=>{
  for(const seed of [101,202,303]){const w=new Symbiosis(seed);for(let i=0;i<1500;i++){w.step();w.events=[];assert.equal(new Set(w.agents.map(a=>a.node)).size,w.agents.length);assert.equal(w.agents.length,LIMITS.founders+w.births-w.deaths);
    for(const a of w.agents){assert.ok(a.food>=-1e-10&&a.food<=6&&a.mineral>=-1e-10&&a.mineral<=6);assert.ok(a.energy>0&&a.energy<=36);assert.ok(a.genes.units.length>=1&&a.genes.units.length<=48);for(const [i,u] of a.genes.units.entries()){assert.ok(u.a<12+i&&u.b<12+i);assert.ok(circuit(a.genes,w.sensors(a),a.q).scores.every(Number.isFinite));}}
  }assert.ok(w.agents.length>0,'diagnostic population should remain viable');}
});
test('bilateral trade conserves resources, requires a standing offer and complementary inventories',()=>{
  const w=new Symbiosis(11),a=w.agents[0],b=w.agents[1];w.agents=[a,b];b.node=w.nodes[a.node].neighbors[0];a.food=5;a.mineral=1;b.food=1;b.mineral=5;
  w.act(a,2);assert.equal(w.totals.trades,0);b.offerUntil=12;const before=[a.food+b.food,a.mineral+b.mineral];w.act(a,2);assert.equal(w.totals.trades,1);assert.deepEqual([a.food+b.food,a.mineral+b.mineral],before);assert.equal(a.food,4);assert.equal(b.food,2);
});
test('raid transfers conserve resources; guarding can block the same random attack',()=>{
  const w=new Symbiosis(11),a=w.agents[0],b=w.agents[1];w.agents=[a,b];b.node=w.nodes[a.node].neighbors[0];a.food=1;a.mineral=1;b.food=4;b.mineral=4;w.rand=()=>.4;
  w.act(a,4);assert.equal(w.totals.raids,1);assert.equal(a.food+b.food,5);assert.equal(a.mineral+b.mineral,5);b.guard=1;const before=b.food;w.act(a,4);assert.equal(w.totals.blocked,1);assert.equal(b.food,before);
});
test('a structure persists without its builder and increases a neighboring resource supply',()=>{
  const w=new Symbiosis(11),a=w.agents[0],site=w.nodes[a.node],neighbor=w.nodes[site.neighbors[0]];a.mineral=3;w.act(a,3);const b=Symbiosis.restore(w.snapshot());b.nodes[site.id].structure=0;w.agents=[];b.agents=[];
  // Retain one isolated organism so both worlds continue; no organism harvests the tested sites.
  w.birth(190,null);b.birth(190,null);site.food=0;neighbor.food=0;b.nodes[site.id].food=0;b.nodes[neighbor.id].food=0;w.step();b.step();assert.ok(site.structure>0);assert.ok(neighbor.food>b.nodes[neighbor.id].food);
});
test('extinction is terminal and offspring programs do not alias parents',()=>{
  const w=new Symbiosis();const p=w.agents[0],before=structuredClone(p.genes),child=w.birth(250,p);child.genes.bias[0]=99;assert.deepEqual(p.genes,before);w.agents=[];const tick=w.tick;assert.equal(w.step(),false);assert.equal(w.tick,tick);
});
test('persistent checkpoint refuses overwrite, corrupted records and duplicate accepted runs',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'symbiosis-')),dataDir=path.join(dir,'data'),archiveRoot=path.join(dir,'archives');const opts={dataDir,archiveRoot,env:{}};
  try{await advance({...opts,genesis:true});await assert.rejects(advance({...opts,genesis:true}),/replace/);const first=await advance({...opts,ticks:20,runId:'123'});const next=await advance({...opts,ticks:20,runId:'124'});assert.equal(next.parentHash,first.checkpointHash);assert.equal(next.fromTick,20);assert.equal((await advance({...opts,runId:'124'})).skipped,true);
    const p=path.join(dataDir,'checkpoint.json'),s=JSON.parse(await readFile(p));s.state.tick++;await writeFile(p,JSON.stringify(s));await assert.rejects(advance({...opts,ticks:1}),/integrity/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('advisory director is off by default and output cannot alter world state',async()=>{
  const w=new Symbiosis(),snapshot=w.snapshot();let calls=0;const fetcher=async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({observation:'Counts changed.',hypothesis:'Resource balance matters.',prediction:'Trade could rise.',proposedStudy:'Matched checkpoint comparison.'})}]}]})};};
  const report={after:w.metrics()};assert.equal((await reviewWorld(report,null,{env:{},fetcher})).mode,'not-connected');assert.equal(calls,0);const env={SYMBIOSIS_DIRECTOR_ENABLED:'true',OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'},r=await reviewWorld(report,null,{env,fetcher,now:new Date('2026-10-13T01:00:00Z')});assert.equal(calls,1);assert.equal(r.mode,'advisory');await reviewWorld(report,r.day,{env,fetcher,now:new Date('2026-10-13T02:00:00Z')});assert.equal(calls,1);assert.deepEqual(w.snapshot(),snapshot);
});
