const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => links?.classList.remove('open'))
);

const enhancementStyle = document.createElement('style');
enhancementStyle.textContent = `
.lightbox{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;padding:40px;opacity:0;pointer-events:none;transition:opacity .25s}.lightbox.open{opacity:1;pointer-events:auto}.lightbox img{max-width:min(1200px,92vw);max-height:82vh;width:auto;height:auto;object-fit:contain;box-shadow:0 30px 90px rgba(0,0,0,.6)}.lightbox p{position:absolute;left:40px;bottom:22px;margin:0;color:#bbb;font-size:9px;letter-spacing:.14em;text-transform:uppercase}.lightbox-close{position:absolute;right:25px;top:18px;background:none;border:0;color:#fff;font-size:34px;line-height:1;cursor:pointer}
.selected-grid{display:grid!important}.selected-card{display:block!important}.selected-card[hidden]{display:none!important}.filter-bar{display:flex!important;gap:10px;flex-wrap:wrap;margin:26px 0}.filter{background:transparent;border:1px solid #333;color:#888;padding:9px 13px;font:inherit;font-size:9px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}.filter.active,.filter:hover{color:#f3f1ec;border-color:#777}.selected-meta h3,.project-meta h3{font-weight:500}.selected-meta p,.project-meta p{line-height:1.55}.section-heading>p,.archive-group>p,.capability p,.about-copy>p,.book-copy>p,.contact-grid>div>p{line-height:1.8}.hero-text{max-width:620px}.hero-availability{display:inline-flex;align-items:center;gap:9px;margin-top:22px;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#777}.hero-availability i{width:6px;height:6px;border-radius:50%;background:#c5a36b;display:block;box-shadow:0 0 0 4px rgba(197,163,107,.08)}
.case-study-shell{background:#080808;color:#fff}.case-study-grid{display:grid;grid-template-columns:1fr;gap:70px}.case-study-card{border-top:1px solid #292929;padding:22px 0 0}.case-study-card img{width:100%;height:520px;object-fit:cover;display:block}.case-study-card .case-kicker{margin:18px 0 8px;font-size:9px;letter-spacing:.16em;color:#999;text-transform:uppercase}.case-study-card h3{margin:0;font-size:34px;font-weight:500;letter-spacing:-.03em}.case-study-card p{color:#aaa;line-height:1.8;max-width:700px}.case-study-card .case-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.case-study-card .case-meta span{display:block;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#666;margin-bottom:6px}.case-study-card .case-meta strong{font-size:12px;font-weight:500;color:#ddd}.case-study-intro{max-width:650px;color:#999;line-height:1.85}.case-study-cta{margin-top:30px}.case-study-cta .text-link{color:#fff}.final-cta{background:#080808!important;color:#f3f1ec!important;border-top:1px solid #292929}.final-cta .eyebrow{color:#888!important}.final-cta h2{color:#f3f1ec!important}.final-cta p{color:#999;max-width:640px;line-height:1.8}.cta-links{display:flex;gap:22px;flex-wrap:wrap;margin-top:10px}.final-cta .cta-links a{color:#f3f1ec}.final-cta .button-dark{border:1px solid #555;background:#f3f1ec;color:#080808!important}.capability h3{margin-top:50px}
.visual-language-clean{position:relative!important;background:#080808!important;background-image:none!important;color:#f3f1ec!important;overflow:hidden!important}.visual-language-clean::before,.visual-language-clean::after{display:none!important}.visual-language-clean img,.visual-language-clean picture,.visual-language-clean .gallery-card,.visual-language-clean [class*="gallery"],.visual-language-clean [style*="background-image"]{background-image:none!important;background:none!important}.visual-language-clean img,.visual-language-clean picture{display:none!important}.visual-language-clean .visual-language-list,.visual-language-clean .visual-language-items{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:0!important;margin-top:46px!important;border-top:1px solid #292929!important}.visual-language-clean .visual-language-list>*,.visual-language-clean .visual-language-items>*{display:flex!important;align-items:flex-end!important;min-height:82px!important;padding:18px 18px 18px 0!important;border-bottom:1px solid #292929!important;border-right:1px solid #292929!important;background:transparent!important;color:#eee!important;font-size:10px!important;letter-spacing:.16em!important;text-transform:uppercase!important;transition:color .2s ease,transform .2s ease!important}.visual-language-clean .visual-language-list>*:hover,.visual-language-clean .visual-language-items>*:hover{color:#c5a36b!important;transform:translateY(-2px)!important}
@media(max-width:800px){.case-study-card img{height:380px}.lightbox{padding:18px}.lightbox p{left:18px;bottom:12px;font-size:8px}.hero-availability{margin-top:16px}.visual-language-clean .visual-language-list,.visual-language-clean .visual-language-items{grid-template-columns:1fr 1fr!important}}
@media(max-width:560px){.visual-language-clean .visual-language-list,.visual-language-clean .visual-language-items{grid-template-columns:1fr!important}.visual-language-clean .visual-language-list>*,.visual-language-clean .visual-language-items>*{min-height:58px!important}.case-study-card .case-meta{grid-template-columns:1fr}}
`;
document.head.appendChild(enhancementStyle);

