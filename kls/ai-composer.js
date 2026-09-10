(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ar=()=>document.documentElement.dir==='rtl'||document.documentElement.lang==='ar';
const t=(e,a)=>ar()?a:e;
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
let model=null;

function inject(){
  if($('klsAIComposer')) return;
  const projectPanel=$('brief')?.closest('.panel');
  if(!projectPanel) return;
  const box=document.createElement('div');
  box.id='klsAIComposer';
  box.style.cssText='margin-top:12px;padding:12px;border:1px solid #31506a;border-radius:14px;background:#0a151f';
  box.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
      <strong>${t('KLS Design Intelligence','ذكاء KLS للتصميم')}</strong>
      <span id="aiState" class="chip warn">${t('WAITING','انتظار')}</span>
    </div>
    <p id="aiHelp" class="tip">${t('Describe the space in normal language. KLS separates facts, inferences, design proposals and assumptions, then creates a conceptual plan.','صف المكان بلغتك العادية. يفصل KLS بين الحقائق والاستنتاجات ومقترحات التصميم والافتراضات، ثم ينشئ مخططاً مبدئياً.')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="aiBuild" class="btn primary">${t('Build concept from brief','ابنِ مخططاً من الوصف')}</button>
      <button id="aiSend" class="btn good">${t('Use concept in KLS','استخدم المقترح في KLS')}</button>
    </div>
    <div id="aiFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(135px,1fr));margin-top:10px"></div>
    <canvas id="aiCanvas" style="display:none;width:100%;max-height:360px;background:#fff;border-radius:10px;margin-top:10px"></canvas>
    <div id="aiOutput" style="margin-top:10px"></div>`;
  projectPanel.appendChild(box);
  $('aiBuild').onclick=build;
  $('aiSend').onclick=apply;
}
const num=s=>parseFloat(String(s).replace(',','.'));
function first(re,s){const m=s.match(re);return m?num(m[1]):null}
function count(re,s){const m=s.match(re);return m?parseInt(m[1],10):0}
function wordsCount(re,s,map){
 const m=s.match(re);if(!m)return 0;return map[m[1].toLowerCase()]||0;
}
function extract(brief){
 const length=first(/(?:length|long|طول(?:ه)?|بطول)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*m?/i,brief);
 const width=first(/(?:width|عرض(?:ه)?|بعرض)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*m?/i,brief);
 const height=first(/(?:height|ceiling(?: height)?|ارتفاع(?: السقف)?|السقف(?: على)? ارتفاع)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*m?/i,brief);
 let dims=[...brief.matchAll(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter|metre|متر)?/gi)];
 let w=width,l=length,h=height;
 if(dims.length){const a=num(dims[0][1]),b=num(dims[0][2]);if(!w)w=Math.min(a,b);if(!l)l=Math.max(a,b)}
 const shape=/\bl[- ]?shape|l shaped|حرف\s*l|شكل\s*l/i.test(brief)?'L':
   /circular|round|دائري/i.test(brief)?'circular':
   /irregular|غير منتظم/i.test(brief)?'irregular':'rectangular';
 const domain=/museum|gallery|exhibition|artwork|canvas|sculpture|متحف|معرض|لوحات|مجسم/i.test(brief)?'Exhibition':
   /theatre|theater|stage|مسرح|خشبة/i.test(brief)?'Theatre':
   /concert|event|فعالية|حفلة/i.test(brief)?'Live Event':
   /film|photo|camera|تصوير|كاميرا/i.test(brief)?'Film & Photography':($('mode')?.value||'Hybrid');
 const nmap={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
 const canvases=count(/(\d+)\s*(?:large\s*)?(?:canvases?|paintings?|artworks?|لوحات)/i,brief)||wordsCount(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:large\s*)?(?:canvases?|paintings?|artworks?)/i,brief,nmap);
 const sculptures=count(/(\d+)\s*(?:sculptures?|مجسم(?:ات)?)/i,brief)||wordsCount(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:sculptures?)/i,brief,nmap);
 const ceilingBlack=/black ceiling|سقف أسود|السقف أسود/i.test(brief);
 const frameOnly=/frame gaps?|between frames?|فتحات? الفريم|بين الفريم/i.test(brief);
 return{domain,shape,length:l,width:w,height:h,canvases,sculptures,ceilingBlack,frameOnly};
}
function conceptualGeometry(f){
 let W=f.width,L=f.length;
 const assumptions=[];
 if(!L){L=12;assumptions.push({key:'length',value:L,unit:'m',reason:t('No length stated','لم يُذكر الطول')})}
 if(!W){W=Math.max(6,Math.min(9,L*.6));assumptions.push({key:'width',value:+W.toFixed(2),unit:'m',reason:t('No width stated','لم يُذكر العرض')})}
 const H=f.height||4.2;if(!f.height)assumptions.push({key:'height',value:H,unit:'m',reason:t('No height stated','لم يُذكر الارتفاع')});
 let poly;
 if(f.shape==='L') poly=[{x:0,y:0},{x:W,y:0},{x:W,y:L*.45},{x:W*.55,y:L*.45},{x:W*.55,y:L},{x:0,y:L}];
 else if(f.shape==='irregular') poly=[{x:0,y:0},{x:W,y:.1*L},{x:.92*W,y:L},{x:.15*W,y:.9*L}];
 else poly=[{x:0,y:0},{x:W,y:0},{x:W,y:L},{x:0,y:L}];
 return{W,L,H,poly,assumptions};
}
function design(f,g){
 const tracks=[],targets=[];
 if(f.domain==='Exhibition'){
   if(f.sculptures>0) tracks.push({role:'Sculpture accent',layout:'single',spots:Math.max(3,Math.min(8,f.sculptures*2+1)),reason:'sculpture emphasis'});
   if(f.canvases>0) tracks.push({role:'Artwork wall',layout:'parallel',spots:Math.max(3,Math.min(10,f.canvases*2+1)),reason:'wall artwork coverage'});
   if(!tracks.length) tracks.push({role:'Flexible exhibition accent',layout:'parallel',spots:5,reason:'general exhibition concept'});
 }
 if(f.domain==='Theatre') tracks.push({role:'FOH + stage wash',layout:'zones',spots:8,reason:'concept only'});
 if(f.domain==='Live Event') tracks.push({role:'Front + wash',layout:'truss',spots:8,reason:'concept only'});
 if(f.domain==='Film & Photography') tracks.push({role:'Key / fill / back',layout:'3-point',spots:3,reason:'camera lighting concept'});
 for(let i=0;i<f.canvases;i++)targets.push({type:'artwork',id:`ART-${i+1}`});
 for(let i=0;i<f.sculptures;i++)targets.push({type:'sculpture',id:`SC-${i+1}`});
 return{tracks,targets};
}
function build(){
 const brief=$('brief')?.value.trim()||'';
 if(!brief){alert(t('Write a description first.','اكتب وصف المكان أولاً.'));return}
 const facts=extract(brief),geom=conceptualGeometry(facts),proposal=design(facts,geom);
 const factList=[
  [t('Domain','المجال'),facts.domain],
  [t('Shape','الشكل'),facts.shape],
  [t('Length','الطول'),facts.length?facts.length+' m':t('Not stated','غير مذكور')],
  [t('Width','العرض'),facts.width?facts.width+' m':t('Not stated','غير مذكور')],
  [t('Height','الارتفاع'),facts.height?facts.height+' m':t('Not stated','غير مذكور')],
  [t('Artworks','الأعمال'),facts.canvases],
  [t('Sculptures','المجسمات'),facts.sculptures],
  [t('Ceiling constraint','قيد السقف'),facts.frameOnly?t('Frame-gap mounting','تركيب داخل فتحات الفريم'):t('Not detected','غير مكتشف')]
 ];
 $('aiFacts').innerHTML=factList.map(([a,b])=>`<div class="card"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
 model={
  inputType:'written_brief',sourceText:brief,facts,
  geometry:{status:facts.length&&facts.width?'source_based':'conceptual',width:{value:geom.W,status:facts.width?'source_fact':'assumption'},length:{value:geom.L,status:facts.length?'source_fact':'assumption'},height:{value:geom.H,status:facts.height?'source_fact':'assumption'},polygon:geom.poly},
  assumptions:geom.assumptions,designProposal:proposal,status:geom.assumptions.length?'estimated':'mixed'
 };
 draw(model);
 const assumptions=model.assumptions.length?model.assumptions.map(a=>`<div class="tip">• <strong>${esc(a.key)}</strong>: ${a.value} ${a.unit} — ${esc(a.reason)} <span class="chip warn">ASSUMPTION</span></div>`).join(''):`<div class="tip"><span class="chip good">SOURCE-BASED</span> ${t('Core geometry came from the brief.','الهندسة الأساسية جاءت من الوصف.')}</div>`;
 const proposals=proposal.tracks.map(x=>`<div class="tip">• ${esc(x.role)} — ${esc(x.layout)} — ${x.spots} ${t('fixtures','وحدات')} <span class="chip">DESIGN PROPOSAL</span></div>`).join('');
 $('aiOutput').innerHTML=`<div style="margin-top:6px"><strong>${t('Assumptions','الافتراضات')}</strong>${assumptions}</div><div style="margin-top:8px"><strong>${t('Lighting proposal','مقترح الإضاءة')}</strong>${proposals}</div><div class="tip" style="margin-top:8px">${t('This is a conceptual design model, not verified site geometry.','هذا نموذج تصميم مبدئي وليس هندسة موقع مؤكدة.')}</div>`;
 $('aiState').textContent=t('CONCEPT READY','المقترح جاهز');$('aiState').className='chip good';$('smartEngine').textContent=t('Conceptual design generated','تم إنشاء تصميم مبدئي');
}
function draw(m){
 const c=$('aiCanvas');if(!c)return;c.width=900;c.height=520;const q=c.getContext('2d');q.clearRect(0,0,c.width,c.height);
 const p=m.geometry.polygon,W=m.geometry.width.value,L=m.geometry.length.value,pad=55,s=Math.min((c.width-2*pad)/W,(c.height-2*pad)/L),X=x=>pad+x*s,Y=y=>pad+y*s;
 q.lineWidth=4;q.beginPath();p.forEach((pt,i)=>i?q.lineTo(X(pt.x),Y(pt.y)):q.moveTo(X(pt.x),Y(pt.y)));q.closePath();q.stroke();q.font='16px sans-serif';q.fillText(`${W.toFixed(2)} m × ${L.toFixed(2)} m`,pad,30);
 const tracks=m.designProposal.tracks;tracks.forEach((trc,i)=>{const y=pad+(i+1)*(c.height-2*pad)/(tracks.length+1);q.lineWidth=3;q.beginPath();q.moveTo(pad+80,y);q.lineTo(c.width-pad-80,y);q.stroke();for(let k=0;k<trc.spots;k++){const x=pad+100+k*((c.width-2*pad-200)/Math.max(1,trc.spots-1));q.beginPath();q.arc(x,y,5,0,Math.PI*2);q.fill()}});c.style.display='block';
}
function apply(){
 if(!model){build();if(!model)return}
 window.KLS_AI_PROJECT_MODEL=model;
 if($('mode')){$('mode').value=model.facts.domain;$('mode').dispatchEvent(new Event('change',{bubbles:true}))}
 $('w').value=model.geometry.width.value.toFixed(2);$('d').value=model.geometry.length.value.toFixed(2);$('h').value=model.geometry.height.value.toFixed(2);
 $('spaceGeometryState').textContent=t('Conceptual geometry from brief','هندسة مبدئية من الوصف');$('spaceConfidence').textContent=t('Confidence: estimated','درجة الثقة: تقديرية');$('smartSpace').textContent=t('Written brief converted to conceptual plan','تم تحويل الوصف النصي إلى مخطط مبدئي');$('smartDims').textContent=t('Source facts + explicit assumptions','حقائق المصدر + افتراضات واضحة');
 if($('trackLayout')&&model.designProposal.tracks[0]) $('trackLayout').value=model.designProposal.tracks[0].layout==='parallel'?'parallel':'single';
 if($('spotsPerTrack')&&model.designProposal.tracks[0]) $('spotsPerTrack').value=model.designProposal.tracks[0].spots;
 if($('approveGeom'))$('approveGeom').checked=false;
}
function boot(){inject()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();