(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* Perspective floor behind the hero: lines converging on one vanishing point */
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

  /* Start gantry in the hero */
  const start = $('.start');
  const pods = $$('.start .pod');
  const startText = $('.start__text');
  const lightsOut = () => {
    pods.forEach(p => p.classList.remove('on'));
    if (start) start.classList.add('is-out');
    if (startText) startText.textContent = 'Lights out and away we go';
    const pole = $('.pole');
    if (pole) pole.classList.add('is-lit');
  };
  const heroSequence = () => {
    pods.forEach((p, i) => setTimeout(() => p.classList.add('on'), 500 + i * 650));
    setTimeout(lightsOut, 500 + 5 * 650 + 900);
  };

  /* Loading screen: five red lights and a lap timer; lights out reveals the page.
     Shown once per browser session and skipped for reduced motion. */
  const root = document.documentElement;
  const loader = $('.loader');
  if (loader && root.classList.contains('is-loading')) {
    try { sessionStorage.setItem('sp-lights', '1'); } catch (e) {}
    const lpods = $$('.pod', loader);
    const timeEl = $('.loader__time b', loader);
    const label = $('.loader__label', loader);
    const bar = $('.loader__bar i', loader);
    let raf = 0;
    const tick = () => { timeEl.textContent = (performance.now() / 1000).toFixed(3); raf = requestAnimationFrame(tick); };
    tick();
    const STEP = 260;
    lpods.forEach((p, i) => setTimeout(() => {
      p.classList.add('on');
      bar.style.transform = `scaleX(${(i + 1) / 5})`;
    }, 200 + i * STEP));
    const lightsReady = new Promise(r => setTimeout(r, 200 + 5 * STEP + 350));
    const pageReady = new Promise(r => {
      if (document.readyState === 'complete') r();
      else addEventListener('load', r, { once: true });
      setTimeout(r, 4000);
    });
    Promise.all([lightsReady, pageReady]).then(() => {
      cancelAnimationFrame(raf);
      lpods.forEach(p => p.classList.remove('on'));
      label.textContent = 'Fastest lap';
      loader.classList.add('is-out');
      setTimeout(() => {
        loader.classList.add('is-done');
        root.classList.remove('is-loading');
        lightsOut();
      }, 650);
      setTimeout(() => { loader.hidden = true; }, 1700);
    });
  } else {
    if (loader) loader.hidden = true;
    root.classList.remove('is-loading');
    if (reduce) lightsOut(); else heroSequence();
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

  /* Active section: purple sector in the nav, lap counter on the circuit map */
  const laps = { about: [1, 'About'], work: [2, 'The grid'], method: [3, 'Strategy'], toolkit: [4, 'Setup'], record: [5, 'Podiums'], contact: [6, 'Finish'] };
  const lapEl = $('.circuit__lap');
  const secEl = $('.circuit__sec');
  const links = new Map($$('.nav__links a[data-sec]').map(a => [a.dataset.sec, a]));
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(x => x.classList.remove('is-active'));
      const a = links.get(e.target.id);
      if (a) a.classList.add('is-active');
      const lap = laps[e.target.id];
      if (lap && lapEl) { lapEl.textContent = `Lap ${lap[0]}/6`; secEl.textContent = lap[1]; }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(laps).forEach(id => { const s = document.getElementById(id); if (s) secIO.observe(s); });

  /* Circuit map: the car follows your scroll around the track */
  const circuit = $('.circuit');
  const done = $('.circuit__done');
  const car = $('.circuit__car');
  const trackLen = done ? done.getTotalLength() : 0;
  if (done) { done.style.strokeDasharray = trackLen; done.style.strokeDashoffset = trackLen; }

  /* Lap progress + sticky nav border + circuit */
  const nav = $('.nav');
  const lap = $('.lap');
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    lap.style.setProperty('--p', p.toFixed(4));
    nav.classList.toggle('is-stuck', scrollY > 8);
    if (done) {
      const pt = done.getPointAtLength(p * trackLen);
      car.setAttribute('cx', pt.x.toFixed(2));
      car.setAttribute('cy', pt.y.toFixed(2));
      done.style.strokeDashoffset = (trackLen * (1 - p)).toFixed(2);
      circuit.classList.toggle('is-on', scrollY > innerHeight * 0.55);
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
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

  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
