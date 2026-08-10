const toggle=document.querySelector('.nav-toggle');
const links=document.querySelector('.nav-links');
if(toggle&&links){toggle.addEventListener('click',()=>{const open=links.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>links?.classList.remove('open')));

const enhancementStyle=document.createElement('style');
enhancementStyle.textContent='.lightbox{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;padding:40px;opacity:0;pointer-events:none;transition:opacity .25s}.lightbox.open{opacity:1;pointer-events:auto}.lightbox img{max-width:min(1100px,92vw);max-height:82vh;width:auto;height:auto;object-fit:contain;box-shadow:0 30px 90px rgba(0,0,0,.6)}.lightbox p{position:absolute;left:40px;bottom:22px;margin:0;color:#bbb;font-size:9px;letter-spacing:.14em;text-transform:uppercase}.lightbox-close{position:absolute;right:25px;top:18px;background:none;border:0;color:#fff;font-size:34px;line-height:1;cursor:pointer}.selected-card[hidden]{display:none}@media(max-width:700px){.lightbox{padding:18px}.lightbox p{left:18px;bottom:12px;font-size:8px}}';
document.head.appendChild(enhancementStyle);

// Use the user's uploaded image as the hero visual.
const heroImage=document.querySelector('.hero-photo img');
if(heroImage){heroImage.src='assets/hero.jpg';heroImage.alt='Kareem Khaled Eid — selected portfolio work';heroImage.loading='eager';heroImage.fetchPriority='high';}

// Upgrade the six selected-work cards to the editorial portfolio layout.
const workSection=document.querySelector('#work');
const projectGrid=document.querySelector('.project-grid');
if(workSection&&projectGrid){
  projectGrid.classList.replace('project-grid','selected-grid');
  const cards=[...projectGrid.querySelectorAll('.project-card')];
  cards.forEach((card,i)=>{
    card.classList.remove('project-card','project-feature','project-wide');
    card.classList.add('selected-card');
    if(i===0)card.classList.add('selected-feature');
    if(i===3)card.classList.add('selected-wide');
    const image=card.querySelector('.project-image');
    if(image){image.classList.remove('project-image','project-photo');image.classList.add('selected-image');image.querySelector('span')?.classList.add('card-number');image.querySelector('small')?.classList.add('card-tag');}
    const meta=card.querySelector('.project-meta');
    if(meta)meta.classList.replace('project-meta','selected-meta');
    card.querySelector('.selected-meta b')?.classList.add('card-arrow');
    const type=(card.querySelector('.project-type')?.textContent||'').toLowerCase();
    card.dataset.category=type.includes('interior')?'interior':type.includes('event')?'events':(type.includes('scenography')||type.includes('costume')||type.includes('decor'))?'scenography':'lighting';
  });
  const heading=workSection.querySelector('.section-heading');
  if(heading){
    const bar=document.createElement('div');bar.className='filter-bar';bar.setAttribute('aria-label','Filter selected work');
    [['all','All'],['lighting','Lighting'],['scenography','Scenography'],['interior','Interior'],['events','Events']].forEach(([value,label],i)=>{const b=document.createElement('button');b.type='button';b.className='filter'+(i===0?' active':'');b.dataset.filter=value;b.textContent=label;bar.appendChild(b);});
    heading.after(bar);
    bar.addEventListener('click',e=>{const b=e.target.closest('.filter');if(!b)return;bar.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');cards.forEach(c=>c.hidden=b.dataset.filter!=='all'&&c.dataset.category!==b.dataset.filter);});
  }
}

// Add the capability section for a clearer professional positioning.
const experience=document.querySelector('#experience');
if(experience&&!document.querySelector('#capabilities')){
  const s=document.createElement('section');s.id='capabilities';s.className='capability-section section-dark';
  s.innerHTML='<div class="container section"><div class="section-heading reveal"><div><p class="eyebrow">CAPABILITIES</p><h2>What I bring.</h2></div><p>Creative thinking is only half the job. My value is connecting concept, visual language and real-world execution.</p></div><div class="capability-grid"><article class="capability reveal"><span>01</span><h3>Scenography</h3><p>Decor, costumes, accessories and visual environments for performance.</p></article><article class="capability reveal"><span>02</span><h3>Theatre Lighting</h3><p>Lighting design and implementation for theatrical productions and performance spaces.</p></article><article class="capability reveal"><span>03</span><h3>Exhibition Lighting</h3><p>Atmosphere, artwork hierarchy and visitor-focused illumination for cultural environments.</p></article><article class="capability reveal"><span>04</span><h3>Event Execution</h3><p>Equipment management and practical preparation for live events and productions.</p></article></div></div>';
  experience.before(s);
}

// Featured real-world case study.
if(experience&&!document.querySelector('#exhibition')){
  const s=document.createElement('section');s.id='exhibition';s.className='case-study section-dark';
  s.innerHTML='<div class="container case-grid"><div class="case-image reveal"><img src="assets/page-11-image-02.jpg" alt="Saad Al-Ubaid exhibition lighting" loading="lazy"><span>FEATURED CASE STUDY · 01</span></div><div class="case-copy reveal"><p class="eyebrow">EXHIBITION LIGHTING</p><h2>Saad Al-Ubaid<br><em>Exhibition</em></h2><p class="case-lead">Biography and Career Exhibition</p><p>A focused gallery-lighting project where illumination supports artwork hierarchy and creates a controlled atmosphere for the visitor experience.</p><div class="case-facts"><div><span>DISCIPLINE</span><strong>Exhibition Lighting</strong></div><div><span>CONTEXT</span><strong>Art Exhibition</strong></div><div><span>ROLE</span><strong>Design + Execution</strong></div></div><a class="text-link light-link" href="#contact">Discuss an exhibition project ↗</a></div></div>';
  (document.querySelector('#capabilities')||experience).after(s);
}

// Editorial lightbox for the portfolio archive.
const archiveImages=[...document.querySelectorAll('.archive-photo img')];
if(archiveImages.length&&!document.querySelector('.lightbox')){
  const box=document.createElement('div');box.className='lightbox';box.innerHTML='<button class="lightbox-close" type="button" aria-label="Close image">×</button><img alt=""><p></p>';document.body.appendChild(box);
  const img=box.querySelector('img'),cap=box.querySelector('p');
  const close=()=>box.classList.remove('open');
  archiveImages.forEach(source=>source.parentElement.addEventListener('click',()=>{img.src=source.currentSrc||source.src;img.alt=source.alt;cap.textContent=source.alt;box.classList.add('open');}));
  box.addEventListener('click',e=>{if(e.target===box)close();});box.querySelector('.lightbox-close').addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
}

document.querySelectorAll('img:not(.hero-photo img)').forEach(img=>{if(!img.loading)img.loading='lazy';img.decoding='async';});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
