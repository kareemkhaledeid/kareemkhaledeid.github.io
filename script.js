(() => {
  'use strict';

  // Mobile navigation
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // Reveal existing content only. Do not move, hide, replace, or rebuild page sections.
  const reveal = () => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
  else reveal();

  // Keep the hero image controlled by index.html.
  const hero = document.querySelector('.hero-photo img');
  if (hero) {
    hero.alt = hero.alt || 'Kareem Khaled Eid — selected portfolio work';
    hero.loading = 'eager';
    hero.fetchPriority = 'high';
  }

  // Visual Language: intentionally text-only. The previous background-image treatment
  // created four horizontal image strips and caused visual overlap with the labels.
  const gallery = document.querySelector('.gallery');
  if (gallery) {
    const style = document.createElement('style');
    style.textContent = `
      .gallery { border-top: 1px solid #282828; }
      .gallery-head { max-width: 900px; margin-bottom: 55px; }
      .gallery-head h2 { font-size: clamp(52px, 7vw, 88px); line-height: .9; letter-spacing: -.075em; margin: 0 0 25px; }
      .gallery-head h2 em { font-family: Georgia, serif; font-weight: 400; color: #aaa; }
      .gallery-head > p:last-child { max-width: 700px; color: #85827c; font-size: 15px; line-height: 1.8; margin: 0; }
      .gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #292929; border-bottom: 1px solid #292929; }
      .gallery-card,
      .gallery-card.g1,
      .gallery-card.g2,
      .gallery-card.g3,
      .gallery-card.g4 { 
        min-height: 170px; 
        height: auto; 
        display: flex; 
        align-items: flex-end; 
        padding: 28px 24px; 
        background-image: none !important; 
        background: #080808 !important; 
        border-right: 1px solid #292929; 
        position: relative; 
        overflow: hidden; 
      }
      .gallery-card:last-child { border-right: 0; }
      .gallery-card:before { content: ''; position: absolute; left: 24px; top: 28px; width: 28px; height: 1px; background: #c5a36b; opacity: .8; }
      .gallery-card span { position: relative; z-index: 1; font-size: 18px; font-weight: 500; letter-spacing: .02em; color: #eee; }
      .gallery-card:hover { background: #101010 !important; }
      .gallery-card:hover span { color: #c5a36b; transform: translateX(3px); transition: .25s ease; }
      @media (max-width: 800px) {
        .gallery-grid { grid-template-columns: 1fr 1fr; }
        .gallery-card:nth-child(2) { border-right: 0; }
        .gallery-card { border-bottom: 1px solid #292929; }
        .gallery-card:nth-child(3), .gallery-card:nth-child(4) { border-bottom: 0; }
      }
      @media (max-width: 560px) {
        .gallery-grid { grid-template-columns: 1fr; }
        .gallery-card, .gallery-card.g1, .gallery-card.g2, .gallery-card.g3, .gallery-card.g4 { min-height: 115px; border-right: 0; border-bottom: 1px solid #292929; }
        .gallery-card:last-child { border-bottom: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Lightweight archive image viewer. It does not alter the page layout.
  const box = document.createElement('div');
  box.className = 'site-lightbox';
  box.innerHTML = '<button type="button" aria-label="Close image">×</button><img alt="">';
  Object.assign(box.style, {
    position:'fixed', inset:'0', zIndex:'1000', background:'rgba(0,0,0,.96)',
    display:'none', alignItems:'center', justifyContent:'center', padding:'24px'
  });
  const close = box.querySelector('button');
  const image = box.querySelector('img');
  Object.assign(close.style, {
    position:'absolute', right:'24px', top:'12px', background:'none',
    border:'0', color:'#fff', fontSize:'36px', cursor:'pointer'
  });
  Object.assign(image.style, {maxWidth:'92vw', maxHeight:'88vh', objectFit:'contain'});
  document.body.appendChild(box);

  const hide = () => {
    box.style.display = 'none';
    image.removeAttribute('src');
  };

  document.querySelectorAll('.portfolio-archive .archive-photo img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      image.src = img.currentSrc || img.src;
      image.alt = img.alt || '';
      box.style.display = 'flex';
    });
  });

  close.addEventListener('click', hide);
  box.addEventListener('click', e => { if (e.target === box) hide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
})();
