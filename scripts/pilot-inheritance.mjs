import {Study,ARMS} from '../src/inheritance.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const rounds=Number(process.env.PILOT_ROUNDS||48),s=new Study({seeds:[401,402,403]}),start=performance.now(),cpu=process.cpuUsage();const timeline=[];
for(let i=0;i<rounds;i++){const row=s.step();timeline.push(row);if((i+1)%12===0)console.log(JSON.stringify({round:row.round,arms:row.arms}));}
const report={kind:'development-pilot',official:false,seeds:s.state.seeds,rounds,seconds:(performance.now()-start)/1000,cpu:process.cpuUsage(cpu),peakRss:process.resourceUsage().maxRSS,final:timeline.at(-1),timeline};
await mkdir('work',{recursive:true});await writeFile('work/inheritance-pilot.json',JSON.stringify(report));console.log(JSON.stringify({seconds:report.seconds,cpu:report.cpu,peakRss:report.peakRss,final:report.final.arms}));
