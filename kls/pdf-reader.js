(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ar=()=>document.documentElement.lang==='ar'||document.documentElement.dir==='rtl';
const msg=(en,arabic)=>ar()?arabic:en;
let box=null;
function ensureUI(){
 if(box)return box;
 const host=$('planStatus')?.closest('.panel')||document.querySelector('aside .panel');
 if(!host)return null;
 box=document.createElement('div');
 box.id='pdfUnderstanding';
 box.style.cssText='margin-top:14px;padding:14px;border:1px solid #26394a;border-radius:14px;background:#0b1620;display:none';
 box.innerHTML=`<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap"><strong id="pdfTitle">PDF Understanding</strong><span id="pdfConfidence" class="chip warn">WAITING</span></div><p id="pdfSummary" class="tip" style="margin:10px 0">—</p><div id="pdfFacts" class="cards" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-top:8px"></div><div id="pdfDetected" style="margin-top:10px"></div><canvas id="pdfPreview" style="width:100%;max-height:360px;object-fit:contain;background:#fff;border-radius:10px;margin-top:10px;display:none"></canvas><details style="margin-top:10px"><summary id="pdfTextLabel">Extracted PDF text</summary><pre id="pdfText" style="white-space:pre-wrap;max-height:240px;overflow:auto;font-size:11px;line-height:1.5"></pre></details><p id="pdfPrivacy" class="tip">PDF analysis runs locally in your browser. The file is not uploaded to a KLS server.</p>`;
 host.appendChild(box);return box;
}
function setText(id,en,arabic){let e=$(id);if(e)e.textContent=msg(en,arabic)}
function unitToM(v,u){v=parseFloat(String(v).replace(',','.'));u=(u||'m').toLowerCase();if(!Number.isFinite(v))return null;if(u==='mm')return v/1000;if(u==='cm')return v/100;if(u==='ft'||u==='feet'||u==="'")return v*.3048;if(u==='in'||u==='inch'||u==='inches'||u==='\"')return v*.0254;return v}
function uniq(a){return [...new Set(a.filter(Boolean))]}
function detectDimensions(text){
 const t=text.replace(/,/g,'.');let explicit={};
 const labels=[['w',/(?:width|عرض)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)\b/i],['d',/(?:depth|length|عمق|طول)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)\b/i],['h',/(?:height|ارتفاع)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|metres?|meters?)\b/i]];
 labels.forEach(([k,r])=>{let m=t.match(r);if(m)explicit[k]=unitToM(m[1],m[2])});
 const pairs=[];for(const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi)){let u1=m[2]||m[4],a=unitToM(m[1],u1),b=unitToM(m[3],m[4]);if(a>=.2&&b>=.2&&a<=200&&b<=200)pairs.push([a,b,m[0]])}
 const dims=[];for(const m of t.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi)){let v=unitToM(m[1],m[2]);if(v>=.2&&v<=200)dims.push(v)}
 return{explicit,pairs,values:uniq(dims.map(v=>Math.round(v*1000)/1000)).sort((a,b)=>b-a).slice(0,12)};
}
function detectScale(text){let m=text.match(/(?:scale|مقياس(?: الرسم)?)?\s*1\s*[:/]\s*(\d{1,5})/i);return m?'1:'+m[1]:null}
function detectDomain(text){let t=text.toLowerCase(),scores={Exhibition:0,Theatre:0,'Live Event':0,'Film & Photography':0};
 [['Exhibition',['exhibition','museum','gallery','artwork','display case','track light','معرض','متحف','قاعة عرض','قطعة فنية','تراك لايت']],['Theatre',['theatre','theater','stage','foh','proscenium','auditorium','مسرح','خشبة']],['Live Event',['truss','moving head','event lighting','concert','فعالية','حفلة','تراس']],['Film & Photography',['camera','key light','fill light','cinema','photography','كاميرا','تصوير','إضاءة رئيسية']]].forEach(([d,keys])=>keys.forEach(k=>{if(t.includes(k.toLowerCase()))scores[d]++}));
 let best=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];return best&&best[1]>0?{name:best[0],score:best[1]}:null}
