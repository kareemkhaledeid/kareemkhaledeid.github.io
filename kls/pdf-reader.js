(()=>{
'use strict';
const $=id=>document.getElementById(id);
const isAr=()=>document.documentElement.lang==='ar'||document.documentElement.dir==='rtl';
const t=(en,ar)=>isAr()?ar:en;
let panel=null,busy=false,lastAnalysis=null;

function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function uniq(a){return [...new Set(a.filter(Boolean))]}
function ui(){
  if(panel)return panel;
  const host=$('planStatus')?.closest('.panel')||document.querySelector('aside .panel');
  if(!host)return null;
  panel=document.createElement('div');
  panel.id='planVision';
  panel.style.cssText='margin-top:14px;padding:14px;border:1px solid #26394a;border-radius:14px;background:#0b1620';
  panel.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
      <strong id="pvTitle">KLS Plan Vision</strong><span id="pvState" class="chip warn">WAITING</span>
    </div>
    <p id="pvSummary" class="tip">Upload a PDF to classify pages and find the best plan automatically.</p>
    <div id="pvProgress" class="tip"></div>
    <div id="pvFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-top:10px"></div>
    <div id="pvPages" style="display:grid;gap:8px;margin-top:10px"></div>
    <div id="pvSelection" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #26394a">
      <strong id="pvSelTitle"></strong>
      <div id="pvSelFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-top:8px"></div>
      <div id="pvDetected" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button id="pvApply" class="btn good">Apply detected dimensions</button>
        <button id="pvUse" class="btn primary">Use this page as plan</button>
      </div>
      <p id="pvNote" class="tip"></p>
    </div>`;
  host.appendChild(panel);
  $('pvApply').onclick=applySelected;
  $('pvUse').onclick=useSelected;
  return panel;
}
function set(id,en,ar){const e=$(id);if(e)e.textContent=t(en,ar)}
function factCards(id,arr){const e=$(id);if(e)e.innerHTML=arr.map(([a,b])=>`<div class="card"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('')}
function unitM(v,u){
  v=parseFloat(String(v).replace(',','.')); if(!Number.isFinite(v))return null;
  u=(u||'m').toLowerCase();
  if(u==='mm')return v/1000;if(u==='cm')return v/100;if(/ft|feet/.test(u))return v*.3048;if(/in|inch/.test(u))return v*.0254;return v;
}
function dimensions(text){
  const s=text.replace(/,/g,'.'); const out={explicit:{},pairs:[],values:[]};
  const defs=[
    ['w',/(?:width|overall width|عرض)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)/i],
    ['d',/(?:depth|length|overall length|عمق|طول)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)/i],
    ['h',/(?:height|ceiling height|ارتفاع)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)/i]
  ];
  defs.forEach(([k,r])=>{const m=s.match(r);if(m)out.explicit[k]=unitM(m[1],m[2])});
  for(const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi)){
    const a=unitM(m[1],m[2]||m[4]),b=unitM(m[3],m[4]);if(a>=.2&&a<=250&&b>=.2&&b<=250)out.pairs.push([a,b,m[0]]);
  }
  for(const m of s.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi)){
    const v=unitM(m[1],m[2]);if(v>=.2&&v<=250)out.values.push(Math.round(v*1000)/1000);
  }
  out.values=uniq(out.values).slice(0,20); return out;
}
function scaleOf(text){const m=text.match(/(?:scale|مقياس(?: الرسم)?)?\s*1\s*[:/]\s*(\d{1,5})/i);return m?'1:'+m[1]:null}
function pageType(text){
  const x=text.toLowerCase();
  const rules=[
    ['Main Installation Plan',['main installation plan','lighting plan','electrical plan','installation plan','reflected ceiling plan','rcp','lighting layout','floor plan','general arrangement plan','ga plan']],
    ['General Arrangement',['general arrangement','arrangement plan','overall plan']],
    ['Elevation',['elevation','elevations']],
    ['Section',['section','sections']],
    ['Detail',['detail','details']],
    ['Schedule',['schedule','legend','symbols and legends','fixture schedule']],
    ['Concept / Image',['concept','render','perspective','mood','visual']]
  ];
  let best=['Unknown',0];
  for(const [name,keys] of rules){let s=0;for(const k of keys)if(x.includes(k))s+=k.length>12?3:1;if(s>best[1])best=[name,s]}
  return {name:best[0],score:best[1]};
}
function sheetNo(text){
  const patterns=[/\bA[-\s]?\d{2,3}\b/i,/\bL[-\s]?\d{2,3}\b/i,/\bE[-\s]?\d{2,3}\b/i,/\bS[-\s]?\d{2,3}\b/i];
  for(const r of patterns){const m=text.match(r);if(m)return m[0].replace(/\s/g,'')}return null;
}
function titleGuess(lines){const good=lines.map(cleanTitle).filter(x=>x&&x.length<=100),preferred=good.filter(x=>/(main installation|general arrangement|artwork layout|lighting plan|floor plan|elevation|section|detail|layout|schedule|list of drawings|مخطط|واجهة|قطاع|تفصيلة)/i.test(x));return(preferred.sort((a,b)=>b.length-a.length)[0]||'Title not reliably read')}
function domainOf(text){
  const x=text.toLowerCase(),d=[
    ['Exhibition',['exhibition','museum','gallery','artwork','display case','showcase','track light','معرض','متحف']],
    ['Theatre',['theatre','theater','stage','auditorium','foh','proscenium','مسرح']],
    ['Live Event',['truss','moving head','concert','event lighting','فعالية','حفلة']],
    ['Film & Photography',['camera','photography','cinema','key light','fill light','كاميرا','تصوير']]
  ];let best=null;for(const [n,k] of d){let s=0;k.forEach(q=>{if(x.includes(q))s++});if(!best||s>best.score)best={name:n,score:s}}return best&&best.score?best:null;
}
function lightingTerms(text){
  const keys=['track light','spotlight','downlight','wall washer','wallwasher','profile','fresnel','moving head','led','dmx','dali','lux','ies','ldt','emergency light','تراك لايت','سبوت','لوكس','إضاءة'];
  return uniq(keys.filter(k=>text.toLowerCase().includes(k.toLowerCase())));
}
function zones(text){
  const lines=text.split(/\n+/);return uniq(lines.map(s=>s.trim()).filter(s=>s.length<90&&/(zone|area|gallery|hall|room|section|منطقة|قاعة|غرفة)\s*[\w\d\-]*/i.test(s))).slice(0,20);
}
async function renderPage(page,targetW=1050,rotation=0){
  const rot=(page.rotate+rotation)%360,base=page.getViewport({scale:1,rotation:rot}),scale=Math.min(1.9,targetW/base.width),vp=page.getViewport({scale,rotation:rot});
  const c=document.createElement('canvas');c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));
  await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp}).promise;return c;
}
async function ensureWorker(){
  if(!window.Tesseract)throw Error('OCR engine unavailable');
  if(window.__klsOCRWorker)return window.__klsOCRWorker;
  window.__klsOCRWorker=await Tesseract.createWorker('eng',1,{logger:m=>{
    if(m.status&&typeof m.progress==='number')$('pvProgress').textContent=`${m.status} ${Math.round(m.progress*100)}%`;
  }});
  return window.__klsOCRWorker;
}
async function ocrPage(page,index,total){
  $('pvProgress').textContent=t(`Reading drawing ${index}/${total}…`,`جاري قراءة الرسم ${index}/${total}…`);
  const c=await renderPage(page,1050,0),w=await ensureWorker(),r=await w.recognize(c);
  return {text:String(r.data.text||'').trim(),confidence:+(r.data.confidence||0),canvas:c};
}
async function textLayer(page){
  const tc=await page.getTextContent();const items=tc.items.map(i=>String(i.str||'').trim()).filter(Boolean);return items.join('\n');
}

