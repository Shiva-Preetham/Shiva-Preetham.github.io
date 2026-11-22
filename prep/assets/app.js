/* Field Manual — single-page app. Content lives in content/*.md and content/manifest.json.
   Markdown extensions:
     <!-- tab: Name -->          splits a page into tabs
     ```mermaid                  diagram (with optional first line "%% caption: text")
     ```quiz                     MCQs: "Q: …", options "- wrong" / "* right", "> explanation"
     ```widget name key=value    interactive simulator from widgets.js
     > [!TIP] / [!TRAP] / [!NOTE] / [!SAY]   callouts
     ### Q: question             becomes a collapsible interview answer */
(function () {
  "use strict";
  const REPO_EDIT = "https://github.com/Shiva-Preetham/shiva-preetham.github.io/edit/main/prep/content/";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("prep:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("prep:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  let M = null;                 // manifest
  const mdCache = {};
  const quizBank = {};          // id -> questions
  let quizSeq = 0, diagSeq = 0;

  /* ---------- theme ---------- */
  function theme() { return document.documentElement.dataset.theme || "light"; }
  function applyHL() {
    const dark = theme() === "dark";
    $("#hl-light").disabled = dark; $("#hl-dark").disabled = !dark;
  }
  function mermaidInit() {
    if (!window.mermaid) return;
    const d = theme() === "dark";
    mermaid.initialize({
      startOnLoad: false, securityLevel: "strict", theme: "base",
      fontFamily: "IBM Plex Sans, system-ui, sans-serif",
      flowchart: { curve: "basis", htmlLabels: true, padding: 10 },
      sequence: { mirrorActors: false, actorMargin: 40 },
      themeVariables: d ? {
        background: "#12284A", primaryColor: "#18365F", primaryTextColor: "#DCE7F5", primaryBorderColor: "#7FC4FF",
        lineColor: "#9DB2CF", secondaryColor: "#3A2A16", secondaryBorderColor: "#FFB15C", tertiaryColor: "#0B1930",
        tertiaryBorderColor: "#2A4672", noteBkgColor: "#3A2A16", noteTextColor: "#DCE7F5", noteBorderColor: "#FFB15C",
        actorBkg: "#18365F", actorBorder: "#7FC4FF", actorTextColor: "#DCE7F5", signalColor: "#DCE7F5", signalTextColor: "#DCE7F5",
        labelBoxBkgColor: "#18365F", labelBoxBorderColor: "#7FC4FF", labelTextColor: "#DCE7F5", edgeLabelBackground: "#12284A",
        clusterBkg: "#0B1930", clusterBorder: "#2A4672", titleColor: "#DCE7F5", fontSize: "15px"
      } : {
        background: "#F8FAF8", primaryColor: "#DCE6F5", primaryTextColor: "#1B2430", primaryBorderColor: "#1F4E9C",
        lineColor: "#4A5666", secondaryColor: "#F8E3D5", secondaryBorderColor: "#C4561B", tertiaryColor: "#EEF2EF",
        tertiaryBorderColor: "#C3CEC8", noteBkgColor: "#F8E3D5", noteTextColor: "#1B2430", noteBorderColor: "#C4561B",
        actorBkg: "#DCE6F5", actorBorder: "#1F4E9C", actorTextColor: "#1B2430", signalColor: "#1B2430", signalTextColor: "#1B2430",
        labelBoxBkgColor: "#DCE6F5", labelBoxBorderColor: "#1F4E9C", labelTextColor: "#1B2430", edgeLabelBackground: "#F8FAF8",
        clusterBkg: "#EEF2EF", clusterBorder: "#C3CEC8", titleColor: "#1B2430", fontSize: "15px"
      }
    });
  }

  /* ---------- markdown ---------- */
  function parseQuiz(src) {
    const qs = []; let cur = null;
    for (const raw of src.split("\n")) {
      const l = raw.trim();
      if (!l) continue;
      if (/^Q[:.]\s*/.test(l)) { cur = { q: l.replace(/^Q[:.]\s*/, ""), opts: [], ans: -1, exp: "" }; qs.push(cur); }
      else if (!cur) continue;
      else if (/^[-*]\s+/.test(l)) { if (l[0] === "*") cur.ans = cur.opts.length; cur.opts.push(l.replace(/^[-*]\s+/, "")); }
      else if (/^>\s?/.test(l)) cur.exp += (cur.exp ? " " : "") + l.replace(/^>\s?/, "");
      else cur.q += " " + l;
    }
    return qs.filter(q => q.opts.length >= 2 && q.ans >= 0);
  }
  const inlineMd = s => window.marked ? marked.parseInline(s) : esc(s);

  function setupMarked() {
    marked.use({
      gfm: true, breaks: false,
      renderer: {
        code(code, info) {
          const lang = (info || "").trim().split(/\s+/)[0];
          if (lang === "mermaid") {
            let cap = ""; const m = code.match(/^%%\s*caption:\s*(.+)$/m);
            if (m) cap = m[1];
            return '<figure class="diagram"><button class="btn small zoom" data-zoom>Expand</button><div class="mermaid-src" data-id="d' + (++diagSeq) + '" hidden>' + esc(code) + '</div><div class="mermaid"></div>' + (cap ? '<figcaption class="diagram-cap">' + esc(cap) + "</figcaption>" : "") + "</figure>";
          }
          if (lang === "quiz") {
            const id = "q" + (++quizSeq); quizBank[id] = parseQuiz(code);
            return '<div class="quiz" data-quiz="' + id + '"></div>';
          }
          if (lang === "widget") {
            const parts = (info || "").trim().split(/\s+/).slice(1);
            const name = parts.shift() || code.trim().split(/\s+/)[0];
            return '<div class="widget" data-widget="' + esc(name) + '" data-args="' + esc(parts.join(" ") || code.trim().split(/\s+/).slice(1).join(" ")) + '"></div>';
          }
          let html = esc(code);
          if (window.hljs && lang && hljs.getLanguage(lang)) { try { html = hljs.highlight(code, { language: lang }).value; } catch (e) {} }
          return '<pre><code class="hljs language-' + esc(lang || "text") + '">' + html + "</code></pre>";
        }
      }
    });
  }

  function slug(s) { return String(s).toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }

  function enhance(root) {
    // callouts
    for (const bq of $$("blockquote", root)) {
      const p = bq.firstElementChild; if (!p) continue;
      const m = p.innerHTML.match(/^\[!(TIP|TRAP|NOTE|SAY)\]\s*/i);
      if (!m) continue;
      const kind = m[1].toLowerCase();
      const label = { tip: "Tip", trap: "Interview trap", note: "Note", say: "Say this in the interview" }[kind];
      p.innerHTML = p.innerHTML.slice(m[0].length);
      const div = document.createElement("div"); div.className = "callout " + kind;
      div.innerHTML = "<b>" + label + "</b>" + bq.innerHTML;
      bq.replaceWith(div);
    }
    // Q&A
    for (const h of $$("h3", root)) {
      if (!/^Q[:.]/.test(h.textContent.trim())) continue;
      const d = document.createElement("details"); d.className = "qa";
      const s = document.createElement("summary"); s.innerHTML = "<span>" + h.innerHTML.replace(/^Q[:.]\s*/, "") + "</span>";
      const ans = document.createElement("div"); ans.className = "ans";
      let n = h.nextElementSibling;
      while (n && !/^H[123]$/.test(n.tagName)) { const nx = n.nextElementSibling; ans.appendChild(n); n = nx; }
      d.append(s, ans); h.replaceWith(d);
    }
    // heading ids
    for (const h of $$("h2, h3", root)) if (!h.id) h.id = slug(h.textContent);
    // tables: wrap ok; links open external in new tab
    for (const a of $$("a[href^='http']", root)) { a.target = "_blank"; a.rel = "noopener"; }
  }

  let mermaidLoading = null;
  function loadMermaid() {
    if (window.mermaid) return Promise.resolve();
    if (!mermaidLoading) mermaidLoading = new Promise(res => { const s = document.createElement("script"); s.src = "vendor/mermaid.min.js"; s.onload = () => { mermaidInit(); res(); }; s.onerror = () => res(); document.head.appendChild(s); });
    return mermaidLoading;
  }
  async function renderMermaid(root) {
    if (!$(".mermaid-src", root)) return;
    await loadMermaid();
    if (!window.mermaid) { for (const f of $$(".mermaid-src", root)) f.nextElementSibling.innerHTML = '<pre class="err">Diagram library did not load. Check your connection.</pre>'; return; }
    for (const src of $$(".mermaid-src", root)) {
      const out = src.nextElementSibling;
      if (out.dataset.done) continue;
      out.dataset.done = "1";
      const code = src.textContent.replace(/^%%\s*caption:.*$/m, "");
      try {
        const { svg } = await mermaid.render("mmd-" + src.dataset.id + "-" + Date.now().toString(36), code);
        out.innerHTML = svg;
        const el = out.querySelector("svg"), vb = el && el.viewBox && el.viewBox.baseVal;
        if (vb && vb.width) {
          const avail = out.parentElement.clientWidth - 28;
          // keep small text readable on phones: scroll sideways instead of shrinking below 70%
          if (avail > 0 && avail < vb.width * 0.7) { el.style.maxWidth = "none"; el.setAttribute("width", Math.round(vb.width * 0.8)); el.removeAttribute("height"); }
        }
      } catch (e) {
        out.innerHTML = '<pre class="err">Diagram error: ' + esc(e && e.message ? e.message.split("\n")[0] : e) + "</pre>";
        console.warn("mermaid", src.dataset.id, e);
      }
    }
  }

  /* ---------- quiz ---------- */
  function mountQuiz(el, qs, key, title) {
    if (!qs || !qs.length) { el.innerHTML = "<p>No questions.</p>"; return; }
    let i = 0, score = 0; const picked = new Array(qs.length).fill(-1);
    const best = store.get("quiz", {})[key];
    function draw() {
      if (i >= qs.length) {
        const pct = Math.round(100 * score / qs.length);
        const all = store.get("quiz", {}); const prev = all[key];
        if (!prev || score / qs.length >= prev.s / prev.t) { all[key] = { s: score, t: qs.length, d: new Date().toISOString().slice(0, 10) }; store.set("quiz", all); }
        el.innerHTML = '<div class="quiz-end"><b>' + score + " / " + qs.length + "</b><p>" + (pct >= 80 ? "Interview-ready on this set." : pct >= 60 ? "Close. Re-read the explanations you missed, then retry." : "Go back to the notes for this topic, then retry.") + '</p><button class="btn primary" data-act="retry">Try again</button> <button class="btn" data-act="review">Review answers</button></div>';
        return;
      }
      const q = qs[i], p = picked[i], done = p >= 0;
      el.innerHTML = '<div class="quiz-top"><span>' + esc(title || "Practice") + " · question " + (i + 1) + " of " + qs.length + "</span><span>" + (best ? "best " + best.s + "/" + best.t : "") + " score " + score + '</span></div><div class="quiz-bar"><span style="width:' + (100 * i / qs.length) + '%"></span></div>' +
        '<p class="quiz-q">' + inlineMd(q.q) + '</p><div class="quiz-opts">' +
        q.opts.map((o, k) => '<button class="quiz-opt' + (done ? (k === q.ans ? " right" : k === p ? " wrong" : "") : "") + '" data-k="' + k + '"' + (done ? " disabled" : "") + '><span class="k">' + "ABCDEF"[k] + "</span><span>" + inlineMd(o) + "</span></button>").join("") + "</div>" +
        (done && q.exp ? '<div class="quiz-exp">' + inlineMd(q.exp) + "</div>" : "") +
        '<div class="quiz-nav"><button class="btn small" data-act="prev"' + (i === 0 ? " disabled" : "") + '>Previous</button><button class="btn small primary" data-act="next"' + (done ? "" : " disabled") + ">" + (i === qs.length - 1 ? "See score" : "Next question") + "</button></div>";
    }
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.k !== undefined) { const k = +b.dataset.k; picked[i] = k; if (k === qs[i].ans) score++; draw(); return; }
      const a = b.dataset.act;
      if (a === "next") { i++; draw(); }
      else if (a === "prev") { i = Math.max(0, i - 1); draw(); }
      else if (a === "retry") { i = 0; score = 0; picked.fill(-1); draw(); }
      else if (a === "review") { el.innerHTML = qs.map((q, n) => '<p class="quiz-q">' + (n + 1) + ". " + inlineMd(q.q) + "</p><p>" + (picked[n] === q.ans ? "✔ " : "✘ ") + "Answer: <b>" + inlineMd(q.opts[q.ans]) + "</b>" + (q.exp ? "<br><small>" + inlineMd(q.exp) + "</small>" : "") + "</p>").join("") + '<button class="btn primary" data-act="retry">Try again</button>'; }
    });
    draw();
  }

  /* ---------- data ---------- */
  async function loadManifest() {
    const r = await fetch("content/manifest.json", { cache: "no-cache" });
    M = await r.json();
    M.byId = {}; M.order = [];
    for (const g of M.groups) for (const p of M.pages.filter(p => p.group === g.id)) { M.byId[p.id] = p; M.order.push(p); }
  }
  async function getMd(p) {
    if (mdCache[p.id]) return mdCache[p.id];
    const r = await fetch("content/" + p.file, { cache: "no-cache" });
    if (!r.ok) throw new Error("Could not load " + p.file + " (" + r.status + ")");
    return (mdCache[p.id] = await r.text());
  }
  function splitTabs(md) {
    const parts = md.split(/^<!--\s*tab:\s*(.+?)\s*-->\s*$/m);
    const intro = parts[0]; const tabs = [];
    for (let k = 1; k < parts.length; k += 2) tabs.push({ name: parts[k], md: parts[k + 1] || "" });
    if (!tabs.length) tabs.push({ name: "Notes", md: intro });
    return { intro: tabs.length && parts.length > 1 ? intro : "", tabs };
  }

  /* ---------- nav ---------- */
  function studied() { return store.get("studied", {}); }
  function renderNav(activeId) {
    const st = studied();
    $("#nav").innerHTML = M.groups.map(g => {
      const ps = M.pages.filter(p => p.group === g.id);
      const done = ps.filter(p => st[p.id]).length;
      return '<div class="nav-group"><h2>' + esc(g.title) + "<small>" + done + "/" + ps.length + "</small></h2>" +
        ps.map(p => '<a class="nav-item" href="#/p/' + p.id + '"' + (p.id === activeId ? ' aria-current="page"' : "") + '><span class="sh">' + esc(p.sheet) + "</span><span>" + esc(p.title) + '</span><span class="dot' + (st[p.id] ? " on" : "") + '"></span></a>').join("") + "</div>";
    }).join("") + '<div class="nav-group"><h2>Tools</h2><a class="nav-item" href="#/matrix"' + (activeId === "matrix" ? ' aria-current="page"' : "") + '><span class="sh">MX</span><span>Pattern matrix</span><span></span></a><a class="nav-item" href="#/drill"' + (activeId === "drill" ? ' aria-current="page"' : "") + '><span class="sh">DR</span><span>Mixed MCQ drill</span><span></span></a></div>';
  }

  /* ---------- views ---------- */
  function ring(done, total) {
    const r = 52, c = 2 * Math.PI * r, f = total ? done / total : 0;
    return '<svg class="ring" viewBox="0 0 132 132" role="img" aria-label="' + done + " of " + total + ' sheets studied"><circle cx="66" cy="66" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="66" cy="66" r="' + r + '" fill="none" stroke="var(--blue)" stroke-width="10" stroke-dasharray="' + (c * f) + " " + c + '" transform="rotate(-90 66 66)"/><text x="66" y="68" text-anchor="middle" font-size="30" font-weight="800" fill="var(--ink)" font-stretch="70%">' + done + '</text><text x="66" y="88" text-anchor="middle" font-size="11" fill="var(--ink-2)">of ' + total + " studied</text></svg>";
  }
  function tile(p, st) {
    return '<a class="sheet-tile" href="#/p/' + p.id + '"><span class="num"><span>' + esc(p.sheet) + "</span><span>" + "●".repeat(p.level || 1) + "○".repeat(3 - (p.level || 1)) + "</span></span><h3>" + esc(p.title) + "</h3><p>" + esc(p.blurb || "") + '</p><span class="kinds">' +
      (p.kind || []).map(k => '<span class="tag ' + k.toLowerCase() + '">' + esc(k) + "</span>").join("") + (st[p.id] ? '<span class="tag done">studied</span>' : "") + "</span></a>";
  }
  function viewHome() {
    const st = studied(), total = M.pages.length, done = M.pages.filter(p => st[p.id]).length;
    const last = store.get("last", null), lp = last && M.byId[last];
    const qz = store.get("quiz", {}); const qk = Object.keys(qz);
    let h = '<section class="cover"><div><h1>Interview<br>Field Manual</h1><p>Every system from your tracker, drawn as a sheet you can open on any device: requirements, numbers, architecture, deep dives, class design, code, and the questions interviewers ask. Plus CN, OS, DBMS, OOP, React and FastAPI with MCQs.</p></div>' + ring(done, total) + "</section>";
    h += '<div class="home-row">' + (lp ? '<a class="resume" href="#/p/' + lp.id + '"><small>Continue where you stopped</small><b>' + esc(lp.sheet + " " + lp.title) + "</b></a>" : '<a class="resume" href="#/p/hld-fundamentals"><small>Start here</small><b>HLD fundamentals and the 45-minute framework</b></a>') +
      '<a class="resume" href="#/drill"><small>' + (qk.length ? qk.length + " quiz sets attempted" : "Test yourself") + '</small><b>Mixed MCQ drill: 15 random questions</b></a><a class="resume" href="#/matrix"><small>See how systems share patterns</small><b>Pattern matrix</b></a></div>';
    for (const g of M.groups) {
      const ps = M.pages.filter(p => p.group === g.id);
      h += '<div class="section-h"><h2>' + esc(g.title) + "</h2><p>" + esc(g.note || "") + '</p></div><div class="sheets">' + ps.map(p => tile(p, st)).join("") + "</div>";
    }
    h += '<p class="edit-link" style="margin-top:40px">Content lives in Markdown files on GitHub. Edit any sheet from its page or <a href="https://github.com/Shiva-Preetham/shiva-preetham.github.io/tree/main/prep/content" target="_blank" rel="noopener">browse all files</a>; the site updates a minute after you commit.</p>';
    return h;
  }

  async function viewPage(id, tabName) {
    const p = M.byId[id];
    if (!p) return '<div class="empty"><h1>Sheet not found</h1><p>No sheet is called “' + esc(id) + '”. <a href="#/">Go to the index</a>.</p></div>';
    store.set("last", id);
    const md = await getMd(p);
    const { intro, tabs } = splitTabs(md);
    const st = studied(); const on = !!st[id];
    const qz = store.get("quiz", {});
    const quizKeys = Object.keys(qz).filter(k => k.startsWith(id + ":"));
    const qtxt = quizKeys.length ? quizKeys.map(k => qz[k].s + "/" + qz[k].t).join(", ") : "not taken";
    const g = M.groups.find(x => x.id === p.group);
    let tIdx = Math.max(0, tabs.findIndex(t => slug(t.name) === tabName));
    let h = '<div class="sheet-head"><div><div class="crumb"><a href="#/">Index</a> / ' + esc(g ? g.title : "") + "</div><h1>" + esc(p.title) + '</h1><p class="lede">' + esc(p.blurb || "") + "</p>" + (intro.trim() ? '<div class="prose">' + marked.parse(intro) + "</div>" : "") + "</div>";
    h += '<div class="titleblock" aria-label="Sheet details"><div class="big"><span>Sheet</span><b>' + esc(p.sheet) + '</b></div><div class="big"><span>Difficulty</span><b>' + ["", "Core", "Standard", "Advanced"][p.level || 1] + "</b></div>" +
      '<div class="wide"><span>Covers</span><div class="tags">' + (p.kind || []).map(k => '<span class="tag ' + k.toLowerCase() + '">' + esc(k) + "</span>").join("") + (p.tags || []).slice(0, 6).map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div></div>" +
      "<div><span>Tracker item</span><b>" + esc((p.tracker || []).join(", ") || "—") + "</b></div><div><span>Quiz best</span><b>" + esc(qtxt) + "</b></div>" +
      '<div class="wide"><button class="mark-btn' + (on ? " on" : "") + '" data-mark="' + id + '"><span>Status</span><b>' + (on ? "Studied on " + esc(st[id]) + " · tap to undo" : "Not studied yet · tap when done") + "</b></button></div></div></div>";
    h += '<div class="tabs" role="tablist">' + tabs.map((t, k) => '<button role="tab" aria-selected="' + (k === tIdx) + '" data-tab="' + k + '">' + esc(t.name) + "</button>").join("") + "</div>";
    h += tabs.map((t, k) => '<section class="tabpanel" data-panel="' + k + '"' + (k === tIdx ? "" : " hidden") + "></section>").join("");
    const i = M.order.indexOf(p), prev = M.order[i - 1], next = M.order[i + 1];
    h += '<nav class="pager">' + (prev ? '<a href="#/p/' + prev.id + '"><small>Previous sheet</small><b>' + esc(prev.title) + "</b></a>" : "<span></span>") + (next ? '<a href="#/p/' + next.id + '" style="text-align:right"><small>Next sheet</small><b>' + esc(next.title) + "</b></a>" : "") + "</nav>";
    h += '<p class="edit-link"><a href="' + REPO_EDIT + p.file + '" target="_blank" rel="noopener">Edit this sheet on GitHub</a></p>';
    return { html: h, after: root => {
      const show = k => {
        $$(".tabs button", root).forEach(b => b.setAttribute("aria-selected", String(+b.dataset.tab === k)));
        $$(".tabpanel", root).forEach(s => { s.hidden = +s.dataset.panel !== k; });
        const panel = $('.tabpanel[data-panel="' + k + '"]', root);
        if (!panel.dataset.ready) {
          panel.dataset.ready = "1";
          panel.innerHTML = '<div class="prose">' + marked.parse(tabs[k].md) + "</div>";
          const pr = $(".prose", panel);
          enhance(pr);
          const hs = $$("h2", pr);
          if (hs.length > 2) { const toc = document.createElement("div"); toc.className = "toc"; toc.innerHTML = hs.map(x => '<a href="#" data-goto="' + x.id + '">' + esc(x.textContent) + "</a>").join(""); pr.prepend(toc); }
          if ($$("details.qa", pr).length > 3) { const t = document.createElement("div"); t.className = "qa-tools"; t.innerHTML = '<button class="btn small" data-qa="open">Show all answers</button><button class="btn small" data-qa="close">Hide all answers</button>'; const first = $("details.qa", pr); first.before(t); }
          let qn = 0;
          $$(".quiz", pr).forEach(el => mountQuiz(el, quizBank[el.dataset.quiz], id + ":" + slug(tabs[k].name) + ":" + (qn++), p.title));
          $$(".widget", pr).forEach(el => { const f = window.Widgets && window.Widgets[el.dataset.widget]; if (f) { try { f(el, el.dataset.args || ""); } catch (e) { el.textContent = "Widget error: " + e.message; } } else el.textContent = "Unknown widget " + el.dataset.widget; });
        }
        renderMermaid(panel);
        const nm = slug(tabs[k].name);
        history.replaceState(null, "", "#/p/" + id + "/" + nm);
      };
      root.onclick = e => {
        const tb = e.target.closest(".tabs button"); if (tb) { show(+tb.dataset.tab); const top = $(".tabs", root).getBoundingClientRect().top + scrollY - 60; if (scrollY > top) scrollTo({ top }); return; }
        const mk = e.target.closest("[data-mark]");
        if (mk) { const s = studied(); if (s[id]) delete s[id]; else s[id] = new Date().toISOString().slice(0, 10); store.set("studied", s); route(); return; }
        const go = e.target.closest("[data-goto]"); if (go) { e.preventDefault(); const t = document.getElementById(go.dataset.goto); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        const qa = e.target.closest("[data-qa]"); if (qa) { $$("details.qa", qa.closest(".prose")).forEach(d => d.open = qa.dataset.qa === "open"); return; }
        const z = e.target.closest("[data-zoom]"); if (z) { const f = z.closest(".diagram"); f.classList.toggle("full"); z.textContent = f.classList.contains("full") ? "Close" : "Expand"; }
      };
      show(tIdx);
    } };
  }

  async function viewMatrix() {
    const sys = M.pages.filter(p => p.group === "systems");
    const cols = M.patterns || [];
    let h = '<div class="crumb"><a href="#/">Index</a> / Tools</div><h1>Pattern matrix</h1><p class="lede">Which building blocks each system uses. Interviewers reward reuse: once you can explain a pattern well in one system, you can carry it to every system in its column.</p>';
    h += '<div class="matrix-wrap" style="margin-top:20px"><table class="matrix"><thead><tr><th style="writing-mode:horizontal-tb;transform:none;height:auto">System</th>' + cols.map(c => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>" +
      sys.map(p => '<tr><th><a href="#/p/' + p.id + '">' + esc(p.sheet + " " + p.title) + "</a></th>" + cols.map(c => '<td class="' + ((p.tags || []).includes(c) ? "on" : "") + '" title="' + esc(p.title + (((p.tags || []).includes(c)) ? " uses " : " does not use ") + c) + '"></td>').join("") + "</tr>").join("") + "</tbody></table></div>";
    return h;
  }

  async function viewDrill(src) {
    const pool = M.pages.filter(p => !src || src === "all" || p.group === src);
    const md = await Promise.all(pool.map(p => getMd(p).then(t => ({ p, t })).catch(() => null)));
    let all = [];
    for (const x of md) { if (!x) continue; const re = /```quiz\n([\s\S]*?)```/g; let m; while ((m = re.exec(x.t))) all = all.concat(parseQuiz(m[1]).map(q => Object.assign({}, q, { q: q.q + " _(" + x.p.title + ")_" }))); }
    for (let k = all.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [all[k], all[j]] = [all[j], all[k]]; }
    const qs = all.slice(0, 15);
    const opts = [["all", "Everything"]].concat(M.groups.map(g => [g.id, g.title]));
    return { html: '<div class="crumb"><a href="#/">Index</a> / Tools</div><h1>Mixed MCQ drill</h1><p class="lede">15 random questions from ' + all.length + ' in the bank. Each run reshuffles.</p><div class="qa-tools">' + opts.map(([k, l]) => '<a class="btn small' + ((src || "all") === k ? " primary" : "") + '" href="#/drill/' + k + '" style="text-decoration:none">' + esc(l) + "</a>").join("") + '</div><div class="quiz" id="drillq"></div>', after: root => mountQuiz($("#drillq", root), qs, "drill:" + (src || "all"), "Mixed drill") };
  }

  /* ---------- router ---------- */
  async function route() {
    const main = $("#main");
    const hash = location.hash.replace(/^#\/?/, "");
    const [kind, a, b] = hash.split("/");
    closeRail();
    let res, active = null;
    main.innerHTML = '<p class="loading">Loading sheet…</p>';
    try {
      if (kind === "p") { active = a; res = await viewPage(a, b); }
      else if (kind === "matrix") { active = "matrix"; res = await viewMatrix(); }
      else if (kind === "drill") { active = "drill"; res = await viewDrill(a); }
      else res = viewHome();
    } catch (e) {
      res = '<div class="empty"><h1>This sheet didn’t load</h1><p>' + esc(e.message) + '. If you are offline, open it once while online so it is saved on this device.</p><p><a href="#/">Back to the index</a></p></div>';
    }
    renderNav(active);
    main.onclick = null;
    if (typeof res === "string") main.innerHTML = res; else { main.innerHTML = res.html; res.after(main); }
    if (kind === "p" && document.activeElement !== main) main.focus({ preventScroll: true });
    scrollTo(0, 0);
    document.title = (active && M.byId[active] ? M.byId[active].title + " · " : "") + "Interview Field Manual";
  }

  /* ---------- search ---------- */
  let index = null;
  async function buildIndex() {
    if (index) return index;
    const docs = await Promise.all(M.pages.map(p => getMd(p).then(t => ({ p, t })).catch(() => ({ p, t: "" }))));
    index = [];
    for (const { p, t } of docs) {
      index.push({ p, tab: "", head: p.title, text: (p.blurb || "") + " " + (p.tags || []).join(" ") });
      const { tabs } = splitTabs(t);
      for (const tb of tabs) {
        const secs = tb.md.split(/^(?=#{2,3} )/m);
        for (const s of secs) {
          const hm = s.match(/^#{2,3} (.+)$/m);
          index.push({ p, tab: slug(tb.name), tabName: tb.name, head: hm ? hm[1].replace(/^Q[:.]\s*/, "") : tb.name, text: s.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`|\-]/g, " ").replace(/\s+/g, " ") });
        }
      }
    }
    return index;
  }
  let sel = 0;
  async function doSearch(q) {
    const box = $("#results"); q = q.trim().toLowerCase();
    if (!q) { box.innerHTML = '<p class="search-hint">Try “consistent hashing”, “deadlock”, “useEffect”, “idempotency”.</p>'; return; }
    const idx = await buildIndex(); const words = q.split(/\s+/);
    const hits = [];
    for (const d of idx) {
      const hl = d.head.toLowerCase(), tl = d.text.toLowerCase();
      if (!words.every(w => hl.includes(w) || tl.includes(w))) continue;
      let score = words.reduce((s, w) => s + (hl.includes(w) ? 5 : 0) + (d.p.title.toLowerCase().includes(w) ? 3 : 0), 0);
      const at = tl.indexOf(words[0]);
      const snip = at >= 0 ? d.text.slice(Math.max(0, at - 50), at + 110) : d.text.slice(0, 140);
      hits.push({ d, score, snip });
    }
    hits.sort((x, y) => y.score - x.score);
    sel = 0;
    const mark = s => { let o = esc(s); for (const w of words) if (w.length > 1) o = o.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); return o; };
    box.innerHTML = hits.slice(0, 30).map((h, k) => '<a href="#/p/' + h.d.p.id + (h.d.tab ? "/" + h.d.tab : "") + '"' + (k === 0 ? ' class="sel"' : "") + "><b>" + mark(h.d.head) + "</b><small>" + esc(h.d.p.sheet + " " + h.d.p.title + (h.d.tabName ? " · " + h.d.tabName : "")) + "</small><small>" + mark(h.snip) + "…</small></a>").join("") || '<p class="search-hint">Nothing matches “' + esc(q) + '”. Try a shorter word.</p>';
  }
  function openSearch() { $("#search").hidden = false; const q = $("#q"); q.value = ""; doSearch(""); setTimeout(() => q.focus(), 10); }
  function closeSearch() { $("#search").hidden = true; }

  /* ---------- rail ---------- */
  function openRail() { $("#rail").classList.add("open"); $("#scrim").classList.add("show"); }
  function closeRail() { $("#rail").classList.remove("open"); $("#scrim").classList.remove("show"); }

  /* ---------- boot ---------- */
  async function boot() {
    applyHL(); mermaidInit(); if (window.marked) setupMarked();
    try { await loadManifest(); } catch (e) { $("#main").innerHTML = '<div class="empty"><h1>Couldn’t load the index</h1><p>' + esc(e.message) + "</p></div>"; return; }
    window.addEventListener("hashchange", route);
    $("#railOpen").onclick = openRail; $("#railClose").onclick = closeRail; $("#scrim").onclick = closeRail;
    $("#searchOpen").onclick = openSearch; $("#searchOpen2").onclick = openSearch;
    $("#themeBtn").onclick = () => { const t = theme() === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("prep:theme", t); } catch (e) {} applyHL(); mermaidInit(); route(); };
    $("#q").addEventListener("input", e => doSearch(e.target.value));
    $("#search").addEventListener("click", e => { if (e.target.id === "search") closeSearch(); if (e.target.closest(".results a")) closeSearch(); });
    document.addEventListener("keydown", e => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
      else if (e.key === "Escape") { closeSearch(); closeRail(); const f = $(".diagram.full"); if (f) { f.classList.remove("full"); $("[data-zoom]", f).textContent = "Expand"; } }
      else if (!$("#search").hidden && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
        const as = $$("#results a"); if (!as.length) return;
        if (e.key === "Enter") { e.preventDefault(); location.hash = as[sel].getAttribute("href"); closeSearch(); return; }
        e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : as.length - 1)) % as.length;
        as.forEach((a, k) => a.classList.toggle("sel", k === sel)); as[sel].scrollIntoView({ block: "nearest" });
      }
    });
    route();
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  boot();
})();
