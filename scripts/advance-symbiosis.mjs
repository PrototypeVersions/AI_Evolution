import {readFile,writeFile,mkdir,rename,open,rm,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Symbiosis,WORLD_ID,SCHEMA,HABITATS,ACTIONS,SENSORS,LIMITS} from '../src/symbiosis.mjs';
import {reviewWorld} from './symbiosis-director.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const sources=['src/symbiosis.mjs','scripts/advance-symbiosis.mjs','scripts/symbiosis-director.mjs'];
const encode=x=>JSON.stringify(x),sha=x=>createHash('sha256').update(x).digest('hex');
export async function sourceDigest(){return sha((await Promise.all(sources.map(f=>readFile(path.join(ROOT,f),'utf8')))).join('\n'));}
async function atomic(p,data){await writeFile(p+'.tmp',encode(data));await rename(p+'.tmp',p);}
function projection(w){return {nodes:w.nodes,agents:w.agents,lineages:w.lineages,metrics:w.metrics(),milestones:w.milestones};}
function compactFrame(w){const f=w.frame();f.nodes=f.nodes.map(row=>row.map(v=>Math.round(v*20)));delete f.metrics;return f;}
function note(before,after){
  const delta=Object.fromEntries(Object.keys(after.totals).map(k=>[k,after.totals[k]-before.totals[k]]));
  return {tick:after.tick,fromTick:before.tick,source:'Measured summary',title:`${after.population} lives, ${after.lineages} surviving ancestries`,text:`This chapter recorded ${after.births-before.births} births, ${after.deaths-before.deaths} deaths, ${delta.trades} completed exchanges, ${delta.builds} builds and ${delta.raids} successful raids.`,delta,
    caveat:'Actions include exploration. Program variety and length are not measures of intelligence; a single trajectory does not establish causality.'};
}
export async function advance({dataDir=path.join(ROOT,'data','symbiosis'),archiveRoot=path.join(ROOT,'research','symbiosis'),genesis=false,ticks=1000,runId=process.env.GITHUB_RUN_ID??null,attempt=process.env.GITHUB_RUN_ATTEMPT??'1',env=process.env}={}){
  if(!Number.isInteger(ticks)||ticks<1||ticks>5000)throw new Error('Continuation budget must be 1–5000 ticks');
  if(runId&&!/^\d+$/.test(runId))throw new Error('Invalid workflow run ID');
  if(!/^\d+$/.test(String(attempt)))throw new Error('Invalid attempt');
  await mkdir(dataDir,{recursive:true});const lock=path.join(dataDir,'.lock'),handle=await open(lock,'wx');
  try{
    const statePath=path.join(dataDir,'checkpoint.json'),viewPath=path.join(dataDir,'observatory.json'),sourceHash=await sourceDigest();let envelope,previous;
    if(genesis){
      // Either file blocks genesis, including an incomplete previous transaction.
      for(const p of [statePath,viewPath]){try{await readFile(p);throw new Error('Genesis cannot replace existing data');}catch(e){if(e.code!=='ENOENT')throw e;}}
      const w=new Symbiosis(),state=w.snapshot(),checkpointHash=sha(encode(state)),now=new Date().toISOString();
      envelope={id:WORLD_ID,schema:SCHEMA,segment:0,sourceHash,checkpointHash,startedAt:now,updatedAt:now,lastRunId:null,directorDay:null,state};
      previous={id:WORLD_ID,segment:0,sourceHash,checkpointHash,startedAt:now,updatedAt:now,...projection(w),habitats:HABITATS,actions:ACTIONS,sensors:SENSORS,limits:LIMITS,
        timeline:[w.metrics()],frames:[compactFrame(w)],chapters:[],notes:[],director:{mode:'not-connected',entries:[]},schedule:{ticks:1000,cron:'37 * * * *',description:'Hourly continuation; GitHub scheduling may be delayed.'}};
      await atomic(statePath,envelope);await atomic(viewPath,previous);return {genesis:true,tick:0,checkpointHash};
    }
    try{envelope=JSON.parse(await readFile(statePath,'utf8'));previous=JSON.parse(await readFile(viewPath,'utf8'));}catch{throw new Error('Saved world missing or unreadable. Refusing to reset.');}
    if(envelope.sourceHash!==sourceHash)throw new Error('World rules changed. A documented migration or distinct experiment is required.');
    if(envelope.checkpointHash!==sha(encode(envelope.state))||previous.checkpointHash!==envelope.checkpointHash||previous.segment!==envelope.segment||previous.metrics.tick!==envelope.state.tick)throw new Error('Checkpoint integrity failure');
    if(runId&&envelope.lastRunId===runId)return {skipped:true,reason:'This run already committed.'};
    if(!envelope.state.agents.length)return {skipped:true,reason:'Extinct; final checkpoint preserved.'};
    const w=Symbiosis.restore(envelope.state),before=w.metrics(),initial=w.snapshot(),frames=[],metrics=[],start=w.tick;
    for(let i=0;i<ticks;i++){if(!w.step())break;if(w.tick%25===0)metrics.push(w.metrics());if(i>=ticks-300&&w.tick%5===0)frames.push(compactFrame(w));}
    if(metrics.at(-1)?.tick!==w.tick)metrics.push(w.metrics());if(frames.at(-1)?.tick!==w.tick)frames.push(compactFrame(w));
    const state=w.snapshot(),checkpointHash=sha(encode(state)),segment=envelope.segment+1,updatedAt=new Date().toISOString();
    const director=await reviewWorld({world:WORLD_ID,before,after:w.metrics(),events:w.milestones.slice(-12)},envelope.directorDay,{env});
    const tag=`${WORLD_ID}-segment-${String(segment).padStart(6,'0')}${runId?`-run-${runId}-${attempt}`:'-local'}`,dir=path.join(archiveRoot,tag),archive=dir+'.tar.gz';await mkdir(dir,{recursive:true});
    const manifest={id:WORLD_ID,segment,fromTick:start,toTick:w.tick,parentHash:envelope.checkpointHash,checkpointHash,sourceHash,updatedAt,tag,runId};
    const files={'checkpoint-before.json':encode(initial),'checkpoint-after.json':encode(state),'events.json.gz':gzipSync(encode(w.events)),'metrics.json':encode(metrics),'frames.json':encode(frames),'director.json':encode(director),'manifest.json':encode(manifest)};
    const checksums={};for(const [name,bytes] of Object.entries(files)){await writeFile(path.join(dir,name),bytes);checksums[name]=sha(bytes);}
    for(const f of [...sources,'docs/SYMBIOSIS.md']){const dest=path.join(dir,f);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(ROOT,f),dest);checksums[f]=sha(await readFile(dest));}
    await writeFile(path.join(dir,'checksums.json'),encode(checksums));
    if(spawnSync('tar',['-czf',archive,'-C',archiveRoot,tag],{stdio:'inherit'}).status!==0)throw new Error('Could not preserve archive; checkpoint unchanged');
    const publicEntry=director.entry?{...director.entry}:null;if(publicEntry){delete publicEntry.request;delete publicEntry.response;}
    const chapter={...manifest,release:`https://github.com/PrototypeVersions/AI_Evolution/releases/tag/${tag}`};
    // Keep early history plus increasingly sparse older samples; full measurements remain in releases.
    let timeline=[...previous.timeline,...metrics];if(timeline.length>1200){const older=timeline.slice(0,-600).filter((_,i)=>i%2===0);timeline=[...older,...timeline.slice(-600)];}
    const published={...previous,segment,updatedAt,checkpointHash,...projection(w),timeline,frames,chapters:[...previous.chapters,chapter].slice(-120),notes:[...previous.notes,note(before,w.metrics())].slice(-60),director:{mode:director.mode,entries:[...previous.director.entries,...(publicEntry?[publicEntry]:[])].slice(-60)}};
    await atomic(viewPath,published);await atomic(statePath,{...envelope,segment,updatedAt,checkpointHash,state,lastRunId:runId,directorDay:director.day});
    if(env.GITHUB_OUTPUT)await writeFile(env.GITHUB_OUTPUT,`advanced=true\narchive=${archive}\ntag=${tag}\n`,{flag:'a'});
    return {...manifest,archive,population:w.agents.length};
  }finally{await handle.close();await rm(lock,{force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await advance({genesis:process.argv.includes('--genesis'),ticks:Number(process.env.WORLD_TICKS||1000)}),null,2));
