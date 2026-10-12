import {readFile,writeFile,mkdir,rename,open,rm,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Continuum,SCHEMA,WORLD_ID} from '../src/persistent.mjs';
import {consultDirector} from './director.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const encode=x=>JSON.stringify(x);
async function atomic(file,value){await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',value);await rename(file+'.tmp',file);}
export async function sourceDigest(){return sha((await Promise.all(['src/engine.mjs','src/persistent.mjs','scripts/continue-world.mjs','scripts/director.mjs'].map(f=>readFile(path.join(ROOT,f),'utf8')))).join('\n'));}
function note(before,after){
  const dead=after.islands.filter(x=>!x.population).map(x=>x.name);
  return {tick:after.tick,source:'Automatic measurements (not GPT)',title:dead.length?`Empty populations: ${dead.join(', ')}`:`${after.lineages} founder lineages remain`,
    text:`${after.births-before.births} births, ${after.deaths-before.deaths} deaths, ${after.transfers-before.transfers} neighbor-learning events and ${after.migrations-before.migrations} migrations in this segment.`,
    interpretation:'Counts describe this world. They do not by themselves establish cooperation, intelligence, or a causal explanation.'};
}
export async function continueWorld({dataDir=path.join(ROOT,'data'),archiveRoot=path.join(ROOT,'research','world'),genesis=false,ticks=240,runId=process.env.GITHUB_RUN_ID??null,attempt=process.env.GITHUB_RUN_ATTEMPT??'1',env=process.env}={}){
  if(!Number.isInteger(ticks)||ticks<1||ticks>1000)throw new Error('Each continuation must be 1–1000 ticks.');
  await mkdir(dataDir,{recursive:true});const lock=path.join(dataDir,'.world.lock');const handle=await open(lock,'wx');
  try{
    const statePath=path.join(dataDir,'world-state.json'),publicPath=path.join(dataDir,'world.json'),sourceHash=await sourceDigest();
    let envelope,previous;
    try{envelope=JSON.parse(await readFile(statePath,'utf8'));previous=JSON.parse(await readFile(publicPath,'utf8'));}catch(e){if(e.code!=='ENOENT'||!genesis)throw new Error('Checkpoint missing or unreadable. Refusing to create a replacement world.');}
    if(genesis){
      if(envelope)throw new Error('A world already exists. Genesis cannot overwrite it.');
      const w=new Continuum(),state=w.snapshot(),checkpointHash=sha(encode(state)),startedAt=new Date().toISOString();
      envelope={schema:SCHEMA,id:WORLD_ID,segment:0,sourceHash,checkpointHash,startedAt,updatedAt:startedAt,directorDay:null,lastRunId:null,state};
      previous={id:WORLD_ID,segment:0,sourceHash,checkpointHash,startedAt,updatedAt:startedAt,metrics:w.metrics(),state,
        series:[{tick:0,population:24,islands:[6,6,6,6],traits:{exploration:.16,learningRate:.18,socialLearning:.15,migration:.04}}],frames:[w.frame()],events:w.events,chapters:[],notes:[],director:{mode:'not-connected',entries:[]},schedule:{ticks:240,cron:'17 * * * *',description:'Resumes hourly at minute 17 UTC; GitHub may delay scheduled jobs.'}};
      await atomic(statePath,encode(envelope));await atomic(publicPath,encode(previous));return {genesis:true,tick:0,checkpointHash};
    }
    if(envelope.sourceHash!==sourceHash)throw new Error('Simulation source changed. An explicit, documented migration is required; no silent world replacement.');
    if(sha(encode(envelope.state))!==envelope.checkpointHash||previous.checkpointHash!==envelope.checkpointHash||previous.segment!==envelope.segment)throw new Error('Checkpoint/report integrity check failed.');
    if(runId&&envelope.lastRunId===runId)return {skipped:true,reason:'This workflow run already committed its segment.'};
    if(!envelope.state.agents.length)return {skipped:true,reason:'World extinct; checkpoint preserved without reseeding.'};
    const world=Continuum.restore(envelope.state),before=world.metrics(),initial=world.snapshot();
    const director=await consultDirector(world,envelope.directorDay,{env});
    const frames=[world.frame()],series=[],start=world.tick;
    for(let i=0;i<ticks;i++){if(!world.step())break;if(world.tick%12===0)series.push(world.metrics());if((world.tick-start)%12===0)frames.push(world.frame());}
    if(frames.at(-1).tick!==world.tick)frames.push(world.frame());
    const state=world.snapshot(),checkpointHash=sha(encode(state)),segment=envelope.segment+1,updatedAt=new Date().toISOString();
    const tag=`${WORLD_ID}-segment-${String(segment).padStart(6,'0')}${runId?`-run-${runId}-${attempt}`:'-local'}`;
    const archiveDir=path.join(archiveRoot,tag),archive=archiveDir+'.tar.gz';await mkdir(archiveDir,{recursive:true});
    const manifest={id:WORLD_ID,segment,fromTick:start,toTick:world.tick,parentHash:envelope.checkpointHash,checkpointHash,sourceHash,updatedAt,tag,runId};
    const files={'checkpoint-before.json':encode(initial),'checkpoint-after.json':encode(state),'events.json.gz':gzipSync(encode(world.events)),
      'metrics.json':encode(series),'frames.json':encode(frames),'director.json':encode(director),'manifest.json':encode(manifest)};
    for(const [name,bytes] of Object.entries(files))await writeFile(path.join(archiveDir,name),bytes);
    for(const file of ['src/engine.mjs','src/persistent.mjs','scripts/continue-world.mjs','scripts/director.mjs','docs/PERSISTENT_WORLD.md']){const dest=path.join(archiveDir,file);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(ROOT,file),dest);}
    const checksums={};for(const name of Object.keys(files))checksums[name]=sha(files[name]);await writeFile(path.join(archiveDir,'checksums.json'),encode(checksums));
    const tar=spawnSync('tar',['-czf',archive,'-C',archiveRoot,tag],{stdio:'inherit'});if(tar.status!==0)throw new Error('Archive creation failed; checkpoint not advanced.');
    const metrics=world.metrics(),chapter={...manifest,metrics,release:`https://github.com/PrototypeVersions/AI_Evolution/releases/tag/${tag}`};
    const publicDirector=director.entry?{...director.entry}:null;if(publicDirector){delete publicDirector.request;delete publicDirector.response;}
    const published={...previous,segment,updatedAt,checkpointHash,state,metrics,
      series:[...previous.series,...series.map(m=>({tick:m.tick,population:m.population,islands:m.islands.map(i=>i.population),traits:Object.fromEntries(Object.entries(m.traits).map(([k,v])=>[k,v.mean]))}))].slice(-2048),frames,events:world.events.filter(e=>['birth','death','shift','migration','extinction'].includes(e.type)).slice(-50),
      chapters:[...previous.chapters,chapter].slice(-100),notes:[...previous.notes,note(before,metrics)].slice(-100),
      director:{mode:director.mode,entries:[...previous.director.entries,...(publicDirector?[publicDirector]:[])].slice(-100)}};
    const next={...envelope,segment,updatedAt,checkpointHash,state,directorDay:director.day,lastRunId:runId};
    // A Git commit is the remote transaction boundary for these two derived files.
    await atomic(publicPath,encode(published));await atomic(statePath,encode(next));
    if(env.GITHUB_OUTPUT)await writeFile(env.GITHUB_OUTPUT,`advanced=true\narchive=${archive}\ntag=${tag}\n`,{flag:'a'});
    return {segment,fromTick:start,toTick:world.tick,checkpointHash,parentHash:envelope.checkpointHash,archive,tag,population:state.agents.length};
  }finally{await handle.close();await rm(lock,{force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const genesis=process.argv.includes('--genesis');console.log(JSON.stringify(await continueWorld({genesis}),null,2));
}
