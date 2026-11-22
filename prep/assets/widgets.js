/* Interactive simulators used inside sheets with ```widget name key=value``` blocks. */
(function () {
  "use strict";
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };
  const args = s => Object.fromEntries(String(s || "").split(/\s+/).filter(Boolean).map(kv => kv.split("=")));
  const fmt = n => {
    if (!isFinite(n)) return "—";
    const a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(1) + "T";
    if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n >= 10 ? Math.round(n).toString() : n.toFixed(2);
  };
  const bytes = n => {
    const u = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]; let i = 0;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (n >= 100 ? Math.round(n) : n.toFixed(1)) + " " + u[i];
  };
  const W = {};

  /* Back-of-the-envelope estimator */
  W.estimator = (el, a) => {
    const o = Object.assign({ dau: 100e6, writes: 1, reads: 10, size: 500, years: 5, peak: 3 }, Object.fromEntries(Object.entries(args(a)).map(([k, v]) => [k, +v])));
    el.innerHTML = "";
    el.append(h(`<h4>Back-of-the-envelope estimator</h4><p class="wsub">Change the inputs. 1 day ≈ 86,400 s ≈ 10<sup>5</sup> s, the rounding interviewers expect.</p>
      <div class="wrow">
        <label>Daily active users<input data-k="dau" type="number" min="0" value="${o.dau}"></label>
        <label>Writes per user per day<input data-k="writes" type="number" min="0" step="0.1" value="${o.writes}"></label>
        <label>Reads per user per day<input data-k="reads" type="number" min="0" step="0.1" value="${o.reads}"></label>
        <label>Bytes per write<input data-k="size" type="number" min="0" value="${o.size}"></label>
        <label>Keep data (years)<input data-k="years" type="number" min="0" step="0.5" value="${o.years}"></label>
        <label>Peak ÷ average<input data-k="peak" type="number" min="1" step="0.5" value="${o.peak}"></label>
      </div><div class="wout"></div>`));
    const out = el.querySelector(".wout");
    const calc = () => {
      for (const i of el.querySelectorAll("input")) o[i.dataset.k] = +i.value || 0;
      const wq = o.dau * o.writes / 86400, rq = o.dau * o.reads / 86400;
      const perDay = o.dau * o.writes * o.size, total = perDay * 365 * o.years;
      out.innerHTML = [
        ["Write QPS (avg / peak)", fmt(wq) + " / " + fmt(wq * o.peak)],
        ["Read QPS (avg / peak)", fmt(rq) + " / " + fmt(rq * o.peak)],
        ["New data per day", bytes(perDay)],
        ["Storage over " + o.years + " y", bytes(total)],
        ["With 3× replication", bytes(total * 3)],
        ["Read bandwidth (avg)", bytes(rq * o.size) + "/s"],
        ["Servers at 1K QPS each (peak)", fmt(Math.ceil((wq + rq) * o.peak / 1000))],
        ["Hot cache (20% of a day's reads)", bytes(o.dau * o.reads * o.size * 0.2)]
      ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
    };
    el.addEventListener("input", calc); calc();
  };

  /* Consistent hashing ring */
  W.hashring = (el, a) => {
    const o = Object.assign({ nodes: 4, vnodes: 3, keys: 24 }, args(a));
    let nodes = [], vn = +o.vnodes, nk = +o.keys, nextId = 0, prevOwner = null;
    const hash = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 3600) / 10; };
    const colors = ["#1F4E9C", "#C4561B", "#1E7A4C", "#7B3FA0", "#B3261E", "#0F7C86", "#8A6D00", "#5A5A5A"];
    for (let i = 0; i < +o.nodes; i++) nodes.push(nextId++);
    el.innerHTML = "";
    el.append(h(`<h4>Consistent hashing ring</h4><p class="wsub">Keys (small dots) belong to the first server point clockwise. Add or remove a server and count how many keys move. With plain <code>hash % N</code> almost all would.</p>
      <div class="wrow"><label>Virtual nodes per server<input data-k="vn" type="number" min="1" max="20" value="${vn}"></label><label>Keys<input data-k="nk" type="number" min="4" max="200" value="${nk}"></label>
      <button class="btn small" data-a="add">Add server</button><button class="btn small" data-a="del">Remove a server</button></div>
      <svg class="wsvg" viewBox="0 0 400 300"></svg><div class="wout"></div>`));
    const svg = el.querySelector("svg"), out = el.querySelector(".wout");
    const draw = () => {
      const pts = [];
      for (const n of nodes) for (let v = 0; v < vn; v++) pts.push({ n, a: hash("S" + n + "#" + v) });
      pts.sort((x, y) => x.a - y.a);
      const owner = {}; const load = {}; nodes.forEach(n => load[n] = 0);
      for (let k = 0; k < nk; k++) { const a = hash("key-" + k); const p = pts.find(p => p.a >= a) || pts[0]; owner[k] = p ? p.n : null; if (p) load[p.n]++; }
      let moved = 0; if (prevOwner) for (const k in owner) if (prevOwner[k] !== undefined && prevOwner[k] !== owner[k]) moved++;
      const P = (ang, r) => [200 + r * Math.cos((ang - 90) * Math.PI / 180), 150 + r * Math.sin((ang - 90) * Math.PI / 180)];
      let s = `<circle cx="200" cy="150" r="110" fill="none" stroke="var(--line)" stroke-width="10"/>`;
      for (let k = 0; k < nk; k++) { const [x, y] = P(hash("key-" + k), 92); s += `<circle cx="${x}" cy="${y}" r="4" fill="${owner[k] == null ? "#999" : colors[owner[k] % colors.length]}" opacity=".8"/>`; }
      for (const p of pts) { const [x, y] = P(p.a, 110); s += `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="3" fill="${colors[p.n % colors.length]}" stroke="var(--sheet)" stroke-width="2"/>`; }
      nodes.forEach((n, i) => { s += `<rect x="${330}" y="${20 + i * 22}" width="12" height="12" rx="2" fill="${colors[n % colors.length]}"/><text x="348" y="${30 + i * 22}" font-size="12" fill="var(--ink)">S${n}: ${load[n]}</text>`; });
      svg.innerHTML = s;
      const vals = Object.values(load), avg = nk / Math.max(1, nodes.length);
      out.innerHTML = `<div><span>Servers</span><b>${nodes.length}</b></div><div><span>Keys moved by last change</span><b>${prevOwner ? moved + " of " + nk : "—"}</b></div><div><span>Ideal moved ≈ K / N</span><b>${prevOwner ? Math.round(nk / Math.max(1, nodes.length)) : "—"}</b></div><div><span>Max load ÷ average</span><b>${vals.length ? (Math.max(...vals) / avg).toFixed(2) : "—"}</b></div>`;
      return owner;
    };
    let cur = draw();
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      prevOwner = cur;
      if (b.dataset.a === "add" && nodes.length < 8) nodes.push(nextId++);
      if (b.dataset.a === "del" && nodes.length > 1) nodes.splice(Math.floor(nodes.length / 2), 1);
      cur = draw();
    });
    el.addEventListener("input", e => { const i = e.target; if (i.dataset.k === "vn") vn = Math.max(1, +i.value || 1); if (i.dataset.k === "nk") nk = Math.max(1, +i.value || 1); prevOwner = null; cur = draw(); });
  };

  /* Token bucket rate limiter */
  W.tokenbucket = (el, a) => {
    const o = Object.assign({ cap: 5, rate: 1 }, args(a));
    let cap = +o.cap, rate = +o.rate, tokens = cap, last = performance.now(), ok = 0, no = 0, auto = null;
    el.innerHTML = "";
    el.append(h(`<h4>Token bucket</h4><p class="wsub">Tokens refill at a fixed rate up to the capacity. Each request takes one token or is rejected with HTTP 429. Capacity sets the burst you allow; rate sets the long-run limit.</p>
      <div class="wrow"><label>Capacity (burst)<input data-k="cap" type="number" min="1" max="30" value="${cap}"></label><label>Refill per second<input data-k="rate" type="number" min="0.1" step="0.1" max="20" value="${rate}"></label>
      <button class="btn small primary" data-a="one">Send 1 request</button><button class="btn small" data-a="burst">Send burst of 10</button><button class="btn small" data-a="auto">Steady 3 per second</button></div>
      <svg class="wsvg" viewBox="0 0 400 120"></svg><div class="wout"></div><div class="wlog"></div>`));
    const svg = el.querySelector("svg"), out = el.querySelector(".wout"), log = el.querySelector(".wlog");
    const refill = () => { const t = performance.now(); tokens = Math.min(cap, tokens + (t - last) / 1000 * rate); last = t; };
    const draw = () => {
      refill();
      let s = `<rect x="20" y="10" width="${cap * 22 + 8}" height="44" rx="6" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
      for (let i = 0; i < cap; i++) { const f = Math.max(0, Math.min(1, tokens - i)); s += `<rect x="${26 + i * 22}" y="16" width="18" height="32" rx="3" fill="var(--blue)" opacity="${0.12 + 0.88 * f}"/>`; }
      s += `<text x="20" y="80" font-size="13" fill="var(--ink)">${tokens.toFixed(2)} of ${cap} tokens</text><text x="20" y="104" font-size="12" fill="var(--ink-2)">accepted ${ok} · rejected ${no}</text>`;
      svg.innerHTML = s;
      out.innerHTML = `<div><span>Long-run limit</span><b>${rate}/s</b></div><div><span>Max burst</span><b>${cap}</b></div><div><span>Accept rate so far</span><b>${ok + no ? Math.round(100 * ok / (ok + no)) + "%" : "—"}</b></div>`;
    };
    const req = () => { refill(); const t = new Date().toLocaleTimeString(); if (tokens >= 1) { tokens -= 1; ok++; log.prepend(h(`<div>${t} 200 OK, ${tokens.toFixed(2)} left</div>`)); } else { no++; log.prepend(h(`<div style="color:var(--bad)">${t} 429 Too Many Requests</div>`)); } draw(); };
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      if (b.dataset.a === "one") req();
      if (b.dataset.a === "burst") for (let i = 0; i < 10; i++) req();
      if (b.dataset.a === "auto") { if (auto) { clearInterval(auto); auto = null; b.textContent = "Steady 3 per second"; } else { auto = setInterval(() => { if (!el.isConnected) { clearInterval(auto); return; } req(); }, 333); b.textContent = "Stop"; } }
    });
    el.addEventListener("input", e => { const i = e.target; if (i.dataset.k === "cap") cap = Math.max(1, +i.value || 1); if (i.dataset.k === "rate") rate = Math.max(0.1, +i.value || 1); tokens = Math.min(tokens, cap); draw(); });
    const tick = setInterval(() => { if (!el.isConnected) { clearInterval(tick); return; } draw(); }, 250);
    draw();
  };

  /* LRU cache */
  W.lru = (el, a) => {
    const o = Object.assign({ cap: 3 }, args(a));
    let cap = +o.cap; const m = new Map(); let hits = 0, miss = 0, lastEvict = null, lastKey = null;
    el.innerHTML = "";
    el.append(h(`<h4>LRU cache: hash map + doubly linked list</h4><p class="wsub">get and put are both O(1): the map finds the node, the list keeps recency. Most recent is on the left; the right end is evicted when full.</p>
      <div class="wrow"><label>Capacity<input data-k="cap" type="number" min="1" max="8" value="${cap}"></label><label>Key<input data-k="key" value="A" style="width:70px"></label><label>Value<input data-k="val" value="1" style="width:70px"></label>
      <button class="btn small primary" data-a="put">put(key, value)</button><button class="btn small" data-a="get">get(key)</button><button class="btn small" data-a="demo">Run A B C A D</button></div>
      <div class="chips"></div><div class="wout" style="margin-top:8px"></div><div class="wlog"></div>`));
    const chips = el.querySelector(".chips"), out = el.querySelector(".wout"), log = el.querySelector(".wlog");
    const draw = () => {
      const ks = Array.from(m.keys()).reverse();
      chips.innerHTML = (ks.length ? ks.map(k => `<span class="chip${k === lastKey ? " hot" : ""}">${k}:${m.get(k)}</span>`).join('<span aria-hidden="true">⇄</span>') : '<span class="wsub">empty</span>') + (lastEvict ? ` <span class="chip out">${lastEvict}</span>` : "");
      out.innerHTML = `<div><span>Size</span><b>${m.size} / ${cap}</b></div><div><span>Hit ratio</span><b>${hits + miss ? Math.round(100 * hits / (hits + miss)) + "%" : "—"}</b></div>`;
    };
    const put = (k, v) => { lastEvict = null; if (m.has(k)) m.delete(k); else if (m.size >= cap) { lastEvict = m.keys().next().value; m.delete(lastEvict); } m.set(k, v); lastKey = k; log.prepend(h(`<div>put(${k}, ${v})${lastEvict ? " evicted " + lastEvict : ""}</div>`)); draw(); };
    const get = k => { lastEvict = null; if (m.has(k)) { const v = m.get(k); m.delete(k); m.set(k, v); hits++; lastKey = k; log.prepend(h(`<div>get(${k}) → ${v} hit, moved to front</div>`)); } else { miss++; lastKey = null; log.prepend(h(`<div style="color:var(--bad)">get(${k}) → miss (-1)</div>`)); } draw(); };
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const k = el.querySelector('[data-k="key"]').value.trim() || "A", v = el.querySelector('[data-k="val"]').value.trim() || "1";
      if (b.dataset.a === "put") put(k, v);
      if (b.dataset.a === "get") get(k);
      if (b.dataset.a === "demo") { m.clear(); hits = miss = 0; log.innerHTML = ""; let i = 0; const seq = [["put", "A"], ["put", "B"], ["put", "C"], ["get", "A"], ["put", "D"], ["get", "B"]]; const step = () => { if (i >= seq.length || !el.isConnected) return; const [op, key] = seq[i++]; op === "put" ? put(key, i) : get(key); setTimeout(step, 650); }; step(); }
    });
    el.addEventListener("input", e => { if (e.target.dataset.k === "cap") { cap = Math.max(1, +e.target.value || 1); while (m.size > cap) { lastEvict = m.keys().next().value; m.delete(lastEvict); } draw(); } });
    draw();
  };

  /* CPU scheduling */
  W.scheduler = (el) => {
    el.innerHTML = "";
    el.append(h(`<h4>CPU scheduling simulator</h4><p class="wsub">Edit processes as <code>name:arrival:burst</code>, pick an algorithm, read the Gantt chart. Waiting time = turnaround − burst; turnaround = completion − arrival.</p>
      <div class="wrow"><label>Processes<input class="wide" data-k="p" value="P1:0:5 P2:1:3 P3:2:8 P4:3:6"></label>
      <label>Algorithm<select data-k="alg"><option value="fcfs">FCFS</option><option value="sjf">SJF (non-preemptive)</option><option value="srtf">SRTF (preemptive SJF)</option><option value="rr">Round robin</option></select></label>
      <label>Quantum<input data-k="q" type="number" min="1" value="2" style="width:70px"></label></div>
      <div class="gantt"></div><div class="wrapx"><table class="ptable"></table></div><div class="wout" style="margin-top:8px"></div>`));
    const run = () => {
      const ps = el.querySelector('[data-k="p"]').value.trim().split(/\s+/).map(t => { const [n, a, b] = t.split(":"); return { n, a: +a || 0, b: Math.max(1, +b || 1) }; }).filter(p => p.n);
      const alg = el.querySelector('[data-k="alg"]').value, q = Math.max(1, +el.querySelector('[data-k="q"]').value || 1);
      const rem = ps.map(p => p.b), done = ps.map(() => -1), seg = []; let t = 0, left = ps.length;
      const push = (name, d) => { const l = seg[seg.length - 1]; if (l && l.n === name) l.e += d; else seg.push({ n: name, s: t, e: t + d }); t += d; };
      if (alg === "rr") {
        const order = ps.map((p, i) => i).sort((x, y) => ps[x].a - ps[y].a); const queue = []; let k = 0;
        const admit = () => { while (k < order.length && ps[order[k]].a <= t) queue.push(order[k++]); };
        admit();
        while (left) {
          if (!queue.length) { const nt = ps[order[k]].a; push("idle", nt - t); admit(); continue; }
          const i = queue.shift(); const d = Math.min(q, rem[i]); push(ps[i].n, d); rem[i] -= d; admit();
          if (rem[i] > 0) queue.push(i); else { done[i] = t; left--; }
        }
      } else {
        let guard = 0;
        while (left && guard++ < 10000) {
          const ready = ps.map((p, i) => i).filter(i => done[i] < 0 && ps[i].a <= t);
          if (!ready.length) { const nt = Math.min(...ps.filter((p, i) => done[i] < 0).map(p => p.a)); push("idle", nt - t); continue; }
          let i;
          if (alg === "fcfs") i = ready.sort((x, y) => ps[x].a - ps[y].a || x - y)[0];
          else i = ready.sort((x, y) => rem[x] - rem[y] || ps[x].a - ps[y].a)[0];
          if (alg === "srtf") { push(ps[i].n, 1); rem[i]--; }
          else { push(ps[i].n, rem[i]); rem[i] = 0; }
          if (rem[i] === 0) { done[i] = t; left--; }
        }
      }
      el.querySelector(".gantt").innerHTML = seg.map(s => `<div class="${s.n === "idle" ? "idle" : ""}" style="width:${Math.max(30, (s.e - s.s) * 30)}px">${s.n === "idle" ? "idle" : s.n}<small>${s.e}</small></div>`).join("");
      let wt = 0, tat = 0;
      el.querySelector(".ptable").innerHTML = "<tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Completion</th><th>Turnaround</th><th>Waiting</th></tr>" + ps.map((p, i) => { const ta = done[i] - p.a, w = ta - p.b; wt += w; tat += ta; return `<tr><td>${p.n}</td><td>${p.a}</td><td>${p.b}</td><td>${done[i]}</td><td>${ta}</td><td>${w}</td></tr>`; }).join("");
      el.querySelector(".wout").innerHTML = `<div><span>Average waiting</span><b>${(wt / ps.length).toFixed(2)}</b></div><div><span>Average turnaround</span><b>${(tat / ps.length).toFixed(2)}</b></div><div><span>Context switches</span><b>${Math.max(0, seg.filter(s => s.n !== "idle").length - 1)}</b></div>`;
    };
    el.addEventListener("input", run); el.addEventListener("change", run); run();
  };

  /* Page replacement */
  W.pagereplace = (el) => {
    el.innerHTML = "";
    el.append(h(`<h4>Page replacement simulator</h4><p class="wsub">Red cells are page faults. Try FIFO with 3 and then 4 frames on the default string to see Belady's anomaly: more frames, more faults.</p>
      <div class="wrow"><label>Reference string<input class="wide" data-k="r" value="1 2 3 4 1 2 5 1 2 3 4 5"></label><label>Frames<input data-k="f" type="number" min="1" max="7" value="3" style="width:70px"></label>
      <label>Algorithm<select data-k="alg"><option value="fifo">FIFO</option><option value="lru">LRU</option><option value="opt">Optimal</option></select></label></div>
      <div class="wrapx"><table class="ptable"></table></div><div class="wout" style="margin-top:8px"></div>`));
    const run = () => {
      const ref = el.querySelector('[data-k="r"]').value.trim().split(/[\s,]+/).filter(Boolean);
      const F = Math.max(1, +el.querySelector('[data-k="f"]').value || 3), alg = el.querySelector('[data-k="alg"]').value;
      let frames = [], fifo = [], lastUse = {}, faults = 0; const cols = [];
      ref.forEach((p, t) => {
        let fault = false;
        if (!frames.includes(p)) {
          fault = true; faults++;
          if (frames.length < F) { frames.push(p); fifo.push(p); }
          else {
            let victim;
            if (alg === "fifo") victim = fifo.shift();
            else if (alg === "lru") victim = frames.slice().sort((x, y) => lastUse[x] - lastUse[y])[0];
            else victim = frames.slice().sort((x, y) => { const nx = ref.indexOf(x, t + 1), ny = ref.indexOf(y, t + 1); return (ny < 0 ? 1e9 : ny) - (nx < 0 ? 1e9 : nx); })[0];
            frames[frames.indexOf(victim)] = p; if (alg === "fifo") fifo.push(p);
          }
        }
        lastUse[p] = t; cols.push({ p, f: frames.slice(), fault });
      });
      let tb = "<tr><th>Ref</th>" + cols.map(c => `<th>${c.p}</th>`).join("") + "</tr>";
      for (let r = 0; r < F; r++) tb += `<tr><th>F${r + 1}</th>` + cols.map(c => `<td>${c.f[r] ?? ""}</td>`).join("") + "</tr>";
      tb += "<tr><th></th>" + cols.map(c => `<td class="${c.fault ? "f" : "h"}">${c.fault ? "F" : "H"}</td>`).join("") + "</tr>";
      el.querySelector(".ptable").innerHTML = tb;
      el.querySelector(".wout").innerHTML = `<div><span>Page faults</span><b>${faults}</b></div><div><span>Hits</span><b>${ref.length - faults}</b></div><div><span>Fault rate</span><b>${ref.length ? Math.round(100 * faults / ref.length) : 0}%</b></div>`;
    };
    el.addEventListener("input", run); el.addEventListener("change", run); run();
  };

  /* Subnet calculator */
  W.subnet = (el) => {
    el.innerHTML = "";
    el.append(h(`<h4>Subnet calculator</h4><p class="wsub">Type an IPv4 address with a prefix length. Usable hosts = 2<sup>(32 − prefix)</sup> − 2.</p>
      <div class="wrow"><label>Address / prefix<input class="wide" data-k="ip" value="192.168.10.77/26"></label></div><div class="wout"></div>`));
    const run = () => {
      const v = el.querySelector('[data-k="ip"]').value.trim(); const m = v.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
      const out = el.querySelector(".wout");
      if (!m || m.slice(1, 5).some(x => +x > 255) || +m[5] > 32) { out.innerHTML = '<div><span>Input</span><b>Use the form a.b.c.d/n</b></div>'; return; }
      const ip = ((+m[1] << 24) >>> 0) + (+m[2] << 16) + (+m[3] << 8) + +m[4], n = +m[5];
      const mask = n === 0 ? 0 : (0xFFFFFFFF << (32 - n)) >>> 0, net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
      const s = x => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join(".");
      const hosts = n >= 31 ? (n === 31 ? 2 : 1) : Math.pow(2, 32 - n) - 2;
      const cls = +m[1] < 128 ? "A" : +m[1] < 192 ? "B" : +m[1] < 224 ? "C" : +m[1] < 240 ? "D (multicast)" : "E";
      out.innerHTML = [["Subnet mask", s(mask)], ["Network address", s(net)], ["Broadcast address", s(bc)], ["Usable range", n >= 31 ? "—" : s(net + 1) + " – " + s(bc - 1)], ["Usable hosts", hosts.toLocaleString()], ["Classful class", cls]].map(([k, v]) => `<div><span>${k}</span><b style="font-size:1rem">${v}</b></div>`).join("");
    };
    el.addEventListener("input", run); run();
  };

  window.Widgets = W;
})();
