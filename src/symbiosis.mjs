// Symbiosis 002: a deterministic, bounded artificial ecology. No I/O or eval.
export const WORLD_ID='symbiosis-002', SCHEMA='symbiosis-1';
export const ACTIONS=['FORAGE','MINE','TRADE','BUILD','RAID','GUARD','MOVE','MIGRATE','REST'];
export const SENSORS=['constant','energy','food carried','mineral carried','local food','local mineral','neighbors','recent harm','structure','food deficit','mineral deficit','age'];
export const HABITATS=[
  {name:'Verdant Shelf',subtitle:'Food-rich • mineral-poor',color:'#7be6ba',food:.16,mineral:.047,upkeep:.45},
  {name:'Amber Steppe',subtitle:'Mineral-rich • food-poor',color:'#efba73',food:.09,mineral:.12,upkeep:.45},
  {name:'Tidal Reach',subtitle:'A slow seasonal tide',color:'#7acbef',food:.135,mineral:.08,upkeep:.47},
  {name:'Violet Barrens',subtitle:'Scarce resources • costly survival',color:'#bb9af4',food:.09,mineral:.07,upkeep:.50}
];
export const LIMITS=Object.freeze({nodes:256,founders:24,maxUnits:48,maxAge:160,inventory:6,energy:36});
const clone=x=>structuredClone(x),clamp=(v,l=0,h=1)=>Math.max(l,Math.min(h,v));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const round=x=>Math.round(x*1000)/1000;
export function shape(genes){return genes.units.map(u=>`${u.a}:${u.b}>${u.out}`).join('|');}
export function circuit(genes,sensors,learned=Array(9).fill(0)){
  const values=[...sensors],scores=genes.bias.map((b,i)=>b+.35*learned[i]),activity=[];
  for(const u of genes.units){const v=Math.tanh(values[u.a]*u.wa+values[u.b]*u.wb+u.bias);values.push(v);scores[u.out]+=v*u.gain;activity.push(v);}
  return {scores,activity};
}
export class Symbiosis{
  constructor(seed=20261013){
    this.id=WORLD_ID;this.schema=SCHEMA;this.seed=seed;this.rng=seed>>>0||1;this.tick=0;this.nextId=1;this.births=0;this.deaths=0;
    this.totals={trades:0,builds:0,raids:0,blocked:0,migrations:0,foodGrownByStructures:0};
    this.agents=[];this.events=[];this.links=[];this.milestones=[];this.lineages=[];this.windows=[];this.randomWindows=[];
    this.nodes=Array.from({length:256},(_,id)=>{
      const local=id%64,theta=local*2.399963229728653+Math.floor(id/64)*.7,r=Math.sqrt((local+.5)/64);
      return {id,island:Math.floor(id/64),x:Math.cos(theta)*r,y:Math.sin(theta)*r,food:4+this.rand()*2,mineral:2+this.rand()*2,structure:0,neighbors:[]};
    });
    for(const n of this.nodes)n.neighbors=this.nodes.filter(m=>m.island===n.island&&m.id!==n.id).sort((a,b)=>(a.x-n.x)**2+(a.y-n.y)**2-((b.x-n.x)**2+(b.y-n.y)**2)||a.id-b.id).slice(0,5).map(m=>m.id);
    for(const n of this.nodes)for(const j of [...n.neighbors])if(!this.nodes[j].neighbors.includes(n.id))this.nodes[j].neighbors.push(n.id);
    const sites=Array.from({length:64},(_,i)=>i);this.shuffle(sites);
    for(const n of sites.slice(0,LIMITS.founders))this.birth(n,null);
    this.occupiedBefore=[24,0,0,0];
    this.milestone('genesis','A common beginning','24 founders begin in Verdant Shelf. The other three habitats are empty.');
  }
  rand(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296;}
  pick(a){return a[Math.floor(this.rand()*a.length)];}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  record(type,data={}){this.events.push({tick:this.tick,type,...data});}
  milestone(type,title,text,data={}){const e={tick:this.tick,type,title,text,...data};this.milestones.push(e);this.milestones=this.milestones.slice(-120);this.record('milestone',e);}
  randomUnit(index){return {a:Math.floor(this.rand()*(12+index)),b:Math.floor(this.rand()*(12+index)),wa:this.rand()*4-2,wb:this.rand()*4-2,bias:this.rand()*2-1,out:Math.floor(this.rand()*9),gain:this.rand()*3-1.5};}
  genome(parent){
    if(!parent)return {bias:[.65,.12,-.2,-.65,-.55,-.7,-.5,-1,-.8].map(v=>v+(this.rand()-.5)*.3),explore:.065,learn:.12,inherit:.4,
      units:[{a:9,b:0,wa:2,wb:0,bias:-.5,out:0,gain:2},{a:10,b:2,wa:2,wb:1,bias:-1,out:1,gain:1.7},
        {a:4,b:9,wa:-5,wb:1,bias:.4,out:6,gain:3.5},{a:7,b:0,wa:3,wb:0,bias:-.3,out:5,gain:1.2},this.randomUnit(4),this.randomUnit(5)]};
    const g=clone(parent.genes);
    if(this.rand()<.20&&g.units.length<LIMITS.maxUnits)g.units.push(this.randomUnit(g.units.length));
    if(this.rand()<.10&&g.units.length>1){const d=Math.floor(this.rand()*g.units.length);g.units.splice(d,1);for(const u of g.units)for(const k of ['a','b']){if(u[k]===12+d)u[k]=0;else if(u[k]>12+d)u[k]--;}}
    for(let i=0;i<g.units.length;i++)if(this.rand()<.12){const u=g.units[i],key=this.pick(['a','b','wa','wb','bias','out','gain']);u[key]=key==='out'?Math.floor(this.rand()*9):['a','b'].includes(key)?Math.floor(this.rand()*(12+i)):clamp(u[key]+(this.rand()-.5)*.9,-4,4);}
    const j=Math.floor(this.rand()*9);g.bias[j]=clamp(g.bias[j]+(this.rand()-.5)*.65,-3,3);
    for(const key of ['explore','learn','inherit'])if(this.rand()<.3)g[key]=clamp(g[key]+(this.rand()-.5)*.06,key==='inherit'?0:.01,key==='inherit'?1:.35);
    return g;
  }
  birth(node,parent){
    const id=this.nextId++,genes=this.genome(parent),a={id,node,parent:parent?.id??null,founder:parent?.founder??id,generation:parent?parent.generation+1:0,born:this.tick,age:0,energy:parent?10:18,food:parent?1:3,mineral:parent?.6:1.8,guard:0,harm:0,offerUntil:-1,genes,q:parent?parent.q.map(v=>v*genes.inherit):Array(9).fill(0),counts:Array(9).fill(0),last:8,children:0,ancestry:parent?[...parent.ancestry,parent.id].slice(-16):[]};
    this.agents.push(a);
    if(parent){this.births++;parent.children++;}else this.lineages.push({id,born:0,ended:null,births:0,peak:1});
    if(parent)this.lineages.find(l=>l.id===a.founder).births++;
    this.record(parent?'birth':'founder',{id,parent:a.parent,founder:a.founder,node,genes:clone(genes),generation:a.generation});return a;
  }
  peers(a){return this.agents.filter(b=>b.id!==a.id&&b.energy>0&&this.nodes[a.node].neighbors.includes(b.node));}
  sensors(a){const n=this.nodes[a.node];return [1,a.energy/36,a.food/6,a.mineral/6,n.food/8,n.mineral/8,this.peers(a).length/8,a.harm,n.structure/6,1-a.food/6,1-a.mineral/6,a.age/160];}
  decide(a){const sensors=this.sensors(a),evaluated=circuit(a.genes,sensors,a.q),scores=evaluated.scores,exploratory=this.rand()<a.genes.explore;const action=exploratory?Math.floor(this.rand()*9):scores.indexOf(Math.max(...scores));return {tick:this.tick,action,exploratory,sensors,...evaluated};}
  link(kind,a,b,data={}){const e={tick:this.tick,kind,from:a.id,to:b.id,fromNode:a.node,toNode:b.node,...data};this.links.push(e);this.record(kind,e);}
  act(a,action){
    const n=this.nodes[a.node],peers=this.peers(a);let success=false;
    if(action===0){const v=Math.min(1.8,n.food,6-a.food);n.food-=v;a.food+=v;a.energy-=.12;success=v>0;}
    else if(action===1){const v=Math.min(1.35,n.mineral,6-a.mineral);n.mineral-=v;a.mineral+=v;a.energy-=.16;success=v>0;}
    else if(action===2){
      a.energy-=.12;a.offerUntil=this.tick+12;
      const offer=a.food-a.mineral>0?'food':'mineral',want=offer==='food'?'mineral':'food';
      const b=peers.filter(b=>b.offerUntil>=this.tick&&a[offer]>a[want]+.5&&b[want]>b[offer]+.5).sort((x,y)=>y[want]-x[want]||x.id-y.id)[0];
      if(b){const v=Math.min(1,a[offer],b[want],6-a[want],6-b[offer]);if(v>0){a[offer]-=v;b[offer]+=v;b[want]-=v;a[want]+=v;this.totals.trades++;this.link('trade',a,b,{offer,amount:v});success=true;}}
    }else if(action===3){
      if(a.mineral>=.8&&n.structure<6){a.mineral-=.8;a.energy-=.22;n.structure=Math.min(6,n.structure+1);this.totals.builds++;success=true;this.record('build',{id:a.id,node:n.id,structure:n.structure});}
    }else if(action===4){
      a.energy-=.35;const b=peers.sort((x,y)=>y.food+y.mineral-x.food-x.mineral||x.id-y.id)[0];
      if(b){const defense=clamp(b.guard+this.nodes[b.node].structure*.08,0,.9);b.harm=1;
        if(this.rand()<.68*(1-defense)){const food=Math.min(1.2,b.food,6-a.food),mineral=Math.min(.6,b.mineral,6-a.mineral);b.food-=food;a.food+=food;b.mineral-=mineral;a.mineral+=mineral;this.totals.raids++;this.link('raid',a,b,{food,mineral});success=food+mineral>0;}
        else{a.energy-=.25;this.totals.blocked++;this.link('blocked',a,b);}}
    }else if(action===5){a.guard=1;a.energy-=.16;success=true;}
    else if(action===6||action===7){
      const occupied=new Set(this.agents.filter(b=>b.energy>0).map(b=>b.node));
      const other=action===7?this.pick([(n.island+1)%4,(n.island+3)%4]):n.island;
      const candidates=action===7?this.nodes.filter(m=>m.island===other&&!occupied.has(m.id)):n.neighbors.filter(j=>!occupied.has(j)).map(j=>this.nodes[j]);
      if(candidates.length){const value=m=>m.food*(1-a.food/6)+m.mineral*(1-a.mineral/6)+m.structure*.15;
        candidates.sort((x,y)=>value(y)-value(x)||x.id-y.id);const dest=candidates[0];a.energy-=action===7?1.4:.22;
        const fromNode=a.node;a.node=dest.id;success=true;
        if(action===7){this.totals.migrations++;this.links.push({tick:this.tick,kind:'migration',from:a.id,to:a.id,fromNode,toNode:a.node});this.record('migration',{id:a.id,from:n.island,to:dest.island,fromNode,toNode:a.node});}}
    }else a.energy+=.12;
    a.last=action;a.counts[action]++;this.record('action',{id:a.id,node:a.node,action,success});return success;
  }
  step(){
    if(!this.agents.length)return false;this.tick++;
    for(const n of this.nodes){
      const h=HABITATS[n.island],season=n.island===2?.65+.55*(1+Math.sin(this.tick/150))/2:1;
      const support=n.structure*.035+mean(n.neighbors.map(j=>this.nodes[j].structure))*.012;
      const base=h.food*season;this.totals.foodGrownByStructures+=Math.max(0,Math.min(8-n.food,base+support)-Math.min(8-n.food,base));
      n.food=Math.min(8,n.food+base+support);n.mineral=Math.min(8,n.mineral+h.mineral);n.structure=Math.max(0,n.structure-.006);
    }
    const tally=Array.from({length:4},()=>Array(9).fill(0)),randomTally=Array(9).fill(0),turn=this.shuffle([...this.agents]);
    for(const a of turn){
      a.age++;a.guard=Math.max(0,a.guard-.16);a.harm*=.82;
      const before=a.energy+a.food*1.8+a.mineral*.8,decision=this.decide(a),{action}=decision;a.lastDecision=decision;if(decision.exploratory)randomTally[action]++;tally[this.nodes[a.node].island][action]++;this.act(a,action);
      const eaten=Math.min(.60,a.food);a.food-=eaten;a.energy=Math.min(36,a.energy+eaten*1.8-HABITATS[this.nodes[a.node].island].upkeep-.0025*a.genes.units.length);
      const reward=clamp((a.energy+a.food*1.8+a.mineral*.8-before)/2,-1,1);a.q[action]+=a.genes.learn*(reward-a.q[action]);
      if(a.energy<=0||a.age>=160){a.dead=true;a.energy=0;this.deaths++;this.record('death',{id:a.id,node:a.node,founder:a.founder,age:a.age,children:a.children,cause:a.age>=160?'age':'energy'});continue;}
      if(a.energy>=23&&a.mineral>=1.7&&a.food>=1.5){const occupied=new Set(this.agents.filter(b=>!b.dead).map(b=>b.node)),free=this.nodes[a.node].neighbors.filter(j=>!occupied.has(j));if(free.length){a.energy-=12;a.food-=1;a.mineral-=1.2;this.birth(this.pick(free),a);}}
    }
    this.agents=this.agents.filter(a=>!a.dead);this.links=this.links.filter(e=>e.tick>this.tick-10).slice(-80);
    this.windows.push(tally);this.randomWindows.push(randomTally);if(this.windows.length>100){this.windows.shift();this.randomWindows.shift();}
    const counts=HABITATS.map((_,i)=>this.agents.filter(a=>this.nodes[a.node].island===i).length);
    for(let i=0;i<4;i++){if(counts[i]&&!this.occupiedBefore[i])this.milestone('arrival',`${HABITATS[i].name} receives life`,`${counts[i]} agent${counts[i]===1?'':'s'} present after this tick. Arrival is not yet a lasting colony.`,{island:i});if(!counts[i]&&this.occupiedBefore[i])this.milestone('empty',`${HABITATS[i].name} falls quiet`,'No agents remain here. Migrants may return.',{island:i});}
    this.occupiedBefore=counts;
    for(const l of this.lineages){const n=this.agents.filter(a=>a.founder===l.id).length;l.peak=Math.max(l.peak,n);if(!n&&l.ended===null){l.ended=this.tick;this.milestone('lineage',`Founder ${l.id}'s line ends`,'No living descendants remain.',{founder:l.id});}}
    if(!this.agents.length)this.milestone('extinction','The world has ended','The final population is preserved. No automatic reseeding.');
    return true;
  }
  metrics(){
    const actions=Array.from({length:4},()=>Array(9).fill(0));for(const w of this.windows)for(let i=0;i<4;i++)for(let j=0;j<9;j++)actions[i][j]+=w[i][j];
    const programs=new Map();for(const a of this.agents){const s=shape(a.genes);programs.set(s,(programs.get(s)||0)+1);}
    const lineages=this.lineages.map(l=>({...l,population:this.agents.filter(a=>a.founder===l.id).length}));
    return {tick:this.tick,population:this.agents.length,births:this.births,deaths:this.deaths,generation:Math.max(0,...this.agents.map(a=>a.generation)),lineages:lineages.filter(l=>l.population).length,lineageCounts:lineages.map(l=>l.population),
      exploratory:this.randomWindows.reduce((sum,row)=>sum+row.reduce((a,b)=>a+b,0),0)/Math.max(1,actions.flat().reduce((a,b)=>a+b,0)),shapes:programs.size,effectiveShapes:this.agents.length?Math.exp(-[...programs.values()].reduce((s,v)=>{const p=v/this.agents.length;return s+p*Math.log(p);},0)):0,units:mean(this.agents.map(a=>a.genes.units.length)),maxUnits:Math.max(0,...this.agents.map(a=>a.genes.units.length)),structure:this.nodes.reduce((s,n)=>s+n.structure,0),totals:clone(this.totals),
      islands:HABITATS.map((h,i)=>({name:h.name,population:this.agents.filter(a=>this.nodes[a.node].island===i).length,food:mean(this.nodes.filter(n=>n.island===i).map(n=>n.food)),structure:this.nodes.filter(n=>n.island===i).reduce((s,n)=>s+n.structure,0),actions:actions[i]}))};
  }
  frame(){return {tick:this.tick,agents:this.agents.map(a=>[a.id,a.node,a.founder,a.generation,round(a.energy),a.last,a.genes.units.length]),nodes:this.nodes.map(n=>[round(n.food),round(n.mineral),round(n.structure)]),links:clone(this.links),metrics:this.metrics()};}
  snapshot(){const {events,...s}=this;return clone(s);}
  static restore(s){
    if(s.id!==WORLD_ID||s.schema!==SCHEMA||!Number.isSafeInteger(s.tick)||s.tick<0||s.nodes?.length!==256||s.agents?.length>256)throw new Error('Invalid Symbiosis checkpoint.');
    const w=Object.create(Symbiosis.prototype);Object.assign(w,clone(s));w.events=[];return w;
  }
}
