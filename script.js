const toggle=document.querySelector('.nav-toggle');
const links=document.querySelector('.nav-links');
if(toggle){toggle.addEventListener('click',()=>{const open=links.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>links?.classList.remove('open')));

// Use the user's uploaded portfolio hero image as the primary visual.
const heroImage=document.querySelector('.hero-photo img');
if(heroImage){heroImage.src='assets/hero.jpg';heroImage.alt='Kareem Khaled Eid — selected portfolio work';}

// Turn the selected-work area into a useful portfolio index without adding another page.
const workSection=document.querySelector('#work');
const projectGrid=document.querySelector('.project-grid');
if(workSection && projectGrid){
  const heading=workSection.querySelector('.section-heading');
  const filterBar=document.createElement('div');
  filterBar.className='filter-bar';
  filterBar.setAttribute('aria-label','Filter selected work');
  [['all','All'],['lighting','Lighting'],['scenography','Scenography'],['interior','Interior'],['events','Events']].forEach(([value,label],i)=>{
    const b=document.createElement('button'); b.className='filter'+(i===0?' active':''); b.dataset.filter=value; b.textContent=label; filterBar.appendChild(b);
  });
  heading?.after(filterBar);
  const cards=[...projectGrid.querySelectorAll('.project-card')];
  cards.forEach((card,i)=>{
    const type=(card.querySelector('.project-type')?.textContent||'').toLowerCase();
    const title=(card.querySelector('h3')?.textContent||'').toLowerCase();
    let category='lighting';
    if(type.includes('interior')) category='interior';
    else if(type.includes('scenography')||type.includes('costume')) category='scenography';
    else if(type.includes('event')) category='events';
    card.dataset.category=category;
    card.dataset.index=String(i+1).padStart(2,'0');
    card.setAttribute('tabindex','0');
  });
  filterBar.addEventListener('click',e=>{
    const button=e.target.closest('.filter'); if(!button)return;
    filterBar.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
    button.classList.add('active');
    const value=button.dataset.filter;
    cards.forEach(card=>{card.hidden=value!=='all'&&card.dataset.category!==value;});
  });
}

// Add a concise capabilities section before the career archive.
const experience=document.querySelector('#experience');
if(experience && !document.querySelector('#capabilities')){
  const section=document.createElement('section');
  section.id='capabilities'; section.className='capability-section section-dark';
  section.innerHTML=`<div class="container section"><div class="section-heading reveal"><div><p class="eyebrow">CAPABILITIES</p><h2>What I bring.</h2></div><p>Creative thinking is only half the job. My value is in connecting concept, visual language and real-world execution.</p></div><div class="capability-grid"><article class="capability reveal"><span>01</span><h3>Scenography</h3><p>Decor, costumes, accessories and visual environments for performance.</p></article><article class="capability reveal"><span>02</span><h3>Theatre Lighting</h3><p>Lighting design and implementation for theatrical productions and performance spaces.</p></article><article class="capability reveal"><span>03</span><h3>Exhibition Lighting</h3><p>Atmosphere, artwork hierarchy and visitor-focused illumination for cultural environments.</p></article><article class="capability reveal"><span>04</span><h3>Event Execution</h3><p>Equipment management and practical preparation for live events and productions.</p></article></div></div>`;
  experience.before(section);
}

// Featured exhibition case study: a stronger proof point than a gallery tile alone.
if(experience && !document.querySelector('#exhibition')){
  const section=document.createElement('section');
  section.id='exhibition'; section.className='case-study section-dark';
  section.innerHTML=`<div class="container case-grid"><div class="case-image reveal"><img src="assets/page-11-image-02.jpg" alt="Saad Al-Ubaid exhibition lighting"><span>FEATURED CASE STUDY · 01</span></div><div class="case-copy reveal"><p class="eyebrow">EXHIBITION LIGHTING</p><h2>Saad Al-Ubaid<br><em>Exhibition</em></h2><p class="case-lead">Biography and Career Exhibition</p><p>A focused gallery-lighting project where illumination supports artwork hierarchy and creates a controlled atmosphere for the visitor experience.</p><div class="case-facts"><div><span>DISCIPLINE</span><strong>Exhibition Lighting</strong></div><div><span>CONTEXT</span><strong>Art Exhibition</strong></div><div><span>ROLE</span><strong>Design + Execution</strong></div></div><a class="text-link light-link" href="#contact">Discuss an exhibition project ↗</a></div></div>`;
  const capabilities=document.querySelector('#capabilities');
  (capabilities||experience).after(section);
}

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const year=document.getElementById('year'); if(year)year.textContent=new Date().getFullYear();
