(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const legacy = new Set(['#archive-decor', '#archive-set', '#archive-lighting', '#archive-scenography', '#archive-events', '#archive-film', '#archive-exhibition']);
  const followLegacyAnchor = () => {
    if (document.body.dataset.page !== 'home' || !legacy.has(location.hash)) return false;
    location.replace(`archive.html${location.hash}`);
    return true;
  };
  if (followLegacyAnchor()) return;
  window.addEventListener('hashchange', followLegacyAnchor);

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    const setMenu = open => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', event => {
      if (!event.target.closest('.nav')) setMenu(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    window.addEventListener('pageshow', () => setMenu(false));
    const desktop = window.matchMedia?.('(min-width: 841px)');
    desktop?.addEventListener?.('change', () => setMenu(false));
  }
  document.querySelectorAll('#year').forEach(node => { node.textContent = new Date().getFullYear(); });

  // Every section remains visible if motion APIs or JavaScript are unavailable.
  if ('IntersectionObserver' in window && window.matchMedia) {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = document.querySelectorAll('.reveal');
    const seen = new WeakSet();
    const active = new Set();
    const finish = element => {
      element.classList.remove('motion-enter');
      element.style.removeProperty('--motion-delay');
      active.delete(element);
    };
    const observer = new IntersectionObserver(entries => {
      let sequence = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting || preference.matches) continue;
        const element = entry.target;
        observer.unobserve(element);
        seen.add(element);
        if (!document.hidden && !element.contains(document.activeElement)) {
          element.style.setProperty('--motion-delay', `${Math.min(sequence++, 2) * 50}ms`);
          active.add(element);
          element.classList.add('motion-enter');
        }
      }
    }, { threshold: 0.06 });
    const update = () => {
      observer.disconnect();
      active.forEach(finish);
      if (!preference.matches) targets.forEach(element => { if (!seen.has(element)) observer.observe(element); });
    };
    document.addEventListener('animationend', event => { if (event.animationName === 'portfolio-enter') finish(event.target); });
    document.addEventListener('focusin', event => active.forEach(element => { if (element.contains(event.target)) finish(element); }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) active.forEach(finish); });
    preference.addEventListener?.('change', update);
    update();
  }

  // Native image links remain the fallback when dialog support is absent.
  const viewer = document.createElement('dialog');
  if (typeof viewer.showModal !== 'function') return;
  const imageLinks = [...document.querySelectorAll('a.image-open')];
  if (!imageLinks.length) return;
  viewer.className = 'site-lightbox';
  viewer.setAttribute('aria-label', 'Portfolio image viewer');
  viewer.innerHTML = '<div class="viewer-toolbar"><button class="viewer-prev" type="button" aria-label="Previous image">←</button><button class="viewer-next" type="button" aria-label="Next image">→</button><span class="viewer-status" aria-live="polite"></span><a class="viewer-original" target="_blank" rel="noopener">Original ↗</a><button class="viewer-close" type="button" autofocus aria-label="Close image">Close ×</button></div><img alt=""><p></p>';
  document.body.appendChild(viewer);
  const img = viewer.querySelector('img');
  const caption = viewer.querySelector('p');
  const previous = viewer.querySelector('.viewer-prev');
  const next = viewer.querySelector('.viewer-next');
  const status = viewer.querySelector('.viewer-status');
  const original = viewer.querySelector('.viewer-original');
  let group = [];
  let position = 0;
  let previousFocus;
  const showImage = index => {
    position = index;
    const link = group[index];
    const alt = link.querySelector('img')?.alt || '';
    img.src = link.href;
    img.alt = alt;
    caption.textContent = link.dataset.caption || alt;
    original.href = link.href;
    original.setAttribute('aria-label', `Open original: ${caption.textContent}`);
    status.textContent = `${index + 1} / ${group.length}`;
    previous.disabled = index === 0;
    next.disabled = index === group.length - 1;
  };
  imageLinks.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    previousFocus = link;
    group = imageLinks.filter(candidate => candidate.dataset.gallery === link.dataset.gallery);
    showImage(group.indexOf(link));
    viewer.showModal();
    document.body.classList.add('viewer-open');
  }));
  previous.addEventListener('click', () => { if (position > 0) showImage(position - 1); });
  next.addEventListener('click', () => { if (position < group.length - 1) showImage(position + 1); });
  viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && position > 0) { event.preventDefault(); showImage(position - 1); }
    if (event.key === 'ArrowRight' && position < group.length - 1) { event.preventDefault(); showImage(position + 1); }
  });
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    img.removeAttribute('src');
    previousFocus?.focus({ preventScroll: true });
  });
})();