/* Keep the hero image defined by index.html. No runtime asset swap. */
const heroImage = document.querySelector('.hero-photo img');
if (heroImage) {
  heroImage.alt = 'Kareem Khaled Eid — selected portfolio work';
  heroImage.loading = 'eager';
  heroImage.fetchPriority = 'high';
}

/* Selected work filters */
const workSection = document.querySelector('#work');
const projectGrid = document.querySelector('.project-grid');
if (workSection && projectGrid) {
  projectGrid.classList.replace('project-grid','selected-grid');
  const cards = [...projectGrid.querySelectorAll('.project-card')];
  cards.forEach((card,i) => {
    card.classList.remove('project-card','project-feature','project-wide');
    card.classList.add('selected-card');
    if (i===0) card.classList.add('selected-feature');
    if (i===3) card.classList.add('selected-wide');
    const image = card.querySelector('.project-image');
    if (image) image.classList.add('selected-image');
    const meta = card.querySelector('.project-meta');
    if (meta) meta.classList.add('selected-meta');
    const type = (card.querySelector('.project-type')?.textContent || '').toLowerCase();
    card.dataset.category = type.includes('interior') ? 'interior' : type.includes('event') ? 'events' : (type.includes('scenography') || type.includes('costume') || type.includes('decor')) ? 'scenography' : 'lighting';
  });
  const heading = workSection.querySelector('.section-heading');
  if (heading && !workSection.querySelector('.filter-bar')) {
    const bar = document.createElement('div');
    bar.className = 'filter-bar';
    bar.setAttribute('aria-label','Filter selected work');
    [['all','All Work'],['lighting','Lighting'],['scenography','Scenography'],['interior','Interior'],['events','Events']].forEach(([value,label],i)=>{
      const b=document.createElement('button');
      b.type='button'; b.className='filter'+(i===0?' active':''); b.dataset.filter=value; b.textContent=label; bar.appendChild(b);
    });
    heading.after(bar);
    bar.addEventListener('click',e=>{
      const b=e.target.closest('.filter'); if(!b) return;
      bar.querySelectorAll('.filter').forEach(x=>x.classList.remove('active')); b.classList.add('active');
      cards.forEach(c=>{c.hidden=b.dataset.filter!=='all' && c.dataset.category!==b.dataset.filter;});
    });
  }
}

/* Hero availability */
const heroCopy = document.querySelector('.hero-copy');
if (heroCopy) {
  let availability = heroCopy.querySelector('.hero-availability');
  if (!availability) {
    availability = document.createElement('div');
    availability.className='hero-availability';
    heroCopy.querySelector('.hero-actions')?.after(availability);
  }
  availability.innerHTML='<i aria-hidden="true"></i><span>Available for projects worldwide</span>';
}

/* Capabilities */
const experience = document.querySelector('#experience');
if (experience && !document.querySelector('#capabilities')) {
  const s=document.createElement('section'); s.id='capabilities'; s.className='capability-section section-dark';
  s.innerHTML='<div class="container section"><div class="section-heading reveal"><div><p class="eyebrow">CAPABILITIES</p><h2>What I bring.</h2></div><p>Creative thinking is only half the job. My value is connecting concept, visual language and real-world execution across performance, exhibitions and live events.</p></div><div class="capability-grid"><article class="capability reveal"><span>01</span><h3>Scenography</h3><p>Decor, costumes, accessories and visual environments for performance.</p></article><article class="capability reveal"><span>02</span><h3>Theatre Lighting</h3><p>Lighting design and implementation for theatrical productions and performance spaces.</p></article><article class="capability reveal"><span>03</span><h3>Exhibition Lighting</h3><p>Atmosphere, artwork hierarchy and visitor-focused illumination for cultural environments.</p></article><article class="capability reveal"><span>04</span><h3>Event Execution</h3><p>Equipment management and practical preparation for live events and productions.</p></article></div></div>';
  experience.before(s);
}

