(()=>{
'use strict';
const $=id=>document.getElementById(id), ar=()=>document.documentElement.dir==='rtl'||document.documentElement.lang==='ar', t=(e,a)=>ar()?a:e;
let currentFile=null,doc=null,worker=null,busy=false,lastKey='',verified=null,autoResult=null;
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function uniq(a){return [...new Set(a.filter(Boolean))]}
function ui(){
 let b=$('klsDeepDimensions');if(b)return b;const host=$('pvSelection')||$('planStatus')?.closest('.panel');if(!host)return null;
 b=document.createElement('div');b.id='klsDeepDimensions';b.style.cssText='margin-top:12px;padding:12px;border:1px solid #31506a;border-radius:12px;background:#0a151f';
 b.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong>${t('Precision Drawing Reader v19','قارئ الرسومات الدقيق v19')}</strong><span id="kdrState" class="chip warn">${t('WAITING','انتظار')}</span></div>
 <p id="kdrSummary" class="tip">${t('A-01 and A-04 are analysed together automatically. Cover/index sheets are never treated as geometry sheets.','يتم تحليل A-01 وA-04 معًا تلقائيًا. لا يتم التعامل مع صفحات الغلاف والفهرس كلوحات هندسية.')}</p>
 <div id="kdrFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(125px,1fr));margin-top:8px"></div>
 <div id="kdrEvidence" style="margin-top:8px"></div>
 <button id="kdrApply" class="btn good" style="margin-top:8px">${t('Apply verified overall dimensions','تطبيق الأبعاد الكلية المؤكدة')}</button>`;
 host.appendChild(b);$('kdrApply').onclick=applyVerified;return b
}
function cards(a){const h=$('kdrFacts');if(h)h.innerHTML=a.map(([x,y])=>`<div class="card"><small>${esc(x)}</small><strong>${esc(y)}</strong></div>`).join('')}
async function getWorker(){
 if(worker)return worker;if(!window.Tesseract)throw Error('OCR unavailable');
 worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status&&typeof m.progress==='number')$('kdrSummary').textContent=`${m.status} ${Math.round(m.progress*100)}%`}});
 await worker.setParameters({preserve_interword_spaces:'1'});
 return worker
}
async function render(page,w=3300){
 const b=page.getViewport({scale:1}),s=Math.min(5,w/b.width),v=page.getViewport({scale:s}),c=document.createElement('canvas');
 c.width=Math.round(v.width);c.height=Math.round(v.height);await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:v}).promise;return c
}
function crop(src,x,y,w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*w));c.height=Math.max(1,Math.round(src.height*h));c.getContext('2d').drawImage(src,src.width*x,src.height*y,src.width*w,src.height*h,0,0,c.width,c.height);return c}
function rotate(src,deg){const c=document.createElement('canvas'),a=((deg%360)+360)%360;if(a===90||a===270){c.width=src.height;c.height=src.width}else{c.width=src.width;c.height=src.height}const q=c.getContext('2d');q.translate(c.width/2,c.height/2);q.rotate(a*Math.PI/180);q.drawImage(src,-src.width/2,-src.height/2);return c}
function blueMask(src,loose=false){
 const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const q=c.getContext('2d');q.drawImage(src,0,0);
 const im=q.getImageData(0,0,c.width,c.height),d=im.data;
 for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];const k=loose?(b>90&&b>r*1.02&&b>g*.98):(b>105&&b>r*1.08&&b>g*1.02);const v=k?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}q.putImageData(im,0,0);return c
}
function grayHighContrast(src){
 const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const q=c.getContext('2d');q.drawImage(src,0,0);
 const im=q.getImageData(0,0,c.width,c.height),d=im.data;
 for(let i=0;i<d.length;i+=4){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=y<185?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}q.putImageData(im,0,0);return c
}
async function ocr(c,psm='6'){
 const w=await getWorker();await w.setParameters({tessedit_pageseg_mode:String(psm)});
 const max=2600,s=Math.min(1,max/c.width),x=document.createElement('canvas');x.width=Math.round(c.width*s);x.height=Math.round(c.height*s);x.getContext('2d').drawImage(c,0,0,x.width,x.height);
 const r=await w.recognize(x);return{text:String(r.data.text||''),conf:+(r.data.confidence||0)}
}
function cleanOCR(s){return String(s).replace(/[Oo]/g,'0').replace(/[Il|]/g,'1').replace(/(\d)\s*[,:]\s*(\d)/g,'$1.$2').replace(/(\d)\s+\.(\s*)?(\d)/g,'$1.$3')}
function nums(s){
 const v=[],txt=cleanOCR(s);
 for(const m of txt.matchAll(/(?:^|[^\d])(\d{1,3}(?:\.\d{1,3})?)(?!\d)/g)){const n=parseFloat(m[1]);if(n>=.15&&n<=80)v.push(Math.round(n*1000)/1000)}
 return uniq(v).sort((a,b)=>b-a)
}
function scales(s){return uniq([...cleanOCR(s).matchAll(/(?:scale\s*)?1\s*[:/]\s*(\d{1,4})/gi)].map(m=>'1:'+m[1]))}
function pageFor(code){const n=parseInt(code.split('-')[1],10);return Number.isFinite(n)?n+1:null}
function intersect(a,b,tol=.05){const out=[];for(const x of a)for(const y of b)if(Math.abs(x-y)<=tol)out.push((x+y)/2);return uniq(out.map(x=>Math.round(x*100)/100)).sort((a,b)=>b-a)}
function chooseOverall(commonH,commonV){
 const H=commonH.filter(x=>x>=2),V=commonV.filter(x=>x>=2);if(!H.length||!V.length)return null;
 const h=H[0],v=V[0];if(Math.max(h,v)/Math.min(h,v)>8)return null;
 return {w:Math.max(h,v),d:Math.min(h,v)}
}
async function readAxis(full,axis){
 const tight=blueMask(full,false),loose=blueMask(full,true);let regions=[];
 if(axis==='h')regions=[crop(tight,.02,0,.96,.23),crop(tight,.02,.70,.96,.30),crop(loose,.02,0,.96,.23),crop(loose,.02,.70,.96,.30)];
 else regions=[rotate(crop(tight,0,.02,.25,.96),90),rotate(crop(tight,.75,.02,.25,.96),270),rotate(crop(loose,0,.02,.25,.96),90),rotate(crop(loose,.75,.02,.25,.96),270)];
 const outs=[];for(const r of regions)outs.push(await ocr(r,'6'));
 return {nums:nums(outs.map(x=>x.text).join('\n')),conf:outs.reduce((a,b)=>a+b.conf,0)/outs.length,text:outs.map(x=>x.text).join('\n')}
}
async function readScale(full){
 const areas=[crop(full,.70,.55,.30,.45),crop(full,.78,.68,.22,.32),grayHighContrast(crop(full,.65,.50,.35,.50))];
 const outs=[];for(const a of areas)outs.push(await ocr(a,'6'));
 return {scales:scales(outs.map(x=>x.text).join('\n')),conf:outs.reduce((a,b)=>a+b.conf,0)/outs.length}
}
async function readSheet(code){
 const pn=pageFor(code);if(!pn||pn>doc.numPages)throw Error('Sheet mapping failed');
 const page=await doc.getPage(pn),full=await render(page),[h,v,sc]=await Promise.all([readAxis(full,'h'),readAxis(full,'v'),readScale(full)]);
 return {code,full,h,v,sc,avg:Math.round((h.conf+v.conf+sc.conf)/3)}
}
async function autoCompare(){
 if(!currentFile||busy)return;busy=true;ui();verified=null;autoResult=null;$('kdrState').textContent=t('READING A-01 + A-04','قراءة A-01 + A-04');$('kdrState').className='chip warn';
 try{
  if(!window.pdfjsLib)throw Error('PDF engine unavailable');if(!doc){const data=new Uint8Array(await currentFile.arrayBuffer());doc=await pdfjsLib.getDocument({data}).promise}
  if(doc.numPages<5)throw Error('Drawing package is too short for A-01/A-04 mapping');
  $('kdrSummary').textContent=t('Reading A-01 base geometry at high resolution…','جاري قراءة A-01 كمرجع هندسي بدقة عالية…');const a1=await readSheet('A-01');
  $('kdrSummary').textContent=t('Reading A-04 lighting RCP at high resolution…','جاري قراءة A-04 مخطط الإضاءة بدقة عالية…');const a4=await readSheet('A-04');
  const commonH=intersect(a1.h.nums,a4.h.nums),commonV=intersect(a1.v.nums,a4.v.nums),overall=chooseOverall(commonH,commonV);
  if(overall)verified={...overall,source:'A-01 + A-04'};autoResult={a1,a4,commonH,commonV};
  cards([[t('Reference sheets','اللوحات المرجعية'),'A-01 + A-04'],[t('A-01 OCR','OCR A-01'),a1.avg+'%'],[t('A-04 OCR','OCR A-04'),a4.avg+'%'],[t('Scale evidence','دليل المقياس'),uniq([...a1.sc.scales,...a4.sc.scales]).join(', ')||t('Not reliable yet','غير موثوق بعد')],[t('A-01 horizontal','A-01 أفقي'),a1.h.nums.slice(0,12).join(' · ')||'—'],[t('A-04 horizontal','A-04 أفقي'),a4.h.nums.slice(0,12).join(' · ')||'—'],[t('Matched horizontal','تطابق أفقي'),commonH.join(' · ')||'—'],[t('Matched vertical','تطابق رأسي'),commonV.join(' · ')||'—']]);
  const ev=[t('A-00 is excluded from geometry verification because it is the cover / drawing index.','تم استبعاد A-00 من التحقق الهندسي لأنها صفحة الغلاف / فهرس الرسومات.'),t('A-01 is treated as the base geometry source; A-04 is treated as the lighting/RCP source.','يتم التعامل مع A-01 كمصدر الهندسة الأساسية وA-04 كمصدر الإضاءة/RCP.'),t('Dimension OCR now uses two blue thresholds plus rotated side strips, then cross-checks matching values between both sheets.','تستخدم قراءة الأبعاد الآن مستويين لعزل اللون الأزرق مع تدوير الشرائط الجانبية، ثم تقارن القيم المتطابقة بين اللوحتين.'),verified?t(`Verified overall candidate: ${verified.w.toFixed(2)} × ${verified.d.toFixed(2)} m from ${verified.source}.`,`مرشح أبعاد كلية مؤكد: ${verified.w.toFixed(2)} × ${verified.d.toFixed(2)} م من ${verified.source}.`):t('No safe overall pair yet. Candidate numbers are shown as evidence instead of being auto-applied.','لا يوجد زوج أبعاد كلي آمن بعد. يتم عرض الأرقام المرشحة كأدلة بدل تطبيقها تلقائيًا.')];
  $('kdrEvidence').innerHTML=ev.map(x=>`<div class="tip">• ${esc(x)}</div>`).join('');$('kdrState').textContent=verified?t('VERIFIED PAIR','زوج مؤكد'):t('REVIEW','مراجعة');$('kdrState').className='chip '+(verified?'good':'warn');$('kdrSummary').textContent=t('Automatic cross-sheet precision pass completed.','اكتملت القراءة الدقيقة التلقائية بين اللوحات.');
  if(verified){$('spaceGeometryState').textContent=t('A-01/A-04 dimensions verified','تم تأكيد أبعاد A-01/A-04');$('spaceConfidence').textContent=t('Confidence: high','درجة الثقة: مرتفعة')}
 }catch(e){console.error(e);$('kdrState').textContent=t('ERROR','خطأ');$('kdrSummary').textContent=t('Precision reading failed: ','فشلت القراءة الدقيقة: ')+(e.message||e)}finally{busy=false}
}
function applyVerified(){
 if(!verified){alert(t('No cross-sheet verified overall dimensions yet. Review the matched dimension evidence above.','لا توجد أبعاد كلية مؤكدة بين اللوحات حتى الآن. راجع قيم الأبعاد المتطابقة بالأعلى.'));return}
 $('w').value=verified.w.toFixed(3);$('d').value=verified.d.toFixed(3);$('smartDims').textContent=t(`Verified ${verified.w.toFixed(2)} × ${verified.d.toFixed(2)} m from ${verified.source}`,`تم تأكيد ${verified.w.toFixed(2)} × ${verified.d.toFixed(2)} م من ${verified.source}`)
}
async function selectedPass(code){
 if(!currentFile||busy||!code||code==='A-00')return;
 if(!['A-01','A-04'].includes(code)){ui();$('kdrSummary').textContent=t(`Selected ${code}. Overall geometry verification remains based on A-01 + A-04.`,`تم اختيار ${code}. يظل التحقق من الأبعاد الكلية معتمدًا على A-01 + A-04.`);return}
 if(autoResult){const r=code==='A-01'?autoResult.a1:autoResult.a4;cards([[t('Selected sheet','اللوحة المختارة'),code],[t('Deep OCR','OCR الدقيق'),r.avg+'%'],[t('Horizontal dimensions','الأبعاد الأفقية'),r.h.nums.slice(0,14).join(' · ')||'—'],[t('Vertical dimensions','الأبعاد الرأسية'),r.v.nums.slice(0,14).join(' · ')||'—'],[t('Matched horizontal','تطابق أفقي'),autoResult.commonH.join(' · ')||'—'],[t('Matched vertical','تطابق رأسي'),autoResult.commonV.join(' · ')||'—']])}
}
function sheetCode(){const s=$('pvSelTitle')?.textContent||'';return s.match(/\bA-\d{2}\b/i)?.[0].toUpperCase()||null}
function trigger(){const code=sheetCode();if(!code||code===lastKey||!currentFile)return;lastKey=code;setTimeout(()=>selectedPass(code),120)}
function boot(){
 ui();const inp=$('spaceFileNative');
 if(inp){const f=e=>{const x=e.target.files?.[0];if(x&&(x.type==='application/pdf'||/\.pdf$/i.test(x.name))){currentFile=x;doc=null;verified=null;autoResult=null;lastKey='';setTimeout(autoCompare,1300)}};inp.addEventListener('change',f);inp.addEventListener('input',f)}
 new MutationObserver(trigger).observe(document.body,{childList:true,subtree:true,characterData:true})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();