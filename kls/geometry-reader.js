(()=>{
'use strict';
const $=id=>document.getElementById(id);
const isAr=()=>document.documentElement.dir==='rtl'||document.documentElement.lang==='ar';
const tr=(en,ar)=>isAr()?ar:en;
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let file=null,doc=null,busy=false,result=null;

function ui(){
  let b=$('klsGeomFeatures');
  if(b)return b;
  const host=$('klsDeepDimensions')||$('pvSelection')||$('planStatus')?.closest('.panel');
  if(!host)return null;
  b=document.createElement('div');
  b.id='klsGeomFeatures';
  b.style.cssText='margin-top:12px;padding:12px;border:1px solid #31506a;border-radius:14px;background:#0a151f';
  b.innerHTML=`
  <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
    <strong>${tr('KLS Geometry + Lighting Feature Reader v23','قارئ الهندسة وعناصر الإضاءة v23')}</strong>
    <span id="g23State" class="chip warn">${tr('WAITING','انتظار')}</span>
  </div>
  <p id="g23Summary" class="tip">${tr('Builds a normalized A-01 wall envelope, detects candidate red lighting/suspension symbols on A-04, and keeps every detection as reviewable evidence.','يبني حدود الحوائط المعيارية من A-01، ويكتشف مرشحات رموز الإضاءة/التعليق الحمراء في A-04، ويحفظ كل اكتشاف كدليل قابل للمراجعة.')}</p>
  <div id="g23Facts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(135px,1fr));margin-top:8px"></div>
  <canvas id="g23Preview" style="display:none;width:100%;max-height:480px;background:#fff;border-radius:10px;margin-top:10px"></canvas>
  <div id="g23Segments" style="margin-top:10px"></div>
  <div id="g23Evidence" style="margin-top:8px"></div>
  <button id="g23Apply" class="btn good" style="margin-top:8px">${tr('Use detected plan geometry','استخدام هندسة المخطط المكتشفة')}</button>`;
  host.appendChild(b);
  $('g23Apply').onclick=apply;
  return b;
}
function cards(items){
  const h=$('g23Facts');
  if(h)h.innerHTML=items.map(([a,b])=>`<div class="card"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
}
async function render(page,target=2200){
  const base=page.getViewport({scale:1}),s=Math.min(4,target/base.width),vp=page.getViewport({scale:s});
  const c=document.createElement('canvas'); c.width=Math.round(vp.width);c.height=Math.round(vp.height);
  await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp}).promise; return c;
}
function downsample(src,maxW=1050){
  const s=Math.min(1,maxW/src.width),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(src.width*s));c.height=Math.max(1,Math.round(src.height*s));
  c.getContext('2d').drawImage(src,0,0,c.width,c.height); return c;
}
function imageData(c){return c.getContext('2d').getImageData(0,0,c.width,c.height).data}
function darkMask(c){
  const d=imageData(c),m=new Uint8Array(c.width*c.height);
  for(let i=0,p=0;i<d.length;i+=4,p++){
    const r=d[i],g=d[i+1],b=d[i+2];
    if(r<72&&g<72&&b<72&&Math.max(r,g,b)-Math.min(r,g,b)<25)m[p]=1;
  }
  return m;
}
function redMask(c){
  const d=imageData(c),m=new Uint8Array(c.width*c.height);
  for(let i=0,p=0;i<d.length;i+=4,p++){
    const r=d[i],g=d[i+1],b=d[i+2];
    if(r>135&&r>g*1.28&&r>b*1.22&&(r-g)>35)m[p]=1;
  }
  return m;
}
function boundaryFromDark(c){
  const w=c.width,h=c.height,m=darkMask(c),roi={x0:.05,x1:.86,y0:.08,y1:.86};
  const samples=[];
  for(let x=Math.floor(w*roi.x0);x<Math.floor(w*roi.x1);x+=3){
    let ys=[];for(let y=Math.floor(h*roi.y0);y<Math.floor(h*roi.y1);y++)if(m[y*w+x])ys.push(y);
    if(ys.length>8){samples.push({x,y:ys[0],edge:'top'});samples.push({x,y:ys[ys.length-1],edge:'bottom'})}
  }
  for(let y=Math.floor(h*roi.y0);y<Math.floor(h*roi.y1);y+=3){
    let xs=[];for(let x=Math.floor(w*roi.x0);x<Math.floor(w*roi.x1);x++)if(m[y*w+x])xs.push(x);
    if(xs.length>8){samples.push({x:xs[0],y,edge:'left'});samples.push({x:xs[xs.length-1],y,edge:'right'})}
  }
  const groups={top:[],bottom:[],left:[],right:[]};samples.forEach(p=>groups[p.edge].push(p));
  function median(vals){const a=[...vals].sort((a,b)=>a-b);return a.length?a[(a.length/2)|0]:null}
  function robustLine(pts,vertical=false){
    if(pts.length<12)return null;
    let cur=pts.slice(),line=null;
    for(let k=0;k<4;k++){
      let sx=0,sy=0,sxx=0,sxy=0,n=cur.length;
      for(const p of cur){const X=vertical?p.y:p.x,Y=vertical?p.x:p.y;sx+=X;sy+=Y;sxx+=X*X;sxy+=X*Y}
      const den=n*sxx-sx*sx;if(Math.abs(den)<1e-6)return null;
      const a=(n*sxy-sx*sy)/den,b=(sy-a*sx)/n;line={a,b,vertical,count:cur.length};
      const errs=cur.map(p=>Math.abs((vertical?p.x:p.y)-(a*(vertical?p.y:p.x)+b)));
      const med=median(errs)||1,lim=Math.max(3,med*2.0);
      cur=cur.filter((p,i)=>errs[i]<=lim); if(cur.length<12)break;
    }
    return line;
  }
  const L={top:robustLine(groups.top,false),bottom:robustLine(groups.bottom,false),left:robustLine(groups.left,true),right:robustLine(groups.right,true)};
  function intersect(hline,vline){
    if(!hline||!vline)return null;
    const den=1-vline.a*hline.a;if(Math.abs(den)<1e-6)return null;
    const x=(vline.a*hline.b+vline.b)/den,y=hline.a*x+hline.b;
    return {x:x/w,y:y/h};
  }
  let poly=[intersect(L.top,L.left),intersect(L.top,L.right),intersect(L.bottom,L.right),intersect(L.bottom,L.left)].filter(Boolean);
  poly=poly.filter(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
  return {lines:L,polygon:poly,samples:groups};
}
function connectedRed(c){
  const w=c.width,h=c.height,m=redMask(c),seen=new Uint8Array(m.length),stack=[],out=[];
  const x0=Math.floor(w*.05),x1=Math.floor(w*.86),y0=Math.floor(h*.08),y1=Math.floor(h*.86);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const p=y*w+x;if(!m[p]||seen[p])continue;seen[p]=1;stack.push(p);
    let n=0,minx=x,maxx=x,miny=y,maxy=y,sx=0,sy=0;
    while(stack.length){
      const q=stack.pop(),qx=q%w,qy=(q/w)|0;n++;sx+=qx;sy+=qy;
      minx=Math.min(minx,qx);maxx=Math.max(maxx,qx);miny=Math.min(miny,qy);maxy=Math.max(maxy,qy);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
        const nx=qx+dx,ny=qy+dy;if(nx<x0||nx>=x1||ny<y0||ny>=y1)continue;
        const z=ny*w+nx;if(m[z]&&!seen[z]){seen[z]=1;stack.push(z)}
      }
    }
    const bw=maxx-minx+1,bh=maxy-miny+1;
    if(n>=3&&n<=500&&bw<=45&&bh<=45)out.push({x:sx/n/w,y:sy/n/h,area:n,w:bw/w,h:bh/h});
  }
  out.sort((a,b)=>b.area-a.area);const keep=[];
  for(const p of out){if(!keep.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.012))keep.push(p);if(keep.length>=120)break}
  return keep;
}
function detectGrid(c){
  const d=imageData(c),w=c.width,h=c.height;
  function neutralDark(x,y){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];return r<165&&g<175&&b<175&&Math.max(r,g,b)-Math.min(r,g,b)<30}
  const xs=[],ys=[];
  for(let x=Math.floor(w*.1);x<Math.floor(w*.82);x+=2){let n=0;for(let y=Math.floor(h*.12);y<Math.floor(h*.76);y++)if(neutralDark(x,y))n++;if(n>h*.25)xs.push(x/w)}
  for(let y=Math.floor(h*.12);y<Math.floor(h*.76);y+=2){let n=0;for(let x=Math.floor(w*.1);x<Math.floor(w*.82);x++)if(neutralDark(x,y))n++;if(n>w*.28)ys.push(y/h)}
  function cluster(a){const o=[];for(const v of a){if(!o.length||Math.abs(v-o[o.length-1])>.006)o.push(v);else o[o.length-1]=(o[o.length-1]+v)/2}return o}
  return {x:cluster(xs),y:cluster(ys)};
}
function segmentTable(poly){
  if(poly.length<3)return '';
  const rows=[];for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y;
    rows.push(`<tr><td>S${i+1}</td><td>${a.x.toFixed(3)}, ${a.y.toFixed(3)}</td><td>${b.x.toFixed(3)}, ${b.y.toFixed(3)}</td><td>${Math.hypot(dx,dy).toFixed(3)}</td><td>${Math.round(Math.atan2(dy,dx)*180/Math.PI)}°</td></tr>`);
  }
  return `<div class="table"><table><thead><tr><th>Segment</th><th>Start N</th><th>End N</th><th>Length N</th><th>Angle</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function draw(a4,geom,reds){
  const out=$('g23Preview'),src=a4;if(!out)return;
  const s=Math.min(1,1050/src.width);out.width=Math.round(src.width*s);out.height=Math.round(src.height*s);
  const q=out.getContext('2d');q.drawImage(src,0,0,out.width,out.height);q.lineWidth=4;
  if(geom.polygon.length>=3){q.beginPath();geom.polygon.forEach((p,i)=>{const x=p.x*out.width,y=p.y*out.height;i?q.lineTo(x,y):q.moveTo(x,y)});q.closePath();q.stroke()}
  q.font='13px sans-serif';reds.slice(0,80).forEach((p,i)=>{q.beginPath();q.arc(p.x*out.width,p.y*out.height,4,0,Math.PI*2);q.stroke();if(i<30)q.fillText(String(i+1),p.x*out.width+5,p.y*out.height-5)});
  out.style.display='block';
}
async function readSheet(pageNo){const page=await doc.getPage(pageNo),src=await render(page),small=downsample(src);return {src,small}}
async function run(){
  if(!file||busy)return;busy=true;ui();result=null;$('g23State').textContent=tr('ANALYSING','تحليل');$('g23State').className='chip warn';
  try{
    if(!window.pdfjsLib)throw Error('PDF engine unavailable');
    if(!doc){const data=new Uint8Array(await file.arrayBuffer());doc=await pdfjsLib.getDocument({data}).promise}
    if(doc.numPages<5)throw Error('A-01/A-04 mapping unavailable');
    $('g23Summary').textContent=tr('Tracing architectural envelope from A-01…','جاري تتبع حدود الفراغ المعمارية من A-01…');
    const A1=await readSheet(2),geom=boundaryFromDark(A1.small);
    $('g23Summary').textContent=tr('Detecting red lighting/suspension candidates and ceiling grid on A-04…','جاري اكتشاف مرشحات الإضاءة/التعليق الحمراء وشبكة السقف في A-04…');
    const A4=await readSheet(5),reds=connectedRed(A4.small),grid=detectGrid(A4.small);
    result={A1,A4,geom,reds,grid};const polyOK=geom.polygon.length===4;
    cards([[tr('A-01 wall envelope','حدود حوائط A-01'),polyOK?tr('4-corner model','نموذج 4 أركان'):tr('Review','مراجعة')],[tr('Wall segments','قطاعات الحوائط'),geom.polygon.length],[tr('A-04 red candidates','مرشحات A-04 الحمراء'),reds.length],[tr('Ceiling grid X lines','خطوط شبكة السقف X'),grid.x.length],[tr('Ceiling grid Y lines','خطوط شبكة السقف Y'),grid.y.length],[tr('Coordinate system','نظام الإحداثيات'),tr('Normalized 0–1','معياري 0–1')]]);
    $('g23Segments').innerHTML=segmentTable(geom.polygon);
    const ev=[tr('A-01 is used only for the architectural envelope. A-04 does not replace the base room geometry.','تُستخدم A-01 فقط لحدود الفراغ المعمارية. لا تستبدل A-04 الهندسة الأساسية للفراغ.'),tr('Red components on A-04 are stored as candidates, not automatically called spotlights; final classification must agree with the project legend on A-00.','تُحفظ المكونات الحمراء في A-04 كمرشحات فقط، ولا يتم تسميتها سبوت لايت تلقائيًا؛ يجب أن يتوافق التصنيف النهائي مع مفتاح الرموز في A-00.'),tr('The model now has normalized coordinates for walls, red candidates and ceiling-grid evidence, ready to be calibrated by verified dimensions.','أصبح النموذج يحتوي على إحداثيات معيارية للحوائط والمرشحات الحمراء وأدلة شبكة السقف، وجاهزًا للمعايرة بالأبعاد المؤكدة.'),tr('No real-world metre coordinates are invented when dimension calibration is not yet verified.','لا يتم اختلاق إحداثيات بالمتر عندما تكون معايرة الأبعاد غير مؤكدة بعد.')];
    $('g23Evidence').innerHTML=ev.map(x=>`<div class="tip">• ${esc(x)}</div>`).join('');draw(A4.src,geom,reds);
    $('g23State').textContent=polyOK?tr('MODEL READY','النموذج جاهز'):tr('REVIEW','مراجعة');$('g23State').className='chip '+(polyOK?'good':'warn');$('g23Summary').textContent=tr('Geometry and lighting-feature extraction completed.','اكتمل استخراج الهندسة وعناصر الإضاءة المرشحة.');
  }catch(e){console.error(e);$('g23State').textContent=tr('ERROR','خطأ');$('g23Summary').textContent=tr('Geometry extraction failed: ','فشل استخراج الهندسة: ')+(e.message||e)}finally{busy=false}
}
function apply(){
  if(!result?.geom?.polygon?.length){alert(tr('No usable wall geometry yet.','لا توجد هندسة حوائط قابلة للاستخدام حتى الآن.'));return}
  window.KLS_PLAN_GEOMETRY={source:{geometry:'A-01',lighting:'A-04'},coordinateSystem:'normalized',polygon:result.geom.polygon,segments:result.geom.polygon.map((a,i)=>{const b=result.geom.polygon[(i+1)%result.geom.polygon.length];return{id:'S'+(i+1),start:a,end:b,lengthNormalized:Math.hypot(b.x-a.x,b.y-a.y),angleDeg:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}}),lightingCandidates:result.reds,ceilingGrid:result.grid,dimensionModel:window.KLS_DIMENSION_MODEL||null,status:window.KLS_DIMENSION_MODEL?'mixed':'estimated'};
  $('spaceGeometryState').textContent=tr('Plan geometry model created','تم إنشاء نموذج هندسة المخطط');$('spaceConfidence').textContent=tr(window.KLS_DIMENSION_MODEL?'Confidence: mixed':'Confidence: estimated',window.KLS_DIMENSION_MODEL?'درجة الثقة: مختلطة':'درجة الثقة: تقديرية');$('smartSpace').textContent=tr('A-01 wall geometry + A-04 lighting features linked','تم ربط هندسة A-01 بعناصر الإضاءة في A-04');if($('approveGeom'))$('approveGeom').checked=false;
}
function boot(){ui();const inp=$('spaceFileNative');if(inp){const f=e=>{const x=e.target.files?.[0];if(x&&(x.type==='application/pdf'||/\.pdf$/i.test(x.name))){file=x;doc=null;result=null;setTimeout(run,2600)}};inp.addEventListener('change',f);inp.addEventListener('input',f)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();