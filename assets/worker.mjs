import {World} from '../src/engine.mjs';
import {trialConfigs,analyze} from '../src/experiment.mjs';
self.onmessage=({data})=>{
  try{
    const rows=[],configs=[...trialConfigs({phase:'exploration',count:8,baseSeed:data.baseSeed})];
    for(let i=0;i<configs.length;i++){
      const world=new World(configs[i]);const result=world.finish();rows.push(result);
      self.postMessage({type:'trial',index:i+1,total:configs.length,result,snapshot:world.snapshot()});
    }
    self.postMessage({type:'done',rows,analysis:analyze(rows)});
  }catch(e){self.postMessage({type:'error',message:e.message});}
};
