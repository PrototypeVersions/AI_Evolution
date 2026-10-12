// Optional model access belongs to the owner-operated runner, never to an agent or browser.
export function validateDecision(d){
  if(!d||!['observe','shift_habitat'].includes(d.action)||!Number.isInteger(d.island)||d.island<0||d.island>3||!Number.isInteger(d.habitat)||d.habitat<0||d.habitat>2)throw new Error('Invalid director decision.');
  for(const key of ['observation','hypothesis','prediction','reason'])if(typeof d[key]!=='string'||d[key].length>1600)throw new Error('Invalid director text.');
  return d;
}
export function applyDecision(world,decision,allowInterventions=false){
  const d=validateDecision(decision);
  if(d.action==='observe')return {applied:false,reason:'Observation only.'};
  if(!allowInterventions)return {applied:false,reason:'Interventions are not enabled by the owner.'};
  if(world.metrics().occupancy<.65||world.tick-world.lastShift<240||world.tick-world.lastDirectorShift<1200||world.config.environmentPeriod-world.tick%world.config.environmentPeriod<120)return {applied:false,reason:'Intervention deferred: population or change-spacing condition not met.'};
  world.shift(d.island,d.habitat,'GPT director');world.lastDirectorShift=world.tick;return {applied:true,reason:'One recorded habitat change.'};
}
export async function consultDirector(world,previousDay,{env=process.env,fetcher=fetch,now=new Date()}={}){
  const day=now.toISOString().slice(0,10),enabled=env.DIRECTOR_ENABLED==='true';
  const configured=enabled&&Boolean(env.OPENAI_API_KEY&&env.OPENAI_MODEL);
  if(!configured)return {mode:'not-connected',day:previousDay??null,entry:null};
  if(previousDay===day)return {mode:'connected',day,entry:null};
  const input={world:world.id,tick:world.tick,metrics:world.metrics(),lastEnvironmentChange:world.lastShift,
    policy:'Observe by default. At most one habitat may be shifted. No resets, new organisms, genome editing, code changes, or access outside the simulation.',
    limits:'Four fixed islands; simple learning policies; four inherited numerical traits and a variable-size neural policy limited to 24 units. A long trajectory alone cannot establish causality, new intelligence, or open-ended evolution.'};
  const request={model:env.OPENAI_MODEL,store:false,max_output_tokens:1600,
    instructions:'You are the research director of a persistent digital ecology. Distinguish observation from hypothesis. State a falsifiable prediction. Prefer leaving the world alone unless a specific question warrants one permitted intervention. Do not treat population size alone as intelligence or complexity. Output the required JSON.',
    input:JSON.stringify(input),text:{format:{type:'json_schema',name:'ecology_decision',strict:true,schema:{type:'object',additionalProperties:false,
      properties:{action:{type:'string',enum:['observe','shift_habitat']},island:{type:'integer'},habitat:{type:'integer'},observation:{type:'string'},hypothesis:{type:'string'},prediction:{type:'string'},reason:{type:'string'}},required:['action','island','habitat','observation','hypothesis','prediction','reason']}}}};
  try{
    const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw new Error(`Model request failed (HTTP ${response.status}).`);
    const raw=await response.json();if(raw.status!=='completed')throw new Error('Model response incomplete.');
    const text=(raw.output??[]).filter(x=>x.type==='message').flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
    const decision=validateDecision(JSON.parse(text)),outcome=applyDecision(world,decision,env.DIRECTOR_ALLOW_INTERVENTIONS==='true');
    return {mode:'connected',day,entry:{tick:world.tick,time:now.toISOString(),source:'GPT director',model:raw.model??env.OPENAI_MODEL,responseId:raw.id,usage:raw.usage,request,response:raw,decision,outcome}};
  }catch(error){return {mode:'error',day,entry:{tick:world.tick,time:now.toISOString(),source:'GPT director',outcome:{applied:false,reason:'Director unavailable; world continues under its existing rules.'},error:error.message.replace(/sk-[\w-]+/g,'[redacted]')}};}
}
