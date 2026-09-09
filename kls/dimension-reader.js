(()=>{
'use strict';
const $=id=>document.getElementById(id);
const isAr=()=>document.documentElement.dir==='rtl'||document.documentElement.lang==='ar';
const tr=(en,ar)=>isAr()?ar:en;
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const uniq=a=>[...new Set(a.filter(Boolean))];
let file=null,doc=null,worker=null,busy=false,result=null;

function ui(){
 let b=$('klsDeepDimensions');
 if(!b){const host=$('pvSelection')||$('planStatus')?.closest('.panel');if(!host)return null;b=document.createElement('div');b.id='klsDeepDimensions';host.appendChild(b)}
 b.style.cssText='margin-top:12px;padding:12px;border:1px solid #31506a;border-radius:14px;background:#0a151f';
 b.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><strong>${tr('KLS Irregular Geometry Reader v21','قارئ الهندسة غير المنتظمة v21')}</strong><span id="g21State" class="chip warn">${tr('WAITING','انتظار')}</span></div>
 <p id="g21Summary" class="tip">${tr('Reads A-01 and A-04 as an irregular plan, not as one width × depth rectangle. It extracts side dimensions, chained dimensions and the outer wall polygon separately.','يقرأ A-01 وA-04 كفراغ غير منتظم، وليس كمستطيل عرض × عمق واحد. يستخرج أبعاد الأضلاع والأبعاد المتسلسلة وحدود الحوائط الخارجية بشكل منفصل.')}</p>
 <div id="g21Facts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(135px,1fr));margin-top:8px"></div>
 <canvas id="g21Preview" style="display:none;width:100%;max-height:460px;background:#fff;border-radius:10px;margin-top:10px"></canvas>
 <div id="g21Dimensions" style="margin-top:10px"></div>
 <div id="g21Evidence" style="margin-top:8px"></div>
 <button id="g21Apply" class="btn good" style="margin-top:8px">${tr('Use detected polygon geometry','استخدام الهندسة متعددة الأضلاع المكتشفة')}</button>`;
 $('g21Apply').onclick=apply;return b;
}
function cards(items){const h=$('g21Facts');if(h)h.innerHTML=items.map(([a,b])=>`<div class="card"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('')}
async function getWorker(){if(worker)return worker;if(!window.Tesseract)throw Error('OCR unavailable');worker=await Tesseract.createWorker('eng',1,{logger:m=>{if(m.status&&typeof m.progress==='number')$('g21Summary').textContent=`${m.status} ${Math.round(m.progress*100)}%`}});await worker.setParameters({preserve_interword_spaces:'1'});return worker}
async function render(page,target=3600){const base=page.getViewport({scale:1}),s=Math.min(6,target/base.width),vp=page.getViewport({scale:s});const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp}).promise;return c}
function crop(src,x,y,w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*w));c.height=Math.max(1,Math.round(src.height*h));c.getContext('2d').drawImage(src,src.width*x,src.height*y,src.width*w,src.height*h,0,0,c.width,c.height);return c}
function rotate(src,deg){const c=document.createElement('canvas'),a=((deg%360)+360)%360;if(a===90||a===270){c.width=src.height;c.height=src.width}else{c.width=src.width;c.height=src.height}const q=c.getContext('2d');q.translate(c.width/2,c.height/2);q.rotate(a*Math.PI/180);q.drawImage(src,-src.width/2,-src.height/2);return c}
function blueOnly(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const q=c.getContext('2d');q.drawImage(src,0,0);const im=q.getImageData(0,0,c.width,c.height),d=im.data;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],blue=(b>95&&b>r*1.03&&b>g*.99&&(b-r)>6);const v=blue?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}q.putImageData(im,0,0);return c}
async function ocr(c,psm='6'){const w=await getWorker();await w.setParameters({tessedit_pageseg_mode:String(psm)});const max=2800,s=Math.min(1,max/c.width),x=document.createElement('canvas');x.width=Math.max(1,Math.round(c.width*s));x.height=Math.max(1,Math.round(c.height*s));x.getContext('2d').drawImage(c,0,0,x.width,x.height);const r=await w.recognize(x);return{text:String(r.data.text||''),conf:+(r.data.confidence||0)}}
function norm(s){return String(s).replace(/,/g,'.').replace(/(\d)\s*[,:]\s*(\d)/g,'$1.$2').replace(/(\d)\s+\.\s*(\d)/g,'$1.$2').replace(/(?<=\d)[Oo](?=\d|\.)/g,'0').replace(/(?<=\d)[Il|](?=\d|\.)/g,'1')}
function nums(text){const out=[];for(const m of norm(text).matchAll(/(?:^|[^\d])(\d{1,3}(?:\.\d{1,3})?)(?!\d)/g)){const v=parseFloat(m[1]);if(v>=.15&&v<=80)out.push(Math.round(v*1000)/1000)}return uniq(out).sort((a,b)=>b-a)}
function scales(text){return uniq([...norm(text).matchAll(/(?:scale\s*)?1\s*[:/]\s*(\d{1,4})/gi)].map(m=>'1:'+m[1]))}
async function readDimensionZones(src){
 const blue=blueOnly(src);
 const zones={
  top:crop(blue,.05,.05,.78,.18),
  bottom:crop(blue,.05,.64,.78,.30),
  left:rotate(crop(blue,.03,.12,.20,.70),90),
  right:rotate(crop(blue,.67,.12,.22,.70),270),
  title:crop(src,.82,.72,.17,.25)
 };
 const [top,bottom,left,right,title]=await Promise.all([ocr(zones.top,'6'),ocr(zones.bottom,'6'),ocr(zones.left,'6'),ocr(zones.right,'6'),ocr(zones.title,'6')]);
 return {top:{...top,nums:nums(top.text)},bottom:{...bottom,nums:nums(bottom.text)},left:{...left,nums:nums(left.text)},right:{...right,nums:nums(right.text)},title:{...title,scales:scales(title.text)}};
}
function darkMask(src,maxW=1200){const s=Math.min(1,maxW/src.width),w=Math.round(src.width*s),h=Math.round(src.height*s),c=document.createElement('canvas');c.width=w;c.height=h;const q=c.getContext('2d');q.drawImage(src,0,0,w,h);const d=q.getImageData(0,0,w,h).data,m=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];if(r<72&&g<72&&b<72)m[y*w+x]=1}return{m,w,h}}
function median(a){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);return b[(b.length/2)|0]}
function fitLine(points,mode){if(points.length<20)return null;let sx=0,sy=0,sxx=0,sxy=0;for(const p of points){const x=mode==='yx'?p.y:p.x,y=mode==='yx'?p.x:p.y;sx+=x;sy+=y;sxx+=x*x;sxy+=x*y}const n=points.length,den=n*sxx-sx*sx;if(Math.abs(den)<1e-6)return null;const a=(n*sxy-sx*sy)/den,b=(sy-a*sx)/n;return mode==='yx'?{vertical:true,a,b}:{vertical:false,a,b}}
function outerEdges(src){
 const M=darkMask(src),{m,w,h}=M,x0=Math.round(w*.07),x1=Math.round(w*.84),y0=Math.round(h*.12),y1=Math.round(h*.82);
 const top=[],bottom=[],left=[],right=[];
 for(let x=x0;x<=x1;x+=3){let ys=[];for(let y=y0;y<=y1;y++)if(m[y*w+x])ys.push(y);if(ys.length){top.push({x,y:ys[0]});bottom.push({x,y:ys[ys.length-1]})}}
 for(let y=y0;y<=y1;y+=3){let xs=[];for(let x=x0;x<=x1;x++)if(m[y*w+x])xs.push(x);if(xs.length){left.push({x:xs[0],y});right.push({x:xs[xs.length-1],y})}}
 function robust(points,vertical=false){if(points.length<20)return null;let cur=points;for(let k=0;k<3;k++){const line=fitLine(cur,vertical?'yx':'xy');if(!line)return null;const errs=cur.map(p=>Math.abs(vertical?(p.x-(line.a*p.y+line.b)):(p.y-(line.a*p.x+line.b))));const med=median(errs)||1;cur=cur.filter((p,i)=>errs[i]<=Math.max(3,med*2.2));if(cur.length<20)break}return fitLine(cur,vertical?'yx':'xy')}
 const T=robust(top),B=robust(bottom),L=robust(left,true),R=robust(right,true);
 function intersect(l1,l2){if(!l1||!l2)return null;const den=1-l2.a*l1.a;if(Math.abs(den)<1e-6)return null;const x=(l2.a*l1.b+l2.b)/den,y=l1.a*x+l1.b;return{x:x/w,y:y/h}}
 return {top:T,bottom:B,left:L,right:R,corners:[intersect(T,L),intersect(T,R),intersect(B,R),intersect(B,L)].filter(Boolean)};
}
function chooseSideValue(list){const v=list.filter(x=>x>=2);return v.length?v[0]:null}
function mergeEvidence(a1,a4){return {top:chooseSideValue([...a1.dim.top.nums,...a4.dim.top.nums]),bottom:chooseSideValue([...a1.dim.bottom.nums,...a4.dim.bottom.nums]),left:chooseSideValue([...a1.dim.left.nums,...a4.dim.left.nums]),right:chooseSideValue([...a1.dim.right.nums,...a4.dim.right.nums])}}
function dimListHTML(label,arr){return `<div class="card"><small>${esc(label)}</small><strong>${arr.length?arr.slice(0,14).join(' · '):'—'}</strong></div>`}
function draw(sheet,poly){const out=$('g21Preview'),src=sheet.src;if(!out)return;const max=1000,s=Math.min(1,max/src.width);out.width=Math.round(src.width*s);out.height=Math.round(src.height*s);const q=out.getContext('2d');q.drawImage(src,0,0,out.width,out.height);if(poly?.corners?.length===4){q.lineWidth=4;q.beginPath();poly.corners.forEach((p,i)=>{const x=p.x*out.width,y=p.y*out.height;i?q.lineTo(x,y):q.moveTo(x,y)});q.closePath();q.stroke()}out.style.display='block'}
async function readSheet(code,pn){const page=await doc.getPage(pn),src=await render(page),dim=await readDimensionZones(src),poly=outerEdges(src);return{code,src,dim,poly}}
async function run(){
 if(!file||busy)return;busy=true;ui();result=null;$('g21State').textContent=tr('READING A-01 + A-04','قراءة A-01 + A-04');$('g21State').className='chip warn';
 try{
  if(!window.pdfjsLib)throw Error('PDF engine unavailable');if(!doc){const data=new Uint8Array(await file.arrayBuffer());doc=await pdfjsLib.getDocument({data}).promise}
  if(doc.numPages<5)throw Error('A-01/A-04 mapping unavailable');
  $('g21Summary').textContent=tr('Reading A-01 as an irregular base polygon…','جاري قراءة A-01 كحدود فراغ غير منتظمة…');const a1=await readSheet('A-01',2);
  $('g21Summary').textContent=tr('Reading A-04 lighting RCP and chained dimensions…','جاري قراءة A-04 ومخطط الإضاءة والأبعاد المتسلسلة…');const a4=await readSheet('A-04',5);
  const sideValues=mergeEvidence(a1,a4),scalesFound=uniq([...a1.dim.title.scales,...a4.dim.title.scales]);result={a1,a4,sideValues,scales:scalesFound};const polyOk=a1.poly?.corners?.length===4;
  cards([[tr('Geometry model','نموذج الهندسة'),polyOk?tr('Irregular 4-edge polygon','مضلع غير منتظم من 4 أضلاع'):tr('Review required','تحتاج مراجعة')],[tr('Scale evidence','دليل المقياس'),scalesFound.join(', ')||tr('Not reliable yet','غير موثوق بعد')],[tr('Top side candidate','مرشح الضلع العلوي'),sideValues.top?sideValues.top+' m':'—'],[tr('Bottom side candidate','مرشح الضلع السفلي'),sideValues.bottom?sideValues.bottom+' m':'—'],[tr('Left side candidate','مرشح الضلع الأيسر'),sideValues.left?sideValues.left+' m':'—'],[tr('Right side candidate','مرشح الضلع الأيمن'),sideValues.right?sideValues.right+' m':'—']]);
  $('g21Dimensions').innerHTML=`<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(145px,1fr))">${dimListHTML(tr('A-01 top dimensions','أبعاد A-01 العلوية'),a1.dim.top.nums)}${dimListHTML(tr('A-01 bottom dimensions','أبعاد A-01 السفلية'),a1.dim.bottom.nums)}${dimListHTML(tr('A-01 left dimensions','أبعاد A-01 اليسرى'),a1.dim.left.nums)}${dimListHTML(tr('A-01 right dimensions','أبعاد A-01 اليمنى'),a1.dim.right.nums)}${dimListHTML(tr('A-04 top dimensions','أبعاد A-04 العلوية'),a4.dim.top.nums)}${dimListHTML(tr('A-04 bottom dimensions','أبعاد A-04 السفلية'),a4.dim.bottom.nums)}${dimListHTML(tr('A-04 left dimensions','أبعاد A-04 اليسرى'),a4.dim.left.nums)}${dimListHTML(tr('A-04 right dimensions','أبعاد A-04 اليمنى'),a4.dim.right.nums)}</div>`;
  const ev=[tr('The previous width × depth model was wrong for this drawing package because the room footprint is not rectangular.','نموذج العرض × العمق السابق كان غير مناسب لهذا الملف لأن حدود الفراغ ليست مستطيلة.'),tr('A-01 contains different top, bottom, left and right dimensions plus internal chains, so KLS now keeps them as separate dimension entities.','تحتوي A-01 على أبعاد مختلفة للضلع العلوي والسفلي والأيسر والأيمن بالإضافة إلى أبعاد داخلية متسلسلة، لذلك يحتفظ بها KLS الآن كعناصر أبعاد منفصلة.'),tr('A-04 is used as lighting/RCP evidence, not as a replacement for the base polygon.','تُستخدم A-04 كدليل لمخطط الإضاءة والسقف، وليس كبديل عن حدود الفراغ الأساسية.'),polyOk?tr('Outer wall polygon was detected from the dark architectural boundary.','تم اكتشاف مضلع الحوائط الخارجية من الحدود المعمارية الداكنة.'):tr('Outer wall polygon still needs review; KLS will not invent missing corners.','حدود الحوائط الخارجية ما زالت تحتاج مراجعة؛ لن يخترع KLS زوايا غير مؤكدة.')];
  $('g21Evidence').innerHTML=ev.map(x=>`<div class="tip">• ${esc(x)}</div>`).join('');draw(a1,a1.poly);$('g21State').textContent=polyOk?tr('POLYGON FOUND','تم اكتشاف المضلع'):tr('REVIEW','مراجعة');$('g21State').className='chip '+(polyOk?'good':'warn');$('g21Summary').textContent=tr('Irregular-plan geometry pass completed. Dimensions are preserved by side and chain instead of forcing one width × depth pair.','اكتملت قراءة الفراغ غير المنتظم. يتم الاحتفاظ بالأبعاد حسب كل ضلع وتسلسل بدل إجبارها على زوج عرض × عمق واحد.');
 }catch(e){console.error(e);$('g21State').textContent=tr('ERROR','خطأ');$('g21Summary').textContent=tr('Geometry reading failed: ','فشلت قراءة الهندسة: ')+(e.message||e)}finally{busy=false}
}
function apply(){if(!result?.a1?.poly?.corners?.length){alert(tr('No reliable polygon geometry yet.','لا توجد هندسة مضلعة موثوقة حتى الآن.'));return}window.KLS_POLYGON_GEOMETRY={source:'A-01',corners:result.a1.poly.corners,sideDimensions:result.sideValues,dimensionChains:{A01:{top:result.a1.dim.top.nums,bottom:result.a1.dim.bottom.nums,left:result.a1.dim.left.nums,right:result.a1.dim.right.nums},A04:{top:result.a4.dim.top.nums,bottom:result.a4.dim.bottom.nums,left:result.a4.dim.left.nums,right:result.a4.dim.right.nums}},scales:result.scales};$('spaceGeometryState').textContent=tr('Irregular polygon geometry detected','تم اكتشاف هندسة الفراغ غير المنتظمة');$('spaceConfidence').textContent=tr('Confidence: review','درجة الثقة: مراجعة');$('smartDims').textContent=tr('Dimensions preserved by side / chain — not forced into W × D','تم حفظ الأبعاد حسب الضلع / التسلسل — بدون تحويل إجباري إلى عرض × عمق');if($('approveGeom'))$('approveGeom').checked=false}
function boot(){ui();const inp=$('spaceFileNative');if(inp){const f=e=>{const x=e.target.files?.[0];if(x&&(x.type==='application/pdf'||/\.pdf$/i.test(x.name))){file=x;doc=null;result=null;setTimeout(run,1800)}};inp.addEventListener('change',f);inp.addEventListener('input',f)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();