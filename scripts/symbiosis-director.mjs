// Optional advisory model. It cannot mutate the world or execute proposals.
export async function reviewWorld(report,previousDay,{env=process.env,fetcher=fetch,now=new Date()}={}){
  const day=now.toISOString().slice(0,10);
  if(env.SYMBIOSIS_DIRECTOR_ENABLED!=='true'||!env.OPENAI_API_KEY||!env.OPENAI_MODEL)return {mode:'not-connected',day:previousDay??null,entry:null};
  if(previousDay===day)return {mode:'advisory',day,entry:null};
  const fields=['observation','hypothesis','prediction','proposedStudy'];
  const request={model:env.OPENAI_MODEL,store:false,max_output_tokens:1300,
    instructions:'You are an advisory scientist for a bounded digital ecology. Report measured observations separately from hypotheses. Propose one falsifiable comparison with matched checkpoints and fresh seeds. No claims of intelligence, consciousness or open-ended evolution from program length, action counts or one trajectory. You cannot intervene or execute studies. Random exploration can produce every action; counts alone do not prove adaptive behavior.',
    input:JSON.stringify(report),text:{format:{type:'json_schema',name:'ecology_review',strict:true,schema:{type:'object',additionalProperties:false,properties:Object.fromEntries(fields.map(k=>[k,{type:'string'}])),required:fields}}}};
  try{
    const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw new Error(`Director HTTP ${response.status}`);
    const raw=await response.json();if(raw.status!=='completed')throw new Error('Incomplete director response');
    const out=(raw.output??[]).filter(x=>x.type==='message').flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''),decision=JSON.parse(out);
    for(const k of fields)if(typeof decision[k]!=='string'||decision[k].length>2400)throw new Error('Invalid director review');
    return {mode:'advisory',day,entry:{tick:report.after.tick,time:now.toISOString(),source:'AI director',model:raw.model??env.OPENAI_MODEL,decision,usage:raw.usage,request,response:raw}};
  }catch(e){return {mode:'error',day,entry:{tick:report.after.tick,source:'AI director',error:String(e.message).replace(/sk-[\w-]+/g,'[redacted]')}};}
}
