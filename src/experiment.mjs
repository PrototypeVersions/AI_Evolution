import {World, VERSION, DEFAULTS, ARMS, random} from './engine.mjs';
export const PROTOCOL = Object.freeze({id:'inheritance-shift-v1',version:VERSION,
  question:'Does an environmental change alter the benefit of faithful inherited memory?',
  primary:'Difference in memory benefit: (faithful − none) after change minus (faithful − none) in a stable world.',
  prediction:'The memory benefit is smaller after environmental change (primary contrast < 0).',
  outcome:'Mean occupied fraction during ticks 120–239, including zeros after extinction.',
  unit:'Independent world seed; treatments are paired within seeds.',
  controls:'Same starting world, controller, founders, resource rules, horizon and exogenous random field. Mutation disabled.',
  config:{...DEFAULTS,mutation:false},explorationSeeds:24,confirmationSeeds:48,
  seedBlocks:{exploration:10000,confirmation:50000},bootstrapReplicates:2000,
  caveats:['Simulation only; no LLMs are tested.','Shuffling permutes action labels in parental memory; it does not sample unrelated lineages.',
    'Confidence intervals quantify variation across seeds within this model, not real-world validity.',
    'The environment change is total and abrupt. Other kinds of change may behave differently.',
    'Only the primary contrast is confirmatory. All secondary contrasts are descriptive.']});
export function* trialConfigs({phase='exploration',count,baseSeed}={}){
  if(!['exploration','confirmation'].includes(phase))throw new Error('Invalid phase.');
  count??=phase==='exploration'?PROTOCOL.explorationSeeds:PROTOCOL.confirmationSeeds;
  if(!Number.isInteger(count)||count<2||count>500)throw new Error('Seed count must be 2–500.');
  const start=baseSeed??PROTOCOL.seedBlocks[phase];
  for(let i=0;i<count;i++)for(const shiftAt of [0,120])for(const inheritance of ARMS)
    yield {...PROTOCOL.config,seed:start+i,shiftAt,inheritance};
}
export function runTrial(config){return new World(config).finish();}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
export function interval(values, key='primary'){
  if(!values.length)return null;
  const draws=[];
  for(let b=0;b<PROTOCOL.bootstrapReplicates;b++){
    let sum=0;for(let i=0;i<values.length;i++)sum+=values[Math.floor(random(key,b,i)*values.length)];
    draws.push(sum/values.length);
  }
  draws.sort((a,b)=>a-b);
  return {mean:mean(values),low:draws[Math.floor(draws.length*.025)],high:draws[Math.floor(draws.length*.975)],n:values.length};
}
export function analyze(rows){
  const seeds=[...new Set(rows.map(r=>r.seed))].sort((a,b)=>a-b),complete=[];
  for(const seed of seeds){const rs=rows.filter(r=>r.seed===seed);if(rs.length===6&&new Set(rs.map(r=>`${r.shiftAt}:${r.arm}`)).size===6)complete.push(seed);}
  const get=(s,shift,arm)=>rows.find(r=>r.seed===s&&r.shiftAt===shift&&r.arm===arm).occupancy;
  const stable=complete.map(s=>get(s,0,'faithful')-get(s,0,'none'));
  const changed=complete.map(s=>get(s,120,'faithful')-get(s,120,'none'));
  const primary=interval(changed.map((x,i)=>x-stable[i]));
  const groups=[];
  for(const shiftAt of [0,120])for(const arm of ARMS){
    const rs=rows.filter(r=>complete.includes(r.seed)&&r.shiftAt===shiftAt&&r.arm===arm);
    if(rs.length)groups.push({shiftAt,arm,occupancy:interval(rs.map(r=>r.occupancy),`${shiftAt}:${arm}`),
      survival:mean(rs.map(r=>Number(r.survived))),births:mean(rs.map(r=>r.births)),seeds:rs.length});
  }
  return {completeSeeds:complete.length,incompleteSeeds:seeds.length-complete.length,groups,primary,
    stableBenefit:interval(stable,'stable'),changedBenefit:interval(changed,'changed')};
}
export function assess(exploration,confirmation){
  if(!confirmation?.primary)return {status:'Exploratory',text:'Fresh confirmation runs have not yet been completed.'};
  const e=exploration?.primary,c=confirmation.primary;
  if(e&&e.high<0&&c.high<0)return {status:'Confirmed within this model',text:'Both seed blocks support the prespecified negative interaction. External validity is untested.'};
  if(c.low>0)return {status:'Prediction not supported',text:'Confirmation suggests an interaction opposite to the prespecified prediction.'};
  return {status:'Inconclusive',text:'The prespecified negative interaction was not established in both seed blocks.'};
}
