// A read-only projection. No simulation, writes, API keys or world controls in this module.
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('en-US'),fixed=(n,p=1)=>Number(n||0).toFixed(p);
const COLORS=['#7be6ba','#efba73','#bb9af4','#efba73','#f08d7e','#7acbef','#7acbef','#7acbef','#789394'];
const LABELS=['Forage','Mine','Exchange','Build','Raid','Guard','Move','Migrate','Rest'];
const CENTERS=[[208,194],[640,172],[663,421],[227,432]],RADIUS=[123,115,121,114];
let data,frameIndex=0,selected=null,layer='behavior',timer=null,following=true;
const lineageColor=id=>`hsl(${(id*137.508+115)%360} 49% 66%)`;
const position=id=>{const n=data.nodes[id],c=CENTERS[n.island],r=RADIUS[n.island];return [c[0]+n.x*r,c[1]+n.y*r*.74];};
const f=()=>data.frames[frameIndex]||data.frames.at(-1);
const isLatest=()=>f()?.tick===data?.metrics.tick;
function spark(series,w=250,h=44){if(!series.length)return '';const max=Math.max(1,...series.map(x=>x.population)),start=series[0].tick,end=series.at(-1).tick;return series.map((p,i)=>`${i?'L':'M'}${fixed((p.tick-start)/Math.max(1,end-start)*(w-4)+2)} ${fixed(h-p.population/max*(h-7))}`).join(' ');}
function polygon(cx,cy,r,phase=0,stretch=.77){return Array.from({length:60},(_,i)=>{const t=i*Math.PI/30,k=1+.07*Math.sin(t*3+phase)+.04*Math.cos(t*7+phase);return `${fixed(cx+Math.cos(t)*r*k)},${fixed(cy+Math.sin(t)*r*k*stretch)}`;}).join(' ');}
function hex(x,y,r){return Array.from({length:6},(_,i)=>`${fixed(x+Math.cos(i*Math.PI/3+Math.PI/6)*r)},${fixed(y+Math.sin(i*Math.PI/3+Math.PI/6)*r*.82)}`).join(' ');}
function renderMap(){
  const frame=f();if(!frame)return;
  const nodes=frame.nodes,agents=frame.agents,links=$('show-links').checked?frame.links:[];
  let html=`<defs><radialGradient id="water"><stop stop-color="#183238" stop-opacity=".6"/><stop offset="1" stop-color="#0d1b22" stop-opacity="0"/></radialGradient><filter id="bloom"><feGaussianBlur stdDeviation="3"/></filter><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#7acbef" opacity=".5"/></marker></defs><title id="map-title">Symbiosis at tick ${frame.tick}</title><desc id="map-desc">${agents.length} organisms across four habitats. Select an organism to inspect it.</desc><ellipse cx="450" cy="300" rx="440" ry="285" fill="url(#water)"/>`;
  for(let i=0;i<4;i++){
    const [x,y]=CENTERS[i],r=RADIUS[i],h=data.habitats[i],pop=agents.filter(a=>data.nodes[a[1]].island===i).length;
    for(let k=4;k>=1;k--)html+=`<polygon points="${polygon(x,y,r+14+k*14,i*.8)}" fill="none" stroke="${h.color}" stroke-opacity="${.018+(5-k)*.009}" stroke-width=".8"/>`;
    html+=`<polygon points="${polygon(x,y,r+14,i*.8)}" fill="${h.color}" fill-opacity=".028" stroke="${h.color}" stroke-opacity=".14" stroke-width="1"/>`;
    const labelY=y-r*.77-39;
    html+=`<text x="${x}" y="${labelY}" class="habitat-label" text-anchor="middle" font-size="13" letter-spacing="1.1" fill="${h.color}">${esc(h.name.toUpperCase())}</text><text x="${x}" y="${labelY+18}" class="habitat-pop" text-anchor="middle" font-size="10" fill="#728e93">${num(pop)} ORGANISMS ${pop?'':'· UNINHABITED'}</text>`;
  }
  const routes=[[0,1],[1,2],[2,3],[3,0]];
  for(const [i,j] of routes){const a=CENTERS[i],b=CENTERS[j],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),start=[a[0]+dx/l*RADIUS[i]*.98,a[1]+dy/l*RADIUS[i]*.78],end=[b[0]-dx/l*RADIUS[j]*.98,b[1]-dy/l*RADIUS[j]*.78];html+=`<path d="M${start} Q${(a[0]+b[0])/2+15},${(a[1]+b[1])/2-12} ${end}" fill="none" stroke="#769ca3" stroke-opacity=".18" stroke-dasharray="2 6" stroke-width="1" marker-end="url(#arrow)"/>`;}
  for(const n of data.nodes){const [x,y]=position(n.id),v=nodes[n.id]||[0,0,0],food=v[0]/20,mineral=v[1]/20,structure=v[2]/20;
    const color=layer==='resources'?(food>=mineral?'#7be6ba':'#efba73'):layer==='structures'?'#efba73':data.habitats[n.island].color;
    const opacity=layer==='resources'?.07+Math.max(food,mineral)/8*.40:layer==='structures'?.04+structure/6*.7:.04+food/8*.08;
    html+=`<polygon points="${hex(x,y,13.5)}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-opacity=".065" stroke-width=".6"><title>Site ${n.id}: ${fixed(food)} food · ${fixed(mineral)} mineral · ${fixed(structure)} structure</title></polygon>`;
    if(structure>.12)html+=`<circle cx="${x}" cy="${y}" r="${3+structure}" fill="none" stroke="#efba73" stroke-width=".8" stroke-opacity="${layer==='structures'?.8:.18}"/>`;
  }
  for(const e of links){const a=position(e.fromNode),b=position(e.toNode),c=e.kind==='trade'?'#bb9af4':e.kind==='raid'?'#f08d7e':e.kind==='blocked'?'#efba73':'#7acbef';
    html+=`<path class="interaction" d="M${a} Q${(a[0]+b[0])/2+8},${(a[1]+b[1])/2-22} ${b}" fill="none" stroke="${c}" stroke-width="${e.kind==='migration'?1.1:1.4}" stroke-opacity="${Math.max(.15,.8-(frame.tick-e.tick)*.055)}"><title>${esc(e.kind)} · tick ${e.tick} · ${e.from} → ${e.to}</title></path>`;
  }
  for(const a of agents){const [id,node,founder,generation,energy,action]=a,[x,y]=position(node),color=layer==='lineage'?lineageColor(founder):layer==='resources'||layer==='structures'?'#d9e8df':COLORS[action],r=3.4+energy/36*2.3;
    html+=`<g class="organism" role="button" tabindex="0" data-agent="${id}" aria-label="Inspect organism ${id}, generation ${generation}, ${LABELS[action]}"><circle cx="${x}" cy="${y}" r="13" fill="transparent"/><circle class="aura" cx="${x}" cy="${y}" r="${r+3.5}" fill="${color}" opacity=".14" filter="url(#bloom)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity=".2" stroke="${color}" stroke-width="1.1"/><circle cx="${x}" cy="${y}" r="${r*.39}" fill="${color}"/>${id===selected?`<circle class="selected-ring" cx="${x}" cy="${y}" r="13" stroke="#edf7f0" stroke-width="1" fill="none"/><text x="${x+16}" y="${y-14}" font-size="9" fill="#e6eeeb">#${id}</text>`:''}</g>`;
  }
  html+=`<g transform="translate(835 303)" opacity=".5"><path d="M0 0V-25M-4-19L0-27L4-19" fill="none" stroke="#6c9197" stroke-width="1"/><text x="0" y="-35" font-size="8" fill="#6c9197" text-anchor="middle">N</text></g><g transform="translate(58 310)" fill="#5f7f83" font-size="8" letter-spacing="2"><text transform="rotate(-90)">FOUR HABITATS / 256 SITES</text></g>`;
  $('world-map').innerHTML=html;
  const legends=layer==='behavior'?[['#7be6ba','Forage'],['#efba73','Mine / build'],['#bb9af4','Exchange'],['#f08d7e','Raid'],['#7acbef','Defend / travel']]:layer==='lineage'?[[lineageColor(1),'Color = founding ancestry'],['#e6eeeb','Size = energy']]:layer==='resources'?[['#7be6ba','Food-dominant site'],['#efba73','Mineral-dominant site'],['#e6eeeb','Brighter = more resource']]:[['#efba73','Rings = built structures'],['#e6eeeb','Brighter = more infrastructure']];
  $('map-legend').innerHTML=legends.map(([c,t])=>`<span><i style="--c:${c}"></i>${t}</span>`).join('');
  $('frame-tick').textContent=`T ${num(frame.tick)}${isLatest()?' · LATEST':''}`;$('timeline').value=frameIndex;
}
function smallCircuit(a){
  const count=a.genes.units.length,point=j=>j<12?[10,8+j*7.1]:[65+((j-12)%4)*42,8+Math.floor((j-12)/4)*(84/Math.max(1,Math.ceil(count/4)))];let html='';
  for(let i=0;i<count;i++){const u=a.genes.units[i],[x,y]=point(i+12),active=Math.abs(a.lastDecision?.activity[i]||0);for(const source of [u.a,u.b]){const p=point(source);html+=`<path d="M${p}L${x},${y}" stroke="#7be6ba" stroke-opacity="${.06+active*.12}" fill="none" stroke-width=".7"/>`;}
    html+=`<path d="M${x},${y}L267,${9+u.out*10}" stroke="${COLORS[u.out]}" stroke-opacity=".10" stroke-width=".7"/>`;
  }
  for(let j=0;j<12+count;j++){const [x,y]=point(j);html+=`<circle cx="${x}" cy="${y}" r="${j<12?2:2.8}" fill="${j<12?'#607f85':'#7be6ba'}" opacity="${j<12?.7:.25+Math.abs(a.lastDecision?.activity[j-12]||0)*.7}"/>`;}
  for(let j=0;j<9;j++)html+=`<circle cx="267" cy="${9+j*10}" r="${j===a.last?4:2.5}" fill="${COLORS[j]}" opacity="${j===a.last?1:.3}"/>`;
  return `<svg class="circuit" viewBox="0 0 280 99" role="img" aria-label="Inherited circuit with 12 sensors, ${count} units and nine action outputs">${html}</svg>`;
}
function renderSpecimen(){
  const frame=f(),p=frame.agents.find(a=>a[0]===selected);$('organism-select').innerHTML=frame.agents.map(a=>`<option value="${a[0]}">#${a[0]} · ${esc(data.habitats[data.nodes[a[1]].island].name)} · generation ${a[3]}</option>`).join('');$('organism-select').value=selected??'';if(!p){$('specimen').innerHTML='<div class="empty-inspector">Select an organism<br>to explore its inner workings.</div>';return;}
  const [id,node,founder,generation,energy,action,units]=p,h=data.habitats[data.nodes[node].island],a=isLatest()?data.agents.find(a=>a.id===id):null,c=lineageColor(founder);
  $('specimen-tag').textContent=isLatest()?'LATEST CHECKPOINT':'PAST FRAME';
  let html=`<div class="specimen-heading"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="22" stroke="${c}" stroke-opacity=".2" fill="${c}" fill-opacity=".04"/><circle cx="25" cy="25" r="12" stroke="${c}" fill="none"/><circle cx="25" cy="25" r="5" fill="${c}"/><circle cx="37" cy="25" r="2" fill="#e6eeeb"/></svg><div><h3>Organism ${num(id)}</h3><p>${esc(h.name)} · Founder ${founder}</p></div></div><div class="specimen-stats"><div><strong>${generation}</strong><span>GENERATION</span></div><div><strong>${units}</strong><span>CIRCUIT UNITS</span></div><div><strong>${a?a.children:'—'}</strong><span>OFFSPRING</span></div></div><div class="micro-label"><span>Energy reserve</span><span>${fixed(energy)} / 36</span></div><div class="energy-track"><i style="width:${Math.min(100,energy/36*100)}%"></i></div>`;
  if(!a){html+=`<p class="decision">Recorded activity: <strong>${LABELS[action]}</strong>.</p><p class="fine">You’re looking into the past. Full decision details are available for organisms at the latest checkpoint.</p><button class="arrow-link" data-latest>Return to the present ↗</button>`;$('specimen').innerHTML=html;return;}
  const d=a.lastDecision;
  html+=`<p class="decision">Last action: <strong style="color:${COLORS[action]}">${LABELS[action]}</strong>${d?` · ${d.exploratory?'random exploration':'chosen by its circuit'}`:' · newborn, has not acted'}.</p><div class="micro-label"><span>INHERITED DECISION CIRCUIT</span><span>12 → ${units} → 9</span></div>${smallCircuit(a)}<p class="circuit-caption">Sensors → evolving connections → action votes</p>`;
  if(d){html+=`<details class="inspector-detail"><summary>Why this action? View the scores</summary><p class="fine">Tick ${num(d.tick)}. ${d.exploratory?'Exploration overrode the highest score.':'The highest total score won.'} Votes include inherited biases, circuit output and learned action values.</p><div class="score-list">${d.scores.map((s,i)=>`<div class="score-row ${i===d.action?'chosen':''}"><span>${i===d.action?'→ ':''}${LABELS[i]}</span><span>${fixed(s,3)}</span></div>`).join('')}</div><details class="inspector-detail"><summary>Sensor readings at that decision</summary><div class="score-list">${d.sensors.map((v,i)=>`<div class="score-row"><span>${esc(data.sensors[i])}</span><span>${fixed(v,3)}</span></div>`).join('')}</div><p class="fine">Normalized inputs, recorded before the action.</p></details></details>`;}
  html+=`<details class="inspector-detail"><summary>Read the inherited program</summary><p class="fine">Each unit reads two inputs and casts a vote. All ${units} units execute in order.</p><ol class="program-list">${a.genes.units.map((u,i)=>{const ref=j=>j<12?data.sensors[j]:`unit ${j-11}`;return `<li>tanh(${esc(ref(u.a))} × ${fixed(u.wa,2)} + ${esc(ref(u.b))} × ${fixed(u.wb,2)} + ${fixed(u.bias,2)})<br>→ ${LABELS[u.out]} × ${fixed(u.gain,2)}</li>`;}).join('')}</ol><p class="fine">Exploration ${fixed(a.genes.explore*100)}% · Learning rate ${fixed(a.genes.learn,2)} · Inherited memory ${fixed(a.genes.inherit*100)}%</p></details><details class="inspector-detail"><summary>Resources & family history</summary><p class="fine">Food ${fixed(a.food)} · Mineral ${fixed(a.mineral)} · Age ${a.age} / 160<br>Born at tick ${num(a.born)} · ${a.parent?`Parent ${num(a.parent)}`:'Founder'}</p><p class="ancestry-chain">${a.ancestry.map(num).join(' → ')}${a.ancestry.length?' → ':''}${num(a.id)}</p><p class="fine">Most recent 16 ancestors shown; full parentage is in the archived birth records.</p></details>`;
  $('specimen').innerHTML=html;
}
function renderHistory(){
  const series=data.timeline,max=Math.max(1,...series.map(m=>m.population)),start=series[0].tick,end=series.at(-1).tick,w=775,h=177,x=t=>45+(t-start)/Math.max(1,end-start)*w,y=v=>202-v/max*h;
  let html='';for(let i=0;i<4;i++){const v=max*i/3;html+=`<path d="M45 ${y(v)}H820" stroke="#293d42" stroke-width=".7"/><text x="32" y="${y(v)+3}" text-anchor="end" fill="#67848b" font-size="9">${Math.round(v)}</text>`;}
  const accum=series.map(()=>0);
  for(let id=1;id<=24;id++){
    const lower=[...accum],upper=series.map((m,i)=>accum[i]+=(m.lineageCounts[id-1]||0));
    const points=upper.map((v,i)=>`${x(series[i].tick)},${y(v)}`).concat(lower.map((v,i)=>`${x(series[i].tick)},${y(v)}`).reverse()).join(' ');
    html+=`<polygon points="${points}" fill="${lineageColor(id)}" fill-opacity=".75" stroke="#102026" stroke-width=".25"><title>Founder ${id} · ${data.metrics.lineageCounts[id-1]||0} living descendants now</title></polygon>`;
  }
  for(let i=0;i<5;i++){const t=start+(end-start)*i/4;html+=`<text x="${x(t)}" y="226" text-anchor="middle" fill="#67848b" font-size="9">${num(Math.round(t))}</text>`;}
  html+='<text x="45" y="13" fill="#67848b" font-size="8" letter-spacing="1">ORGANISMS</text><text x="820" y="247" fill="#67848b" font-size="8" text-anchor="end" letter-spacing="1">WORLD TICK</text>';$('lineage-chart').innerHTML=html;
  $('lineage-legend').innerHTML=data.lineages.map(l=>`<span style="opacity:${l.ended===null?1:.32}" title="Founder ${l.id}${l.ended!==null?` ended at tick ${l.ended}`:''}"><i style="--c:${lineageColor(l.id)}"></i>F${String(l.id).padStart(2,'0')}${l.ended!==null?' †':''}</span>`).join('');
  const counts=Array(9).fill(0);data.metrics.islands.forEach(h=>h.actions.forEach((v,i)=>counts[i]+=v));const total=counts.reduce((a,b)=>a+b,0)||1;
  $('behavior-bars').innerHTML=counts.map((v,i)=>`<div class="behavior-row" style="--c:${COLORS[i]}"><span>${LABELS[i]}</span><div class="bar"><i style="width:${v/total*100}%"></i></div><span>${fixed(v/total*100,1)}%</span></div>`).join('');
  $('exploration-note').textContent=`${fixed(data.metrics.exploratory*100)}% of recent actions came from random exploration. Action counts include failed attempts; they do not establish an evolved strategy.`;
}
function renderOverview(){
  const m=data.metrics;$('world-tick').textContent=num(m.tick);$('stat-pop').textContent=num(m.population);$('stat-gen').textContent=num(m.generation);$('stat-shapes').textContent=num(m.shapes);$('stat-lineages').textContent=num(m.lineages);
  const age=(Date.now()-Date.parse(data.updatedAt))/3600000,mins=Math.max(0,Math.floor(age*60));$('world-status').textContent=!m.population?'WORLD EXTINCT':age>3?'CHECKPOINT DELAYED':'PERSISTENT WORLD';$('status-light').classList.toggle('stale',age>3||!m.population);
  $('updated').textContent=`Saved ${mins<1?'just now':mins<60?`${mins} minute${mins===1?'':'s'} ago`:`${Math.floor(age)} hour${Math.floor(age)===1?'':'s'} ago`} · ${new Date(data.updatedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})} UTC`;
  const line=spark(data.timeline);$('population-spark').innerHTML=`<path d="${line} L248 46 L2 46 Z" fill="#7be6ba" fill-opacity=".06"/><path d="${line}" fill="none" stroke="#7be6ba" stroke-width="1.6"/>`;$('spark-label').textContent=`T ${num(data.timeline[0].tick)} — ${num(m.tick)} · sampled measurements`;
  $('structures-total').textContent=fixed(m.structure);$('trades-total').textContent=num(m.totals.trades);
  $('habitats').innerHTML=m.islands.map((h,i)=>`<article class="habitat-card" style="--c:${data.habitats[i].color}"><div class="habitat-name"><i></i>${esc(h.name)}</div><p>${esc(data.habitats[i].subtitle)}</p><div class="habitat-count"><strong>${num(h.population)}</strong><span>organisms / 64 sites</span></div><div class="capacity" aria-hidden="true">${Array.from({length:16},(_,j)=>`<i class="${j<h.population/4?'on':''}"></i>`).join('')}</div><div class="habitat-foot"><span>FOOD ${fixed(h.food)} / SITE</span><span>STRUCTURE ${fixed(h.structure)}</span></div></article>`).join('');
  const note=data.notes.at(-1);$('chapter-note').innerHTML=note?`<h3>${esc(note.title)}</h3><p>${esc(note.text)}</p><p class="fine">Ticks ${num(note.fromTick)}–${num(note.tick)} · ${esc(note.caveat)}</p>`:'<h3>The first lives are here.</h3><p>The next cloud continuation will publish the first chapter. Twenty-four founders share a common starting habitat.</p>';
  $('archive-link').href=data.chapters.at(-1)?.release||'https://github.com/PrototypeVersions/AI_Evolution/releases';
  $('event-list').innerHTML=[...data.milestones].reverse().slice(0,14).map(e=>`<li><time>T ${num(e.tick)}</time><div><strong>${esc(e.title)}</strong><p>${esc(e.text)}</p></div></li>`).join('');
  const mode=data.director.mode;$('director-status').textContent=mode==='advisory'?'ADVISORY · CONNECTED':mode==='error'?'LAST REQUEST FAILED':'NOT CONNECTED';
  if(mode==='advisory'){$('director-heading').textContent='An AI scientist, reading the evidence.';$('director-copy').textContent='The director separates observations, hypotheses and proposed studies. It cannot alter this world. Reviews are attempted at most once per day in the accepted history.';}
  else if(mode==='error'){$('director-heading').textContent='The director is temporarily unavailable.';$('director-copy').textContent='The last review failed. The ecology continues under its existing rules; the failed request is recorded in the chapter archive.';}
  $('director-entries').innerHTML=data.director.entries.filter(e=>e.decision).slice(-2).reverse().map(e=>`<article class="director-entry"><span class="eyebrow">AI REVIEW · T ${num(e.tick)} · ${esc(e.model)}</span>${Object.entries(e.decision).map(([k,v])=>`<p><strong>${esc(k==='proposedStudy'?'Proposed study':k[0].toUpperCase()+k.slice(1))}:</strong> ${esc(v)}</p>`).join('')}</article>`).join('');
  $('provenance-data').innerHTML=[['World',data.id],['Seed','20261013'],['Segment',data.segment],['Saved',data.updatedAt],['Checkpoint',data.checkpointHash],['Source',data.sourceHash],['Schedule','1,000 ticks hourly · minute 37 UTC · may be delayed'],['Complexity',`${fixed(m.units)} mean units · ${m.maxUnits} largest circuit · ${fixed(m.effectiveShapes)} effective program shapes`]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  renderHistory();
}
function selectDefault(){if(!f().agents.some(a=>a[0]===selected)){const chosen=[...f().agents].sort((a,b)=>b[6]-a[6]||a[0]-b[0])[0];selected=chosen?.[0]??null;}}
function latest(){stop();following=true;frameIndex=data.frames.length-1;selectDefault();renderMap();renderSpecimen();}
function stop(){if(timer){clearInterval(timer);timer=null;}$('play').innerHTML='<span>▶</span> Replay';$('play').setAttribute('aria-label','Play recorded history');}
function renderAll(){renderOverview();$('timeline').max=data.frames.length-1;$('replay-start').textContent=`T ${num(data.frames[0].tick)}`;$('replay-end').textContent=`T ${num(data.frames.at(-1).tick)}`;$('play').disabled=data.frames.length<2;selectDefault();renderMap();renderSpecimen();}
async function refresh(){try{const r=await fetch(`data/symbiosis/observatory.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const next=await r.json();if(next.id!=='symbiosis-002'||!next.frames?.length||!next.metrics)throw new Error('Unrecognized world data');
  if(!data){data=next;frameIndex=data.frames.length-1;renderAll();}else if(data.checkpointHash!==next.checkpointHash){if(following&&!timer){data=next;frameIndex=data.frames.length-1;renderAll();}else{$('world-status').textContent='NEW CHECKPOINT AVAILABLE';}}else renderOverview();$('load-error').hidden=true;
}catch(e){$('load-error').hidden=false;$('load-error').textContent=data?'The latest refresh failed. Showing the last successfully loaded checkpoint.':'The world data could not be loaded. Please refresh this page shortly; the cloud world is independent of this viewer.';}}
$('world-map').addEventListener('click',e=>{const target=e.target.closest('[data-agent]');if(target){selected=Number(target.dataset.agent);renderMap();renderSpecimen();}});
$('world-map').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){const target=e.target.closest('[data-agent]');if(target){e.preventDefault();selected=Number(target.dataset.agent);renderMap();renderSpecimen();}}});
$('organism-select').addEventListener('change',()=>{selected=Number($('organism-select').value);renderMap();renderSpecimen();});
$('specimen').addEventListener('click',e=>{if(e.target.closest('[data-latest]'))latest();});
for(const b of document.querySelectorAll('[data-layer]'))b.addEventListener('click',()=>{layer=b.dataset.layer;for(const c of document.querySelectorAll('[data-layer]')){c.classList.toggle('active',c===b);c.setAttribute('aria-pressed',String(c===b));}if(data)renderMap();});
$('show-links').addEventListener('change',()=>{if(data)renderMap();});
$('timeline').addEventListener('input',()=>{if(!data)return;stop();following=false;frameIndex=Number($('timeline').value);selectDefault();renderMap();renderSpecimen();});
$('latest').addEventListener('click',()=>{if(data){latest();refresh();}});
$('play').addEventListener('click',()=>{if(!data)return;if(timer){stop();return;}following=false;if(frameIndex>=data.frames.length-1)frameIndex=0;$('play').innerHTML='<span>Ⅱ</span> Pause';$('play').setAttribute('aria-label','Pause recorded history');selectDefault();renderMap();renderSpecimen();timer=setInterval(()=>{frameIndex++;if(frameIndex>=data.frames.length){frameIndex=data.frames.length-1;stop();}selectDefault();renderMap();renderSpecimen();},650);});
for(const a of document.querySelectorAll('nav a'))a.addEventListener('click',()=>{for(const b of document.querySelectorAll('nav a'))b.classList.toggle('active',b===a);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);
