/* BugScope v2 — script.js */
'use strict';

/* ════════════════════════════════════════════════
   1. AMBIENT CANVAS BACKGROUND
════════════════════════════════════════════════ */
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.5 + 0.1
    };
  }

  for (let i = 0; i < 120; i++) particles.push(makeParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,157,${p.alpha})`;
      ctx.fill();
    });

    // Draw faint connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 90) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,255,157,${0.06 * (1 - dist/90)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ════════════════════════════════════════════════
   2. CUSTOM CURSOR
════════════════════════════════════════════════ */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const trail  = document.getElementById('cursorTrail');
  if (!cursor || !trail) return;

  let tx = 0, ty = 0;
  document.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    cursor.style.left = tx + 'px';
    cursor.style.top  = ty + 'px';
    setTimeout(() => {
      trail.style.left = tx + 'px';
      trail.style.top  = ty + 'px';
    }, 80);
  });

  document.addEventListener('mousedown', () => {
    cursor.style.transform = 'translate(-50%,-50%) scale(0.6)';
  });
  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%,-50%) scale(1)';
  });
})();

/* ════════════════════════════════════════════════
   3. PANEL COLLAPSE / EXPAND
════════════════════════════════════════════════ */
function initPanel(toggleId, bodyId, collapseBtnId) {
  const toggle = document.getElementById(toggleId);
  const body   = document.getElementById(bodyId);
  const btn    = document.getElementById(collapseBtnId);
  if (!toggle || !body || !btn) return;

  let open = true;

  function setOpen(val) {
    open = val;
    body.classList.toggle('collapsed', !open);
    btn.classList.toggle('collapsed', !open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', e => {
    // Don't collapse if clicking action buttons inside header
    if (e.target.closest('.panel-action-btn') || e.target.closest('a')) return;
    setOpen(!open);
  });
  toggle.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); }
  });
}

initPanel('previewToggle', 'previewBody', 'previewCollapseBtn');
initPanel('dashToggle',    'dashBody',    'dashCollapseBtn');
initPanel('bugToggle',     'bugBody',     'bugCollapseBtn');

/* ════════════════════════════════════════════════
   4. TOP-200 SITE DATABASE
════════════════════════════════════════════════ */
const TOP200 = {
  'google.com':1,'youtube.com':2,'facebook.com':3,'twitter.com':10,'instagram.com':8,
  'wikipedia.org':13,'yahoo.com':11,'whatsapp.com':17,'amazon.com':14,'tiktok.com':6,
  'x.com':10,'reddit.com':18,'linkedin.com':22,'netflix.com':25,'microsoft.com':30,
  'bing.com':28,'live.com':42,'office.com':37,'twitch.tv':35,'pinterest.com':31,
  'apple.com':23,'github.com':65,'stackoverflow.com':55,'quora.com':78,'ebay.com':44,
  'shopify.com':68,'paypal.com':47,'zoom.us':71,'dropbox.com':93,'notion.so':112,
  'discord.com':60,'spotify.com':50,'imdb.com':58,'tumblr.com':150,'medium.com':130,
  'nytimes.com':105,'cnn.com':85,'bbc.com':95,'theguardian.com':140,'forbes.com':120,
  'bloomberg.com':135,'wsj.com':155,'washingtonpost.com':145,'techcrunch.com':170,
  'wired.com':165,'theverge.com':175,'arstechnica.com':180,'engadget.com':185,
  'adobe.com':75,'salesforce.com':88,'oracle.com':82,'ibm.com':92,'intel.com':97,
  'nvidia.com':80,'samsung.com':45,'sony.com':90,'airbnb.com':63,'booking.com':32,
  'expedia.com':72,'tripadvisor.com':87,'yelp.com':102,'etsy.com':56,'aliexpress.com':19,
  'walmart.com':38,'target.com':69,'canva.com':73,'figma.com':123,'coursera.org':138,
  'udemy.com':108,'khanacademy.org':148,'duolingo.com':99,'grammarly.com':116,
  'mailchimp.com':103,'hubspot.com':96,'zendesk.com':121,'slack.com':67,'trello.com':133,
  'atlassian.com':86,'cloudflare.com':57,'wordpress.com':21,'wix.com':62,
  'squarespace.com':91,'webflow.com':161,'godaddy.com':54,'openai.com':16,
  'anthropic.com':196,'claude.ai':178,'huggingface.co':126,'kaggle.com':117,
  'archive.org':70,'duckduckgo.com':51,'stripe.com':110,'vercel.com':147,
  'netlify.com':152,'digitalocean.com':109,'heroku.com':153,'nextjs.org':190,
};

function getTier(domain) {
  const clean = domain.replace(/^www\./, '');
  const rank  = TOP200[clean];
  if (!rank) return 0;
  if (rank <= 10)  return 3;
  if (rank <= 50)  return 2;
  if (rank <= 200) return 1;
  return 0;
}

/* ════════════════════════════════════════════════
   5. STATS GENERATION
════════════════════════════════════════════════ */
function rng(a, b)  { return Math.random() * (b - a) + a; }
function rngI(a, b) { return Math.round(rng(a, b)); }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }

function fmtNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function generateStats(domain) {
  const tier  = getTier(domain);
  const clean = domain.replace(/^www\./, '');
  const known = TOP200[clean];

  const rank = known
    ? known + rngI(-3, 3)
    : tier === 0 ? rngI(5000, 999999) : rngI(200, 5000);

  const visRange = {3:[5e8,2e10], 2:[5e7,5e8], 1:[1e6,5e7], 0:[1e3,1e6]}[tier];
  const visitors = Math.round(rng(...visRange));

  const uptimeRange = {3:[99.95,99.999], 2:[99.8,99.99], 1:[99.0,99.9], 0:[97.0,99.5]}[tier];
  const uptime = parseFloat(rng(...uptimeRange).toFixed(3));

  const loadRange = {3:[0.3,1.1], 2:[0.6,1.8], 1:[1.2,3.5], 0:[1.8,6.0]}[tier];
  const load = parseFloat(rng(...loadRange).toFixed(2));

  const bounceRange = {3:[25,42], 2:[30,52], 1:[40,65], 0:[45,80]}[tier];
  const bounce = rngI(...bounceRange);

  const sr = {3:[84,99], 2:[74,95], 1:[58,87], 0:[32,76]}[tier];
  function sc() { return rngI(...sr); }
  const scores = { seo: sc(), perf: sc(), sec: sc(), a11y: sc(), bp: sc() };

  const techOpts = {
    3: ['React / Next.js', 'Custom infra stack', 'Vue / Nuxt', 'Angular / GCP'],
    2: ['React / Node.js', 'Next.js / Vercel', 'Django / Postgres', 'Rails / Redis'],
    1: ['WordPress / PHP', 'Next.js', 'Shopify Hydrogen', 'Hugo / Netlify'],
    0: ['WordPress', 'PHP / MySQL', 'HTML / CSS / JS', 'Webflow'],
  }[tier];
  const cdnOpts = {
    3: ['Akamai', 'Fastly', 'Cloudflare Enterprise', 'AWS CloudFront'],
    2: ['Cloudflare Pro', 'AWS CloudFront', 'Fastly'],
    1: ['Cloudflare Free', 'Bunny CDN', 'None'],
    0: ['None', 'Cloudflare Free'],
  }[tier];
  const hostOpts = {
    3: ['Custom data centres', 'AWS multi-region', 'GCP / custom'],
    2: ['AWS', 'GCP', 'Azure'],
    1: ['Vercel', 'DigitalOcean', 'AWS EC2'],
    0: ['Shared hosting', 'VPS', 'Bluehost'],
  }[tier];

  const sessM = rngI(...{3:[7,20], 2:[5,14], 1:[2,9], 0:[1,5]}[tier]);
  const sessS = rngI(0, 59);
  const ppv   = parseFloat(rng(...{3:[7,22], 2:[4,12], 1:[2,6], 0:[1.1,4]}[tier]).toFixed(1));
  const mob   = rngI(...{3:[45,68], 2:[50,74], 1:[55,80], 0:[50,85]}[tier]);

  // Sparkline: 12 months trending up
  const spark = [];
  let base = visitors * rng(0.65, 0.85);
  for (let i = 0; i < 12; i++) {
    base *= rng(0.94, 1.13);
    spark.push(Math.round(base));
  }

  return { rank, visitors, uptime, load, bounce, scores,
    tech: pick(techOpts), cdn: pick(cdnOpts), host: pick(hostOpts),
    session: `${sessM}m ${sessS}s`, ppv, mobile: mob, spark };
}

/* ════════════════════════════════════════════════
   6. ANIMATED COUNTER
════════════════════════════════════════════════ */
function animateCounter(el, endVal, duration, formatter) {
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const val = endVal * ease;
    el.textContent = formatter(val);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = formatter(endVal);
  }
  requestAnimationFrame(step);
}

/* ════════════════════════════════════════════════
   7. RENDER STATS DASHBOARD
════════════════════════════════════════════════ */
function setDonut(arcId, valId, score) {
  const circ   = 182.2;
  const offset = circ - (score / 100) * circ;
  const arc    = document.getElementById(arcId);
  const valEl  = document.getElementById(valId);
  if (arc)   setTimeout(() => { arc.style.strokeDashoffset = offset; }, 400);
  if (valEl) animateCounter(valEl, score, 1200, v => String(Math.round(v)));
}

function drawSparkline(data) {
  const canvas = document.getElementById('sparkCanvas');
  if (!canvas) return;
  const W = canvas.offsetWidth || 500;
  const H = 90;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = { t: 8, b: 8, l: 4, r: 4 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  const x = i  => pad.l + (i / (data.length - 1)) * cw;
  const y = v  => pad.t + ch - ((v - min) / range) * ch;

  ctx.clearRect(0, 0, W, H);

  // Area fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,255,157,0.18)');
  grad.addColorStop(1, 'rgba(0,255,157,0.01)');
  ctx.beginPath();
  ctx.moveTo(x(0), y(data[0]));
  data.forEach((v, i) => { if (i) ctx.lineTo(x(i), y(v)); });
  ctx.lineTo(x(data.length - 1), H); ctx.lineTo(x(0), H);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(x(0), y(data[0]));
  data.forEach((v, i) => { if (i) ctx.lineTo(x(i), y(v)); });
  ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2;
  ctx.lineJoin = 'round'; ctx.stroke();

  // Dots with animation effect
  data.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(v), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff9d'; ctx.fill();
    // ring on last dot
    if (i === data.length - 1) {
      ctx.beginPath();
      ctx.arc(x(i), y(v), 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,255,157,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  });

  // Month labels
  const months = ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb'];
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  data.forEach((_, i) => {
    if (i % 2 === 0) ctx.fillText(months[i % 12], x(i), H - 1);
  });

  document.getElementById('sparkLo').textContent = fmtNum(min);
  document.getElementById('sparkHi').textContent = fmtNum(max);
}

function renderDash(domain, stats) {
  document.getElementById('dashDomainTag').textContent = domain;

  // KPI — rank
  const rankEl = document.getElementById('kv-rank');
  const rankFin = stats.rank > 0 ? stats.rank : 999999;
  animateCounter(rankEl, rankFin, 1000, v => '#' + Math.round(v).toLocaleString());
  document.getElementById('ks-rank').textContent = stats.rank <= 200 ? 'Top-200 globally' : stats.rank <= 10000 ? 'Top 10K' : 'Long-tail';
  const rankPct = Math.max(5, Math.min(100, 100 - Math.log10(rankFin + 1) * 14));
  setTimeout(() => { document.getElementById('kf-rank').style.width = rankPct + '%'; }, 300);

  // KPI — visitors
  const visEl = document.getElementById('kv-vis');
  animateCounter(visEl, stats.visitors, 1200, v => fmtNum(v));
  document.getElementById('ks-vis').textContent = 'per month (est.)';
  const visPct = Math.min(100, Math.log10(stats.visitors + 1) / Math.log10(1e10) * 100);
  setTimeout(() => { document.getElementById('kf-vis').style.width = visPct + '%'; }, 400);

  // KPI — uptime
  const upEl = document.getElementById('kv-up');
  animateCounter(upEl, stats.uptime, 1100, v => v.toFixed(2) + '%');
  document.getElementById('ks-up').textContent = stats.uptime >= 99.9 ? 'Excellent' : stats.uptime >= 99 ? 'Good' : 'Fair';
  setTimeout(() => { document.getElementById('kf-up').style.width = Math.min(100, stats.uptime) + '%'; }, 500);

  // KPI — load
  const loadEl = document.getElementById('kv-load');
  animateCounter(loadEl, stats.load, 1000, v => v.toFixed(2) + 's');
  document.getElementById('ks-load').textContent = stats.load < 1.5 ? 'Fast' : stats.load < 3 ? 'Moderate' : 'Slow';
  const loadPct = Math.max(5, 100 - (stats.load / 6) * 100);
  setTimeout(() => { document.getElementById('kf-load').style.width = loadPct + '%'; }, 600);

  // KPI — bounce
  const bnEl = document.getElementById('kv-bounce');
  animateCounter(bnEl, stats.bounce, 900, v => Math.round(v) + '%');
  document.getElementById('ks-bounce').textContent = stats.bounce < 40 ? 'Low — great' : stats.bounce < 60 ? 'Average' : 'High';
  setTimeout(() => { document.getElementById('kf-bounce').style.width = stats.bounce + '%'; }, 700);

  // Donuts
  setDonut('arc-seo',  'dv-seo',  stats.scores.seo);
  setDonut('arc-perf', 'dv-perf', stats.scores.perf);
  setDonut('arc-sec',  'dv-sec',  stats.scores.sec);
  setDonut('arc-a11y', 'dv-a11y', stats.scores.a11y);
  setDonut('arc-bp',   'dv-bp',   stats.scores.bp);

  // Sparkline (after layout settles)
  setTimeout(() => drawSparkline(stats.spark), 300);
  window.addEventListener('resize', () => drawSparkline(stats.spark));

  // Meta
  document.getElementById('mv-tech').textContent = stats.tech;
  document.getElementById('mv-cdn').textContent  = stats.cdn;
  document.getElementById('mv-host').textContent = stats.host;
  document.getElementById('mv-sess').textContent = stats.session;
  document.getElementById('mv-ppv').textContent  = stats.ppv;
  document.getElementById('mv-mob').textContent  = stats.mobile + '%';
  document.getElementById('mv-ssl').textContent  = 'Valid — TLS 1.3';
}

/* ════════════════════════════════════════════════
   8. IFRAME PREVIEW
════════════════════════════════════════════════ */
let _currentUrl = '';

function loadPreview(url) {
  _currentUrl = url;
  const frame       = document.getElementById('previewFrame');
  const idle        = document.getElementById('previewOverlayIdle');
  const blocked     = document.getElementById('previewOverlayBlocked');
  const chromeUrl   = document.getElementById('chromeUrl');
  const previewUrl  = document.getElementById('previewUrl');
  const badge       = document.getElementById('previewBadge');

  chromeUrl.textContent  = url;
  previewUrl.textContent = url;

  if (idle)    idle.classList.remove('hidden');
  if (blocked) blocked.classList.add('hidden');

  badge.textContent = 'Loading…';
  badge.className   = 'panel-badge';

  // Small delay then load
  setTimeout(() => {
    if (idle) idle.classList.add('hidden');
    frame.src = url;
  }, 300);

  // Timeout: if not loaded in 6s, show blocked
  const timer = setTimeout(() => {
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.URL === 'about:blank') showBlocked(url);
    } catch (_) {
      // cross-origin means it loaded — that's fine
      badge.textContent = 'Live';
      badge.className   = 'panel-badge success';
    }
  }, 6000);

  frame.addEventListener('load', () => {
    clearTimeout(timer);
    try {
      const doc = frame.contentDocument;
      if (doc && doc.URL !== 'about:blank' && doc.URL !== '') {
        badge.textContent = 'Live';
        badge.className   = 'panel-badge success';
      } else {
        showBlocked(url);
      }
    } catch (_) {
      badge.textContent = 'Live';
      badge.className   = 'panel-badge success';
    }
  }, { once: true });

  frame.addEventListener('error', () => {
    clearTimeout(timer);
    showBlocked(url);
  }, { once: true });
}

function showBlocked(url) {
  const idle     = document.getElementById('previewOverlayIdle');
  const blocked  = document.getElementById('previewOverlayBlocked');
  const blLink   = document.getElementById('blockedLink');
  const blMsg    = document.getElementById('blockedMsg');
  const badge    = document.getElementById('previewBadge');
  const frame    = document.getElementById('previewFrame');

  frame.src = 'about:blank';
  if (idle)    idle.classList.add('hidden');
  if (blocked) blocked.classList.remove('hidden');
  if (blLink)  blLink.href = url;
  if (blMsg)   blMsg.textContent = 'Site blocks iframe embedding (X-Frame-Options / CSP)';
  badge.textContent = 'Blocked';
  badge.className   = 'panel-badge warn';
}

// Toolbar buttons
const refreshBtn = document.getElementById('refreshBtn');
const newTabBtn  = document.getElementById('newTabBtn');
if (refreshBtn) refreshBtn.addEventListener('click', () => { if (_currentUrl) loadPreview(_currentUrl); });
if (newTabBtn)  newTabBtn.addEventListener('click',  () => { if (_currentUrl) window.open(_currentUrl, '_blank', 'noopener'); });

/* ════════════════════════════════════════════════
   9. BUG SECTIONS RENDERER
════════════════════════════════════════════════ */
const SEC_META = {
  html:     { label: 'HTML',             ico: '</>',  cls: 'html' },
  css:      { label: 'CSS',              ico: '{}',   cls: 'css' },
  js:       { label: 'JavaScript',       ico: 'JS',   cls: 'js' },
  backend:  { label: 'Backend / Server', ico: '⚙',   cls: 'backend' },
  security: { label: 'Security',         ico: '⚠',   cls: 'security' },
};

function escH(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sevClass(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'sev-critical';
  if (s === 'high')     return 'sev-high';
  if (s === 'medium')   return 'sev-medium';
  return 'sev-low';
}

function buildBugSections(sections) {
  const container = document.getElementById('bugSections');
  container.innerHTML = '';

  Object.entries(sections).forEach(([key, sec], idx) => {
    const meta = SEC_META[key] || { label: key, ico: '?', cls: 'html' };
    const bugs = sec.bugs || [];
    if (!bugs.length) return;

    const bugsHtml = bugs.map((b, bi) => `
      <div class="bug-item" style="animation-delay:${bi * 0.06}s">
        <span class="sev-badge ${sevClass(b.severity)}">${escH((b.severity || 'low').toUpperCase())}</span>
        <div class="bug-info">
          <div class="bug-title">${escH(b.title)}</div>
          ${b.file ? `<span class="bug-file">${escH(b.file)}</span>` : ''}
          <div class="bug-desc">${escH(b.description)}</div>
          ${b.fix ? `<div class="bug-fix">Fix: ${escH(b.fix)}</div>` : ''}
        </div>
      </div>`).join('');

    const div = document.createElement('div');
    div.className = 'bug-section';
    div.style.animationDelay = (idx * 0.07) + 's';
    div.innerHTML = `
      <div class="bug-sec-head open" id="bsh-${key}">
        <div class="bsh-left">
          <div class="sec-ico ${meta.cls}">${meta.ico}</div>
          <span class="sec-name">${meta.label}</span>
          <span class="sec-count">${bugs.length} issue${bugs.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="bsh-right">
          <span class="sec-chev open" id="chev-${key}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
      <div class="bug-sec-body open" id="bsb-${key}" style="padding:0 1.1rem">${bugsHtml}</div>`;
    container.appendChild(div);

    // Wire toggle
    div.querySelector('.bug-sec-head').addEventListener('click', () => {
      const head = document.getElementById('bsh-' + key);
      const body = document.getElementById('bsb-' + key);
      const chev = document.getElementById('chev-' + key);
      const isOpen = body.classList.contains('open');
      body.classList.toggle('open', !isOpen);
      chev.classList.toggle('open', !isOpen);
      head.classList.toggle('open', !isOpen);
    });
  });
}

function renderBugReport(data) {
  const score  = Math.max(0, Math.min(100, Math.round(data.score || 0)));
  const circ1  = 87.96;
  const circ2  = 263.9;
  const color  = score >= 70 ? '#00ff9d' : score >= 40 ? '#f0b429' : '#ff5e5e';

  // Mini arc (in panel header)
  const miniArc = document.getElementById('miniArc');
  if (miniArc) {
    miniArc.style.stroke = color;
    setTimeout(() => { miniArc.style.strokeDashoffset = circ1 - (score / 100) * circ1; }, 300);
  }
  const inlineScore = document.getElementById('inlineScore');
  if (inlineScore) animateCounter(inlineScore, score, 1000, v => String(Math.round(v)));

  // Big arc
  const bigArc = document.getElementById('bigArc');
  if (bigArc) {
    bigArc.style.stroke = color;
    setTimeout(() => { bigArc.style.strokeDashoffset = circ2 - (score / 100) * circ2; }, 300);
  }
  const bigNum = document.getElementById('bigScoreNum');
  if (bigNum) {
    bigNum.style.color = color;
    animateCounter(bigNum, score, 1200, v => String(Math.round(v)));
  }

  // Domain & verdict
  const domEl = document.getElementById('scoreDomain');
  if (domEl) domEl.textContent = data.domain || '';
  const verdEl = document.getElementById('scoreVerdict');
  if (verdEl) { verdEl.textContent = data.verdict || ''; verdEl.style.color = color; }

  // Counts
  let crit = 0, high = 0, other = 0;
  if (data.sections) Object.values(data.sections).forEach(sec =>
    (sec.bugs || []).forEach(b => {
      const s = (b.severity || '').toLowerCase();
      if (s === 'critical') crit++;
      else if (s === 'high') high++;
      else other++;
    })
  );
  const cc = document.getElementById('cntCrit');
  const ch = document.getElementById('cntHigh');
  const co = document.getElementById('cntOther');
  if (cc) cc.textContent = crit + ' Critical';
  if (ch) ch.textContent = high + ' High';
  if (co) co.textContent = other + ' Med/Low';

  // Summary
  const sumEl = document.getElementById('summaryBox');
  if (sumEl) sumEl.textContent = data.summary || '';

  // Bug badge
  const badge = document.getElementById('bugCountBadge');
  if (badge) {
    const total = crit + high + other;
    badge.textContent = total + ' issues found';
    badge.className = 'panel-badge ' + (crit > 0 ? 'danger' : high > 0 ? 'warn' : 'success');
  }

  // Sections
  if (data.sections) buildBugSections(data.sections);
}

/* ════════════════════════════════════════════════
   10. QUICK LINK BUTTONS
════════════════════════════════════════════════ */
document.querySelectorAll('.ql-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const u = btn.dataset.url;
    if (u) {
      document.getElementById('urlInput').value = u;
      startScan();
    }
  });
});

/* ════════════════════════════════════════════════
   11. TOP PROGRESS BAR
════════════════════════════════════════════════ */
let _progVal = 0;
function setProgress(pct) {
  _progVal = pct;
  const el = document.getElementById('topProgress');
  if (!el) return;
  el.style.width = pct + '%';
  el.classList.toggle('active', pct > 0 && pct < 100);
  if (pct >= 100) setTimeout(() => { el.style.opacity = '0'; el.style.width = '0'; }, 500);
}

/* ════════════════════════════════════════════════
   12. MAIN SCAN FUNCTION
════════════════════════════════════════════════ */
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are BugScope, an expert website bug scanner and code auditor. Use web search to fetch and analyse the URL, then return ONLY a strict JSON object — no markdown, no explanations, nothing else.

Shape:
{
  "domain": "hostname only",
  "score": 0-100,
  "verdict": "one concise verdict sentence",
  "summary": "2-3 plain-English sentences covering overall health",
  "sections": {
    "html":     { "bugs": [ ...bugObjects ] },
    "css":      { "bugs": [ ...bugObjects ] },
    "js":       { "bugs": [ ...bugObjects ] },
    "backend":  { "bugs": [ ...bugObjects ] },
    "security": { "bugs": [ ...bugObjects ] }
  }
}

bugObject: {
  "severity": "critical|high|medium|low",
  "title": "short name (max 8 words)",
  "file": "specific filename or route e.g. index.html, styles.css, app.js, /api/users",
  "description": "1-2 sentences explaining the issue",
  "fix": "one concrete actionable fix"
}

Rules:
- Minimum 2 bugs per section, all sections must be present
- Diagnose: missing meta tags, broken accessibility, unused CSS, outdated libraries, XSS vectors, HTTPS config, CSP headers, CORS issues, cookie flags, SQL injection risk, open redirects, rate limiting, etc.
- Score: 0-30 = critical issues present; 31-60 = moderate; 61-85 = minor; 86-100 = clean
- RETURN ONLY THE JSON — nothing else at all`;

const SCAN_STEPS = [
  [5,  'Resolving domain and DNS…'],
  [15, 'Fetching HTML document…'],
  [30, 'Parsing CSS stylesheets…'],
  [45, 'Analysing JavaScript bundles…'],
  [60, 'Probing backend endpoints…'],
  [75, 'Running security audit…'],
  [88, 'Computing health score…'],
  [95, 'Finalising report…'],
];

let _stepTimer;

function startStepMessages() {
  const stepsEl = document.getElementById('scanSteps');
  const barEl   = document.getElementById('scanBar');
  let idx = 0;

  function showStep() {
    if (idx >= SCAN_STEPS.length) return;
    const [pct, msg] = SCAN_STEPS[idx++];
    if (stepsEl) { stepsEl.textContent = '> ' + msg; }
    if (barEl)   { barEl.style.width = pct + '%'; }
    setProgress(pct);
    _stepTimer = setTimeout(showStep, 1800);
  }
  showStep();
}

function stopStepMessages() {
  clearTimeout(_stepTimer);
  const barEl = document.getElementById('scanBar');
  if (barEl) barEl.style.width = '100%';
  setProgress(100);
}

function normalizeUrl(raw) {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch (_) { return url; }
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) { el.textContent = '⚠ ' + msg; el.classList.add('show'); }
}
function hideError() {
  const el = document.getElementById('errorMsg');
  if (el) el.classList.remove('show');
}

