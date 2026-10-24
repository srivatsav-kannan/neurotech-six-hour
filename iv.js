/* Page IV: renders everything inside #iv-root from iv-content.json.
   To change words, ratings or sources, edit iv-content.json, not this file. */
(() => {
  const root = document.getElementById('iv-root');
  if (!root) return;

  const NS = 'http://www.w3.org/2000/svg';
  const PAPER = [244, 239, 228], RED = [123, 45, 38];
  const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

  // Typographic quotes for content text, then HTML-escape.
  const sq = s => String(s)
    .replace(/(\w)'(\w)/g, '$1\u2019$2')
    .replace(/(^|[\s(\u2014])'(?=\S)/g, '$1\u2018')
    .replace(/'/g, '\u2019')
    .replace(/(^|[\s(\u2014])"(?=\S)/g, '$1\u201C')
    .replace(/"/g, '\u201D');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const t = s => esc(sq(s));

  const TYPE_LABEL = {
    preprint: 'Preprint, not peer reviewed', company: 'Developer\u2019s own source', advocacy: 'Advocacy or policy group',
    news: 'News', secondary: 'Secondary summary', report: 'Expert or industry report', government: 'Government',
    framework: 'Framework or guide', 'trial-registry': 'Clinical trials listing'
  };

  fetch('iv-content.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(C => {
      try { render(C); }
      catch (err) {
        console.error(err);
        root.innerHTML = '<div class="pending">Page IV hit an error while drawing. Check the browser console; it usually means a typo in iv-content.json.</div>';
      }
    }, err => {
      console.error(err);
      root.innerHTML = '<div class="pending">Page IV couldn\u2019t load iv-content.json. If you opened index.html straight from your computer, run a local server instead (see README).</div>';
    });

  function render(C) {
    const SRC = new Map(C.sources.map(s => [s.id, s]));
    const order = [], num = new Map();
    const cite = ids => {
      const ns = (ids || []).filter(id => SRC.has(id)).map(id => {
        if (!num.has(id)) { order.push(id); num.set(id, order.length); }
        const n = num.get(id), s = SRC.get(id);
        return `<a href="#" data-ref="${n}" aria-label="Source ${n}: ${esc(sq(s.title))}">${n}</a>`;
      });
      return ns.length ? `<span class="cite">${ns.join(',')}</span>` : '';
    };

    const CRIT = C.framework.criteria;
    const LEVELS = C.framework.ratingScale.levels;
    const label = r => (LEVELS.find(l => l.rating === r) || {}).label || '';
    const FIELDS = C.fields;
    const LENSES = C.framework.lenses;
    const score = (fid, lens) => {
      let a = 0, b = 0;
      for (const c of CRIT) { a += C.scorecard[fid][c.id].rating * lens.weights[c.id]; b += lens.weights[c.id]; }
      return a / b;
    };
    const ranked = lens => FIELDS.map(f => ({ f, s: score(f.id, lens) })).sort((x, y) => y.s - x.s);
    const winners = new Set(LENSES.map(l => ranked(l)[0].f.id));
    const ordinal = n => ['1st', '2nd', '3rd'][n] || (n + 1) + 'th';
    const cellBg = r => mix(PAPER, RED, (r - 1) / 4 * 0.85);
    const cellFg = r => (r >= 4 ? '#f4efe4' : '#1d1b18');

    const roman = { 1: 'I', 2: 'II' };
    let lens = LENSES[0], fieldIdx = 0, critIdx = 0;

    // ---------- sections ----------
    // Demo at the top of the page (optional "demo" block in iv-content.json; player lives in tms-demo/).
    const D = C.demo;
    const demo = D ? `
      <section id="iv-demo" style="margin:0 0 64px">
        <span class="sc" style="color:var(--accent)">${t(D.kicker)}</span>
        <h2 style="font-size:34px;margin-top:2px">${t(D.heading)}</h2>
        <p class="lede">${D.lede.map(s => t(s.text) + cite(s.sourceIds)).join(' ')}</p>
        <div id="iv-demo-mount"><div class="pending">Loading the demo…</div></div>
        <p class="iv-caption">${D.notes.map(s => t(s.text) + cite(s.sourceIds)).join(' ')} <a href="${esc(D.fullPage.url)}">${t(D.fullPage.label)} →</a></p>
      </section>` : '';

    const thesis = `
      <h1>${t(C.thesis.headline)}</h1>
      <p class="lede">${C.thesis.sentences.map(s => t(s.text) + cite(s.sourceIds)).join(' ')}</p>
      <div class="iv-glance" id="iv-glance"></div>`;

    const lineage = [
      ['DARPA\u2019s Heilmeier Catechism', ['heilmeier-darpa', 'arpah-heilmeier-medium']],
      ['Stanford Biodesign', ['biodesign-guide', 'biodesign-need-screening']],
      ['NASA and DoD readiness levels', ['nasa-trl', 'dod-biomedical-trl']],
      ['FDA device guidance', ['fda-study-market']],
      ['NSF I-Corps', ['nsf-icorps-solicitation']],
      ['research on how venture capitalists decide', ['gompers2020-jfe']],
    ];
    const framework = `
      <section class="prose" id="iv-framework">
        <h2>The full evaluation: how we judged</h2>
        <p>These three fields aren\u2019t on the same axis. Brain stimulation is a therapy already in clinics, biohybrid implants are a new way to connect hardware to the brain, and connectomics is a mapping tool. So before asking which is most promising, we asked promising for whom, by what standard, and on what timeline. Our answers: for patients and the founders who serve them, by six criteria borrowed from the people who fund, regulate and invest in medical technology, over roughly the next ten years.</p>
        <p>${t(C.framework.intro)} We drew on ${lineage.map(([n, ids], i) => (i === lineage.length - 1 ? 'and ' : '') + n + cite(ids)).join(', ')}.</p>
      </section>
      <div class="iv-scroll" style="margin-top:20px"><table class="iv-table">
        <thead><tr><th></th><th>criterion</th><th>the test</th><th>what we looked for</th></tr></thead>
        <tbody>${CRIT.map(c => `<tr><td class="n">${c.number}</td><td>${t(c.name)}<div class="who">Evaluated by ${t(c.owner)}</div></td><td class="test">${t(c.test)}</td><td>${t(c.lookedFor)}${cite(c.groundedIn)}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="iv-scale">
        <div><span class="lbl sc">How we rate</span>
          <ul>${LEVELS.map(l => `<li><span class="iv-swatch" style="background:${cellBg(l.rating)};color:${cellFg(l.rating)}">${l.rating}</span><span><b style="font-weight:600">${t(l.label)}.</b> ${t(l.meaning)}</span></li>`).join('')}</ul>
          <p class="iv-caption">${t(C.framework.ratingScale.direction)} ${t(C.framework.ratingScale.biodesignNote.text)}${cite(C.framework.ratingScale.biodesignNote.sourceIds)}</p>
        </div>
        <div><span class="lbl sc">Whose perspective?</span>
          <p style="margin:0 0 8px">${t(C.framework.lensNote)}</p>
          <ul>${LENSES.map(l => `<li><span><b style="font-weight:600">${t(l.name)}.</b> ${t(l.rationale)}</span></li>`).join('')}</ul>
        </div>
      </div>`;

    const scorecard = `
      <section id="iv-scorecard">
        <h2>How the three fields compare</h2>
        <p class="iv-lensnote">Pick a perspective to reweight the criteria, then click any cell to read the evidence behind it. How we chose the criteria is in the full evaluation below.</p>
        <div class="iv-lenses" role="group" aria-label="Perspective">${LENSES.map((l, i) => `<button data-lens="${i}" aria-pressed="${i === 0}">${t(l.name)}</button>`).join('')}</div>
        <p id="iv-lenssent" aria-live="polite" style="margin:0 0 14px"></p>
        <div class="iv-scroll"><table class="iv-score">
          <caption class="sc" style="text-align:left;color:var(--ink-2);padding-bottom:6px">Our ratings, 1 to 5</caption>
          <thead><tr><th></th>${CRIT.map(c => `<th>${c.number}<br>${t(c.shortName)}</th>`).join('')}<th>Weighted</th></tr></thead>
          <tbody id="iv-scorebody"></tbody>
        </table></div>
        <p class="iv-caption">${t(C.framework.ratingScale.note)}</p>
      </section>`;

    const explorer = `
      <section id="iv-explorer-sec">
        <h2>The evidence, criterion by criterion</h2>
        <div class="iv-explorer">
          <div class="iv-tabs" role="tablist" aria-label="Field">${FIELDS.map((f, i) => `<button role="tab" data-field="${i}" aria-selected="${i === 0}">${t(f.name)}</button>`).join('')}</div>
          <div id="iv-fielddef"></div>
          <div class="iv-steps">
            <button id="iv-prev" aria-label="Previous criterion">\u2039</button>
            <div class="dots">${CRIT.map((c, i) => `<button data-crit="${i}" aria-label="Criterion ${c.number}: ${esc(c.name)}">${c.number} ${t(c.shortName)}</button>`).join('')}</div>
            <button id="iv-next" aria-label="Next criterion">\u203A</button>
            <span class="count" id="iv-count"></span>
          </div>
          <div id="iv-live" aria-live="polite" style="position:absolute;left:-9999px"></div>
          <div id="iv-slides">${FIELDS.map((f, fi) => f.slides.map((s, ci) => slideHTML(f, s, fi, ci)).join('')).join('')}</div>
        </div>
      </section>`;

    const conv = C.convergence;
    const convergence = `
      <section class="iv-conv">
        <h2>${t(conv.heading)}</h2>
        <div class="iv-fig">${convergenceSVG(conv)}
          <ul>${conv.explanation.map(e => `<li>${t(e.text)}${cite(e.sourceIds)}</li>`).join('')}</ul>
        </div>
      </section>`;

    const sham = `
      <section>
        <h2>The sham question</h2>
        <p class="iv-big">${t(C.sham.headline)}</p>
        <div class="iv-fig">${shamChart(C.charts.openLabelVsSham)}</div>
        <div class="prose" style="margin-top:16px">${C.sham.explanation.map(e => `<p>${t(e.text)}${cite(e.sourceIds)}</p>`).join('')}</div>
      </section>`;

    const also = `
      <section id="iv-also">
        <h2>${t(C.alsoAnswers.heading.replace('Questions 1 and 2', 'questions I and II'))}</h2>
        <div class="iv-two">${C.alsoAnswers.items.map(a => `<div><span class="num">${roman[a.question]}</span><h3>${t(a.title)}</h3><p style="margin:0">${t(a.body)}${cite(a.sourceIds)}</p></div>`).join('')}</div>
      </section>`;

    // Build in reading order so citation numbers run top to bottom.
    let html = demo + thesis + convergence + scorecard + sham + also + framework + explorer;
    html += `<section><h2>Sources for page IV</h2><ol class="iv-refs">${order.map((id, i) => {
      const s = SRC.get(id);
      const tag = TYPE_LABEL[s.type] ? `<span class="iv-tag">${TYPE_LABEL[s.type]}</span>` : '';
      return `<li id="ivref-${i + 1}">${tag}<a class="t" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${t(s.title)}</a>. ${t(s.publisher)}${s.year ? ', ' + s.year : ''}.${s.note ? ' ' + t(s.note) : ''}</li>`;
    }).join('')}</ol></section>`;
    root.innerHTML = html;

    // ---------- slides ----------
    function slideHTML(f, s, fi, ci) {
      const c = CRIT[ci], r = C.scorecard[f.id][c.id];
      const groups = [];
      for (const e of s.evidence) {
        let g = groups.find(x => x.name === e.group);
        if (!g) groups.push(g = { name: e.group, items: [] });
        g.items.push(e);
      }
      const side = sideVisual(f, s, ci);
      return `<article class="iv-slide${side ? '' : ' novis'}" data-f="${fi}" data-c="${ci}" ${fi === 0 && ci === 0 ? '' : 'hidden'} aria-label="${esc(f.name)}, criterion ${c.number} of 6: ${esc(c.name)}">
        <div>
          <div class="iv-crit"><span class="n">${c.number}</span><div><h3>${t(c.name)}</h3><span class="test">${t(c.test)}</span></div></div>
          <div class="iv-owner">Evaluated by ${t(s.owner)}</div>
          <div class="iv-meter" aria-label="Rated ${r.rating} of 5, ${label(r.rating)}"><span class="segs">${[1, 2, 3, 4, 5].map(n => `<span class="${n <= r.rating ? 'f' : ''}"></span>`).join('')}</span><span>${r.rating} of 5, ${label(r.rating).toLowerCase()}</span></div>
          <p class="iv-rationale">${t(r.rationale)}</p>
          <p class="iv-verdict">${t(s.verdict)}</p>
          ${groups.map(g => `<div class="iv-group">${t(g.name || 'Evidence')}</div><ul class="iv-ev">${g.items.map(e => `<li>${e.qualifier ? `<span class="iv-tag">${t(e.qualifier)}</span>` : ''}${t(e.text)}${cite(e.sourceIds)}</li>`).join('')}</ul>`).join('')}
          ${s.caveats && s.caveats.length ? `<div class="iv-caveats"><span class="sc" style="color:var(--ink-2)">What would change our mind</span><ul>${s.caveats.map(x => `<li>${t(x)}</li>`).join('')}</ul></div>` : ''}
          ${(s.callouts || []).map(q => `<div class="iv-callout"><div class="hd">Connects to question ${roman[q.question]}</div><p><b style="font-weight:600">${t(q.title)}.</b> ${t(q.body)}${cite(q.sourceIds)}</p>${q.link ? jumpButton(q.link) : ''}</div>`).join('')}
          <details><summary>Questions we asked</summary><ul>${c.questions.map(q => `<li>${t(q)}</li>`).join('')}</ul></details>
        </div>
        ${side ? `<div class="iv-side">${side}</div>` : ''}
      </article>`;
    }

    function jumpButton(link) {
      const m = /\/q4\/(\w+)\?c=(\d)/.exec(link.to || '');
      if (!m) return '';
      const fi = FIELDS.findIndex(f => f.id === m[1]);
      return fi < 0 ? '' : `<button data-jump="${fi},${+m[2] - 1}">${t(link.label)}</button>`;
    }

    function sideVisual(f, s, ci) {
      let out = '';
      if (s.readiness) out += readiness(s.readiness);
      if (f.id === 'stimulation' && ci === 4) out += `<div style="margin-top:${out ? 18 : 0}px">${coverageChart(C.charts.coverageGap)}</div>`;
      return out;
    }

    function readiness(items) {
      return `<span class="lbl sc">Readiness, our estimate</span><div class="iv-ready">${items.map(it => {
        const [lo, hi] = it.trlRange || [it.trl, it.trl];
        return `<div class="row"><div class="name">${t(it.label)}</div><div class="track" role="img" aria-label="TRL ${lo === hi ? lo : lo + ' to ' + hi}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<span class="${n <= hi ? 'f' : ''}" style="${n > lo && n <= hi ? 'opacity:.55' : ''}"></span>`).join('')}</div></div>`;
      }).join('')}<div class="axis"><span>1 idea</span><span>6 first humans</span><span>9 in use</span></div><div class="foot">${t(C.framework.trlFootnote)}${cite(C.framework.trlSourceIds)}</div></div>`;
    }

    // ---------- signature visuals shown under each field's definition ----------
    function signature(f) {
      if (f.id === 'biohybrid') {
        const d = C.charts.biohybridEvidence;
        return `<span class="lbl sc">${t(d.title)}</span><ol class="iv-stepsfig">${d.steps.map(s => `<li><span class="st ${s.status}">${t(d.statusLabels[s.status])}</span><span>${t(s.label)}. ${t(s.detail)}${cite(s.sourceIds)}</span></li>`).join('')}</ol>`;
      }
      if (f.id === 'connectomics') return scaleChart(C.charts.connectomeScale);
      return timeline(C.charts.stimulationTimeline);
    }

    function timeline(d) {
      return `<span class="lbl sc">${t(d.title)}</span><div class="iv-timeline">${d.tracks.map(tr => `<div><span class="sc" style="color:var(--accent)">${t(tr.label)}</span><ol>${tr.events.map(e => `<li><span class="yr">${e.year}</span><span>${t(e.label)}${cite(e.sourceIds)}<span class="kind">${t(d.kindLabels[e.kind])}</span></span></li>`).join('')}</ol></div>`).join('')}</div>`;
    }

    function shamChart(d) {
      const W = 720, rowH = 100, top = 6, x0 = 10, w = 560, max = 60;
      const X = v => x0 + v / max * w;
      const F = 'font-family="EB Garamond, serif"';
      const bottom = top + d.groups.length * rowH;
      let s = `<svg viewBox="0 0 ${W} ${bottom + 26}" role="img" aria-label="${esc(d.summary)}">
        <defs><pattern id="iv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ebe4d4"/><line x1="0" y1="0" x2="0" y2="6" stroke="#5d574c" stroke-width="2"/></pattern></defs>`;
      [0, 20, 40, 60].forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${top + 26}" y2="${bottom}" stroke="#cdc3ae"/><text x="${X(v)}" y="${bottom + 20}" text-anchor="${v === 0 ? 'start' : 'middle'}" font-size="15" fill="#5d574c" ${F}>${v}%</text>`; });
      d.groups.forEach((g, i) => {
        const y = top + i * rowH;
        s += `<text x="${x0}" y="${y + 18}" font-size="18" fill="#1d1b18" ${F}>${esc(sq(g.label))}</text>`;
        if (g.range) {
          s += `<rect x="${X(g.range[0])}" y="${y + 30}" width="${X(g.range[1]) - X(g.range[0])}" height="22" fill="#1f3d5a"/><text x="${X(g.range[1]) + 8}" y="${y + 46}" font-size="15" fill="#1f3d5a" ${F}>${g.range[0]}\u2013${g.range[1]}% responded</text>`;
        } else {
          s += `<rect x="${X(0)}" y="${y + 28}" width="${X(g.active) - X(0)}" height="20" fill="#7b2d26"/><text x="${X(g.active) + 8}" y="${y + 43}" font-size="15" fill="#7b2d26" ${F}>Active ${g.active}%${g.activeFraction ? ' (' + g.activeFraction + ')' : ''}</text>`;
          s += `<rect x="${X(0)}" y="${y + 52}" width="${X(g.sham) - X(0)}" height="20" fill="url(#iv-hatch)" stroke="#5d574c"/><text x="${X(g.sham) + 8}" y="${y + 67}" font-size="15" fill="#5d574c" ${F}>Sham ${Math.round(g.sham)}%${g.shamFraction ? ' (' + g.shamFraction + ')' : ''}</text>`;
          if (g.expectedActive) s += `<line x1="${X(g.expectedActive)}" x2="${X(g.expectedActive)}" y1="${y + 24}" y2="${y + 76}" stroke="#1d1b18" stroke-dasharray="4 3"/><text x="${X(g.expectedActive) + 6}" y="${y + 90}" font-size="14" fill="#1d1b18" ${F}>expected ${g.expectedActive}%</text>`;
        }
      });
      s += '</svg>';
      const rows = d.groups.map(g => `<tr><td>${t(g.label)}</td><td>${g.range ? g.range.join('\u2013') + '%' : g.active + '%'}</td><td>${g.range ? '\u2014' : Math.round(g.sham) + '%'}</td><td>${cite(g.sourceIds)}</td></tr>`).join('');
      return `<span class="lbl sc">${t(d.title)}</span>${s}<p class="figcap">${t(d.takeaway)}</p><details><summary>Show the numbers</summary><table><tr><th>Study</th><th>Active</th><th>Sham</th><th>Source</th></tr>${rows}</table></details>`;
    }

    function scaleChart(d) {
      const W = 720, H = 250, x0 = 30, w = 660, axisY = 200, lo = 2, hi = 11;
      const X = c => x0 + (Math.log10(c) - lo) / (hi - lo) * w;
      const pts = d.points.filter(p => p.count);
      const rows = { 'Worm (C. elegans)': 0, 'Human cortex sample (H01)': 1, 'Fruit fly': 2, 'Mouse visual cortex sample (MICrONS)': 3, 'Whole human brain': 0 };
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.summary)}"><line x1="${x0}" x2="${x0 + w}" y1="${axisY}" y2="${axisY}" stroke="#1d1b18"/>`;
      const SUP = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079';
      const sup = n => String(n).split('').map(d => SUP[+d]).join('');
      for (let e = lo; e <= hi; e++) s += `<line x1="${X(10 ** e)}" x2="${X(10 ** e)}" y1="${axisY}" y2="${axisY + 6}" stroke="#1d1b18"/><text x="${X(10 ** e)}" y="${axisY + 22}" text-anchor="middle" font-size="14" fill="#5d574c" font-family="EB Garamond, serif">10${sup(e)}</text>`;
      pts.forEach(p => {
        const x = X(p.count), row = rows[p.label] ?? 0, ly = 30 + row * 38;
        const fill = p.status === 'complete' ? '#1f3d5a' : p.status === 'partial' ? 'url(#iv-half)' : 'none';
        const anchor = x > W - 160 ? 'end' : 'start';
        s += `<line x1="${x}" x2="${x}" y1="${ly + 6}" y2="${axisY - 8}" stroke="#cdc3ae"/>`;
        s += `<circle cx="${x}" cy="${axisY}" r="7" fill="${fill}" stroke="#1f3d5a" stroke-width="1.6" ${p.status === 'not-mapped' ? 'stroke-dasharray="3 2"' : ''}/>`;
        s += `<text x="${x + (anchor === 'start' ? 4 : -4)}" y="${ly}" text-anchor="${anchor}" font-size="15" fill="#1d1b18" font-family="EB Garamond, serif">${esc(sq(p.label))}</text><text x="${x + (anchor === 'start' ? 4 : -4)}" y="${ly + 16}" text-anchor="${anchor}" font-size="13" fill="#5d574c" font-family="EB Garamond, serif">${esc(p.countLabel || p.count.toLocaleString())} ${esc(p.unitLabel)}, ${esc(sq(p.scope).toLowerCase())}</text>`;
      });
      s += `<defs><linearGradient id="iv-half"><stop offset="50%" stop-color="#1f3d5a"/><stop offset="50%" stop-color="#f4efe4"/></linearGradient></defs></svg>`;
      const tableRows = d.points.map(p => `<tr><td>${t(p.label)}</td><td>${p.count ? esc(p.countLabel || p.count.toLocaleString()) + ' ' + esc(p.unitLabel) : 'not reported'}</td><td>${t(p.status.replace('-', ' '))}</td><td>${cite(p.sourceIds)}</td></tr>`).join('');
      return `<span class="lbl sc">${t(d.title)}</span>${s}<p class="figcap">Filled: complete map. Half filled: a cubic-millimeter sample. Dashed: not yet mapped. ${t(d.countNote)} ${t(d.annotation.text)}${cite(d.annotation.sourceIds)}</p><details><summary>Show the numbers</summary><table><tr><th>Map</th><th>Size</th><th>Status</th><th>Source</th></tr>${tableRows}</table></details>`;
    }

    function coverageChart(d) {
      const W = 300, rowH = 58, x0 = 0, w = 250;
      let s = `<svg viewBox="0 0 ${W} ${d.bars.length * rowH + 4}" role="img" aria-label="${esc(d.summary)}">`;
      d.bars.forEach((b, i) => {
        const y = i * rowH;
        s += `<text x="0" y="${y + 15}" font-size="14" fill="#1d1b18" font-family="EB Garamond, serif">${esc(sq(b.label))}</text><rect x="${x0}" y="${y + 22}" width="${w}" height="16" fill="#ebe4d4"/><rect x="${x0}" y="${y + 22}" width="${b.value / 100 * w}" height="16" fill="${i === 0 ? '#7b2d26' : '#1f3d5a'}"/><text x="${x0 + b.value / 100 * w + 6}" y="${y + 35}" font-size="14" fill="#1d1b18" font-family="EB Garamond, serif">${b.value}%</text>`;
      });
      s += '</svg>';
      return `<span class="lbl sc">${t(d.title)}</span>${s}<p class="figcap">${t(d.headlineStat.text)}${cite(d.sourceIds)}</p>`;
    }

    function convergenceSVG(c) {
      const nodes = c.nodes;
      let s = `<svg viewBox="0 0 760 260" role="img" aria-label="Connectomics tells stimulation where to stimulate, LLM-based decoding tells it when, and biohybrid implants may later provide a better interface. All three feed brain stimulation, which reaches patients.">`;
      nodes.forEach((n, i) => {
        const y = 40 + i * 85;
        s += `<rect x="10" y="${y - 24}" width="220" height="48" fill="#f4efe4" stroke="#1d1b18"/><text x="120" y="${y + 6}" text-anchor="middle" font-size="17" fill="#1d1b18" font-family="EB Garamond, serif">${esc(sq(n.label.replace(' (Question 3)', ' (III)')))}</text>`;
        s += `<line x1="230" y1="${y}" x2="478" y2="130" stroke="${n.edgeStyle === 'dashed' ? '#5d574c' : '#7b2d26'}" stroke-width="1.6" ${n.edgeStyle === 'dashed' ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#iv-arrow)"/>`;
        const ly = y + (130 - y) * (262 - 230) / 248;
        s += `<text x="262" y="${i === 2 ? ly + 24 : ly - 10}" font-size="15" font-style="italic" fill="#5d574c" font-family="EB Garamond, serif">${esc(sq(n.edgeLabel))}</text>`;
      });
      s += `<rect x="482" y="104" width="160" height="52" fill="#1d1b18"/><text x="562" y="136" text-anchor="middle" font-size="18" fill="#f4efe4" font-family="EB Garamond, serif">${esc(sq(c.hub.label))}</text>`;
      s += `<line x1="642" y1="130" x2="690" y2="130" stroke="#7b2d26" stroke-width="1.6" marker-end="url(#iv-arrow)"/><text x="700" y="136" font-size="18" fill="#1d1b18" font-family="EB Garamond, serif">${esc(c.destination.label)}</text>`;
      s += `<defs><marker id="iv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7b2d26"/></marker></defs></svg>`;
      return s + `<p class="figcap">The dashed line is a future possibility, not a current one.</p>`;
    }

    // ---------- interactivity ----------
    const $ = sel => root.querySelector(sel);

    function drawGlance() {
      const r = ranked(lens);
      $('#iv-glance').innerHTML = r.map((x, i) => `<div class="${i === 0 ? 'first' : ''}"><span class="rank sc">${ordinal(i)} under the ${esc(lens.name.toLowerCase())} lens</span><h3>${t(x.f.name)}</h3><p class="verdict">${t(x.f.verdict)}</p><span class="score">Weighted score ${x.s.toFixed(1)} of 5</span><button data-open="${FIELDS.indexOf(x.f)}">Read the evaluation</button></div>`).join('');
    }

    function drawScore() {
      const r = ranked(lens);
      const rankOf = new Map(r.map((x, i) => [x.f.id, i]));
      $('#iv-scorebody').innerHTML = FIELDS.map((f, fi) => `<tr><th scope="row">${t(f.name)}</th>${CRIT.map((c, ci) => {
        const v = C.scorecard[f.id][c.id];
        return `<td style="background:${cellBg(v.rating)}"><button data-cell="${fi},${ci}" title="${esc(sq(v.rationale))}" style="color:${cellFg(v.rating)}" aria-label="${esc(f.name)}, ${esc(c.name)}: ${v.rating} of 5, ${label(v.rating)}. Show the evidence."><span class="num">${v.rating}</span><span class="lab">${label(v.rating)}</span></button></td>`;
      }).join('')}<td class="total">${score(f.id, lens).toFixed(1)}<small>${ordinal(rankOf.get(f.id))}</small></td></tr>`).join('');
      const top = r[0].f.name;
      const holds = winners.size === 1;
      $('#iv-lenssent').innerHTML = `Under the ${esc(lens.name.toLowerCase())} lens, ${esc(top.toLowerCase())} ranks first.${holds ? ' The ranking at the top holds under every lens we tried.' : ''} <span style="color:var(--ink-2)">${t(lens.rationale)}</span>`;
    }

    function showSlide(announce) {
      root.querySelectorAll('.iv-slide').forEach(el => { el.hidden = !(+el.dataset.f === fieldIdx && +el.dataset.c === critIdx); });
      root.querySelectorAll('.iv-tabs button').forEach((b, i) => b.setAttribute('aria-selected', i === fieldIdx));
      root.querySelectorAll('.iv-steps .dots button').forEach((b, i) => { if (i === critIdx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      $('#iv-count').textContent = `${critIdx + 1} of 6`;
      $('#iv-prev').disabled = critIdx === 0;
      $('#iv-next').disabled = critIdx === 5;
      const f = FIELDS[fieldIdx];
      $('#iv-fielddef').innerHTML = `<div class="iv-fielddef"><p class="verdict">${t(f.verdict)}</p><p>${t(f.definition)}${citeExisting(f.definitionSourceIds)}</p></div><div class="iv-sig">${signatureCache[fieldIdx]}</div>`;
      if (announce) $('#iv-live').textContent = `${f.name}, criterion ${critIdx + 1} of 6: ${CRIT[critIdx].name}`;
    }

    // Field definitions and signature charts were not part of the first render,
    // so number their citations now (they append to the end of the source list).
    const citeExisting = ids => cite(ids);
    const signatureCache = FIELDS.map(f => signature(f));
    FIELDS.forEach(f => cite(f.definitionSourceIds));
    rebuildRefs();

    function rebuildRefs() {
      const ol = root.querySelector('.iv-refs');
      if (!ol) return;
      ol.innerHTML = order.map((id, i) => {
        const s = SRC.get(id);
        const tag = TYPE_LABEL[s.type] ? `<span class="iv-tag">${TYPE_LABEL[s.type]}</span>` : '';
        return `<li id="ivref-${i + 1}">${tag}<a class="t" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${t(s.title)}</a>. ${t(s.publisher)}${s.year ? ', ' + s.year : ''}.${s.note ? ' ' + t(s.note) : ''}</li>`;
      }).join('');
    }

    function openSlide(fi, ci, scroll) {
      fieldIdx = fi; critIdx = ci; showSlide(true);
      if (scroll) document.getElementById('iv-explorer-sec').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }

    root.addEventListener('click', e => {
      const ref = e.target.closest('[data-ref]');
      if (ref) {
        e.preventDefault(); // keep the URL hash, which drives page routing
        const li = document.getElementById('ivref-' + ref.dataset.ref);
        if (li) { li.scrollIntoView({ block: 'center' }); li.classList.add('flash'); setTimeout(() => li.classList.remove('flash'), 1600); }
        return;
      }
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.lens) { lens = LENSES[+b.dataset.lens]; root.querySelectorAll('[data-lens]').forEach(x => x.setAttribute('aria-pressed', x === b)); drawScore(); drawGlance(); }
      else if (b.dataset.cell) { const [fi, ci] = b.dataset.cell.split(',').map(Number); openSlide(fi, ci, true); }
      else if (b.dataset.open) openSlide(+b.dataset.open, 0, true);
      else if (b.dataset.field) { fieldIdx = +b.dataset.field; showSlide(true); }
      else if (b.dataset.crit) { critIdx = +b.dataset.crit; showSlide(true); }
      else if (b.dataset.jump) { const [fi, ci] = b.dataset.jump.split(',').map(Number); openSlide(fi, ci, true); }
      else if (b.id === 'iv-prev' && critIdx > 0) { critIdx--; showSlide(true); }
      else if (b.id === 'iv-next' && critIdx < 5) { critIdx++; showSlide(true); }
    });

    // Left/right arrows move between criteria when focus is inside the explorer.
    root.querySelector('.iv-explorer').addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, summary')) return;
      if (e.key === 'ArrowRight' && critIdx < 5) { critIdx++; showSlide(true); }
      else if (e.key === 'ArrowLeft' && critIdx > 0) { critIdx--; showSlide(true); }
    });

    // Swipe between criteria on touch screens.
    let x0 = null;
    const slides = $('#iv-slides');
    slides.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    slides.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) < 60) return;
      if (dx < 0 && critIdx < 5) critIdx++; else if (dx > 0 && critIdx > 0) critIdx--; else return;
      showSlide(true);
    }, { passive: true });

    drawGlance();
    drawScore();
    showSlide(false);
    if (D) mountDemo(D);

    function mountDemo(d) {
      const el = $('#iv-demo-mount');
      const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(s); });
      (window.TMSDemo && window.TMS_DEMO ? Promise.resolve() : Promise.all(d.scripts.map(load)))
        .then(() => window.TMSDemo.mount(el, window.TMS_DEMO))
        .catch(err => { console.error(err); el.innerHTML = '<div class="pending">The demo couldn’t load. Check that the tms-demo folder sits next to index.html.</div>'; });
    }
  }
})();
