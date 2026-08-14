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
