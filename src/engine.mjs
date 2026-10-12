/* Pure, deterministic simulation. No IO, execution, network, or model API. */
export const VERSION = '0.1.0';
export const DEFAULTS = Object.freeze({seed: 1729, nodes: 81, founders: 12, steps: 240,
  shiftAt: 120, inheritance: 'faithful', mutation: false, exploration: 0.16, learningRate: 0.18});
export const ARMS = ['none', 'faithful', 'scrambled'];
export const ARM_LABELS = {none: 'No inheritance', faithful: 'Faithful memory', scrambled: 'Shuffled memory'};
export function random(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function validateConfig(input = {}) {
  const c = {...DEFAULTS, ...input};
  for (const [key, lo, hi] of [['seed',0,2147483647],['nodes',16,225],['founders',1,50],['steps',20,2000],['shiftAt',0,2000]]) {
    if (!Number.isInteger(c[key]) || c[key] < lo || c[key] > hi) throw new Error(`Invalid ${key}: expected integer ${lo}–${hi}.`);
  }
  if (c.founders > c.nodes || c.shiftAt >= c.steps) throw new Error('Founders must fit; shift must be before the final tick (0 disables it).');
  if (!ARMS.includes(c.inheritance)) throw new Error('Unknown inheritance condition.');
  for (const key of ['exploration', 'learningRate']) if (!Number.isFinite(c[key]) || c[key] < 0.01 || c[key] > 0.8) throw new Error(`Invalid ${key}.`);
  if (typeof c.mutation !== 'boolean') throw new Error('Mutation must be boolean.');
  return c;
}
export const blankMemory = () => Array.from({length:3}, () => Array.from({length:3}, () => ({q:0.5, n:0})));
export function inheritMemory(memory, mode, seed, id) {
  if (mode === 'none') return blankMemory();
  const copy = structuredClone(memory);
  if (mode === 'scrambled') for (let h=0; h<3; h++) {
    const offset = 1 + Math.floor(random(seed, id, h, 'scramble')*2);
    copy[h] = memory[h].map((_, a) => ({...memory[h][(a+offset)%3]}));
  }
  return copy;
}
export class World {
  constructor(input = {}) {
    this.config = validateConfig(input); this.tick = 0; this.nextId = 1;
    this.agents = []; this.lineage = []; this.events = []; this.history = [];
    this.births = 0; this.deaths = 0; this.attempts = 0; this.successes = 0;
    const c=this.config, side=Math.ceil(Math.sqrt(c.nodes));
    this.nodes = Array.from({length:c.nodes}, (_,i) => ({id:i, x:i%side, y:Math.floor(i/side),
      habitat:Math.floor(random(c.seed,i,'habitat')*3), reserve:3,
      neighbors:[i-1,i+1,i-side,i+side].filter(j=>j>=0&&j<c.nodes&&(Math.abs(j-i)!==1||Math.floor(j/side)===Math.floor(i/side)))}));
    this.recipes = Array.from({length:3},(_,h)=>Math.floor(random(c.seed,h,'recipe')*3));
    const starts=this.nodes.map(n=>n.id).sort((a,b)=>random(c.seed,a,'start')-random(c.seed,b,'start'));
    for(let i=0;i<c.founders;i++) this.addAgent(starts[i],null);
    this.record('start',null,`World initialized with ${c.founders} founders.`);
    this.sample();
  }
  addAgent(node,parent) {
    const c=this.config, id=this.nextId++;
    const mutate=(v,key,lo,hi)=>c.mutation&&parent?clamp(v+(random(c.seed,id,key)-.5)*.08,lo,hi):v;
    const a={id,node,parent:parent?.id??null,founder:parent?.founder??id,generation:parent?parent.generation+1:0,
      born:this.tick, age:0, energy:parent?12:18, exploration:mutate(parent?.exploration??c.exploration,'epsilon',.01,.8),
      learningRate:mutate(parent?.learningRate??c.learningRate,'alpha',.01,.8),
      memory:parent?inheritMemory(parent.memory,c.inheritance,c.seed,id):blankMemory(),
      harvests:0,successes:0,moves:0,children:0};
    this.agents.push(a);
    this.lineage.push({id,node,parent:a.parent,founder:a.founder,generation:a.generation,born:this.tick,died:null,
      exploration:a.exploration,learningRate:a.learningRate});
    if(parent){this.births++;parent.children++;this.record('birth',a,`Agent ${parent.id} → ${id}; generation ${a.generation}.`);}
    return a;
  }
  record(type,agent,text,extra={}) {
    this.events.push({tick:this.tick,type,agent:agent?.id??null,node:agent?.node??null,text,...extra});
  }
  bestAction(a, habitat) {
    if(random(this.config.seed,this.tick,a.id,'explore')<a.exploration) return Math.floor(random(this.config.seed,this.tick,a.id,'choice')*3);
    const row=a.memory[habitat], best=Math.max(...row.map(x=>x.q));
    const ties=[0,1,2].filter(i=>Math.abs(row[i].q-best)<1e-10);
    return ties[Math.floor(random(this.config.seed,this.tick,a.id,'tie')*ties.length)];
  }
  step() {
    if(this.tick>=this.config.steps||!this.agents.length)return false;
    this.tick++; const c=this.config;
    if(c.shiftAt&&this.tick===c.shiftAt){this.recipes=this.recipes.map(x=>(x+1)%3);this.record('shift',null,'Environment changed: every habitat now favors a different action.');}
    for(const n of this.nodes)n.reserve=Math.min(3,n.reserve+.72);
    const occupied=new Set(this.agents.map(a=>a.node));
    const turn=[...this.agents].sort((a,b)=>random(c.seed,this.tick,a.id,'order')-random(c.seed,this.tick,b.id,'order'));
    for(const a of turn){
      a.age++;a.energy-=.70;
      let n=this.nodes[a.node];
      const vacant=n.neighbors.filter(i=>!occupied.has(i));
      if(vacant.length&&(n.reserve<1||random(c.seed,this.tick,a.id,'move')<.06)){
        vacant.sort((i,j)=>this.nodes[j].reserve-this.nodes[i].reserve||i-j);
        occupied.delete(a.node);a.node=vacant[0];occupied.add(a.node);a.moves++;a.energy-=.3;
        this.record('move',a,`Moved to location ${a.node}.`); n=this.nodes[a.node];
      }
      if(n.reserve>=1){
        const action=this.bestAction(a,n.habitat),p=action===this.recipes[n.habitat] ? .86 : .12;
        const success=random(c.seed,this.tick,n.id,'harvest')<p;
        n.reserve-=1;a.energy-=.45;if(success)a.energy+=3.0;
        const cell=a.memory[n.habitat][action]; cell.q+=a.learningRate*((success?1:0)-cell.q);cell.n++;
        a.harvests++;a.successes+=Number(success);this.attempts++;this.successes+=Number(success);
        this.record('harvest',a,`${success?'Successful':'Failed'} action ${action+1} in habitat ${n.habitat+1}.`,{action,success,habitat:n.habitat,energy:a.energy});
      }else this.record('wait',a,'Waiting for resources to recover.');
      if(a.energy<=0||a.age>=50){
        occupied.delete(a.node);a.dead=true;this.deaths++;
        this.lineage[a.id-1].died=this.tick;this.lineage[a.id-1].children=a.children;
        this.record('death',a,a.energy<=0?'Energy exhausted.':'Lifetime completed.');continue;
      }
      if(a.energy>=29){
        const space=this.nodes[a.node].neighbors.filter(i=>!occupied.has(i));
        if(space.length&&occupied.size<c.nodes){
          const dest=space[Math.floor(random(c.seed,this.tick,a.id,'child-location')*space.length)];
          a.energy-=17;const child=this.addAgent(dest,a);occupied.add(child.node);
        }
      }
    }
    this.agents=this.agents.filter(a=>!a.dead);this.sample();
    if(!this.agents.length)this.record('extinction',null,'Population extinct. This run has ended.');
    else if(this.tick===c.steps)this.record('complete',null,'Predefined observation horizon reached.');
    return true;
  }
  sample(){
    const n=this.agents.length;
    this.history.push({tick:this.tick,population:n,births:this.births,deaths:this.deaths,
      generation:Math.max(0,...this.agents.map(a=>a.generation)),
      diversity:new Set(this.agents.map(a=>a.founder)).size,
      energy:n?this.agents.reduce((s,a)=>s+a.energy,0)/n:0,
      successRate:this.attempts?this.successes/this.attempts:0});
  }
  finish(){while(this.step()){}return this.result();}
  result(){
    // Zero-pad extinct runs to the same planned observation horizon.
    const from=this.config.shiftAt||Math.floor(this.config.steps/2);
    const observed=this.history.filter(h=>h.tick>=from&&h.tick<this.config.steps);
    const occupancy=observed.reduce((s,h)=>s+h.population,0)/(this.config.nodes*(this.config.steps-from));
    return {seed:this.config.seed,arm:this.config.inheritance,shiftAt:this.config.shiftAt,
      finalPopulation:this.agents.length,occupancy,births:this.births,deaths:this.deaths,
      survived:this.agents.length>0,extinctionTick:this.agents.length?null:this.tick,
      maxGeneration:Math.max(...this.lineage.map(a=>a.generation)),successRate:this.attempts?this.successes/this.attempts:0};
  }
  snapshot(){return structuredClone({version:VERSION,config:this.config,tick:this.tick,nextId:this.nextId,
    agents:this.agents,lineage:this.lineage,events:this.events,history:this.history,nodes:this.nodes,recipes:this.recipes,
    births:this.births,deaths:this.deaths,attempts:this.attempts,successes:this.successes});}
  static restore(snapshot){
    if(snapshot.version!==VERSION)throw new Error('Snapshot version mismatch.');
    const w=new World(snapshot.config);Object.assign(w,structuredClone(snapshot));return w;
  }
}
