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
  const tower = $('.tower');
  const towerIn = () => { if (tower) tower.classList.add('is-live'); }; // rows arrive like a TV graphic
  const lightsOut = () => {
    towerIn();
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
    /* The clock runs live until the browser reports the page fully loaded, then
       stops on that real load time (Navigation Timing). The lights keep their own
       rhythm, and lights out comes once both are done. */
    let raf = 0;
    let stopped = false;
    const show = (ms) => { timeEl.textContent = (ms / 1000).toFixed(3); };
    const tick = () => { if (stopped) return; show(performance.now()); raf = requestAnimationFrame(tick); };
    tick();
    /* Sector colours, as on F1 timing screens: purple for a fast load,
       green when it takes a little longer, yellow when it is slow. */
    const sector = (ms) => (ms <= 1000 ? 'purple' : ms <= 2500 ? 'green' : 'yellow');
    const stopClock = (ms) => {
      stopped = true; cancelAnimationFrame(raf); show(ms);
      loader.dataset.sector = sector(ms);
    };
    const loadTime = () => {
      const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
      if (nav && nav.loadEventStart > 0) return nav.loadEventStart;
      const t = performance.timing;
      if (t && t.loadEventStart > 0) return t.loadEventStart - t.navigationStart;
      return performance.now();
    };
    const STEP = 260;
    lpods.forEach((p, i) => setTimeout(() => {
      p.classList.add('on');
      bar.style.transform = 'scaleX(' + (i + 1) / 5 + ')';
    }, 200 + i * STEP));
    const lightsReady = new Promise(r => setTimeout(r, 200 + 5 * STEP + 350));
    const pageReady = new Promise(r => {
      const loaded = () => { stopClock(loadTime()); label.textContent = 'Page loaded in'; r(); };
      if (document.readyState === 'complete') loaded();
      else addEventListener('load', () => setTimeout(loaded, 0), { once: true });
      setTimeout(r, 4000); // slow connection: stop waiting, never block the page
    });
    Promise.all([lightsReady, pageReady]).then(() => {
      if (!stopped) { stopClock(performance.now()); loader.dataset.sector = 'yellow'; label.textContent = 'Still loading after'; }
      lpods.forEach(p => p.classList.remove('on'));
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
    if (reduce) lightsOut(); else { setTimeout(towerIn, 350); heroSequence(); }
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

  /* Steering-wheel display: scroll speed as km/h, a gear, and DRS when you really go for it */
  const hud = $('.hud');
  if (hud && circuit) {
    const speedEl = $('.hud__speed b', hud);
    const gearEl = $('.hud__gear', hud);
    let lastY = scrollY, lastT = performance.now(), speed = 0, target = 0, running = false;
    const frame = () => {
      speed += (target - speed) * 0.18;
      target *= 0.9;
      if (speed < 1 && target < 1) { speed = 0; running = false; }
      const kmh = Math.round(speed);
      speedEl.textContent = kmh;
      gearEl.textContent = kmh < 5 ? 'N' : String(Math.min(8, Math.floor(kmh / 42) + 1));
      if (kmh > 285) hud.classList.add('is-drs'); else if (kmh < 240) hud.classList.remove('is-drs');
      if (running) requestAnimationFrame(frame);
    };
    addEventListener('scroll', () => {
      const now = performance.now();
      const dt = Math.max(8, now - lastT);
      const v = Math.abs(scrollY - lastY) / dt;          // px per ms
      lastY = scrollY; lastT = now;
      target = Math.max(target, Math.min(342, v * 110)); // reading ≈ 30–80 km/h; a hard flick or a nav jump tops out near 340
      if (!running && getComputedStyle(circuit).display !== 'none') { running = true; requestAnimationFrame(frame); }
    }, { passive: true });
  }

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

  /* Team radio: latest pushes, live from GitHub (public API, cached for 15 minutes).
     If the API can't be reached the panel simply stays hidden. */
  const radio = $('#radio');
  if (radio && 'fetch' in window) {
    const USER = 'Shiva-Preetham';
    const SKIP = new Set([`${USER}.github.io`, USER]); // the portfolio itself and the profile README
    const KEY = 'sp-radio-v1';
    const rtf = 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
    const ago = (iso) => {
      const s = (new Date(iso) - Date.now()) / 1000;
      const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
      for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf ? rtf.format(Math.round(s / sec), u) : `${Math.round(-s / sec)} ${u}s ago`;
      return 'just now';
    };
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
    const render = (data) => {
      if (!data.list || !data.list.length) return;
      const rows = $('.radio__rows', radio);
      rows.textContent = '';
      data.list.forEach(r => {
        const li = el('li');
        li.append(el('span', 'radio__when', ago(r.p)));
        const a = el('a', 'radio__repo', r.n); a.href = r.u; a.target = '_blank'; a.rel = 'noopener';
        li.append(a, el('span', 'radio__desc', r.d), el('span', 'radio__lang', r.l));
        rows.append(li);
      });
      const n = data.pushes;
      $('.radio__count', radio).textContent = n ? `${n >= 100 ? '100+' : n} push${n === 1 ? '' : 'es'} in the last 30 days` : '';
      radio.hidden = false;
    };
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (cached && Date.now() - cached.t < 15 * 60 * 1000) {
      render(cached);
    } else {
      const api = (path) => fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } })
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)));
      Promise.all([
        api(`/users/${USER}/repos?sort=pushed&per_page=12`),
        api(`/users/${USER}/events/public?per_page=100`).catch(() => []),
      ]).then(([repos, events]) => {
        const list = repos.filter(r => !r.fork && !SKIP.has(r.name)).slice(0, 4).map(r => ({
          n: r.name,
          d: (r.description || '').replace(/^[^\p{L}\p{N}]+/u, ''), // drop leading emoji for a cleaner line
          l: r.language || '',
          p: r.pushed_at,
          u: r.html_url,
        }));
        const since = Date.now() - 30 * 864e5;
        const pushes = events.filter(e => e.type === 'PushEvent' && !SKIP.has(e.repo.name.split('/')[1]) && new Date(e.created_at) > since).length;
        const data = { t: Date.now(), list, pushes };
        try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
        render(data);
      }).catch(() => {});
    }
  }

  /* Copy email */
  const legacyCopy = (text) => { // for browsers or frames where the async clipboard API is blocked
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-100px;opacity:0';
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  };
  $$('.copy').forEach(btn => btn.addEventListener('click', async () => {
    const label = $('.copy__label', btn);
    const text = btn.dataset.copy;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = legacyCopy(text); }
    if (ok) {
      label.textContent = 'Copied';
      btn.classList.add('is-done');
    } else {
      label.textContent = text; // nothing worked: show it so it can be selected by hand
    }
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { label.textContent = 'Copy email'; btn.classList.remove('is-done'); }, 2200);
  }));

  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
