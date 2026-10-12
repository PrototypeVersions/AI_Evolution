import {World,VERSION} from '../src/engine.mjs';
import {PROTOCOL,trialConfigs,analyze,assess} from '../src/experiment.mjs';
import {mkdir,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function sourceHash(){
  const files=['src/engine.mjs','src/experiment.mjs','scripts/research.mjs'];
  return hash((await Promise.all(files.map(f=>readFile(path.join(ROOT,f),'utf8')))).join('\n'));
}
async function atomic(file,value){const tmp=`${file}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2));await rename(tmp,file);}
export async function runCampaign({campaign=0,signal,onProgress=()=>{}}={}){
  if(!Number.isInteger(campaign)||campaign<0||campaign>999)throw new Error('Invalid campaign.');
  const root=path.join(ROOT,'research');await mkdir(path.join(root,'runs'),{recursive:true});
  await mkdir(path.join(root,'campaigns'),{recursive:true});await mkdir(path.join(ROOT,'data'),{recursive:true});
  const source=await sourceHash(),id=`campaign-${String(campaign).padStart(3,'0')}-${source.slice(0,12)}`;
  const protocol={...PROTOCOL,sourceHash:source,campaign,seedOffset:campaign*100000,
    note:'Protocol recorded before this campaign. Pilot calibration is documented separately.'};
  const protocolPath=path.join(root,'campaigns',`${id}.protocol.json`);
  try{await writeFile(protocolPath,JSON.stringify(protocol,null,2),{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  const db=new DatabaseSync(path.join(root,'ledger.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, campaign TEXT NOT NULL, phase TEXT NOT NULL, manifest TEXT NOT NULL, result TEXT NOT NULL, trace TEXT NOT NULL, trace_sha256 TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS no_run_update BEFORE UPDATE ON runs BEGIN SELECT RAISE(ABORT,'Research records are append-only'); END;
    CREATE TRIGGER IF NOT EXISTS no_run_delete BEFORE DELETE ON runs BEGIN SELECT RAISE(ABORT,'Research records are append-only'); END;`);
  const phases={exploration:[],confirmation:[]},completed=[];let done=0;
  const total=(PROTOCOL.explorationSeeds+PROTOCOL.confirmationSeeds)*6;
  try{
    for(const phase of ['exploration','confirmation']){
      for(const config of trialConfigs({phase,baseSeed:PROTOCOL.seedBlocks[phase]+campaign*100000})){
        if(signal?.aborted)throw new Error('Research paused. Completed trials are saved; restart resumes this campaign.');
        const runId=hash(JSON.stringify({source,config})).slice(0,24),old=db.prepare('SELECT result FROM runs WHERE id=?').get(runId);
        let result;
        if(old){result=JSON.parse(old.result);}else{
          const start=new Date().toISOString(),world=new World(config);result=world.finish();
          const manifest={id:runId,campaign:id,phase,engineVersion:VERSION,sourceHash:source,config,startedAt:start,finishedAt:new Date().toISOString(),runtime:process.version};
          const trace=gzipSync(JSON.stringify({manifest,result,snapshot:world.snapshot()}));
          const traceFile=`runs/${runId}.json.gz`;
          // An orphan from a crash is replaced only if no ledger row was committed.
          await writeFile(path.join(root,traceFile),trace);
          db.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?,?)').run(runId,id,phase,JSON.stringify(manifest),JSON.stringify(result),traceFile,hash(trace));
        }
        phases[phase].push({...result,runId});done++;completed.push(runId);
        onProgress({id,done,total,phase,resumed:Boolean(old)});
        // Yield between trials for status, cancellation, and the local dashboard.
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    const exploration=analyze(phases.exploration),confirmation=analyze(phases.confirmation);
    const report={schemaVersion:1,id,createdAt:new Date().toISOString(),sourceHash:source,engineVersion:VERSION,
      protocol,phases:{exploration,confirmation},assessment:assess(exploration,confirmation),
      trials:phases,runCount:done,seedCount:PROTOCOL.explorationSeeds+PROTOCOL.confirmationSeeds,
      rawArchive:'research/runs/*.json.gz and research/ledger.sqlite on the originating computer',
      reproducibility:'Exact replay: configuration + source hash. Full action traces retained locally.',
      provenance:'Measured execution of the baseline simulator; no LLM inference.'};
    // Save the campaign report once; latest public summaries are derived views.
    const resultPath=path.join(root,'campaigns',`${id}.json`);
    let canonical=report;
    try{await writeFile(resultPath,JSON.stringify(report,null,2),{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;canonical=JSON.parse(await readFile(resultPath,'utf8'));}
    await atomic(path.join(ROOT,'data','published.json'),canonical);
    // SQLite backup captures a consistent ledger; campaign records and traces remain intact.
    const backup=path.join(root,`${id}.sqlite`);
    const backups=await readdir(root);
    if(!backups.includes(path.basename(backup)))db.exec(`VACUUM INTO '${backup.replaceAll("'","''")}'`);
    return canonical;
  }finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),index=args.indexOf('--campaign'),campaign=index>=0?Number(args[index+1]):0;
  let last=0;
  const report=await runCampaign({campaign,onProgress:p=>{if(p.done-last>=24||p.done===p.total){console.log(`${p.id}: ${p.done}/${p.total} trials (${p.phase})`);last=p.done;}}});
  console.log(JSON.stringify({id:report.id,status:report.assessment,primary:report.phases.confirmation.primary},null,2));
}
