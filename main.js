(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* Renaissance perspective floor: lines converging on one vanishing point */
  const grid = $('.floor__grid');
  if (grid) {
    const NS = 'http://www.w3.org/2000/svg';
    const vx = 720, h = 470, W = 1440, H = 900;
    const line = (x1, y1, x2, y2) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      grid.appendChild(l);
    };
    for (let x = -1760; x <= W + 1760; x += 160) line(vx, h, x, H);
    for (let k = 1; k <= 13; k++) {
      const y = h + (H - h) * Math.pow(k / 13, 2.1);
      line(0, y, W, y);
    }
  }

  /* Five red lights, then lights out */
  const start = $('.start');
  const lights = $$('.lights i');
  if (start && lights.length) {
    if (reduce) {
      start.classList.add('is-out');
    } else {
      lights.forEach((l, i) => setTimeout(() => l.classList.add('on'), 350 + i * 380));
      setTimeout(() => {
        lights.forEach(l => l.classList.remove('on'));
        start.classList.add('is-out');
        $('.start__text').textContent = 'Lights out · Portfolio 2026';
      }, 350 + 5 * 380 + 700);
    }
  }

  /* Reveal on scroll */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        revealIO.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-reveal]').forEach(el => revealIO.observe(el));

  /* Active section = purple sector in the nav */
  const links = new Map($$('.nav__links a[data-sec]').map(a => [a.dataset.sec, a]));
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const a = links.get(e.target.id);
      if (!a) return;
      if (e.isIntersecting) {
        links.forEach(x => x.classList.remove('is-active'));
        a.classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) secIO.observe(s); });

  /* Lap progress + sticky nav border */
  const nav = $('.nav');
  const lap = $('.lap');
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    lap.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    nav.classList.toggle('is-stuck', scrollY > 8);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Mobile menu */
  const toggle = $('.nav__toggle');
  const menu = $('#nav-links');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* The Ambassadors: change your angle to see the skull */
  const angleBtn = $('.angle-btn');
  if (angleBtn) {
    const frame = angleBtn.closest('.frame');
    const note = $('.angle-note', frame);
    angleBtn.addEventListener('click', () => {
      const on = angleBtn.getAttribute('aria-pressed') !== 'true';
      angleBtn.setAttribute('aria-pressed', String(on));
      frame.classList.toggle('is-angled', on);
      note.textContent = on ? 'From the side, the skull resolves and the ambassadors distort.' : '';
    });
  }

  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