function cleanTitle(s){
  s=String(s||'').replace(/[^\x20-\x7E\u0600-\u06FF]/g,' ').replace(/\s+/g,' ').trim();
  const letters=(s.match(/[A-Za-z]/g)||[]).length, weird=(s.match(/[^A-Za-z0-9 \-\/&().,:]/g)||[]).length;
  if(s.length<4||letters<3||weird>Math.max(2,letters*.35))return '';
  return s;
}
function extractDrawingIndex(text){
  const lines=text.split(/\n+/).map(x=>cleanTitle(x)).filter(Boolean), map={};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const m=line.match(/\b([A-Z])\s*[-–—]?\s*(\d{2})\b/i);
    if(!m)continue;
    const code=(m[1].toUpperCase()+'-'+m[2]);
    let rest=line.replace(m[0],'').replace(/^[\s:.-]+/,'').trim();
    if(rest.length<5 && lines[i+1] && !/\b[A-Z]\s*[-–—]?\s*\d{2}\b/i.test(lines[i+1])) rest=lines[i+1];
    rest=cleanTitle(rest);
    if(rest && /(plan|elevation|detail|drawing|layout|installation|arrangement|plinth|artwork|section|ceiling|floor|roof|list)/i.test(rest)){
      if(!map[code] || rest.length>map[code].length) map[code]=rest;
    }
  }
  return map;
}
function likelySheetFromPage(page,indexMap){
  const code='A-'+String(page-1).padStart(2,'0');
  return indexMap[code]?code:null;
}
function typeFromTitle(title,current){
  const x=(title||'').toLowerCase();
  if(/main installation.*(floor|roof|plan)|main installation plan|lighting plan|lighting layout/.test(x))return{name:'Main Installation Plan',score:20};
  if(/general arrangement/.test(x))return{name:'General Arrangement',score:12};
  if(/artwork layout/.test(x))return{name:'Artwork Layout',score:10};
  if(/elevation/.test(x))return{name:'Elevation',score:8};
  if(/section/.test(x))return{name:'Section',score:8};
  if(/detail|plinth/.test(x))return{name:'Detail',score:8};
  if(/list of drawings|schedule|legend/.test(x))return{name:'Schedule',score:8};
  return current;
}

