(()=>{
'use strict';
const $=id=>document.getElementById(id);
const langAr=()=>document.documentElement.lang==='ar'||document.documentElement.dir==='rtl';
const tr=(en,ar)=>langAr()?ar:en;
const clean=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const state={textSource:'',textFile:null,lastFile:null,model:null,timer:null};

function addUI(){
  if($('klsUnifiedIntelligence')) return;
  const projectPanel=$('brief')?.closest('.panel');
  if(!projectPanel) return;
  const wrap=document.createElement('div');
  wrap.id='klsUnifiedIntelligence';
  wrap.style.cssText='margin-top:12px;padding:12px;border:1px solid #31506a;border-radius:14px;background:#0a151f';
  wrap.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><strong>${tr('KLS Unified Design Intelligence','ذكاء KLS الموحد للتصميم')}</strong><span id="kuiState" class="chip warn">${tr('WAITING','انتظار')}</span></div><p id="kuiHelp" class="tip">${tr('Combines written brief + drawing-reader evidence + dimension evidence without replacing existing KLS tools.','يجمع الوصف النصي + أدلة قارئ الرسومات + أدلة الأبعاد بدون إلغاء أي أداة موجودة في KLS.')}</p><div class="field" style="margin-top:8px"><label>${tr('Written-only source file','ملف مصدر كتابي فقط')}</label><input id="knowledgeFileNative" class="nativeFile" type="file" accept=".txt,.md,.csv,.json,.log,text/plain,text/markdown,application/json"></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button id="kuiBuild" class="btn primary">${tr('Build / refresh unified model','بناء / تحديث النموذج الموحد')}</button><button id="kuiApply" class="btn good">${tr('Apply safe proposal','تطبيق المقترح الآمن')}</button></div><div id="kuiCards" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(135px,1fr));margin-top:10px"></div><div id="kuiSources" style="margin-top:10px"></div><div id="kuiProposal" style="margin-top:10px"></div>`;
  projectPanel.appendChild(wrap);
  $('kuiBuild').onclick=build;
  $('kuiApply').onclick=apply;
  $('knowledgeFileNative').addEventListener('change',readTextFile);
}
function setStatus(label,cls='warn'){const e=$('kuiState');if(e){e.textContent=label;e.className='chip '+cls}}
function cardRows(rows){const e=$('kuiCards');if(e)e.innerHTML=rows.map(([a,b])=>`<div class="card"><small>${clean(a)}</small><strong>${clean(b)}</strong></div>`).join('')}
async function readTextFile(ev){
  const f=ev.target.files?.[0]; if(!f)return;
  state.textFile=f;
  try{state.textSource=await f.text();setStatus(tr('TEXT LOADED','تم تحميل النص'),'good');$('kuiHelp').textContent=tr(`Loaded written source: ${f.name}`,`تم تحميل المصدر الكتابي: ${f.name}`);build()}catch(err){setStatus(tr('TEXT ERROR','خطأ بالنص'),'bad');$('kuiHelp').textContent=String(err.message||err)}
}
function matchNum(text,patterns){for(const re of patterns){const m=text.match(re);if(m){const v=parseFloat(String(m[1]).replace(',','.'));if(Number.isFinite(v))return v}}return null}
function countObjects(text,arabicWord,englishWords){let n=0;for(const w of englishWords){const m=text.match(new RegExp('(\\d+)\\s+(?:large\\s+)?'+w,'i'));if(m)n=Math.max(n,+m[1])}const m=text.match(new RegExp('(\\d+)\\s*'+arabicWord,'i'));if(m)n=Math.max(n,+m[1]);return n}
function analyzeText(text){
  const t=text||'';
  const domain=/gallery|museum|exhibition|artwork|canvas|sculpture|معرض|متحف|لوح|مجسم/i.test(t)?'Exhibition':/theatre|theater|stage|مسرح|خشبة/i.test(t)?'Theatre':/event|concert|festival|فعالية|حفلة/i.test(t)?'Live Event':/film|photo|camera|تصوير|كاميرا/i.test(t)?'Film & Photography':($('mode')?.value||'Hybrid');
  const length=matchNum(t,[/(?:length|long|طول|بطول)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i,/(\d+(?:[.,]\d+)?)\s*(?:m|meter|metre|متر)\s*(?:long|طول)/i]);
  const width=matchNum(t,[/(?:width|عرض|بعرض)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i]);
  const height=matchNum(t,[/(?:ceiling\s*height|height|ارتفاع\s*السقف|ارتفاع)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i,/(?:ceiling|السقف).*?(\d+(?:[.,]\d+)?)\s*(?:m|meter|metre|متر)/i]);
  const pair=t.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter|metre|متر)?/i),p1=pair?parseFloat(pair[1].replace(',','.')):null,p2=pair?parseFloat(pair[2].replace(',','.')):null;
  return{domain,length:length??(pair?Math.max(p1,p2):null),width:width??(pair?Math.min(p1,p2):null),height,shape:/l[\s-]?shape|شكل\s*l|حرف\s*l/i.test(t)?'L':/circular|round|دائري/i.test(t)?'circular':/irregular|غير منتظم/i.test(t)?'irregular':'rectangular',artworks:countObjects(t,'لوح(?:ة|ات)','(?:artworks?|canvases?|paintings?)'),sculptures:countObjects(t,'مجسم(?:ات)?','(?:sculptures?)'),blackCeiling:/black ceiling|سقف\s*أسود/i.test(t),frameGapOnly:/frame gaps?|between frames?|فتحات?\s*الفريم|بين\s*الفريم/i.test(t)};
}
function conceptual(facts){
  const assumptions=[];let L=facts.length,W=facts.width,H=facts.height;
  if(!L){L=12;assumptions.push({key:'length',value:L,unit:'m',reason:'missing source value'})}
  if(!W){W=Math.max(6,Math.min(9,L*.6));W=Math.round(W*100)/100;assumptions.push({key:'width',value:W,unit:'m',reason:'missing source value'})}
  if(!H){H=4;assumptions.push({key:'height',value:H,unit:'m',reason:'missing source value'})}
  let polygon;if(facts.shape==='L')polygon=[{x:0,y:0},{x:W,y:0},{x:W,y:L*.45},{x:W*.55,y:L*.45},{x:W*.55,y:L},{x:0,y:L}];else if(facts.shape==='irregular')polygon=[{x:0,y:0},{x:W,y:L*.08},{x:W*.92,y:L},{x:W*.15,y:L*.92}];else polygon=[{x:0,y:0},{x:W,y:0},{x:W,y:L},{x:0,y:L}];
  return{W,L,H,polygon,assumptions};
}
function designProposal(facts,geom){
  const p={tracks:[],notes:[],targetLux:null,mountZ:null};
  if(facts.domain==='Exhibition'){if(facts.sculptures>0)p.tracks.push({role:'Sculpture accent',layout:'single',spots:Math.min(8,Math.max(3,facts.sculptures*2+1)),status:'DESIGN PROPOSAL'});if(facts.artworks>0)p.tracks.push({role:'Artwork wall',layout:'parallel',spots:Math.min(10,Math.max(3,facts.artworks*2+1)),status:'DESIGN PROPOSAL'});if(!p.tracks.length)p.tracks.push({role:'Flexible exhibition accent',layout:'parallel',spots:5,status:'DESIGN PROPOSAL'});p.targetLux=150}else if(facts.domain==='Theatre'){p.notes.push('FOH + wash + back/side roles required');p.targetLux=650}else if(facts.domain==='Live Event'){p.notes.push('Front key + wash + effects roles required');p.targetLux=700}else if(facts.domain==='Film & Photography'){p.notes.push('Key + fill + back + camera evaluation required');p.targetLux=800}
  p.mountZ=Math.max(.5,geom.H-.4);if(facts.frameGapOnly)p.notes.push('Mounting constrained to frame gaps — preserve as installation constraint');if(facts.blackCeiling)p.notes.push('Black ceiling detected — consider low-reflectance visual integration');return p;
}
function evidenceSummary(){const dims=window.KLS_DIMENSION_MODEL||null,plan=window.KLS_ANALYSIS_MODEL||window.KLS_PLAN_GEOMETRY||null;return{dimensions:dims,plan,geometryStatus:plan?.status||null,hasPlan:!!plan,hasDimensions:!!dims}}
function build(){
  addUI();setStatus(tr('BUILDING','جاري البناء'),'warn');const brief=$('brief')?.value?.trim()||'',text=[state.textSource,brief].filter(Boolean).join('\n'),textFacts=analyzeText(text),concept=conceptual(textFacts),ev=evidenceSummary();
  let geometrySource='conceptual',geometry=null;if(ev.plan?.geometry?.polygon?.length){geometry=ev.plan.geometry;geometrySource='drawing_evidence'}else if(ev.plan?.polygon?.length){geometry={polygon:ev.plan.polygon,segments:ev.plan.segments||[]};geometrySource='drawing_evidence'}else geometry={polygon:concept.polygon,segments:[]};
  const proposal=designProposal(textFacts,concept);state.model={version:'26',input:{hasBrief:!!brief,writtenFile:state.textFile?.name||null,drawingFile:state.lastFile?.name||null},facts:textFacts,drawingEvidence:ev.plan,dimensionEvidence:ev.dimensions,geometry:{source:geometrySource,model:geometry,conceptFallback:concept},assumptions:concept.assumptions,designProposal:proposal,statuses:{sourceFacts:text?'AVAILABLE':'LIMITED',drawing:ev.hasPlan?'AVAILABLE':'NOT AVAILABLE',dimensions:ev.hasDimensions?'AVAILABLE':'NOT AVAILABLE',geometry:geometrySource==='drawing_evidence'?'MIXED':'ESTIMATED',proposal:'DESIGN PROPOSAL'}};
  window.KLS_UNIFIED_PROJECT_MODEL=state.model;render();setStatus(tr('MODEL READY','النموذج جاهز'),'good');
}
function render(){
  const m=state.model;if(!m)return;cardRows([[tr('Domain','المجال'),m.facts.domain],[tr('Geometry source','مصدر الهندسة'),m.geometry.source],[tr('Drawing evidence','أدلة الرسومات'),m.statuses.drawing],[tr('Dimension evidence','أدلة الأبعاد'),m.statuses.dimensions],[tr('Assumptions','الافتراضات'),String(m.assumptions.length)],[tr('Design status','حالة التصميم'),m.statuses.proposal]]);
  const sourceRows=[['SOURCE FACT',m.facts.length?`Length ${m.facts.length} m`:null],['SOURCE FACT',m.facts.width?`Width ${m.facts.width} m`:null],['SOURCE FACT',m.facts.height?`Height ${m.facts.height} m`:null],['DRAWING EVIDENCE',m.drawingEvidence?'A-01/A-04 plan model linked':null],['DIMENSION EVIDENCE',m.dimensionEvidence?'Dimension association model linked':null]].filter(x=>x[1]);
  $('kuiSources').innerHTML=`<strong>${tr('Evidence layers','طبقات الأدلة')}</strong>`+(sourceRows.length?sourceRows.map(([s,v])=>`<div class="tip">• ${clean(v)} <span class="chip">${clean(s)}</span></div>`).join(''):`<div class="tip">${tr('No confirmed source facts yet.','لا توجد حقائق مصدر مؤكدة حتى الآن.')}</div>`);
  const a=m.assumptions.map(x=>`<div class="tip">• ${clean(x.key)} = ${x.value} ${x.unit} <span class="chip warn">ASSUMPTION</span></div>`).join(''),d=m.designProposal.tracks.map(x=>`<div class="tip">• ${clean(x.role)} · ${clean(x.layout)} · ${x.spots} ${tr('spots','سبوت')} <span class="chip good">DESIGN PROPOSAL</span></div>`).join(''),n=m.designProposal.notes.map(x=>`<div class="tip">• ${clean(x)} <span class="chip">INFERENCE / CONSTRAINT</span></div>`).join('');
  $('kuiProposal').innerHTML=`<strong>${tr('Consultant output','مخرجات المستشار')}</strong>${a||''}${d||''}${n||''}<div class="tip" style="margin-top:8px">${tr('Engineering values remain review-gated. KLS will not mark assumptions as verified.','تظل القيم الهندسية خاضعة للمراجعة، ولن يعتبر KLS أي افتراض قيمة مؤكدة.')}</div>`;
}
function apply(){
  if(!state.model)build();const m=state.model;if(!m)return;const c=m.geometry.conceptFallback;
  if($('mode')){$('mode').value=m.facts.domain;$('mode').dispatchEvent(new Event('change',{bubbles:true}))}
  if($('w'))$('w').value=c.W.toFixed(2);if($('d'))$('d').value=c.L.toFixed(2);if($('h'))$('h').value=c.H.toFixed(2);if($('targetLux')&&m.designProposal.targetLux)$('targetLux').value=m.designProposal.targetLux;if($('mountZ'))$('mountZ').value=m.designProposal.mountZ.toFixed(2);
  const first=m.designProposal.tracks[0];if(first&&$('trackLayout'))$('trackLayout').value=['single','parallel','perimeter','L'].includes(first.layout)?first.layout:'single';if(first&&$('spotsPerTrack'))$('spotsPerTrack').value=first.spots;if($('approveGeom'))$('approveGeom').checked=false;
  if($('spaceGeometryState'))$('spaceGeometryState').textContent=tr('Unified model applied — review required','تم تطبيق النموذج الموحد — المراجعة مطلوبة');if($('spaceConfidence'))$('spaceConfidence').textContent=tr('Confidence: review','درجة الثقة: مراجعة');if($('smartSpace'))$('smartSpace').textContent=tr('Drawing + brief + assumptions merged','تم دمج الرسم + الوصف + الافتراضات');if($('smartDims'))$('smartDims').textContent=tr('Verified evidence kept separate from assumptions','تم فصل الأدلة المؤكدة عن الافتراضات');
}
function watchMainUpload(){const inp=$('spaceFileNative');if(!inp)return;const handler=e=>{const f=e.target.files?.[0];if(!f)return;state.lastFile=f;clearTimeout(state.timer);state.timer=setTimeout(build,9000)};inp.addEventListener('change',handler);inp.addEventListener('input',handler)}
function watchModels(){let last='';setInterval(()=>{const sig=[!!window.KLS_DIMENSION_MODEL,!!window.KLS_ANALYSIS_MODEL,!!window.KLS_PLAN_GEOMETRY].join('|');if(sig!==last){last=sig;if(state.lastFile||$('brief')?.value?.trim())build()}},1800)}
function boot(){addUI();watchMainUpload();watchModels()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();