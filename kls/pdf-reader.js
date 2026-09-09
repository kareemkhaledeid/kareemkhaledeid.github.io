(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ar=()=>document.documentElement.lang==='ar'||document.documentElement.dir==='rtl';
const tr=(en,aa)=>ar()?aa:en;
let panel=null,busy=false,state=null,worker=null;

const ROLE_LABELS={
 cover:['Drawing Index / Legend','فهرس الرسومات / الرموز'],
 base:['Base Geometry','الهندسة الأساسية'],
 artwork:['Artwork Layout','توزيع الأعمال'],
 lighting:['Lighting / Ceiling','الإضاءة / السقف'],
 services:['Services RCP','خدمات السقف'],
 section:['Sections / Heights','القطاعات / الارتفاعات'],
 construction:['Installation Construction','تفاصيل التنفيذ'],
 exploded:['3D Exploded Reference','مرجع ثلاثي الأبعاد'],
 elevation:['Elevations','الواجهات'],
 plinth:['Plinth Details','تفاصيل القواعد'],
 detail:['Track / Frame Detail','تفاصيل التراك / الفريم'],
 other:['Other','أخرى']
};
function roleLabel(r){let x=ROLE_LABELS[r]||ROLE_LABELS.other;return tr(x[0],x[1])}
function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function uniq(a){return [...new Set(a.filter(Boolean))]}
function ui(){
 if(panel)return panel;
 const host=$('planStatus')?.closest('.panel')||document.querySelector('aside .panel'); if(!host)return null;
 panel=document.createElement('div'); panel.id='klsPackageVision';
 panel.style.cssText='margin-top:14px;padding:14px;border:1px solid #294052;border-radius:14px;background:#0a1620';
 panel.innerHTML=`
 <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
   <strong id="kpTitle">KLS Drawing Package Intelligence</strong><span id="kpState" class="chip warn">WAITING</span>
 </div>
 <p id="kpSummary" class="tip">Upload a drawing package. KLS will classify sheets, link evidence and build one project model.</p>
 <div id="kpProgress" class="tip"></div>
 <div id="kpFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-top:10px"></div>
 <div id="kpModel" style="margin-top:12px"></div>
 <details style="margin-top:12px" open><summary id="kpSheetsTitle">Drawing package sheets</summary><div id="kpSheets" style="display:grid;gap:8px;margin-top:8px"></div></details>
 <div id="kpSelected" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #294052">
   <strong id="kpSelTitle"></strong>
   <div id="kpSelFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-top:8px"></div>
   <div id="kpEvidence" style="margin-top:8px"></div>
   <canvas id="kpPreview" style="display:none;width:100%;max-height:430px;background:#fff;border-radius:10px;margin-top:10px"></canvas>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
    <button id="kpUse" class="btn primary">Use this sheet</button>
    <button id="kpApply" class="btn good">Apply reliable dimensions</button>
   </div>
   <p id="kpNote" class="tip"></p>
 </div>`;
 host.appendChild(panel);
 $('kpUse').onclick=useSheet; $('kpApply').onclick=applyDims;
 return panel;
}
function set(id,en,aa){let e=$(id);if(e)e.textContent=tr(en,aa)}
function cards(id,arr){let e=$(id);if(e)e.innerHTML=arr.map(([a,b])=>`<div class="card"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('')}
function clean(s){return String(s||'').replace(/[^\x09\x0A\x0D\x20-\x7E\u0600-\u06FF]/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n')}
function unitM(v,u){
 v=parseFloat(String(v).replace(',','.')); if(!Number.isFinite(v))return null; u=(u||'m').toLowerCase();
 if(u==='mm')return v/1000;if(u==='cm')return v/100;if(/ft|feet/.test(u))return v*.3048;if(/in|inch/.test(u))return v*.0254;return v
}
function detectScale(s){let a=[...s.matchAll(/(?:scale|sc\.?|مقياس(?: الرسم)?)?\s*1\s*[:/]\s*(\d{1,5})/gi)].map(m=>'1:'+m[1]);return uniq(a)}
function detectDims(s){
 s=s.replace(/,/g,'.');let explicit={},pairs=[],vals=[],levels=[];
 [
  ['w',/(?:overall\s+)?width\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)/i],
  ['d',/(?:overall\s+)?(?:depth|length)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)/i],
  ['h',/(?:ceiling\s+)?height\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)/i]
 ].forEach(([k,r])=>{let m=s.match(r);if(m)explicit[k]=unitM(m[1],m[2])});
 for(let m of s.matchAll(/(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi)){
  let a=unitM(m[1],m[2]||m[4]),b=unitM(m[3],m[4]);if(a>=.15&&b>=.15&&a<=250&&b<=250)pairs.push([a,b,m[0]])
 }
 for(let m of s.matchAll(/(?:^|\s)(\d{1,3}(?:\.\d{1,3})?)\s*(mm|cm|m)\b/gi)){let v=unitM(m[1],m[2]);if(v>=.15&&v<=250)vals.push(v)}
 for(let m of s.matchAll(/([+-]?\d+(?:\.\d+)?)\s*(?:FCL|FFL|LEVEL|LVL|LIGHT TRACKS?|SUSPENDED CEILING)/gi)){
   let v=parseFloat(m[1]);if(Number.isFinite(v))levels.push({value:v,label:m[0]})
 }
 return{explicit,pairs,values:uniq(vals.map(v=>+v.toFixed(3))).slice(0,30),levels:levels.slice(0,20)}
}
function drawingNo(s){
 let all=[...s.matchAll(/\b([A-Z])[\s\-]?(\d{2})\b/gi)].map(m=>`${m[1].toUpperCase()}-${m[2]}`);
 return uniq(all).find(x=>/^A-\d{2}$/.test(x))||all[0]||null
}
function parseIndex(s){
 let out={}, lines=s.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  let line=lines[i].replace(/[–—]/g,'-');
  let m=line.match(/\b(A[\s\-]?\d{2})\b\s*[-:]?\s*(.{4,100})/i);
  if(m){let no=m[1].toUpperCase().replace(/\s/g,'').replace(/^A(?=\d)/,'A-');out[no]=m[2].trim();continue}
  let no=line.match(/\bA[\s\-]?\d{2}\b/i);
  if(no && lines[i+1] && lines[i+1].length<110){
   let k=no[0].toUpperCase().replace(/\s/g,'').replace(/^A(?=\d)/,'A-'); out[k]=lines[i+1].trim()
  }
 }
 return out
}
function roleFrom(title,text,no){
 let x=(title+'\n'+text).toLowerCase();
 if(no==='A-00'||/list of drawings|symbols and linetypes|scope of work/.test(x))return'cover';
 if(/artwork layout/.test(x))return'artwork';
 if(/reflected ceiling plan.*lighting|lighting.*wire ropes|lighting plan/.test(x))return'lighting';
 if(/reflected ceiling plan.*services|services.*ceiling/.test(x))return'services';
 if(/general arrangement plan/.test(x))return'base';
 if(/main installation.*construction|wire rope connection|subfloor/.test(x))return'construction';
 if(/3d exploded|exploded view/.test(x))return'exploded';
 if(/\belevation/.test(x))return'elevation';
 if(/\bsection/.test(x))return'section';
 if(/plinth/.test(x))return'plinth';
 if(/suspended ceiling frame|junction detail|frame_\d|frame detail/.test(x))return'detail';
 return'other'
}
function domainOf(s){
 let x=s.toLowerCase(),scores={Exhibition:0,Theatre:0,'Live Event':0,'Film & Photography':0};
 [['Exhibition',['exhibition','gallery','museum','artwork','scenography','display','spotlight','light track']],
 ['Theatre',['theatre','stage','auditorium','foh','proscenium']],
 ['Live Event',['truss','moving head','concert','event lighting']],
 ['Film & Photography',['camera','photography','cinema','key light','fill light']]].forEach(([d,ks])=>ks.forEach(k=>{if(x.includes(k))scores[d]++}));
 let b=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];return b[1]?{name:b[0],score:b[1]}:null
}
function lightingTerms(s){
 const keys=['spotlight','light track','track light','conduit','lighting','wire rope','suspended ceiling','led','dmx','dali','lux','ies','ldt','wall washer','downlight'];
 return uniq(keys.filter(k=>s.toLowerCase().includes(k)))
}
function legendTerms(s){
 const keys=['SPOTLIGHT','LIGHT TRACK','CONDUIT','EXISTING WALL','NEW SCENOGRAPHY WALL','FIRE EXIT','SPRINKLER','WALL SOCKET','FLOOR SOCKET'];
 return uniq(keys.filter(k=>s.toUpperCase().includes(k)))
}
function zones(s){return uniq(s.split(/\n+/).map(x=>x.trim()).filter(x=>x.length<90&&/(zone|area|gallery|hall|room|section|installation|artwork|منطقة|قاعة)/i.test(x))).slice(0,25)}
async function pageCanvas(page,width=1100,rotation=0){
 let rot=(page.rotate+rotation)%360,b=page.getViewport({scale:1,rotation:rot}),scale=Math.min(2.5,width/b.width),v=page.getViewport({scale,rotation:rot}),c=document.createElement('canvas');
 c.width=Math.max(1,Math.round(v.width));c.height=Math.max(1,Math.round(v.height));await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:v}).promise;return c
}
function cropCanvas(src,x,y,w,h,targetW=1500){
 let c=document.createElement('canvas'),ratio=targetW/w;c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);c.getContext('2d').drawImage(src,x,y,w,h,0,0,c.width,c.height);return c
}
async function getWorker(){
 if(worker)return worker;if(!window.Tesseract)throw Error('OCR engine unavailable');
 worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status&&typeof m.progress==='number')$('kpProgress').textContent=`${m.status} ${Math.round(m.progress*100)}%`}});
 return worker
}
async function ocr(c,label){
 $('kpProgress').textContent=label;let w=await getWorker(),r=await w.recognize(c);return{text:clean(r.data.text||''),conf:+(r.data.confidence||0)}
}
async function textLayer(page){let tc=await page.getTextContent();return clean(tc.items.map(i=>String(i.str||'').trim()).filter(Boolean).join('\n'))}
function colorStats(c){
 let ctx=c.getContext('2d'),im=ctx.getImageData(0,0,c.width,c.height).data,step=Math.max(1,Math.floor((c.width*c.height)/180000)),red=0,blue=0,dark=0,total=0;
 for(let p=0;p<im.length;p+=4*step){let r=im[p],g=im[p+1],b=im[p+2];total++;if(r>130&&r>g*1.35&&r>b*1.25)red++;if(b>120&&b>r*1.2&&b>g*1.05)blue++;if(r<90&&g<90&&b<90)dark++}
 return{red:+(100*red/total).toFixed(2),blue:+(100*blue/total).toFixed(2),dark:+(100*dark/total).toFixed(2)}
}
function titleGuess(s,indexTitle){
 if(indexTitle&&indexTitle.length>3)return indexTitle;
 let lines=s.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>=5&&x.length<110);
 let p=lines.filter(x=>/(general arrangement|artwork layout|reflected ceiling|main installation|elevation|section|plinth|suspended ceiling|frame|detail|plan)/i.test(x));
 return (p[0]||lines.find(x=>x===x.toUpperCase()&&/[A-Z]/.test(x))||lines[0]||'Untitled').replace(/\s+/g,' ')
}
function confidence(sheet){
 let c=30;if(sheet.no)c+=15;if(sheet.indexTitle)c+=25;if(sheet.role!=='other')c+=15;if(sheet.scales.length)c+=5;if(sheet.ocrConf>=55)c+=5;if(sheet.ocrConf>=75)c+=5;return Math.min(100,c)
}
function roleScore(role){return{lighting:100,base:92,artwork:90,section:78,construction:72,detail:70,elevation:60,services:55,cover:50,exploded:45,plinth:40,other:10}[role]||10}
function buildModel(sheets,index,domain){
 let by=r=>sheets.filter(s=>s.role===r).sort((a,b)=>b.confidence-a.confidence);
 return{
  domain:domain?.name||'Unknown',
  index,
  base:by('base')[0]||null, artwork:by('artwork')[0]||null, lighting:by('lighting')[0]||null,
  services:by('services')[0]||null, sections:by('section'), construction:by('construction'), details:by('detail'),
  elevations:by('elevation'), exploded:by('exploded')[0]||null, plinth:by('plinth')[0]||null
 }
}
function sheetRef(s){return s?`${s.no||'Page '+s.page} · ${s.title}`:tr('Not detected','غير مكتشف')}
function renderModel(){
 if(!state)return;let m=state.model,rows=[
  [tr('Base geometry','الهندسة الأساسية'),sheetRef(m.base)],
  [tr('Artwork targets','أهداف الأعمال'),sheetRef(m.artwork)],
  [tr('Lighting / ceiling','الإضاءة / السقف'),sheetRef(m.lighting)],
  [tr('Vertical dimensions','الأبعاد الرأسية'),m.sections.length?m.sections.map(sheetRef).join(' | '):tr('Not detected','غير مكتشف')],
  [tr('Installation construction','تفاصيل التنفيذ'),m.construction.length?m.construction.map(sheetRef).join(' | '):tr('Not detected','غير مكتشف')],
  [tr('Track / frame details','تفاصيل التراك / الفريم'),m.details.length?m.details.map(sheetRef).join(' | '):tr('Not detected','غير مكتشف')]
 ];
 $('kpModel').innerHTML=`<strong>${tr('Cross-sheet project model','نموذج المشروع المترابط')}</strong><div style="display:grid;gap:6px;margin-top:8px">${rows.map(([a,b])=>`<div class="card"><small>${esc(a)}</small><strong style="font-size:12px">${esc(b)}</strong></div>`).join('')}</div>`
}
function renderSheets(){
 let h=$('kpSheets');if(!h||!state)return;
 h.innerHTML=state.sheets.map((s,i)=>`<button class="btn kpSheet" data-i="${i}" style="display:block;width:100%;text-align:${ar()?'right':'left'};padding:10px;border:${s===state.recommended?'1px solid #5ebd8a':'1px solid #294052'}">
 <div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(s.no||tr('Page','صفحة')+' '+s.page)} · ${esc(roleLabel(s.role))}</strong>${s===state.recommended?`<span class="chip good">${tr('PRIMARY','أساسية')}</span>`:''}</div>
 <div>${esc(s.title)}</div><small>OCR ${Math.round(s.ocrConf)}% · ${tr('Confidence','الثقة')} ${s.confidence}%${s.scales.length?' · '+s.scales.join(', '):''}</small>
 </button>`).join('');
 h.querySelectorAll('.kpSheet').forEach(b=>b.onclick=()=>selectSheet(+b.dataset.i))
}
async function previewSheet(s){
 let c=$('kpPreview');if(!c||!state?.doc)return;let p=await state.doc.getPage(s.page),src=await pageCanvas(p,950);c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);c.style.display='block'
}
function selectSheet(i){
 if(!state)return;state.selected=i;let s=state.sheets[i];$('kpSelected').style.display='block';
 $('kpSelTitle').textContent=`${s.no||tr('Page','صفحة')+' '+s.page} — ${s.title}`;
 let d=s.dims.explicit.w&&s.dims.explicit.d?`${s.dims.explicit.w.toFixed(2)} × ${s.dims.explicit.d.toFixed(2)} m`:s.dims.pairs[0]?`${Math.max(s.dims.pairs[0][0],s.dims.pairs[0][1]).toFixed(2)} × ${Math.min(s.dims.pairs[0][0],s.dims.pairs[0][1]).toFixed(2)} m`:tr('Not reliable','غير مؤكدة');
 cards('kpSelFacts',[[tr('Role','الدور'),roleLabel(s.role)],[tr('Scale','المقياس'),s.scales.join(', ')||tr('Not found','غير موجود')],[tr('Dimensions','الأبعاد'),d],[tr('Confidence','الثقة'),s.confidence+'%'],['Red layer',s.colors.red+'%'],['Blue layer',s.colors.blue+'%']]);
 let evidence=[...s.lighting,...s.legend,...s.zones,...s.dims.levels.map(x=>x.label)].slice(0,30);
 $('kpEvidence').innerHTML=evidence.length?`<small>${tr('Evidence detected','الأدلة المكتشفة')}</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${evidence.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`:'';
 set('kpNote','Dimensions are applied only when KLS finds an explicit overall pair. Other dimension values remain evidence for review.','يتم تطبيق الأبعاد فقط عند العثور على زوج أبعاد كلي واضح. باقي الأرقام تظل أدلة للمراجعة.');
 previewSheet(s)
}
function reliableDims(s){
 if(s.dims.explicit.w&&s.dims.explicit.d)return[s.dims.explicit.w,s.dims.explicit.d,s.dims.explicit.h||null];
 if(s.dims.pairs.length===1)return[Math.max(s.dims.pairs[0][0],s.dims.pairs[0][1]),Math.min(s.dims.pairs[0][0],s.dims.pairs[0][1]),null];
 return null
}
function applyDims(){
 if(!state)return;let s=state.sheets[state.selected],d=reliableDims(s);if(!d){alert(tr('No single reliable overall dimension pair was found on this sheet.','لم يتم العثور على زوج أبعاد كلية واحد موثوق في هذه اللوحة.'));return}
 $('w').value=d[0].toFixed(3);$('d').value=d[1].toFixed(3);if(d[2])$('h').value=d[2].toFixed(3);
 $('spaceGeometryState').textContent=tr('Drawing dimensions applied','تم تطبيق أبعاد اللوحة');$('spaceConfidence').textContent=tr('Confidence: reviewed','درجة الثقة: بعد المراجعة');
 $('smartDims').textContent=tr(`Applied ${d[0].toFixed(2)} × ${d[1].toFixed(2)} m from ${s.no||'selected sheet'}`,`تم تطبيق ${d[0].toFixed(2)} × ${d[1].toFixed(2)} م من ${s.no||'اللوحة المختارة'}`)
}
function useSheet(){
 if(!state)return;let s=state.sheets[state.selected];$('smartSpace').textContent=tr(`Using ${s.no||'page '+s.page}: ${s.title}`,`يتم استخدام ${s.no||'الصفحة '+s.page}: ${s.title}`);
 $('spaceGeometryState').textContent=tr('Sheet selected / geometry review','تم اختيار اللوحة / مراجعة الهندسة');
 if($('approveGeom'))$('approveGeom').checked=false;
 if(s.role==='lighting'||s.role==='base')applyDims()
}
async function analyse(file){
 if(busy)return;busy=true;ui();panel.style.display='block';set('kpState','READING','جاري القراءة');$('kpState').className='chip warn';
 set('kpSummary','Building drawing index, classifying sheets, reading title blocks, scales, dimensions and lighting evidence…','جاري بناء فهرس الرسومات وتصنيف اللوحات وقراءة العناوين والمقاييس والأبعاد وأدلة الإضاءة…');
 $('kpSheets').innerHTML='';$('kpSelected').style.display='none';
 try{
  if(!window.pdfjsLib)throw Error('PDF.js unavailable');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let data=new Uint8Array(await file.arrayBuffer()),doc=await pdfjsLib.getDocument({data}).promise,pages=[],index={},packageText='';
  for(let i=1;i<=doc.numPages;i++){
   $('kpProgress').textContent=tr(`Pass 1 · page ${i}/${doc.numPages}`,`المرحلة ١ · الصفحة ${i}/${doc.numPages}`);
   let p=await doc.getPage(i),layer=await textLayer(p),fullCanvas=await pageCanvas(p,1050),fullText=layer,fullConf=layer.length>30?100:0;
   if(layer.replace(/\s/g,'').length<30){let r=await ocr(fullCanvas,tr(`OCR page ${i}/${doc.numPages}`,`OCR الصفحة ${i}/${doc.numPages}`));fullText=r.text;fullConf=r.conf}
   let y=Math.floor(fullCanvas.height*.68), h=fullCanvas.height-y, crop= cropCanvas(fullCanvas,Math.floor(fullCanvas.width*.45),y,Math.floor(fullCanvas.width*.55),h,1500);
   let cr=await ocr(crop,tr(`Title block ${i}/${doc.numPages}`,`بلوك العنوان ${i}/${doc.numPages}`));
   let text=clean(fullText+'\n'+cr.text);packageText+='\n'+text;
   let no=drawingNo(cr.text)||drawingNo(text),scales=detectScale(text),dims=detectDims(text),colors=colorStats(fullCanvas);
   pages.push({page:i,no,text,ocrConf:Math.max(fullConf,cr.conf),scales,dims,colors,lighting:lightingTerms(text),legend:legendTerms(text),zones:zones(text),cropText:cr.text})
   if(i===1){index=parseIndex(text)}
  }
  if(Object.keys(index).length<4)index={...index,...parseIndex(packageText)};
  pages.forEach(s=>{
    s.indexTitle=s.no&&index[s.no]?index[s.no]:null;s.title=titleGuess(s.cropText+'\n'+s.text,s.indexTitle);s.role=roleFrom(s.title,s.text,s.no);s.confidence=confidence(s)
  });
  let domain=domainOf(packageText),model=buildModel(pages,index,domain);
  let recommended=model.lighting||model.base||model.artwork||pages.slice().sort((a,b)=>roleScore(b.role)-roleScore(a.role)||b.confidence-a.confidence)[0];
  state={doc,sheets:pages,index,model,recommended,selected:pages.indexOf(recommended)};
  set('kpState','READY','جاهز');$('kpState').className='chip good';$('kpProgress').textContent='';
  cards('kpFacts',[[tr('Sheets','اللوحات'),doc.numPages],[tr('Index entries','بنود الفهرس'),Object.keys(index).length],[tr('Domain','المجال'),domain?.name||tr('Uncertain','غير مؤكد')],[tr('Base plan','المخطط الأساسي'),model.base?.no||'—'],[tr('Lighting sheet','لوحة الإضاءة'),model.lighting?.no||'—'],[tr('Artwork sheet','لوحة الأعمال'),model.artwork?.no||'—']]);
  renderModel();renderSheets();selectSheet(state.selected);
  let msg=`KLS linked ${doc.numPages} sheets into one project model. ${model.base?model.base.no+' base geometry. ':''}${model.artwork?model.artwork.no+' artwork. ':''}${model.lighting?model.lighting.no+' lighting/ceiling. ':''}${model.sections.length?model.sections.map(x=>x.no).filter(Boolean).join('/')+' sections. ':''}`;
  let msgAr=`ربط KLS عدد ${doc.numPages} لوحة في نموذج مشروع واحد. ${model.base?'الهندسة الأساسية '+model.base.no+'. ':''}${model.artwork?'الأعمال '+model.artwork.no+'. ':''}${model.lighting?'الإضاءة/السقف '+model.lighting.no+'. ':''}${model.sections.length?'القطاعات '+model.sections.map(x=>x.no).filter(Boolean).join('/')+'. ':''}`;
  set('kpSummary',msg,msgAr);
  if(domain&&domain.score>=2&&$('mode')){$('mode').value=domain.name;$('mode').dispatchEvent(new Event('change',{bubbles:true}))}
  $('smartSpace').textContent=tr(`Drawing package understood · ${doc.numPages} sheets`,`تم فهم حزمة الرسومات · ${doc.numPages} لوحة`);
  $('spaceGeometryState').textContent=tr('Cross-sheet model / review','نموذج مترابط / مراجعة');
  $('spaceConfidence').textContent=tr('Confidence: mixed','درجة الثقة: مختلطة');
 }catch(e){
  console.error(e);set('kpState','ERROR','خطأ');set('kpSummary',`Analysis failed: ${e.message||e}`,`تعذر التحليل: ${e.message||e}`)
 }finally{busy=false}
}
function onFile(ev){let f=ev.target.files?.[0];if(!f)return;let ext=(f.name.split('.').pop()||'').toLowerCase();if(ext==='pdf'||f.type==='application/pdf')analyse(f)}
function boot(){ui();let i=$('spaceFileNative');if(i){i.addEventListener('change',onFile);i.addEventListener('input',onFile)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();