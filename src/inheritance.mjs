// Inheritance 003. Small neural learners; no network, file access, or dynamic code.
export const ID='inheritance-003';
export const SCHEMA='inheritance-1';
export const CONFIG=Object.freeze({inputs:12,hidden:24,outputs:8,population:4,replicates:3,training:2048,phaseRounds:24,learningRate:0.08,mutationRate:0.02,mutationScale:0.025,roundsPerSegment:12,maxRounds:384});
export const TASKS=['Reverse','Rotate','Invert','XOR'];
export const ARMS=[{id:'inherit',name:'Inherited population',color:'#a99aff',description:'Four learners. Two selected parents pass learned weights to perturbed descendants.'},{id:'reset',name:'Fresh offspring',color:'#f0b96a',description:'The same population procedure, but offspring receive newly initialized weights.'},{id:'single',name:'Continuous learner',color:'#72d9eb',description:'One learner receives the entire training stream and keeps learning.'}];
export const PARAMETERS=12*24+24+24*8+8;
export const FORWARD_MACS=12*24+24*8;
// Forward matrices + both weight gradients + propagation from outputs to hidden.
export const TRAIN_MACS=FORWARD_MACS*2+24*8;
export const clone=x=>JSON.parse(JSON.stringify(x));
export function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export function seedFor(...values){let h=2166136261;for(const c of values.join(':')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export const split=n=>{const k=(n*73+19)%256;return k<192?'train':k<224?'selection':'audit';};
export const POOLS=Object.fromEntries(['train','selection','audit'].map(s=>[s,Array.from({length:256},(_,i)=>i).filter(n=>split(n)===s)]));
export function example(n,ops){const bits=Array.from({length:8},(_,i)=>(n>>(7-i))&1);let y=bits.slice();for(const op of ops){if(op===0)y=y.slice().reverse();if(op===1)y=y.slice(1).concat(y[0]);if(op===2)y=y.map(b=>1-b);if(op===3)y=y.map((b,i)=>b^y[(i+1)%8]);}return {n,ops,x:[...bits.map(b=>b*2-1),...TASKS.map((_,i)=>ops.includes(i)?1:0)],y};}
export function makeWeights(random){return {a:Array.from({length:288},()=> (random()*2-1)*Math.sqrt(6/36)),b:Array(24).fill(0),c:Array.from({length:192},()=>(random()*2-1)*Math.sqrt(6/32)),d:Array(8).fill(0)};}
export function forward(w,x){const h=Array(24),p=Array(8);for(let j=0;j<24;j++){let v=w.b[j];for(let i=0;i<12;i++)v+=w.a[j*12+i]*x[i];h[j]=Math.tanh(v);}for(let k=0;k<8;k++){let v=w.d[k];for(let j=0;j<24;j++)v+=w.c[k*24+j]*h[j];p[k]=1/(1+Math.exp(-Math.max(-40,Math.min(40,v))));}return {h,p};}
export function gradients(w,e){const {h,p}=forward(w,e.x),delta=p.map((v,k)=>(v-e.y[k])/8),dh=h.map((v,j)=>{let t=0;for(let k=0;k<8;k++)t+=w.c[k*24+j]*delta[k];return t*(1-v*v);});return {a:dh.flatMap(v=>e.x.map(x=>v*x)),b:dh,c:delta.flatMap(v=>h.map(x=>v*x)),d:delta};}
export function train(w,e,rate=CONFIG.learningRate){const {h,p}=forward(w,e.x),delta=p.map((v,k)=>(v-e.y[k])/8),dh=Array(24);for(let j=0;j<24;j++){let t=0;for(let k=0;k<8;k++)t+=w.c[k*24+j]*delta[k];dh[j]=t*(1-h[j]*h[j]);}for(let k=0;k<8;k++){w.d[k]-=rate*delta[k];for(let j=0;j<24;j++)w.c[k*24+j]-=rate*delta[k]*h[j];}for(let j=0;j<24;j++){w.b[j]-=rate*dh[j];for(let i=0;i<12;i++)w.a[j*12+i]-=rate*dh[j]*e.x[i];}}
export function evaluate(w,examples){let bits=0,exact=0,loss=0;for(const e of examples){const {p}=forward(w,e.x);let all=true;for(let i=0;i<8;i++){const ok=Number(p[i]>=0.5)===e.y[i];bits+=Number(ok);all=all&&ok;const v=Math.max(1e-12,Math.min(1-1e-12,p[i]));loss-=e.y[i]*Math.log(v)+(1-e.y[i])*Math.log(1-v);}exact+=Number(all);}return {accuracy:bits/(examples.length*8),exact:exact/examples.length,loss:loss/(examples.length*8),examples:examples.length};}
const sets=(pool,composed=false)=>composed?[ [0,1],[0,2],[0,3],[1,2],[1,3],[2,3] ].map(ops=>pool.map(n=>example(n,ops))):TASKS.map((_,t)=>pool.map(n=>example(n,[t])));
const VALIDATION=sets(POOLS.selection),AUDIT=sets(POOLS.audit),TRANSFER=sets(POOLS.audit,true);
export function phase(round){return Math.floor((Math.max(1,round)-1)/CONFIG.phaseRounds)%4;}
export function trainingStream(seed,round,count=CONFIG.training,balanced=false){const random=rng(seedFor(seed,round,balanced?'assay':'training')),focus=phase(round);return Array.from({length:count},()=>{const u=random();const task=balanced?Math.floor(u*4):u<0.7?focus:(focus+1+Math.floor((u-0.7)/0.1))%4;return example(POOLS.train[Math.floor(random()*POOLS.train.length)],[task]);});}
function validate(w,focus){const tasks=VALIDATION.map(es=>evaluate(w,es));return {tasks,loss:tasks.reduce((s,t,i)=>s+t.loss*(i===focus?0.7:0.1),0)};}
export function audit(w){const tasks=AUDIT.map(es=>evaluate(w,es)),transfer=TRANSFER.map(es=>evaluate(w,es));return {tasks,accuracy:tasks.reduce((s,t)=>s+t.accuracy,0)/4,exact:tasks.reduce((s,t)=>s+t.exact,0)/4,transfer:transfer.reduce((s,t)=>s+t.accuracy,0)/6,transferExact:transfer.reduce((s,t)=>s+t.exact,0)/6};}
function makeAgent(seed,id,round=0,slot=0,parent=null,generation=0){return {id,parent,generation,born:round,slot,weights:makeWeights(rng(seed)),trainingExamples:0,mutation:null};}
function record(a){return {id:a.id,parent:a.parent,generation:a.generation,born:a.born,slot:a.slot,retired:null,mutation:a.mutation};}
function emptyLedger(){return {trainingExamples:0,selectionExamples:0,auditExamples:0,assayTrainingExamples:0,assayEvaluationExamples:0,macs:0};}
function auditAssay(agent,seed,round){const warm=clone(agent.weights),fresh=makeWeights(rng(seedFor(seed,round,'assay-reset'))),stream=trainingStream(seed,round,256,true);for(const e of stream){train(warm,e);train(fresh,e);}return {round,trainingExamplesPerCopy:256,warm:auditBasics(warm),fresh:auditBasics(fresh)};}
function auditBasics(w){const tasks=AUDIT.map(es=>evaluate(w,es));return {accuracy:tasks.reduce((s,t)=>s+t.accuracy,0)/4,tasks:tasks.map(t=>t.accuracy)};}
export class Study{
  constructor({seeds=[13001,13002,13003]}={}){this.state={id:ID,schema:SCHEMA,round:0,seeds,replicates:seeds.map((seed,r)=>({seed,id:r+1,arms:Object.fromEntries(ARMS.map(({id})=>{const agents=Array.from({length:id==='single'?1:4},(_,i)=>makeAgent(seedFor(seed,'founder',i),`${r+1}-${id}-${i+1}`,0,i));return [id,{nextId:agents.length+1,agents,records:agents.map(record),ledger:emptyLedger(),champion:agents[0].id,measurement:null,assay:null}];}))}))};this.events=[];}
  static restore(state){if(state.id!==ID||state.schema!==SCHEMA||!Number.isInteger(state.round)||state.replicates.length!==3)throw Error('Invalid study checkpoint');const s=Object.create(Study.prototype);s.state=clone(state);s.events=[];return s;}
  snapshot(){return clone(this.state);}
  step({auditFn=audit}={}){if(this.state.round>=CONFIG.maxRounds)throw Error('Chapter complete; checkpoint preserved');const round=++this.state.round,focus=phase(round);const summaries=[];
    for(const rep of this.state.replicates){const stream=trainingStream(rep.seed,round);for(const {id} of ARMS){const arm=rep.arms[id],chunks=CONFIG.training/4;let ranked=[];
      if(id==='single'){const a=arm.agents[0];for(let c=0;c<4;c++){for(const e of stream.slice(c*chunks,(c+1)*chunks))train(a.weights,e);ranked=[{agent:a,validation:validate(a.weights,focus)}];}a.trainingExamples+=CONFIG.training;}
      else {for(const a of arm.agents){for(const e of stream.slice(a.slot*chunks,(a.slot+1)*chunks))train(a.weights,e);a.trainingExamples+=chunks;ranked.push({agent:a,validation:validate(a.weights,focus)});}ranked.sort((a,b)=>a.validation.loss-b.validation.loss||a.agent.id.localeCompare(b.agent.id));}
      const champion=ranked[0].agent;arm.champion=champion.id;const measurement=auditFn(champion.weights);arm.measurement={...measurement,round,champion:champion.id,generation:champion.generation,selectionLoss:ranked[0].validation.loss,trainingExamples:champion.trainingExamples};
      const ledger=arm.ledger;ledger.trainingExamples+=2048;ledger.selectionExamples+=512;ledger.auditExamples+=320;ledger.macs+=2048*TRAIN_MACS+(512+320)*FORWARD_MACS;
      for(const {agent,validation} of ranked){const rec=arm.records.find(r=>r.id===agent.id);rec.lastRound=round;rec.selectionLoss=validation.loss;if(agent.id===champion.id){rec.accuracy=measurement.accuracy;rec.transfer=measurement.transfer;rec.auditedAt=round;}}
      if(round%CONFIG.phaseRounds===0){arm.assay=auditAssay(champion,rep.seed,round);ledger.assayTrainingExamples+=512;ledger.assayEvaluationExamples+=256;ledger.macs+=512*TRAIN_MACS+256*FORWARD_MACS;this.events.push({type:'assay',replicate:rep.id,arm:id,...arm.assay});}
      if(id!=='single'){const parents=ranked.slice(0,2).map(x=>x.agent),retire=ranked.slice(2).map(x=>x.agent);for(let k=0;k<2;k++){const parent=parents[k],old=retire[k],child=makeAgent(seedFor(rep.seed,round,'birth',k),`${rep.id}-${id}-${arm.nextId++}`,round,old.slot,parent.id,parent.generation+1);
          if(id==='inherit'){child.weights=clone(parent.weights);const random=rng(seedFor(rep.seed,round,'mutation',k));let changed=0;for(const key of ['a','b','c','d'])for(let j=0;j<child.weights[key].length;j++){if(random()<CONFIG.mutationRate){child.weights[key][j]+=(random()*2-1)*CONFIG.mutationScale;changed++;}}child.mutation={kind:'inherited',changed,scale:CONFIG.mutationScale,inheritedTrainingExamples:parent.trainingExamples};child.trainingExamples=parent.trainingExamples;}
          else child.mutation={kind:'fresh',changed:PARAMETERS,scale:null,inheritedTrainingExamples:0};
          arm.records.find(r=>r.id===old.id).retired=round;arm.agents[arm.agents.findIndex(a=>a.id===old.id)]=child;arm.records.push(record(child));this.events.push({type:'birth',round,replicate:rep.id,arm:id,retired:old.id,parent:parent.id,child:clone(child)});
        }
        // Full birth records are in segment archives; checkpoint retains active ancestors plus recent records.
        if(arm.records.length>600){const live=new Set(arm.agents.map(a=>a.id));arm.records=arm.records.filter((r,i)=>i>=arm.records.length-500||live.has(r.id));}
      }
      summaries.push({replicate:rep.id,arm:id,...arm.measurement,macs:ledger.macs,assay:arm.assay});
    }}
    const row={round,focus,arms:Object.fromEntries(ARMS.map(({id})=>{const rows=summaries.filter(r=>r.arm===id);return [id,{accuracy:rows.reduce((s,r)=>s+r.accuracy,0)/3,transfer:rows.reduce((s,r)=>s+r.transfer,0)/3,exact:rows.reduce((s,r)=>s+r.exact,0)/3,min:Math.min(...rows.map(r=>r.accuracy)),max:Math.max(...rows.map(r=>r.accuracy)),tasks:TASKS.map((_,t)=>rows.reduce((s,r)=>s+r.tasks[t].accuracy,0)/3),macs:rows[0].macs}];})),replicates:summaries};
    this.events.push({type:'measurement',...row});return row;
  }
  report(){return {id:ID,schema:SCHEMA,round:this.state.round,focus:phase(this.state.round),config:CONFIG,parameters:PARAMETERS,tasks:TASKS,arms:ARMS,replicates:this.state.replicates.map(rep=>({id:rep.id,seed:rep.seed,arms:Object.fromEntries(ARMS.map(({id})=>{const arm=rep.arms[id],live=new Set(arm.agents.map(a=>a.id));return [id,{champion:arm.champion,measurement:arm.measurement,ledger:arm.ledger,assay:arm.assay,records:arm.records.filter((r,i)=>i>=arm.records.length-140||live.has(r.id)),agents:arm.agents.map(a=>({...clone(a),examples:TASKS.map((_,t)=>{const e=example(POOLS.audit[(t*7)%32],[t]);return {...e,p:forward(a.weights,e.x).p};})}))}];}))}))};}
}