function planScore(rec){const x=((rec.indexTitle||'')+'\n'+rec.text).toLowerCase();let s=0;if(/main installation.*(floor|roof|plan)|main installation plan|lighting plan|installation plan|lighting layout/.test(x))s+=30;if(/general arrangement plan|floor plan|reflected ceiling plan|rcp/.test(x))s+=14;if(/artwork layout plan/.test(x))s+=11;if(/\bscale\b|1\s*[:/]\s*\d+/.test(x))s+=3;if(/spotlight|track light|luminaire|light fitting|lighting/.test(x))s+=4;if(rec.type.name==='Elevation'||rec.type.name==='Section'||rec.type.name==='Detail'||rec.type.name==='Schedule')s-=10;if(rec.type.name==='Concept / Image')s-=12;if(rec.dims.pairs.length||rec.dims.values.length>=2)s+=3;s+=Math.min(3,rec.confidence/30);return s}
function renderPages(){
  const host=$('pvPages'); if(!host||!lastAnalysis)return;
  host.innerHTML=lastAnalysis.pages.map((p,i)=>`
    <button class="pvPage btn" data-i="${i}" style="text-align:${isAr()?'right':'left'};display:block;width:100%;padding:10px;border:${p.recommended?'1px solid #5ebd8a':'1px solid #26394a'}">
      <div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(t('Page','صفحة'))} ${p.page}${p.sheet?' · '+esc(p.sheet):''}</strong>${p.recommended?'<span class="chip good">'+esc(t('RECOMMENDED','مقترحة'))+'</span>':''}</div>
      <div>${esc(p.title)}</div>
      <small>${esc(t('Type','النوع'))}: ${esc(p.type.name)} · ${esc(p.method)} ${Math.round(p.confidence)}%${p.scale?' · '+esc(t('Scale','مقياس'))+' '+esc(p.scale):''}</small>
    </button>`).join('');
  host.querySelectorAll('.pvPage').forEach(b=>b.onclick=()=>selectPage(+b.dataset.i));
}
function selectPage(i){
  if(!lastAnalysis)return;lastAnalysis.selected=i;const p=lastAnalysis.pages[i];$('pvSelection').style.display='block';
  $('pvSelTitle').textContent=`${t('Selected page','الصفحة المختارة')} ${p.page}${p.sheet?' · '+p.sheet:''} — ${p.title}`;
  const d=p.dims.explicit.w&&p.dims.explicit.d?`${p.dims.explicit.w.toFixed(2)} × ${p.dims.explicit.d.toFixed(2)} m`:p.dims.pairs[0]?`${Math.max(p.dims.pairs[0][0],p.dims.pairs[0][1]).toFixed(2)} × ${Math.min(p.dims.pairs[0][0],p.dims.pairs[0][1]).toFixed(2)} m`:t('Not reliable','غير مؤكدة');
  factCards('pvSelFacts',[[t('Type','النوع'),p.type.name],[t('Scale','المقياس'),p.scale||t('Not found','غير موجود')],[t('Dimensions','الأبعاد'),d],[t('OCR','OCR'),Math.round(p.confidence)+'%']]);
  const chips=[...p.lighting,...p.zones].slice(0,24);$('pvDetected').innerHTML=chips.map(x=>`<span class="chip">${esc(x)}</span>`).join('');
  set('pvNote','KLS will only apply dimensions when the page contains a reliable pair or explicit width/depth.','لن يطبق KLS الأبعاد إلا إذا كانت الصفحة تحتوي على زوج أبعاد موثوق أو عرض/عمق صريحين.');
}
function applySelected(){
  if(!lastAnalysis)return;const p=lastAnalysis.pages[lastAnalysis.selected];if(!p)return;let w,d,h=p.dims.explicit.h||null;
  if(p.dims.explicit.w&&p.dims.explicit.d){w=p.dims.explicit.w;d=p.dims.explicit.d}
  else if(p.dims.pairs[0]){w=Math.max(p.dims.pairs[0][0],p.dims.pairs[0][1]);d=Math.min(p.dims.pairs[0][0],p.dims.pairs[0][1])}
  if(!w||!d){alert(t('No reliable overall dimensions found on this page.','لم يتم العثور على أبعاد كلية موثوقة في هذه الصفحة.'));return}
  $('w').value=w.toFixed(3);$('d').value=d.toFixed(3);if(h)$('h').value=h.toFixed(3);
  $('spaceGeometryState').textContent=t('PDF dimensions applied','تم تطبيق أبعاد PDF');$('spaceConfidence').textContent=t('Confidence: medium','درجة الثقة: متوسطة');
  $('smartDims').textContent=t(`Applied ${w.toFixed(2)} × ${d.toFixed(2)} m from selected page`,`تم تطبيق ${w.toFixed(2)} × ${d.toFixed(2)} م من الصفحة المختارة`);
}
function useSelected(){
  if(!lastAnalysis)return;const p=lastAnalysis.pages[lastAnalysis.selected];if(!p)return;
  if(p.domain&&p.domain.score>=2&&$('mode')){$('mode').value=p.domain.name;$('mode').dispatchEvent(new Event('change',{bubbles:true}))}
  $('smartSpace').textContent=t(`Selected page ${p.page}: ${p.title}`,`تم اختيار الصفحة ${p.page}: ${p.title}`);
  $('spaceGeometryState').textContent=t('Plan page selected / geometry review','تم اختيار صفحة المخطط / مراجعة الهندسة');
  if($('approveGeom'))$('approveGeom').checked=false;
  applySelected();
}
async function analyse(file){
  if(busy)return;busy=true;ui();panel.style.display='block';set('pvState','READING','جاري القراءة');$('pvState').className='chip warn';set('pvSummary','Classifying every PDF page to find plans, scales and dimensions…','جاري تصنيف كل صفحات PDF للعثور على المخططات والمقاييس والأبعاد…');$('pvPages').innerHTML='';$('pvSelection').style.display='none';
  try{
    if(!window.pdfjsLib)throw Error('PDF engine unavailable');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const data=new Uint8Array(await file.arrayBuffer()),doc=await pdfjsLib.getDocument({data}).promise,pages=[];
    let textLayerCount=0,ocrCount=0;
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i);let text=await textLayer(page),conf=100,method='PDF text';
      if(text.replace(/\s/g,'').length<30){const o=await ocrPage(page,i,doc.numPages);text=o.text;conf=o.confidence;method='OCR';ocrCount++}else textLayerCount++;
      const rec={page:i,text,confidence:conf,method,type:pageType(text),sheet:sheetNo(text),title:titleGuess(text.split(/\n+/)),scale:scaleOf(text),dims:dimensions(text),domain:domainOf(text),lighting:lightingTerms(text),zones:zones(text)};
      rec.score=planScore(rec);pages.push(rec);
    }
    pages.sort((a,b)=>a.page-b.page);
    const packageText=pages.map(p=>p.text).join('\n'),drawingIndex=extractDrawingIndex(packageText);
    pages.forEach(p=>{
      let sh=p.sheet||likelySheetFromPage(p.page,drawingIndex);
      if(sh)p.sheet=sh;
      if(sh&&drawingIndex[sh]){
        p.indexTitle=drawingIndex[sh];
        p.title=drawingIndex[sh];
        p.type=typeFromTitle(p.indexTitle,p.type);
      }else{
        const ct=cleanTitle(p.title);
        p.title=ct||t('Title not reliably read','تعذر قراءة عنوان اللوحة بثقة');
      }
      p.score=planScore(p);
    });
    const best=pages.reduce((m,p)=>!m||p.score>m.score?p:m,null);pages.forEach(p=>p.recommended=p===best);
    lastAnalysis={pages,selected:Math.max(0,pages.indexOf(best)),docPages:doc.numPages};
    const domain=domainOf(pages.map(p=>p.text).join('\n'));if(domain&&domain.score>=2&&$('mode')){$('mode').value=domain.name;$('mode').dispatchEvent(new Event('change',{bubbles:true}))}
    $('pvState').textContent=t('READY','جاهز');$('pvState').className='chip good';$('pvProgress').textContent='';
    factCards('pvFacts',[[t('Pages','الصفحات'),doc.numPages],[t('PDF text pages','صفحات نصية'),textLayerCount],[t('OCR pages','صفحات OCR'),ocrCount],[t('Drawing index entries','لوحات من فهرس الرسومات'),Object.keys(drawingIndex).length],[t('Likely domain','المجال المرجح'),domain?domain.name:t('Uncertain','غير مؤكد')],[t('Best plan','أفضل مخطط'),best?`${best.page}${best.sheet?' · '+best.sheet:''}`:'—']]);
    set('pvSummary',`KLS classified ${doc.numPages} pages. Best plan candidate: page ${best.page} — ${best.title}. Review it before using dimensions.`,`صنّف KLS عدد ${doc.numPages} صفحة. أفضل صفحة مخطط مرشحة: الصفحة ${best.page} — ${best.title}. راجعها قبل استخدام الأبعاد.`);
    renderPages();selectPage(lastAnalysis.selected);
    $('smartSpace').textContent=t(`PDF classified · recommended page ${best.page}`,`تم تصنيف PDF · الصفحة المقترحة ${best.page}`);
    $('spaceGeometryState').textContent=t('Plan page identified / review','تم تحديد صفحة المخطط / مراجعة');
    $('spaceConfidence').textContent=t('Confidence: review','درجة الثقة: تحتاج مراجعة');
  }catch(e){
    console.error(e);set('pvState','ERROR','خطأ');set('pvSummary',`Plan Vision failed: ${e.message||e}`,`تعذر تحليل المخطط: ${e.message||e}`);
  }finally{busy=false}
}
function onFile(ev){const f=ev.target.files?.[0];if(!f)return;const ex=(f.name.split('.').pop()||'').toLowerCase();if(ex==='pdf'||f.type==='application/pdf')analyse(f)}
function boot(){ui();const i=$('spaceFileNative');if(i){i.addEventListener('change',onFile);i.addEventListener('input',onFile)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();