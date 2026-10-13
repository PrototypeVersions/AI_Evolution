import {readFile,writeFile,mkdir,rename,open,rm,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Study,ID,SCHEMA,CONFIG} from '../src/inheritance.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const sources=['src/inheritance.mjs','scripts/advance-inheritance.mjs','docs/INHERITANCE.md'];
const encode=x=>JSON.stringify(x),sha=x=>createHash('sha256').update(x).digest('hex');
export async function sourceDigest(){return sha((await Promise.all(sources.map(f=>readFile(path.join(ROOT,f),'utf8')))).join('\n'));}
async function atomic(p,data){await writeFile(p+'.tmp',encode(data));await rename(p+'.tmp',p);}
export async function advance({dataDir=path.join(ROOT,'data','inheritance'),archiveRoot=path.join(ROOT,'research','inheritance'),genesis=false,rounds=CONFIG.roundsPerSegment,runId=process.env.GITHUB_RUN_ID??null,attempt=process.env.GITHUB_RUN_ATTEMPT??'1',env=process.env}={}){
  if(!Number.isInteger(rounds)||rounds<1||rounds>96)throw Error('Round budget must be 1–96');
  if(runId&&!/^\d+$/.test(runId))throw Error('Invalid run ID');if(!/^\d+$/.test(String(attempt)))throw Error('Invalid attempt');
  await mkdir(dataDir,{recursive:true});const lock=path.join(dataDir,'.lock'),handle=await open(lock,'wx');
  try{
    const statePath=path.join(dataDir,'checkpoint.json'),viewPath=path.join(dataDir,'observatory.json'),sourceHash=await sourceDigest();let envelope,previous;
    if(genesis){for(const p of [statePath,viewPath]){try{await readFile(p);throw Error('Genesis cannot replace existing data');}catch(e){if(e.code!=='ENOENT')throw e;}}
      const study=new Study(),state=study.snapshot(),checkpointHash=sha(encode(state)),now=new Date().toISOString();
      const report={...study.report(),segment:0,sourceHash,checkpointHash,startedAt:now,updatedAt:now,timeline:[],chapters:[],schedule:{rounds:12,cron:'17 * * * *'},director:{mode:'not-connected'},worker:null};
      await atomic(statePath,{id:ID,schema:SCHEMA,segment:0,sourceHash,checkpointHash,publicHash:sha(encode(report)),startedAt:now,updatedAt:now,lastRunId:null,state});await atomic(viewPath,report);return {genesis:true,round:0,checkpointHash,sourceHash};
    }
    try{envelope=JSON.parse(await readFile(statePath,'utf8'));previous=JSON.parse(await readFile(viewPath,'utf8'));}catch{throw Error('Saved study missing or unreadable; refusing to reset');}
    if(envelope.sourceHash!==sourceHash)throw Error('Protocol changed; a new study or documented migration is required');
    if(envelope.checkpointHash!==sha(encode(envelope.state))||envelope.publicHash!==sha(encode(previous))||previous.checkpointHash!==envelope.checkpointHash||previous.segment!==envelope.segment||previous.round!==envelope.state.round)throw Error('Checkpoint integrity failure');
    if(runId&&envelope.lastRunId===runId)return {skipped:true,reason:'Run already committed'};
    if(envelope.state.round>=CONFIG.maxRounds)return {skipped:true,reason:'Chapter complete; checkpoint preserved for review'};
    const study=Study.restore(envelope.state),initial=study.snapshot(),start=study.state.round,clock=performance.now(),cpu=process.cpuUsage(),metrics=[];
    for(let i=0;i<rounds&&study.state.round<CONFIG.maxRounds;i++)metrics.push(study.step());
    const worker={elapsedSeconds:(performance.now()-clock)/1000,cpuMicroseconds:process.cpuUsage(cpu),peakRssBytes:process.resourceUsage().maxRSS*1024,node:process.version,platform:process.platform,architecture:process.arch};
    const state=study.snapshot(),checkpointHash=sha(encode(state)),segment=envelope.segment+1,updatedAt=new Date().toISOString();
    const tag=`${ID}-segment-${String(segment).padStart(6,'0')}${runId?`-run-${runId}-${attempt}`:'-local'}`,dir=path.join(archiveRoot,tag),archive=dir+'.tar.gz';await mkdir(dir,{recursive:true});
    const manifest={id:ID,segment,fromRound:start,toRound:state.round,parentHash:envelope.checkpointHash,checkpointHash,sourceHash,updatedAt,tag,runId,worker};
    const files={'checkpoint-before.json':encode(initial),'checkpoint-after.json':encode(state),'events.json.gz':gzipSync(encode(study.events)),'metrics.json':encode(metrics),'manifest.json':encode(manifest)};
    const checksums={};for(const [name,bytes] of Object.entries(files)){await writeFile(path.join(dir,name),bytes);checksums[name]=sha(bytes);}for(const f of sources){const target=path.join(dir,f);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(ROOT,f),target);checksums[f]=sha(await readFile(target));}await writeFile(path.join(dir,'checksums.json'),encode(checksums));
    if(spawnSync('tar',['-czf',archive,'-C',archiveRoot,tag],{stdio:'inherit'}).status!==0)throw Error('Archive failed; checkpoint unchanged');
    let timeline=[...previous.timeline,...metrics];if(timeline.length>800)timeline=[...timeline.slice(0,-400).filter((_,i)=>i%2===0),...timeline.slice(-400)];
    const report={...previous,...study.report(),segment,updatedAt,checkpointHash,timeline,worker,chapters:[...previous.chapters,{...manifest,release:`https://github.com/PrototypeVersions/AI_Evolution/releases/tag/${tag}`}].slice(-120)};
    await atomic(viewPath,report);await atomic(statePath,{...envelope,segment,updatedAt,checkpointHash,publicHash:sha(encode(report)),lastRunId:runId,state});
    if(env.GITHUB_OUTPUT)await writeFile(env.GITHUB_OUTPUT,`advanced=true\narchive=${archive}\ntag=${tag}\n`,{flag:'a'});
    return {...manifest,archive};
  }finally{await handle.close();await rm(lock,{force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await advance({genesis:process.argv.includes('--genesis'),rounds:Number(process.env.STUDY_ROUNDS||CONFIG.roundsPerSegment)}),null,2));
