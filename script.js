const toggle=document.querySelector('.nav-toggle');
const links=document.querySelector('.nav-links');
if(toggle&&links){toggle.addEventListener('click',()=>{const open=links.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>links?.classList.remove('open')));

const enhancementStyle=document.createElement('style');
enhancementStyle.textContent=`
.lightbox{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;padding:40px;opacity:0;pointer-events:none;transition:opacity .25s}.lightbox.open{opacity:1;pointer-events:auto}.lightbox img{max-width:min(1200px,92vw);max-height:82vh;width:auto;height:auto;object-fit:contain;box-shadow:0 30px 90px rgba(0,0,0,.6)}.lightbox p{position:absolute;left:40px;bottom:22px;margin:0;color:#bbb;font-size:9px;letter-spacing:.14em;text-transform:uppercase}.lightbox-close{position:absolute;right:25px;top:18px;background:none;border:0;color:#fff;font-size:34px;line-height:1;cursor:pointer}
.selected-grid{display:grid!important}.selected-card{display:block!important}.filter-bar{display:flex!important}.selected-card[hidden]{display:none!important}
.section-heading h2,.archive-group h3,.capability h3,.project-meta h3,.case-copy h2,.about-copy h2,.book-copy h2,.contact h2{font-weight:500}.eyebrow{font-size:10px!important;line-height:1.2!important}.section-heading>p,.archive-group>p,.case-copy>p,.capability p,.about-copy>p,.book-copy>p,.contact-grid>div>p{line-height:1.8}.project-meta h3,.selected-meta h3{font-weight:500}.project-meta p,.selected-meta p{line-height:1.55}.nav-links a,.button,.text-link,.filter{transition:opacity .2s ease,color .2s ease,border-color .2s ease,background .2s ease,transform .2s ease}.portfolio-archive .archive-photo{cursor:zoom-in}
.hero-proof{border-top-color:#333}.hero-proof strong{font-weight:500}.hero-text{max-width:620px}.hero-availability{display:inline-flex;align-items:center;gap:9px;margin-top:22px;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#777}.hero-availability i{width:6px;height:6px;border-radius:50%;background:#c5a36b;display:block;box-shadow:0 0 0 4px rgba(197,163,107,.08)}
.case-study-shell{background:#080808;color:#fff}.case-study-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:70px;align-items:center}.case-study-card{border-top:1px solid #292929;padding:22px 0 0}.case-study-card img{width:100%;height:520px;object-fit:cover;display:block}.case-study-card .case-kicker{margin:18px 0 8px;font-size:9px;letter-spacing:.16em;color:#999;text-transform:uppercase}.case-study-card h3{margin:0;font-size:34px;font-weight:500;letter-spacing:-.03em}.case-study-card p{color:#aaa;line-height:1.8;max-width:620px}.case-study-card .case-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.case-study-card .case-meta span{display:block;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#666;margin-bottom:6px}.case-study-card .case-meta strong{font-size:12px;font-weight:500;color:#ddd}.case-study-intro{max-width:650px;color:#999;line-height:1.85}.case-study-list{display:grid;gap:0;margin-top:28px;border-top:1px solid #292929}.case-study-list div{padding:17px 0;border-bottom:1px solid #222}.case-study-list span{display:block;font-size:8px;letter-spacing:.14em;color:#666;text-transform:uppercase;margin-bottom:5px}.case-study-list strong{font-size:13px;font-weight:500;color:#eee}.case-study-cta{margin-top:30px}.case-study-cta .text-link{color:#fff}.final-cta{background:#c5a36b;color:#080808}.final-cta .eyebrow{color:#4b3b23!important}.final-cta h2{color:#080808}.final-cta p{color:#2f2619;max-width:640px;line-height:1.8}.final-cta .button{margin-top:18px}.cta-links{display:flex;gap:22px;flex-wrap:wrap;margin-top:10px}.cta-links a{color:#080808}.contact-box{border-top:1px solid #292929}.contact-box h2{margin-bottom:18px}.contact-box .button{margin-top:18px}
.section-intro{max-width:680px;color:#888;font-size:13px;line-height:1.85}.archive-note{max-width:700px;line-height:1.8}.capability h3{margin-top:50px}
@media(max-width:800px){.case-study-grid{grid-template-columns:1fr;gap:34px}.case-study-card img{height:380px}.case-study-card .case-meta{grid-template-columns:1fr}.lightbox{padding:18px}.lightbox p{left:18px;bottom:12px;font-size:8px}.hero-availability{margin-top:16px}.section-heading>p{max-width:620px}}
`;
document.head.appendChild(enhancementStyle);

const heroImage=document.querySelector('.hero-photo img');
if(heroImage){heroImage.src='assets/hero.jpg';heroImage.alt='Kareem Khaled Eid — selected portfolio work';heroImage.loading='eager';heroImage.fetchPriority='high';}

const workSection=document.querySelector('#work');
const projectGrid=document.querySelector('.project-grid');
if(workSection&&projectGrid){
  projectGrid.classList.replace('project-grid','selected-grid');
  const cards=[...projectGrid.querySelectorAll('.project-card')];
  cards.forEach((card,i)=>{
    card.classList.remove('project-card','project-feature','project-wide');card.classList.add('selected-card');
    if(i===0)card.classList.add('selected-feature');if(i===3)card.classList.add('selected-wide');
    const image=card.querySelector('.project-image');
    if(image){image.classList.remove('project-image','project-photo');image.classList.add('selected-image');image.querySelector('span')?.classList.add('card-number');image.querySelector('small')?.classList.add('card-tag');}
    const meta=card.querySelector('.project-meta');if(meta)meta.classList.replace('project-meta','selected-meta');
    card.querySelector('.selected-meta b')?.classList.add('card-arrow');
    const type=(card.querySelector('.project-type')?.textContent||'').toLowerCase();
    card.dataset.category=type.includes('interior')?'interior':type.includes('event')?'events':(type.includes('scenography')||type.includes('costume')||type.includes('decor'))?'scenography':'lighting';
  });
  const heading=workSection.querySelector('.section-heading');
  if(heading){
    const bar=document.createElement('div');bar.className='filter-bar';bar.setAttribute('aria-label','Filter selected work');
    [['all','All Work'],['lighting','Lighting'],['scenography','Scenography'],['interior','Interior'],['events','Events']].forEach(([value,label],i)=>{const b=document.createElement('button');b.type='button';b.className='filter'+(i===0?' active':'');b.dataset.filter=value;b.textContent=label;bar.appendChild(b);});
    heading.after(bar);
    bar.addEventListener('click',e=>{const b=e.target.closest('.filter');if(!b)return;bar.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');cards.forEach(c=>c.hidden=b.dataset.filter!=='all'&&c.dataset.category!==b.dataset.filter);});
  }
}

const experience=document.querySelector('#experience');
if(experience&&!document.querySelector('#capabilities')){
  const s=document.createElement('section');s.id='capabilities';s.className='capability-section section-dark';
  s.innerHTML='<div class="container section"><div class="section-heading reveal"><div><p class="eyebrow">CAPABILITIES</p><h2>What I bring.</h2></div><p>Creative thinking is only half the job. My value is connecting concept, visual language and real-world execution across performance, exhibitions and live events.</p></div><div class="capability-grid"><article class="capability reveal"><span>01</span><h3>Scenography</h3><p>Decor, costumes, accessories and visual environments for performance.</p></article><article class="capability reveal"><span>02</span><h3>Theatre Lighting</h3><p>Lighting design and implementation for theatrical productions and performance spaces.</p></article><article class="capability reveal"><span>03</span><h3>Exhibition Lighting</h3><p>Atmosphere, artwork hierarchy and visitor-focused illumination for cultural environments.</p></article><article class="capability reveal"><span>04</span><h3>Event Execution</h3><p>Equipment management and practical preparation for live events and productions.</p></article></div></div>';
  experience.before(s);
}

/* Case studies: turn selected work into evidence of thinking, not just a gallery. */
if(workSection&&!document.querySelector('#case-studies')){
  const s=document.createElement('section');s.id='case-studies';s.className='case-study-shell section';
  s.innerHTML='<div class="container"><div class="section-heading reveal"><div><p class="eyebrow">SELECTED CASE STUDIES</p><h2>How the work comes together.</h2></div><p class="case-study-intro">A closer look at three documented projects. The descriptions stay within the supplied portfolio evidence and focus on the design responsibility visible in the work.</p></div><div class="case-study-grid">'+
  '<article class="case-study-card reveal"><img src="assets/page-11-image-02.jpg" alt="Saad Al-Ubaid exhibition lighting" loading="lazy"><p class="case-kicker">01 · EXHIBITION LIGHTING</p><h3>Saad Al-Ubaid Exhibition</h3><p>Biography and Career Exhibition. The lighting is treated as part of the visitor experience: controlled contrast, visual hierarchy and a focused atmosphere around the exhibited work.</p><div class="case-meta"><div><span>Discipline</span><strong>Exhibition Lighting</strong></div><div><span>Context</span><strong>Art Exhibition</strong></div><div><span>Role</span><strong>Design + Execution</strong></div></div><div class="case-study-cta"><a class="text-link light-link" href="#contact">Discuss an exhibition project ↗</a></div></article>'+
  '<article class="case-study-card reveal"><img src="assets/page-06-image-01.jpg" alt="Circus of the Beast theatrical lighting portfolio image" loading="lazy"><p class="case-kicker">02 · THEATRE LIGHTING</p><h3>Circus of the Beast</h3><p>A theatrical lighting project documented in the portfolio under Lighting Design & Implementation. The design responsibility centers on shaping the stage image through light, contrast and timing.</p><div class="case-meta"><div><span>Discipline</span><strong>Theatre Lighting</strong></div><div><span>Director</span><strong>Maher El-Haggar</strong></div><div><span>Role</span><strong>Lighting Design</strong></div></div><div class="case-study-cta"><a class="text-link light-link" href="#contact">Discuss a theatre project ↗</a></div></article>'+
  '<article class="case-study-card reveal"><img src="assets/page-08-image-01.jpg" alt="Scenography design portfolio image" loading="lazy"><p class="case-kicker">03 · SCENOGRAPHY</p><h3>Samira Moussa</h3><p>A scenography project documented in the portfolio across decor, costumes and lighting. The work demonstrates a cross-disciplinary approach to building a coherent visual world for performance.</p><div class="case-meta"><div><span>Discipline</span><strong>Scenography</strong></div><div><span>Director</span><strong>Maher El-Haggar</strong></div><div><span>Scope</span><strong>Decor · Costumes · Lighting</strong></div></div><div class="case-study-cta"><a class="text-link light-link" href="#contact">Discuss a scenography project ↗</a></div></div></article>'+
  '</div></div>';
  workSection.after(s);
}

const caseStudies=document.querySelector('#case-studies');
const capabilities=document.querySelector('#capabilities');
if(caseStudies&&capabilities)caseStudies.after(capabilities);

/* Stronger conversion layer: a direct invitation for the right client. */
if(!document.querySelector('#project-cta')){
  const c=document.createElement('section');c.id='project-cta';c.className='final-cta section';
  c.innerHTML='<div class="container"><p class="eyebrow">AVAILABLE WORLDWIDE</p><h2>Have a space, stage<br>or exhibition to design?</h2><p>For scenography, theatre lighting, exhibition lighting and cultural or live-event projects, I am available for selected collaborations worldwide.</p><div class="cta-links"><a class="button button-dark" href="mailto:kareemkhaledeid@icloud.com?subject=Project%20Inquiry%20—%20Kareem%20Khaled%20Eid">Start a project conversation ↗</a><a class="text-link" href="https://www.linkedin.com/in/kareem-khaled-3069a6174/" target="_blank" rel="noopener">Connect on LinkedIn ↗</a></div></div>';
  const contact=document.querySelector('#contact');if(contact)contact.before(c);
}

const heroCopy=document.querySelector('.hero-copy');
if(heroCopy){
  let availability=heroCopy.querySelector('.hero-availability');
  if(!availability){availability=document.createElement('div');availability.className='hero-availability';heroCopy.querySelector('.hero-actions')?.after(availability);}
  availability.innerHTML='<i aria-hidden="true"></i><span>Available for projects worldwide</span>';
}

const archiveImages=[...document.querySelectorAll('.archive-photo img')];
if(archiveImages.length&&!document.querySelector('.lightbox')){
  const box=document.createElement('div');box.className='lightbox';box.innerHTML='<button class="lightbox-close" type="button" aria-label="Close image">×</button><img alt=""><p></p>';document.body.appendChild(box);
  const img=box.querySelector('img'),cap=box.querySelector('p');const close=()=>box.classList.remove('open');
  archiveImages.forEach(source=>source.parentElement.addEventListener('click',()=>{img.src=source.currentSrc||source.src;img.alt=source.alt;cap.textContent=source.alt;box.classList.add('open');}));
  box.addEventListener('click',e=>{if(e.target===box)close();});box.querySelector('.lightbox-close').addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
}

document.querySelectorAll('img:not(.hero-photo img)').forEach(img=>{if(!img.loading)img.loading='lazy';img.decoding='async';});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
