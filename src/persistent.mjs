import {random, blankMemory} from './engine.mjs';

export const SCHEMA = 'persistent-ecology-1';
export const WORLD_ID = 'continuum-001';
export const ISLANDS = ['Grove','Basin','Ridge','Delta'];
const islandOf=(id)=>Math.floor((id%12)/6)+2*Math.floor(Math.floor(id/12)/6);
export const CONFIG = Object.freeze({seed:20261012,nodes:144,founders:24,environmentPeriod:600,maxPolicyUnits:24});
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const copy=x=>structuredClone(x);
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;

// A single resumable ecology. No wall clock, filesystem, network, or model access.
// Event logs are drained into immutable segment archives by the external runner.
export class Continuum {
  constructor(){
    this.schema=SCHEMA;this.id=WORLD_ID;this.config={...CONFIG};this.tick=0;this.nextId=1;
    this.births=0;this.deaths=0;this.attempts=0;this.successes=0;this.transfers=0;
    this.migrations=0;this.lastDirectorShift=-1200;this.lastShift=0;this.environmentChanges=0;this.agents=[];this.events=[];this.edges=[];
    const side=Math.sqrt(CONFIG.nodes);
    this.nodes=Array.from({length:CONFIG.nodes},(_,id)=>({id,x:id%side,y:Math.floor(id/side),
      island:islandOf(id),habitat:Math.floor(random(CONFIG.seed,id,'habitat')*3),reserve:3,
      neighbors:[id-1,id+1,id-side,id+side].filter(j=>j>=0&&j<CONFIG.nodes&&islandOf(j)===islandOf(id)&&(Math.abs(j-id)!==1||Math.floor(j/side)===Math.floor(id/side)))}));
    this.recipes=Array.from({length:4},(_,island)=>Array.from({length:3},(_,h)=>Math.floor(random(CONFIG.seed,island,h,'recipe')*3)));
    const starts=[0,1,2,3].flatMap(island=>this.nodes.filter(n=>n.island===island).map(n=>n.id).sort((a,b)=>random(CONFIG.seed,a,'start')-random(CONFIG.seed,b,'start')).slice(0,6));
    for(let i=0;i<CONFIG.founders;i++)this.birth(starts[i],null);
    this.record('genesis',null,'The persistent world begins with 24 founders.');
  }
  record(type,a,text,extra={}){this.events.push({tick:this.tick,type,agent:a?.id??null,text,...extra});}
  policy(parent,id){
    const seed=this.config.seed;
    const unit=k=>({weights:Array.from({length:8},(_,j)=>(random(seed,id,k,j,'weight')-.5)*.4),out:Array.from({length:3},(_,j)=>(random(seed,id,k,j,'out')-.5)*.4),bias:(random(seed,id,k,'bias')-.5)*.4});
    const genes=parent?copy(parent.policy):[unit(0),unit(1)];
    if(parent){
      if(random(seed,id,'insert-unit')<.08&&genes.length<this.config.maxPolicyUnits)genes.push(unit(genes.length));
      if(random(seed,id,'delete-unit')<.04&&genes.length>0)genes.splice(Math.floor(random(seed,id,'delete-index')*genes.length),1);
      if(genes.length&&random(seed,id,'weight-mutation')<.5){const g=genes[Math.floor(random(seed,id,'unit-index')*genes.length)];const target=random(seed,id,'which-weights')<.7?g.weights:g.out;const j=Math.floor(random(seed,id,'weight-index')*target.length);target[j]=clamp(target[j]+(random(seed,id,'weight-delta')-.5)*.3,-2,2);}
    }
    return genes;
  }
  scores(a,node){
    const row=a.memory[node.habitat],inputs=[...row.map(c=>c.q),a.energy/29,a.age/50,node.reserve/3,node.island/3,node.habitat/2];
    const scores=row.map(c=>c.q);
    for(const g of a.policy){const activation=Math.tanh(g.bias+g.weights.reduce((sum,w,i)=>sum+w*inputs[i],0));for(let i=0;i<3;i++)scores[i]+=.2*activation*g.out[i];}
    return scores;
  }
  birth(node,parent){
    const id=this.nextId++,seed=this.config.seed;
    const gene=(name,initial)=>parent?clamp(parent[name]+(random(seed,id,name,'mutation')-.5)*.08,.01,.8):initial;
    const a={id,node,parent:parent?.id??null,founder:parent?.founder??id,generation:parent?parent.generation+1:0,
      born:this.tick,age:0,energy:parent?12:18,exploration:gene('exploration',.16),learningRate:gene('learningRate',.18),
      socialLearning:gene('socialLearning',.15),migration:gene('migration',.04),policy:this.policy(parent,id),memory:parent?copy(parent.memory):blankMemory(),
      ancestry:parent?[...parent.ancestry,parent.id].slice(-12):[],children:0,harvests:0,successes:0,learnedFrom:0};
    this.agents.push(a);if(parent){this.births++;parent.children++;}
    this.record(parent?'birth':'founder',a,parent?`Agent ${parent.id} → ${id}; generation ${a.generation}.`:`Founder ${id}.`,{node,parent:a.parent,founder:a.founder,generation:a.generation,exploration:a.exploration,learningRate:a.learningRate,socialLearning:a.socialLearning,migration:a.migration,policy:a.policy});
    return a;
  }
  shift(island,habitat,source='scheduled ecology'){
    if(!Number.isInteger(island)||island<0||island>3||!Number.isInteger(habitat)||habitat<0||habitat>2)throw new Error('Invalid habitat intervention.');
    const before=this.recipes[island][habitat];this.recipes[island][habitat]=(before+1)%3;this.lastShift=this.tick;this.environmentChanges++;
    this.record('shift',null,`${ISLANDS[island]} habitat ${habitat+1} now favors action ${this.recipes[island][habitat]+1}.`,{source,island,habitat,before,after:this.recipes[island][habitat]});
  }
  step(){
    if(!this.agents.length)return false; // Extinction is retained. Never silently reseed.
    this.tick++;const seed=this.config.seed;
    if(this.tick%this.config.environmentPeriod===0)this.shift((this.tick/this.config.environmentPeriod-1)%4,Math.floor((this.tick/this.config.environmentPeriod-1)/4)%3);
    for(const n of this.nodes)n.reserve=Math.min(3,n.reserve+[.72,.68,.80,.64][n.island]);
    const occupied=new Set(this.agents.map(a=>a.node));
    const turn=[...this.agents].sort((a,b)=>random(seed,this.tick,a.id,'order')-random(seed,this.tick,b.id,'order'));
    for(const a of turn){
      a.age++;a.energy-=.70+.002*a.policy.length;let n=this.nodes[a.node];
      if(random(seed,this.tick,a.id,'social')<a.socialLearning){
        const peers=this.agents.filter(b=>!b.dead&&n.neighbors.includes(b.node)).sort((x,y)=>y.energy-x.energy||x.id-y.id);
        const mentor=peers[0];
        if(mentor){const h=n.habitat;for(let i=0;i<3;i++)a.memory[h][i].q+=a.learningRate*(mentor.memory[h][i].q-a.memory[h][i].q);
          a.energy-=.12;a.learnedFrom++;this.transfers++;
          this.edges.push({tick:this.tick,from:mentor.id,to:a.id,fromNode:mentor.node,toNode:a.node});
          this.record('learning',a,`Agent ${a.id} learned from neighbor ${mentor.id}.`,{mentor:mentor.id,habitat:h});}
      }
      if(random(seed,this.tick,a.id,'migration')<a.migration*.01&&a.energy>8){
        const destination=(n.island+1)%4;const portals=[0,5,60,65].map(i=>i+(destination%2)*6+Math.floor(destination/2)*72).filter(i=>!occupied.has(i));
        if(portals.length){const from=n.island;occupied.delete(a.node);a.node=portals[Math.floor(random(seed,this.tick,a.id,'portal')*portals.length)];occupied.add(a.node);a.energy-=2;n=this.nodes[a.node];this.migrations++;this.record('migration',a,`Agent ${a.id}: ${ISLANDS[from]} → ${ISLANDS[destination]}.`,{from,to:destination,node:a.node});}
      }
      const vacant=n.neighbors.filter(i=>!occupied.has(i));
      if(vacant.length&&(n.reserve<1||random(seed,this.tick,a.id,'move')<.06)){
        vacant.sort((i,j)=>this.nodes[j].reserve-this.nodes[i].reserve||i-j);occupied.delete(a.node);a.node=vacant[0];occupied.add(a.node);a.energy-=.3;n=this.nodes[a.node];
        this.record('move',a,`Moved to location ${a.node}.`,{node:a.node});
      }
      if(n.reserve>=1){
        const row=a.memory[n.habitat],scores=this.scores(a,n),best=Math.max(...scores),ties=[0,1,2].filter(i=>Math.abs(scores[i]-best)<1e-10);
        const action=random(seed,this.tick,a.id,'explore')<a.exploration?Math.floor(random(seed,this.tick,a.id,'choice')*3):ties[Math.floor(random(seed,this.tick,a.id,'tie')*ties.length)];
        const success=random(seed,this.tick,n.id,'harvest')<(action===this.recipes[n.island][n.habitat] ? .86 : .12);
        n.reserve-=1;a.energy-=.45;if(success)a.energy+=3;
        const cell=row[action];cell.q+=a.learningRate*(Number(success)-cell.q);cell.n++;
        a.harvests++;a.successes+=Number(success);this.attempts++;this.successes+=Number(success);
        this.record('harvest',a,`${success?'Successful':'Failed'} action ${action+1}.`,{node:a.node,habitat:n.habitat,action,success,energy:a.energy});
      }else this.record('wait',a,'Waiting for resources.');
      if(a.energy<=0||a.age>=50){occupied.delete(a.node);a.dead=true;this.deaths++;this.record('death',a,a.energy<=0?'Energy exhausted.':'Lifetime completed.',{children:a.children,age:a.age});continue;}
      if(a.energy>=29){const space=this.nodes[a.node].neighbors.filter(i=>!occupied.has(i));if(space.length){a.energy-=17;const dest=space[Math.floor(random(seed,this.tick,a.id,'child-location')*space.length)];const child=this.birth(dest,a);occupied.add(child.node);}}
    }
    this.agents=this.agents.filter(a=>!a.dead);this.edges=this.edges.filter(e=>e.tick>this.tick-20).slice(-160);
    if(!this.agents.length)this.record('extinction',null,'All lineages ended. This world is preserved without a reset.');
    return true;
  }
  metrics(){
    const traits={};for(const key of ['exploration','learningRate','socialLearning','migration']){const vals=this.agents.map(a=>a[key]),m=mean(vals);traits[key]={mean:m,sd:Math.sqrt(mean(vals.map(v=>(v-m)**2)))};}
    return {tick:this.tick,population:this.agents.length,generation:Math.max(0,...this.agents.map(a=>a.generation)),lineages:new Set(this.agents.map(a=>a.founder)).size,
      births:this.births,deaths:this.deaths,transfers:this.transfers,migrations:this.migrations,environmentChanges:this.environmentChanges,policyUnitsMean:mean(this.agents.map(a=>a.policy.length)),policyUnitsMax:Math.max(0,...this.agents.map(a=>a.policy.length)),
      islands:ISLANDS.map((name,island)=>({name,population:this.agents.filter(a=>this.nodes[a.node].island===island).length})),occupancy:this.agents.length/this.config.nodes,successRate:this.attempts?this.successes/this.attempts:0,traits};
  }
  frame(){return {tick:this.tick,recipes:copy(this.recipes),metrics:this.metrics(),agents:this.agents.map(a=>[a.id,a.node,a.founder,a.generation,Number(a.energy.toFixed(2))]),edges:copy(this.edges.slice(-24))};}
  snapshot(){const {events,...state}=this;return copy(state);}
  static restore(s){
    if(s.schema!==SCHEMA||s.id!==WORLD_ID)throw new Error('Wrong persistent world or schema; no automatic reset is permitted.');
    if(!Number.isSafeInteger(s.tick)||s.tick<0||!Array.isArray(s.agents)||s.agents.length>s.config.nodes)throw new Error('Invalid checkpoint.');
    const w=new Continuum();Object.assign(w,copy(s));w.events=[];return w;
  }
}
