import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {advance} from '../scripts/advance-inheritance.mjs';
import {Study,CONFIG} from '../src/inheritance.mjs';
test('runner preserves a verifiable chain, refuses resets/tampering, and makes run IDs idempotent',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'inheritance-test-'));const opts={dataDir:path.join(root,'data'),archiveRoot:path.join(root,'archives'),rounds:1,env:{}};
 try {const first=await advance({...opts,genesis:true});await assert.rejects(advance({...opts,genesis:true}),/cannot replace/);const result=await advance({...opts,runId:'101'});assert.equal(result.parentHash,first.checkpointHash);assert.equal(result.toRound,1);const state=JSON.parse(await readFile(path.join(opts.dataDir,'checkpoint.json')));assert.equal(state.checkpointHash,result.checkpointHash);assert.ok((await readFile(result.archive)).length>1000);assert.equal((await advance({...opts,runId:'101'})).skipped,true);
 const report=JSON.parse(await readFile(path.join(opts.dataDir,'observatory.json')));report.round=999;await writeFile(path.join(opts.dataDir,'observatory.json'),JSON.stringify(report));await assert.rejects(advance({...opts,runId:'102'}),/integrity/);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('assays charge every arm equally and a completed chapter cannot silently restart',()=>{const s=new Study();s.state.round=23;s.step();for(const rep of s.state.replicates){const arms=Object.values(rep.arms);assert.deepEqual(arms[0].ledger,arms[1].ledger);assert.deepEqual(arms[1].ledger,arms[2].ledger);assert.equal(arms[0].ledger.assayTrainingExamples,512);assert.equal(arms[0].assay.round,24);}s.state.round=CONFIG.maxRounds;assert.throws(()=>s.step(),/Chapter complete/);assert.equal(s.state.round,384);});