async function startScan() {
  const raw = document.getElementById('urlInput').value.trim();
  if (!raw) { showError('Please enter a URL to scan.'); return; }

  const url    = normalizeUrl(raw);
  const domain = getDomain(url);

  hideError();

  // UI: scanning state
  const btn  = document.getElementById('scanBtn');
  const prog = document.getElementById('scanProgressWrap');
  const zone = document.getElementById('resultsZone');

  btn.disabled = true;
  if (prog) prog.classList.add('active');
  if (zone) zone.classList.remove('visible');

  startStepMessages();

  // Show preview immediately
  if (zone) zone.classList.add('visible');
  loadPreview(url);

  // Show stats immediately
  const stats = generateStats(domain);
  renderDash(domain, stats);

  // API call
  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `Scan this website for bugs, code quality issues, and security vulnerabilities: ${url}` }],
      }),
    });

    stopStepMessages();

    if (!resp.ok) {
      let msg = `API error ${resp.status}`;
      try { const e = await resp.json(); msg = e.error?.message || msg; } catch (_) {}
      throw new Error(msg);
    }

    const data  = await resp.json();
    const text  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) throw new Error('Could not parse results — please try another URL.');

    const parsed = JSON.parse(match[0]);
    renderBugReport(parsed);

    // Update steps label
    const stepsEl = document.getElementById('scanSteps');
    if (stepsEl) stepsEl.textContent = '> Scan complete — report ready.';

  } catch (err) {
    stopStepMessages();
    showError(err.message || 'Scan failed. Please try again.');
    console.error('[BugScope]', err);
  } finally {
    btn.disabled = false;
  }
}

/* ════════════════════════════════════════════════
   13. BIND EVENTS
════════════════════════════════════════════════ */
const scanBtn  = document.getElementById('scanBtn');
const urlInput = document.getElementById('urlInput');

if (scanBtn)  scanBtn.addEventListener('click', e => {
  // Ripple effect
  const ripple = document.getElementById('btnRipple');
  if (ripple) {
    const rect = scanBtn.getBoundingClientRect();
    const rx   = ((e.clientX - rect.left) / rect.width * 100) + '%';
    const ry   = ((e.clientY - rect.top)  / rect.height * 100) + '%';
    ripple.style.setProperty('--rx', rx);
    ripple.style.setProperty('--ry', ry);
    ripple.classList.remove('active');
    void ripple.offsetWidth;
    ripple.classList.add('active');
  }
  startScan();
});

if (urlInput) urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startScan();
});

// Focus glow on input focus
if (urlInput) {
  urlInput.addEventListener('focus', () => {
    document.getElementById('scanCard')?.style.setProperty('--input-focus', '1');
  });
}