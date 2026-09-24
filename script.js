(() => {
  'use strict';
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const setMenuOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  if (toggle && links) {
    toggle.addEventListener('click', () => setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        toggle.focus();
      }
    });
  }
  document.querySelectorAll('#year').forEach(el => { el.textContent = new Date().getFullYear(); });
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  // Content is visible by default; motion is a one-time enhancement on entry.
  const initMotion = () => {
    if (!('IntersectionObserver' in window) || !window.matchMedia) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = document.querySelectorAll([
      '.reveal', '.statement-grid > *', '.section-heading', '.capability',
      '.archive-group > h3', '.archive-group > p', '.archive-photo',
      '.gallery-card', '.about-photo', '.project-intro > *',
      '.project-overview', '.project-story > *', '.project-gallery > figure', '.project-end'
    ].join(','));
    const seen = new WeakSet();
    const active = new Set();
    const hero = document.querySelector('.hero-photo');
    const portrait = hero?.querySelector('img');
    let lightPlayed = false;
    const playLight = () => {
      if (!hero || !portrait?.complete || !portrait.naturalWidth || lightPlayed || preference.matches) return;
      const bounds = hero.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || document.hidden) return;
      lightPlayed = true;
      hero.classList.add('light-cue');
    };
    portrait?.addEventListener('load', playLight, { once: true });
    const finish = element => {
      element.classList.remove('motion-enter');
      element.style.removeProperty('--motion-delay');
      active.delete(element);
    };
    document.addEventListener('animationend', event => {
      if (event.animationName === 'portfolio-enter') finish(event.target);
      if (event.animationName === 'portfolio-light') hero?.classList.remove('light-cue');
    });
    // Keyboard navigation should never wait for an entrance animation.
    document.addEventListener('focusin', event => {
      active.forEach(element => {
        if (element.contains(event.target)) finish(element);
      });
    });
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting || preference.matches) return;
        const element = entry.target;
        observer.unobserve(element);
        seen.add(element);
        if (!document.hidden && !element.contains(document.activeElement)) {
          element.style.setProperty('--motion-delay', `${Math.min(order++, 3) * 55}ms`);
          active.add(element);
          element.classList.add('motion-enter');
        }
        if (element.classList.contains('hero-visual')) playLight();
      });
    }, { threshold: 0.08 });
    const updateMotion = () => {
      observer.disconnect();
      active.forEach(finish);
      hero?.classList.remove('light-cue');
      if (!preference.matches) {
        targets.forEach(element => {
          if (!seen.has(element)) observer.observe(element);
        });
      }
    };
    if (preference.addEventListener) preference.addEventListener('change', updateMotion);
    else if (preference.addListener) preference.addListener(updateMotion);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        active.forEach(finish);
        hero?.classList.remove('light-cue');
      }
    });
    updateMotion();
  };
  initMotion();
  // Native links still open the full photograph when dialogs are unavailable.
  const viewer = document.createElement('dialog');
  if (typeof viewer.showModal !== 'function') return;
  viewer.className = 'site-lightbox';
  viewer.setAttribute('aria-label', 'Portfolio image viewer');
  viewer.innerHTML = '<button type="button" aria-label="Close image">Close</button><img alt=""><p></p>';
  document.body.appendChild(viewer);
  const image = viewer.querySelector('img');
  const caption = viewer.querySelector('p');
  let previousFocus;
  document.querySelectorAll('a.image-open').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      previousFocus = link;
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      caption.textContent = image.alt;
      viewer.showModal();
    });
  });
  viewer.querySelector('button').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    image.removeAttribute('src');
    previousFocus?.focus();
  });
})();