/* Selected case studies */
if (workSection && !document.querySelector('#case-studies')) {
  const s=document.createElement('section'); s.id='case-studies'; s.className='case-study-shell section';
  s.innerHTML='<div class="container"><div class="section-heading reveal"><div><p class="eyebrow">SELECTED CASE STUDIES</p><h2>How the work comes together.</h2></div><p class="case-study-intro">A closer look at three documented projects, based on the supplied portfolio.</p></div><div class="case-study-grid">'+
  '<article class="case-study-card reveal"><img src="assets/page-11-image-02.jpg" alt="Saad Al-Ubaid exhibition lighting" loading="lazy"><p class="case-kicker">01 · EXHIBITION LIGHTING</p><h3>Saad Al-Ubaid Exhibition</h3><p>Biography and Career Exhibition. The lighting is treated as part of the visitor experience, with controlled contrast, visual hierarchy and a focused atmosphere around the exhibited work.</p><div class="case-meta"><div><span>Discipline</span><strong>Exhibition Lighting</strong></div><div><span>Context</span><strong>Art Exhibition</strong></div><div><span>Role</span><strong>Design + Execution</strong></div></div><div class="case-study-cta"><a class="text-link" href="#contact">Discuss an exhibition project ↗</a></div></article>'+
  '<article class="case-study-card reveal"><img src="assets/page-06-image-01.jpg" alt="Circus of the Beast theatrical lighting portfolio image" loading="lazy"><p class="case-kicker">02 · THEATRE LIGHTING</p><h3>Circus of the Beast</h3><p>A theatrical lighting project documented in the portfolio under Lighting Design & Implementation, centered on shaping the stage image through light, contrast and timing.</p><div class="case-meta"><div><span>Discipline</span><strong>Theatre Lighting</strong></div><div><span>Director</span><strong>Maher El-Haggar</strong></div><div><span>Role</span><strong>Lighting Design</strong></div></div><div class="case-study-cta"><a class="text-link" href="#contact">Discuss a theatre project ↗</a></div></article>'+
  '<article class="case-study-card reveal"><img src="assets/page-08-image-01.jpg" alt="Scenography design portfolio image" loading="lazy"><p class="case-kicker">03 · SCENOGRAPHY</p><h3>Samira Moussa</h3><p>A scenography project documented in the portfolio across decor, costumes and lighting, demonstrating a cross-disciplinary approach to building a coherent visual world for performance.</p><div class="case-meta"><div><span>Discipline</span><strong>Scenography</strong></div><div><span>Director</span><strong>Maher El-Haggar</strong></div><div><span>Scope</span><strong>Decor · Costumes · Lighting</strong></div></div><div class="case-study-cta"><a class="text-link" href="#contact">Discuss a scenography project ↗</a></div></article>'+ '</div></div>';
  workSection.after(s);
}

const caseStudies=document.querySelector('#case-studies');
const capabilities=document.querySelector('#capabilities');
if(caseStudies && capabilities) caseStudies.after(capabilities);

/* Worldwide CTA: black/ivory visual system, not gold. */
if (!document.querySelector('#project-cta')) {
  const c=document.createElement('section'); c.id='project-cta'; c.className='final-cta section';
  c.innerHTML='<div class="container"><p class="eyebrow">AVAILABLE WORLDWIDE</p><h2>Have a space, stage<br>or exhibition to design?</h2><p>For scenography, theatre lighting, exhibition lighting and cultural or live-event projects, I am available for selected collaborations worldwide.</p><div class="cta-links"><a class="button button-dark" href="mailto:kareemkhaledeid@icloud.com?subject=Project%20Inquiry%20—%20Kareem%20Khaled%20Eid">Start a project conversation ↗</a><a class="text-link" href="https://www.linkedin.com/in/kareem-khaled-3069a6174/" target="_blank" rel="noopener">Connect on LinkedIn ↗</a></div></div>';
  const contact=document.querySelector('#contact'); if(contact) contact.before(c);
}

/* Visual Language: typography only, no photographic background bands. */
const visualLanguage=[...document.querySelectorAll('section,div')].find(el=>{
  const t=(el.textContent||'').replace(/\s+/g,' ').trim();
  return t.includes('VISUAL LANGUAGE') && t.includes('From stage light') && t.includes('THEATRE') && t.includes('EXHIBITIONS');
});
if (visualLanguage) {
  visualLanguage.classList.add('visual-language-clean');
  visualLanguage.querySelectorAll('img,picture,.gallery-card,[class*="gallery"],[style*="background-image"]').forEach(el=>{
    el.style.setProperty('background-image','none','important');
    if(el.tagName==='IMG'||el.tagName==='PICTURE') el.style.setProperty('display','none','important');
  });
}

/* Portfolio image lightbox */
const lightbox=document.createElement('div');
lightbox.className='lightbox';
lightbox.innerHTML='<button class="lightbox-close" aria-label="Close image">×</button><img alt=""><p></p>';
document.body.appendChild(lightbox);
const lbImg=lightbox.querySelector('img');
const lbText=lightbox.querySelector('p');
const closeLightbox=()=>lightbox.classList.remove('open');
document.querySelectorAll('.portfolio-archive .archive-photo img').forEach(img=>img.addEventListener('click',()=>{
  lbImg.src=img.currentSrc||img.src; lbImg.alt=img.alt; lbText.textContent=img.alt; lightbox.classList.add('open');
}));
lightbox.addEventListener('click',e=>{if(e.target===lightbox) closeLightbox();});
lightbox.querySelector('.lightbox-close').addEventListener('click',closeLightbox);
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeLightbox();});

if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('reduce-motion');}