function detectZones(lines){return uniq(lines.map(s=>s.trim()).filter(s=>/^(?:zone|area|room|gallery|hall|stage|section|منطقة|قاعة|غرفة|قسم)\b/i.test(s)&&s.length<80)).slice(0,20)}
function detectLighting(text){let keys=['track light','spotlight','downlight','wallwasher','wall washer','profile','fresnel','moving head','led','dmx','dali','lux','ies','ldt','تراك لايت','سبوت','كشاف','لوكس','إضاءة'];return uniq(keys.filter(k=>text.toLowerCase().includes(k.toLowerCase())))}
async function renderPage(page){try{let c=$('pdfPreview');if(!c)return;let vp=page.getViewport({scale:1}),scale=Math.min(1.7,900/vp.width),v=page.getViewport({scale});c.width=v.width;c.height=v.height;c.style.display='block';await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise}catch(e){console.warn('KLS PDF preview',e)}}
function facts(items){let f=$('pdfFacts');if(!f)return;f.innerHTML=items.map(([a,b])=>`<div class="card"><small>${a}</small><strong>${b}</strong></div>`).join('')}
async function analysePDF(file){
 ensureUI();if(!box)return;box.style.display='block';setText('pdfTitle','PDF Understanding','فهم محتوى PDF');setText('pdfConfidence','READING','جاري القراءة');$('pdfConfidence').className='chip warn';setText('pdfSummary','Reading pages, text, dimensions, scale and lighting keywords…','جاري قراءة الصفحات والنصوص والأبعاد والمقياس ومصطلحات الإضاءة…');
 if(!window.pdfjsLib){setText('pdfSummary','PDF engine could not load. Check internet connection and reload.','تعذر تحميل محرك PDF. تحقق من اتصال الإنترنت وأعد تحميل الصفحة.');return}
 try{
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let data=new Uint8Array(await file.arrayBuffer()),doc=await pdfjsLib.getDocument({data}).promise,all=[],lineGroups=[];
  for(let i=1;i<=doc.numPages;i++){
   setText('pdfSummary',`Reading page ${i} of ${doc.numPages}…`,`جاري قراءة الصفحة ${i} من ${doc.numPages}…`);
   let p=await doc.getPage(i);if(i===1)await renderPage(p);let tc=await p.getTextContent();let items=tc.items.map(x=>String(x.str||'').trim()).filter(Boolean);all.push(...items);lineGroups.push(...items);
  }
  let text=all.join('\n'),dims=detectDimensions(text),scale=detectScale(text),domain=detectDomain(text),zones=detectZones(lineGroups),lighting=detectLighting(text),auto=false,confidence='medium';
  if(dims.explicit.w&&dims.explicit.d){$('w').value=dims.explicit.w.toFixed(3);$('d').value=dims.explicit.d.toFixed(3);if(dims.explicit.h)$('h').value=dims.explicit.h.toFixed(3);auto=true;confidence='high'}
  else if(dims.pairs.length){let [w,d]=dims.pairs[0];$('w').value=Math.max(w,d).toFixed(3);$('d').value=Math.min(w,d).toFixed(3);auto=true;confidence='medium'}
  if(domain&&typeof window.setDomain==='function'&&domain.score>=2)window.setDomain(domain.name);
  if(domain&&$('mode')&&domain.score>=2){$('mode').value=domain.name;$('mode').dispatchEvent(new Event('change',{bubbles:true}))}
  let confText=confidence==='high'?msg('HIGH','مرتفعة'):msg('MEDIUM','متوسطة');$('pdfConfidence').textContent=confText;$('pdfConfidence').className='chip '+(confidence==='high'?'good':'warn');
  let dtext=dims.explicit.w&&dims.explicit.d?`${dims.explicit.w.toFixed(2)} × ${dims.explicit.d.toFixed(2)} m`:dims.pairs[0]?`${Math.max(dims.pairs[0][0],dims.pairs[0][1]).toFixed(2)} × ${Math.min(dims.pairs[0][0],dims.pairs[0][1]).toFixed(2)} m`:msg('Not safely detected','لم يتم اكتشافها بثقة');
  facts([[msg('Pages','الصفحات'),doc.numPages],[msg('Text items','العناصر النصية'),all.length],[msg('Domain','المجال'),domain?domain.name:msg('Not certain','غير مؤكد')],[msg('Scale','المقياس'),scale||msg('Not found','غير موجود')],[msg('Dimensions','الأبعاد'),dtext],[msg('Zones','المناطق'),zones.length||msg('None labelled','لا توجد مسميات واضحة')]]);
  let chips=[...zones,...lighting].slice(0,28);$('pdfDetected').innerHTML=chips.length?`<small>${msg('Detected content','المحتوى المكتشف')}</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${chips.map(x=>`<span class="chip">${String(x).replace(/[<>&]/g,'')}</span>`).join('')}</div>`:'';
  $('pdfText').textContent=text.slice(0,30000);setText('pdfTextLabel','Extracted PDF text','النص المستخرج من PDF');setText('pdfPrivacy','PDF analysis runs locally in your browser. The file is not uploaded to a KLS server.','تحليل PDF يتم محليًا داخل متصفحك ولا يتم رفع الملف إلى خادم KLS.');
  let summary=auto?`PDF understood: ${doc.numPages} pages. ${dtext} detected and applied. ${domain?'Likely '+domain.name+'. ':''}${scale?'Scale '+scale+'.':''}`:`PDF read: ${doc.numPages} pages and ${all.length} text items. Real dimensions were not reliable enough to apply automatically.`;
  let summaryAr=auto?`تم فهم PDF: ${doc.numPages} صفحة. تم اكتشاف وتطبيق أبعاد ${dtext}. ${domain?'المجال المرجح: '+domain.name+'. ':''}${scale?'المقياس '+scale+'.':''}`:`تمت قراءة PDF: ${doc.numPages} صفحة و${all.length} عنصر نصي. الأبعاد الحقيقية غير مؤكدة بما يكفي لتطبيقها تلقائيًا.`;
  setText('pdfSummary',summary,summaryAr);
  if($('spaceGeometryState'))$('spaceGeometryState').textContent=auto?msg('PDF dimensions auto-read','تمت قراءة أبعاد PDF تلقائيًا'):msg('PDF text understood / scale review','تم فهم نص PDF / يحتاج مراجعة المقياس');
  if($('spaceConfidence'))$('spaceConfidence').textContent=msg('Confidence: '+confidence,'درجة الثقة: '+(confidence==='high'?'مرتفعة':'متوسطة'));
  if($('smartSpace'))$('smartSpace').textContent=msg(`PDF: ${doc.numPages} pages · ${all.length} text items`,`PDF: ${doc.numPages} صفحة · ${all.length} عنصر نصي`);
  if($('smartDims'))$('smartDims').textContent=auto?msg('Dimensions extracted from PDF and applied','تم استخراج الأبعاد من PDF وتطبيقها'):msg('No safe real-world dimensions found — review scale/reference','لم يتم العثور على أبعاد حقيقية مؤكدة — راجع المقياس أو المرجع');
 }catch(e){console.error(e);setText('pdfConfidence','ERROR','خطأ');setText('pdfSummary','Could not read this PDF. It may be encrypted, scanned-only, or unsupported.','تعذر قراءة ملف PDF. قد يكون مشفرًا أو عبارة عن صور ممسوحة فقط أو غير مدعوم.');}
}
function onFile(ev){let f=ev.target.files&&ev.target.files[0];if(!f)return;let ext=(f.name.split('.').pop()||'').toLowerCase();if(ext==='pdf'||f.type==='application/pdf')analysePDF(f)}
function boot(){ensureUI();let i=$('spaceFileNative');if(i){i.addEventListener('change',onFile);i.addEventListener('input',onFile)} }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();