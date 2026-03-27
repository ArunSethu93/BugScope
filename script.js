/* BugScope v3 — script.js
   Dependencies: GSAP 3, Chart.js 4 (loaded in index.html)
*/
'use strict';

/* ══════════════════════════════════════════════
   GLOBALS
══════════════════════════════════════════════ */
let _scanData = null;   // last full scan result
let _scanUrl = '';     // last scanned URL
let _radarChart = null;   // Chart.js instance

/* ══════════════════════════════════════════════
   1. AMBIENT CANVAS
══════════════════════════════════════════════ */
(function initBg() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [];

  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  resize();
  addEventListener('resize', resize);

  for (let i = 0; i < 100; i++) pts.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .15, vy: (Math.random() - .5) * .15,
    r: Math.random() * 1.2 + .2, a: Math.random() * .45 + .08
  });

  (function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28);
      ctx.fillStyle = `rgba(0,255,157,${p.a})`; ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 80) {
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = `rgba(0,255,157,${.05 * (1 - d / 80)})`; ctx.lineWidth = .5; ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  })();
})();

/* ══════════════════════════════════════════════
   2. TOAST SYSTEM
══════════════════════════════════════════════ */
function toast(msg, type = 'info', dur = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { ok: '✓', err: '✕', info: 'i' };
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<div class="toast-icon ${type}">${icons[type] || 'i'}</div><div class="toast-msg">${msg}</div>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove());
  }, dur);
}

/* ══════════════════════════════════════════════
   3. MODAL HELPERS
══════════════════════════════════════════════ */
function openModal(backdropId) {
  const el = document.getElementById(backdropId);
  if (el) el.classList.remove('hidden');
}
function closeModal(backdropId) {
  const el = document.getElementById(backdropId);
  if (el) el.classList.add('hidden');
}

document.getElementById('exportClose')?.addEventListener('click', () => closeModal('exportBackdrop'));
document.getElementById('shortcutsClose')?.addEventListener('click', () => closeModal('shortcutsBackdrop'));
document.getElementById('exportBackdrop')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('exportBackdrop'); });
document.getElementById('shortcutsBackdrop')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('shortcutsBackdrop'); });

/* ══════════════════════════════════════════════
   4. HISTORY DRAWER
══════════════════════════════════════════════ */
const HISTORY_KEY = 'bugscope_history_v3';

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; }
}
function saveHistory(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 20))); } catch (_) { }
}
function addToHistory(url, data) {
  if (!data || !url) return;
  const hist = getHistory();
  const entry = {
    url, domain: data.domain, score: data.score, verdict: data.verdict,
    ts: Date.now(),
    crit: Object.values(data.sections || {}).reduce((a, s) => a + (s.bugs || []).filter(b => b.severity === 'critical').length, 0),
    bugs: Object.values(data.sections || {}).reduce((a, s) => a + (s.bugs || []).length, 0),
  };
  const idx = hist.findIndex(h => h.url === url);
  if (idx !== -1) hist.splice(idx, 1);
  hist.unshift(entry);
  saveHistory(hist);
  renderHistory();
  updateHistoryBadge();
}

function renderHistory() {
  const body = document.getElementById('drawerBody');
  const empty = document.getElementById('drawerEmpty');
  const hist = getHistory();
  if (!body) return;
  body.innerHTML = '';
  if (!hist.length) { body.appendChild(empty || (() => { const p = document.createElement('p'); p.className = 'drawer-empty'; p.textContent = 'No scans yet.'; return p; })()); return; }

  hist.forEach(h => {
    const sc = h.score >= 70 ? 'good' : h.score >= 40 ? 'mid' : 'bad';
    const ago = timeAgo(h.ts);
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="hi-top">
        <span class="hi-domain">${escH(h.domain || h.url)}</span>
        <span class="hi-score ${sc}">${h.score}/100</span>
      </div>
      <div class="hi-bot">
        <span class="hi-ts">${ago}</span>
        <span class="hi-bugs">${h.bugs} issues (${h.crit} critical)</span>
      </div>`;
    div.addEventListener('click', () => {
      document.getElementById('urlInput').value = h.url;
      closeDrawer();
      startScan();
    });
    body.appendChild(div);
  });
}

function updateHistoryBadge() {
  const cnt = getHistory().length;
  const badge = document.getElementById('historyBadge');
  if (!badge) return;
  if (cnt > 0) { badge.textContent = cnt; badge.classList.add('show'); }
  else badge.classList.remove('show');
}

function openDrawer() {
  renderHistory();
  document.getElementById('historyDrawer')?.classList.add('open');
  document.getElementById('drawerBackdrop')?.classList.add('on');
}
function closeDrawer() {
  document.getElementById('historyDrawer')?.classList.remove('open');
  document.getElementById('drawerBackdrop')?.classList.remove('on');
}

document.getElementById('historyBtn')?.addEventListener('click', openDrawer);
document.getElementById('navHistory')?.addEventListener('click', openDrawer);
document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);
document.getElementById('drawerClearBtn')?.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  updateHistoryBadge();
  toast('History cleared', 'info');
});

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ══════════════════════════════════════════════
   5. EXPORT / SHARE
══════════════════════════════════════════════ */
document.getElementById('exportBtn')?.addEventListener('click', () => {
  if (!_scanData) return;
  openModal('exportBackdrop');
});

document.getElementById('exportJson')?.addEventListener('click', () => {
  if (!_scanData) return;
  const blob = new Blob([JSON.stringify(_scanData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bugscope-${_scanData.domain}-${Date.now()}.json`;
  a.click();
  closeModal('exportBackdrop');
  toast('JSON report downloaded', 'ok');
});

document.getElementById('exportMarkdown')?.addEventListener('click', () => {
  if (!_scanData) return;
  const d = _scanData;
  let md = `# BugScope Report: ${d.domain}\n\n`;
  md += `**Health Score:** ${d.score}/100\n\n`;
  md += `**Verdict:** ${d.verdict}\n\n`;
  md += `## Summary\n\n${d.summary}\n\n`;
  md += `## Issues\n\n`;
  if (d.sections) {
    Object.entries(d.sections).forEach(([key, sec]) => {
      if (!(sec.bugs || []).length) return;
      md += `### ${key.toUpperCase()}\n\n`;
      (sec.bugs || []).forEach(b => {
        md += `- **[${b.severity.toUpperCase()}]** ${b.title}`;
        if (b.file) md += ` — \`${b.file}\``;
        md += `\n  ${b.description}`;
        if (b.fix) md += `\n  > Fix: ${b.fix}`;
        md += '\n\n';
      });
    });
  }
  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bugscope-${d.domain}-${Date.now()}.md`;
  a.click();
  closeModal('exportBackdrop');
  toast('Markdown report downloaded', 'ok');
});

document.getElementById('exportClipboard')?.addEventListener('click', () => {
  if (!_scanData) return;
  const d = _scanData;
  let txt = `BugScope Report: ${d.domain}\nScore: ${d.score}/100\n${d.verdict}\n\n${d.summary}`;
  navigator.clipboard.writeText(txt).then(() => toast('Summary copied to clipboard', 'ok'));
  closeModal('exportBackdrop');
});

document.getElementById('shareUrl')?.addEventListener('click', () => {
  if (!_scanUrl) return;
  const shareUrl = `${location.href.split('?')[0]}?url=${encodeURIComponent(_scanUrl)}`;
  navigator.clipboard.writeText(shareUrl).then(() => toast('Share link copied!', 'ok'));
  closeModal('exportBackdrop');
});

/* ══════════════════════════════════════════════
   6. KEYBOARD SHORTCUTS
══════════════════════════════════════════════ */
document.getElementById('navShortcuts')?.addEventListener('click', () => openModal('shortcutsBackdrop'));

document.addEventListener('keydown', e => {
  const ctrl = e.metaKey || e.ctrlKey;
  const inp = document.getElementById('urlInput');

  if (ctrl && e.key === 'k') { e.preventDefault(); inp?.focus(); inp?.select(); }
  if (ctrl && e.key === 'e') { e.preventDefault(); if (_scanData) openModal('exportBackdrop'); }
  if (ctrl && e.key === 'h') { e.preventDefault(); openDrawer(); }
  if (ctrl && e.key === '/') { e.preventDefault(); openModal('shortcutsBackdrop'); }

  // Collapse panels 1-3
  if (ctrl && e.key === '1') { e.preventDefault(); togglePanel('pvBody', 'pvChevron'); }
  if (ctrl && e.key === '2') { e.preventDefault(); togglePanel('dashBody', 'dashChevron'); }
  if (ctrl && e.key === '3') { e.preventDefault(); togglePanel('bugBody', 'bugChevron'); }

  // Esc: close modals, clear input
  if (e.key === 'Escape') {
    closeModal('exportBackdrop');
    closeModal('shortcutsBackdrop');
    closeDrawer();
    if (document.activeElement === inp) { inp.blur(); }
  }
});

// URL from query string
(function prefillFromUrl() {
  const p = new URLSearchParams(location.search).get('url');
  if (p) {
    const inp = document.getElementById('urlInput');
    if (inp) { inp.value = decodeURIComponent(p); }
  }
})();

/* ══════════════════════════════════════════════
   7. COLLAPSIBLE PANELS
══════════════════════════════════════════════ */
function togglePanel(bodyId, chevId) {
  const body = document.getElementById(bodyId);
  const chev = document.getElementById(chevId);
  if (!body) return;
  const isOpen = !body.classList.contains('closed');
  body.classList.toggle('closed', isOpen);
  if (chev) chev.classList.toggle('closed', isOpen);
  const hdr = body.previousElementSibling;
  if (hdr) hdr.classList.toggle('open', !isOpen);
}

function initPanel(hdrId, bodyId, chevId) {
  const hdr = document.getElementById(hdrId);
  const body = document.getElementById(bodyId);
  const chev = document.getElementById(chevId);
  if (!hdr || !body) return;

  // Start open
  hdr.classList.add('open');

  hdr.addEventListener('click', e => {
    if (e.target.closest('.hdr-btn') || e.target.closest('a')) return;
    const isOpen = !body.classList.contains('closed');
    body.classList.toggle('closed', isOpen);
    if (chev) chev.classList.toggle('closed', isOpen);
    hdr.classList.toggle('open', !isOpen);
  });
  hdr.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hdr.click(); }
  });
}

initPanel('previewHdr', 'pvBody', 'pvChevron');
initPanel('dashHdr', 'dashBody', 'dashChevron');
initPanel('bugHdr', 'bugBody', 'bugChevron');

/* ══════════════════════════════════════════════
   8. TOP-200 DATABASE
══════════════════════════════════════════════ */
const TOP200 = {
  'google.com': 1, 'youtube.com': 2, 'facebook.com': 3, 'twitter.com': 10, 'instagram.com': 8,
  'wikipedia.org': 13, 'yahoo.com': 11, 'whatsapp.com': 17, 'amazon.com': 14, 'tiktok.com': 6,
  'x.com': 10, 'reddit.com': 18, 'linkedin.com': 22, 'netflix.com': 25, 'microsoft.com': 30,
  'bing.com': 28, 'live.com': 42, 'office.com': 37, 'twitch.tv': 35, 'pinterest.com': 31,
  'apple.com': 23, 'github.com': 65, 'stackoverflow.com': 55, 'quora.com': 78, 'ebay.com': 44,
  'shopify.com': 68, 'paypal.com': 47, 'zoom.us': 71, 'dropbox.com': 93, 'notion.so': 112,
  'discord.com': 60, 'spotify.com': 50, 'imdb.com': 58, 'medium.com': 130, 'nytimes.com': 105,
  'cnn.com': 85, 'bbc.com': 95, 'forbes.com': 120, 'bloomberg.com': 135, 'adobe.com': 75,
  'salesforce.com': 88, 'nvidia.com': 80, 'samsung.com': 45, 'airbnb.com': 63, 'booking.com': 32,
  'etsy.com': 56, 'aliexpress.com': 19, 'walmart.com': 38, 'canva.com': 73, 'figma.com': 123,
  'coursera.org': 138, 'duolingo.com': 99, 'mailchimp.com': 103, 'slack.com': 67, 'atlassian.com': 86,
  'cloudflare.com': 57, 'wordpress.com': 21, 'wix.com': 62, 'openai.com': 16, 'anthropic.com': 196,
  'claude.ai': 178, 'huggingface.co': 126, 'duckduckgo.com': 51, 'stripe.com': 110, 'vercel.com': 147,
  'netlify.com': 152, 'digitalocean.com': 109, 'linear.app': 188, 'supabase.com': 195,
};

function getTier(domain) {
  const r = TOP200[domain.replace(/^www\./, '')];
  if (!r) return 0;
  return r <= 10 ? 3 : r <= 50 ? 2 : r <= 200 ? 1 : 0;
}

/* ══════════════════════════════════════════════
   9. STATS GENERATION
══════════════════════════════════════════════ */
const rng = (a, b) => Math.random() * (b - a) + a;
const rngI = (a, b) => Math.round(rng(a, b));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function generateStats(domain) {
  const tier = getTier(domain);
  const known = TOP200[domain.replace(/^www\./, '')];
  const rank = known ? known + rngI(-3, 3) : rngI(5000, 999999);

  const vis = Math.round(rng(...{ 3: [5e8, 2e10], 2: [5e7, 5e8], 1: [1e6, 5e7], 0: [1e3, 1e6] }[tier]));
  const up = parseFloat(rng(...{ 3: [99.95, 99.999], 2: [99.8, 99.99], 1: [99.0, 99.9], 0: [97.0, 99.5] }[tier]).toFixed(3));
  const ld = parseFloat(rng(...{ 3: [0.3, 1.1], 2: [0.6, 1.8], 1: [1.2, 3.5], 0: [1.8, 6.0] }[tier]).toFixed(2));
  const bn = rngI(...{ 3: [25, 42], 2: [30, 52], 1: [40, 65], 0: [45, 80] }[tier]);

  const sr = { 3: [85, 99], 2: [74, 95], 1: [58, 86], 0: [32, 75] }[tier];
  const sc = () => rngI(...sr);
  const scores = { seo: sc(), perf: sc(), sec: sc(), a11y: sc(), bp: sc() };

  const spark = [];
  let base = vis * rng(.6, .82);
  for (let i = 0; i < 12; i++) { base *= rng(.93, 1.14); spark.push(Math.round(base)); }

  return {
    rank, vis, up, ld, bn, scores, spark,
    tech: pick({ 3: ['React / Next.js', 'Angular / Node.js', 'Vue / Nuxt'], 2: ['React / Node.js', 'Next.js / Vercel', 'Django'], 1: ['WordPress', 'Next.js', 'Shopify'], 0: ['WordPress', 'HTML/CSS/JS', 'Webflow'] }[tier]),
    cdn: pick({ 3: ['Akamai', 'Fastly', 'Cloudflare Enterprise'], 2: ['Cloudflare Pro', 'AWS CloudFront'], 1: ['Cloudflare Free', 'Bunny CDN'], 0: ['None', 'Cloudflare Free'] }[tier]),
    host: pick({ 3: ['Custom datacentres', 'AWS multi-region', 'GCP'], 2: ['AWS', 'GCP', 'Azure'], 1: ['Vercel', 'DigitalOcean'], 0: ['Shared hosting', 'VPS'] }[tier]),
    sess: `${rngI(...{ 3: [7, 20], 2: [5, 14], 1: [2, 9], 0: [1, 5] }[tier])}m ${rngI(0, 59)}s`,
    ppv: rng(...{ 3: [7, 22], 2: [4, 12], 1: [2, 6], 0: [1.1, 4] }[tier]).toFixed(1),
    mob: rngI(...{ 3: [45, 68], 2: [50, 74], 1: [55, 80], 0: [50, 85] }[tier]),
  };
}

/* ══════════════════════════════════════════════
   10. ANIMATED COUNTER
══════════════════════════════════════════════ */
function countUp(el, end, dur, fn) {
  if (!el) return;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = fn(end * e);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = fn(end);
  };
  requestAnimationFrame(step);
}

/* ══════════════════════════════════════════════
   11. RADAR CHART
══════════════════════════════════════════════ */
function renderRadar(scores) {
  const canvas = document.getElementById('radarCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  if (_radarChart) { _radarChart.destroy(); _radarChart = null; }

  Chart.defaults.color = '#4a5568';
  Chart.defaults.font.family = 'JetBrains Mono, monospace';

  _radarChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['SEO', 'Performance', 'Security', 'Accessibility', 'Best Practices'],
      datasets: [{
        data: [scores.seo, scores.perf, scores.sec, scores.a11y, scores.bp],
        borderColor: '#00ff9d',
        backgroundColor: 'rgba(0,255,157,0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#00ff9d',
        pointBorderColor: 'transparent',
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111820',
          borderColor: '#1e2840',
          borderWidth: 1,
          titleFont: { size: 11, family: 'JetBrains Mono, monospace' },
          bodyFont: { size: 11, family: 'JetBrains Mono, monospace' },
          callbacks: { label: ctx => ` ${ctx.raw}/100` }
        }
      },
      scales: {
        r: {
          min: 0, max: 100, ticks: { stepSize: 25, display: false },
          grid: { color: 'rgba(255,255,255,0.06)', lineWidth: 1 },
          angleLines: { color: 'rgba(255,255,255,0.06)', lineWidth: 1 },
          pointLabels: { font: { size: 10, family: 'JetBrains Mono,monospace' }, color: '#4a5568' },
        }
      }
    }
  });
}

/* ══════════════════════════════════════════════
   12. SPARKLINE
══════════════════════════════════════════════ */
function drawSparkline(data) {
  const canvas = document.getElementById('sparkCanvas');
  if (!canvas) return;
  const W = canvas.offsetWidth || 500, H = 120;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pad = { t: 8, b: 18, l: 4, r: 4 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const x = i => pad.l + (i / (data.length - 1)) * cw;
  const y = v => pad.t + ch - ((v - min) / range) * ch;
  ctx.clearRect(0, 0, W, H);

  // Gradient fill
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,255,157,.18)'); g.addColorStop(1, 'rgba(0,255,157,.01)');
  ctx.beginPath(); ctx.moveTo(x(0), y(data[0]));
  data.forEach((_, i) => { if (i) ctx.lineTo(x(i), y(data[i])); });
  ctx.lineTo(x(data.length - 1), H); ctx.lineTo(x(0), H); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();

  // Line
  ctx.beginPath(); ctx.moveTo(x(0), y(data[0]));
  data.forEach((_, i) => { if (i) ctx.lineTo(x(i), y(data[i])); });
  ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  // Dots
  data.forEach((v, i) => {
    ctx.beginPath(); ctx.arc(x(i), y(v), 3, 0, 6.28);
    ctx.fillStyle = '#00ff9d'; ctx.fill();
  });

  // Pulsing last dot ring
  ctx.beginPath(); ctx.arc(x(data.length - 1), y(data[data.length - 1]), 7, 0, 6.28);
  ctx.strokeStyle = 'rgba(0,255,157,.3)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Month labels
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
  data.forEach((_, i) => { if (i % 2 === 0) ctx.fillText(months[i % 12], x(i), H - 2); });

  document.getElementById('spLo').textContent = fmt(min);
  document.getElementById('spHi').textContent = fmt(max);
}

/* ══════════════════════════════════════════════
   13. BENCHMARK STRIP
══════════════════════════════════════════════ */
const BENCHMARKS = { load: 2.1, bounce: 50, seo: 72, perf: 68, sec: 75 };
function renderBenchmarks(stats, scores) {
  const strip = document.getElementById('benchmarkStrip');
  const items = document.getElementById('bmItems');
  if (!strip || !items) return;

  const pairs = [
    { label: 'Load', val: stats.ld.toFixed(2) + 's', avg: BENCHMARKS.load + 's', better: stats.ld < BENCHMARKS.load },
    { label: 'Bounce', val: stats.bn + '%', avg: BENCHMARKS.bounce + '%', better: stats.bn < BENCHMARKS.bounce },
    { label: 'SEO', val: scores.seo, avg: BENCHMARKS.seo, better: scores.seo > BENCHMARKS.seo },
    { label: 'Perf', val: scores.perf, avg: BENCHMARKS.perf, better: scores.perf > BENCHMARKS.perf },
    { label: 'Sec', val: scores.sec, avg: BENCHMARKS.sec, better: scores.sec > BENCHMARKS.sec },
  ];

  items.innerHTML = pairs.map(p => {
    const cls = p.better ? 'up' : 'dn';
    const arr = p.better ? '↑' : '↓';
    return `<span class="bm-chip ${cls}">${arr} ${p.label}: ${p.val} <span style="opacity:.55">(avg ${p.avg})</span></span>`;
  }).join('');

  strip.classList.remove('hidden');

  // GSAP entrance
  if (typeof gsap !== 'undefined') {
    gsap.from('.bm-chip', { opacity: 0, y: 8, stagger: .06, duration: .4, ease: 'power2.out' });
  }
}

/* ══════════════════════════════════════════════
   14. RENDER STATS DASHBOARD
══════════════════════════════════════════════ */
function renderDash(domain, s) {
  document.getElementById('dashDomain').textContent = domain;

  const kvs = [
    { kv: 'kv0', ks: 'ks0', kf: 'kf0', val: s.rank, sub: s.rank <= 200 ? 'Top-200 globally' : s.rank <= 10000 ? 'Top 10K' : 'Long tail', fmt: v => '#' + Math.round(v).toLocaleString(), pct: Math.max(5, 100 - Math.log10(s.rank + 1) * 14) },
    { kv: 'kv1', ks: 'ks1', kf: 'kf1', val: s.vis, sub: 'per month (est.)', fmt: v => fmt(v), pct: Math.min(100, Math.log10(s.vis + 1) / 10 * 100) },
    { kv: 'kv2', ks: 'ks2', kf: 'kf2', val: s.up, sub: s.up >= 99.9 ? 'Excellent' : s.up >= 99 ? 'Good' : 'Fair', fmt: v => v.toFixed(2) + '%', pct: Math.min(100, s.up) },
    { kv: 'kv3', ks: 'ks3', kf: 'kf3', val: s.ld, sub: s.ld < 1.5 ? 'Fast' : s.ld < 3 ? 'Moderate' : 'Slow', fmt: v => v.toFixed(2) + 's', pct: Math.max(5, 100 - (s.ld / 6) * 100) },
    { kv: 'kv4', ks: 'ks4', kf: 'kf4', val: s.bn, sub: s.bn < 40 ? 'Low — great' : s.bn < 60 ? 'Average' : 'High', fmt: v => Math.round(v) + '%', pct: s.bn },
  ];

  kvs.forEach((item, i) => {
    const el = document.getElementById(item.kv);
    if (el) countUp(el, item.val, 1200, item.fmt);
    const sub = document.getElementById(item.ks);
    if (sub) sub.textContent = item.sub;
    setTimeout(() => {
      const fill = document.getElementById(item.kf);
      if (fill) fill.style.width = item.pct + '%';
    }, 300 + i * 100);
  });

  // Meta
  const mvals = [s.tech, s.cdn, s.host, s.sess, s.ppv, s.mob + '%', 'Valid — TLS 1.3', 'Enabled', 'Enabled'];
  mvals.forEach((v, i) => {
    const el = document.getElementById('mv' + i);
    if (el) el.textContent = v;
  });

  // Charts
  setTimeout(() => {
    renderRadar(s.scores);
    drawSparkline(s.spark);
  }, 400);
  addEventListener('resize', () => drawSparkline(s.spark));
}

/* ══════════════════════════════════════════════
   15. FILTER TABS
══════════════════════════════════════════════ */
let _activeFilter = 'all';

function initFilterTabs() {
  const tabs = document.querySelectorAll('.ftab');
  const track = document.getElementById('ftabTrack');

  function moveTo(tab) {
    if (!track) return;
    const tRect = tab.closest('.filter-tabs').getBoundingClientRect();
    const bRect = tab.getBoundingClientRect();
    track.style.left = (bRect.left - tRect.left) + 'px';
    track.style.width = bRect.width + 'px';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      _activeFilter = tab.dataset.filter;
      moveTo(tab);
      applyFilter(_activeFilter);
    });
  });

  // Init track position
  const activeTab = document.querySelector('.ftab.active');
  if (activeTab) setTimeout(() => moveTo(activeTab), 100);
}

function applyFilter(filter) {
  document.querySelectorAll('.bug-item').forEach(item => {
    if (filter === 'all') { item.classList.remove('hidden'); return; }
    const sev = item.dataset.sev || '';
    item.classList.toggle('hidden', sev !== filter);
  });

  // Show/hide sections that become empty
  document.querySelectorAll('.bug-section').forEach(sec => {
    const visible = sec.querySelectorAll('.bug-item:not(.hidden)').length;
    sec.style.display = visible ? '' : 'none';
  });
}

/* ══════════════════════════════════════════════
   16. BUG SECTIONS RENDERER
══════════════════════════════════════════════ */
const SEC_META = {
  html: { label: 'HTML', ico: '</>', cls: 'html' },
  css: { label: 'CSS', ico: '{}', cls: 'css' },
  js: { label: 'JavaScript', ico: 'JS', cls: 'js' },
  backend: { label: 'Backend / Server', ico: '⚙', cls: 'backend' },
  security: { label: 'Security', ico: '⚠', cls: 'security' },
};

function escH(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sevClass(sev) {
  const s = (sev || '').toLowerCase();
  return { critical: 'critical', high: 'high', medium: 'medium', low: 'low' }[s] || 'low';
}

function buildBugSections(sections) {
  const cont = document.getElementById('bugSections');
  cont.innerHTML = '';
  let total = 0;

  Object.entries(sections).forEach(([key, sec], si) => {
    const meta = SEC_META[key] || { label: key, ico: '?', cls: 'html' };
    const bugs = sec.bugs || [];
    if (!bugs.length) return;
    total += bugs.length;

    const bugsHtml = bugs.map((b, bi) => {
      const sev = sevClass(b.severity);
      return `
        <div class="bug-item" data-sev="${sev}" style="animation-delay:${bi * .05}s">
          <span class="sev ${sev}">${(b.severity || 'low').toUpperCase()}</span>
          <div class="bug-info">
            <div class="bug-title">${escH(b.title)}</div>
            ${b.file ? `<span class="bug-file">${escH(b.file)}</span>` : ''}
            <div class="bug-desc">${escH(b.description)}</div>
            ${b.fix ? `<div class="bug-fix">Fix: ${escH(b.fix)}</div>` : ''}
          </div>
          <button class="bug-copy" title="Copy bug details" data-bug="${escH(JSON.stringify({ title: b.title, severity: b.severity, file: b.file, description: b.description, fix: b.fix }))}">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="3" y="2" width="7" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
              <path d="M3 3.5H2.5A1 1 0 001.5 4.5v5A1 1 0 002.5 10.5h5a1 1 0 001-1V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
    }).join('');

    const div = document.createElement('div');
    div.className = 'bug-section';
    div.style.animationDelay = (si * .06) + 's';
    div.innerHTML = `
      <div class="bss-hdr" id="bsh-${key}">
        <div class="bss-left">
          <div class="bs-ico ${meta.cls}">${meta.ico}</div>
          <span class="bs-name">${meta.label}</span>
          <span class="bs-count">${bugs.length} issue${bugs.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="bss-right">
          <span class="bs-chev open" id="bschev-${key}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
      <div class="bss-body open" id="bsb-${key}" style="padding:0 1rem">${bugsHtml}</div>`;
    cont.appendChild(div);

    // Section toggle
    div.querySelector('.bss-hdr').addEventListener('click', () => {
      const body = document.getElementById('bsb-' + key);
      const chev = document.getElementById('bschev-' + key);
      const open = body.classList.toggle('open');
      chev.classList.toggle('open', open);
    });
  });

  return total;
}

// Copy bug details
document.addEventListener('click', e => {
  const btn = e.target.closest('.bug-copy');
  if (!btn) return;
  try {
    const d = JSON.parse(btn.dataset.bug || '{}');
    const txt = `[${(d.severity || '').toUpperCase()}] ${d.title}${d.file ? ' (' + d.file + ')' : ''}\n${d.description}${d.fix ? '\nFix: ' + d.fix : ''}`;
    navigator.clipboard.writeText(txt).then(() => toast('Bug details copied', 'ok', 2000));
  } catch (_) { }
});

// Collapse/expand all
document.getElementById('collapseAllBugs')?.addEventListener('click', () => {
  document.querySelectorAll('.bss-body').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.bs-chev').forEach(c => c.classList.remove('open'));
});
document.getElementById('expandAllBugs')?.addEventListener('click', () => {
  document.querySelectorAll('.bss-body').forEach(b => b.classList.add('open'));
  document.querySelectorAll('.bs-chev').forEach(c => c.classList.add('open'));
});

/* ══════════════════════════════════════════════
   17. RENDER BUG REPORT
══════════════════════════════════════════════ */
function renderBugReport(data) {
  const score = Math.max(0, Math.min(100, Math.round(data.score || 0)));
  const color = score >= 70 ? '#00ff9d' : score >= 40 ? '#f0b429' : '#ff5e5e';

  // Mini arc
  const mini = document.getElementById('miniArc');
  if (mini) { mini.style.stroke = color; setTimeout(() => { mini.style.strokeDashoffset = 94.25 - (score / 100) * 94.25; }, 200); }
  const miniS = document.getElementById('miniScore');
  if (miniS) countUp(miniS, score, 1000, v => String(Math.round(v)));

  // Big arc
  const big = document.getElementById('bigArc');
  if (big) { big.style.stroke = color; setTimeout(() => { big.style.strokeDashoffset = 295.3 - (score / 100) * 295.3; }, 200); }
  const bigS = document.getElementById('bigScore');
  if (bigS) { bigS.style.color = color; countUp(bigS, score, 1200, v => String(Math.round(v))); }

  // Domain/verdict
  const domEl = document.getElementById('scoreDomain');
  if (domEl) domEl.textContent = data.domain || '';
  const vEl = document.getElementById('scoreVerdict');
  if (vEl) { vEl.textContent = data.verdict || ''; vEl.style.color = color; }

  // Counts
  let crit = 0, high = 0, other = 0;
  if (data.sections) Object.values(data.sections).forEach(s =>
    (s.bugs || []).forEach(b => { const sv = (b.severity || '').toLowerCase(); if (sv === 'critical') crit++; else if (sv === 'high') high++; else other++; })
  );
  const pc = document.getElementById('pCrit');
  const ph = document.getElementById('pHigh');
  const po = document.getElementById('cntOther') || document.getElementById('pOther');
  if (pc) pc.textContent = crit + ' Critical';
  if (ph) ph.textContent = high + ' High';
  if (po) po.textContent = other + ' Med/Low';

  // Bug badge
  const bb = document.getElementById('bugBadge');
  if (bb) { bb.textContent = (crit + high + other) + ' issues'; bb.className = 'ph-badge ' + (crit ? 'danger' : high ? 'warn' : 'green'); }

  // Summary
  const sb = document.getElementById('summaryBox');
  if (sb) sb.textContent = data.summary || '';

  // Build sections
  if (data.sections) buildBugSections(data.sections);

  // Init filter tabs
  initFilterTabs();
}

/* ══════════════════════════════════════════════
   18. PREVIEW
══════════════════════════════════════════════ */
let _previewUrl = '';

function loadPreview(url) {
  _previewUrl = url;
  const frame = document.getElementById('pvFrame');
  const idle = document.getElementById('pvIdle');
  const blocked = document.getElementById('pvBlocked');
  const addr = document.getElementById('chromeAddr');
  const purl = document.getElementById('pvUrl');
  const badge = document.getElementById('pvBadge');

  if (addr) addr.textContent = url;
  if (purl) purl.textContent = url;
  if (badge) { badge.textContent = 'Loading…'; badge.className = 'ph-badge'; }
  if (idle) idle.classList.remove('hidden');
  if (blocked) blocked.classList.add('hidden');

  setTimeout(() => {
    if (idle) idle.classList.add('hidden');
    frame.src = url;
  }, 300);

  const timer = setTimeout(() => {
    try { void frame.contentDocument; } catch (_) { }
    badge.textContent = 'Live'; badge.className = 'ph-badge green';
  }, 7000);

  frame.addEventListener('load', () => {
    clearTimeout(timer);
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.URL === 'about:blank') { showBlocked(url); return; }
    } catch (_) { }
    badge.textContent = 'Live'; badge.className = 'ph-badge green';
  }, { once: true });

  frame.addEventListener('error', () => { clearTimeout(timer); showBlocked(url); }, { once: true });
}

function showBlocked(url) {
  const frame = document.getElementById('pvFrame');
  const idle = document.getElementById('pvIdle');
  const blocked = document.getElementById('pvBlocked');
  const link = document.getElementById('blockedLink');
  const badge = document.getElementById('pvBadge');
  frame.src = 'about:blank';
  if (idle) idle.classList.add('hidden');
  if (blocked) blocked.classList.remove('hidden');
  if (link) link.href = url;
  if (badge) { badge.textContent = 'Blocked'; badge.className = 'ph-badge warn'; }
}

document.getElementById('refreshBtn')?.addEventListener('click', () => { if (_previewUrl) loadPreview(_previewUrl); });
document.getElementById('newTabBtn')?.addEventListener('click', () => { if (_previewUrl) open(_previewUrl, '_blank', 'noopener'); });

/* ══════════════════════════════════════════════
   19. PROGRESS BAR
══════════════════════════════════════════════ */
function setProgress(pct) {
  const el = document.getElementById('topProgress');
  if (!el) return;
  el.style.width = pct + '%';
  el.classList.toggle('on', pct > 0 && pct < 100);
  if (pct >= 100) setTimeout(() => { el.style.opacity = '0'; el.style.width = '0'; setTimeout(() => el.style.opacity = '', 500); }, 600);
}

const STEPS = [
  [5, 'Resolving domain and DNS…'], [15, 'Fetching HTML document…'], [30, 'Parsing CSS stylesheets…'],
  [45, 'Analysing JavaScript bundles…'], [60, 'Probing backend endpoints…'], [75, 'Running security checks…'],
  [88, 'Computing health score…'], [95, 'Finalising report…'],
];
let _stepTimer;

function startSteps() {
  const msg = document.getElementById('stepMsg');
  const fill = document.getElementById('progressFill');
  let i = 0;
  clearInterval(_stepTimer);
  _stepTimer = setInterval(() => {
    if (i >= STEPS.length) return;
    const [pct, txt] = STEPS[i++];
    if (msg) msg.textContent = '> ' + txt;
    if (fill) fill.style.width = pct + '%';
    setProgress(pct);
  }, 1600);
}
function stopSteps(success) {
  clearInterval(_stepTimer);
  const msg = document.getElementById('stepMsg');
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = '100%';
  if (msg) msg.textContent = success ? '> Scan complete — report ready.' : '> Scan failed.';
  setProgress(100);
}

/* ══════════════════════════════════════════════
   20. QUICK LINKS + INPUT CLEAR
══════════════════════════════════════════════ */
document.querySelectorAll('.ql').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById('urlInput');
    if (inp) inp.value = btn.dataset.url;
    updateClearBtn();
    startScan();
  });
});

const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('inputClear');

function updateClearBtn() {
  if (!clearBtn) return;
  clearBtn.classList.toggle('show', (urlInput?.value || '').length > 0);
}

urlInput?.addEventListener('input', updateClearBtn);
clearBtn?.addEventListener('click', () => {
  if (urlInput) { urlInput.value = ''; urlInput.focus(); }
  updateClearBtn();
});

/* ══════════════════════════════════════════════
   21. GSAP ENTRANCE
══════════════════════════════════════════════ */
function gsapEntranceResults() {
  if (typeof gsap === 'undefined') return;
  gsap.from('.panel', { opacity: 0, y: 18, stagger: .09, duration: .55, ease: 'power3.out' });
}

/* ══════════════════════════════════════════════
   22. MAIN SCAN FUNCTION
══════════════════════════════════════════════ */
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const SYSTEM_PROMPT = `You are BugScope, an expert website bug scanner. Use web search to fetch and analyse the given URL. Return ONLY a single strict JSON object — no markdown fences, no explanation, nothing else.

Schema:
{
  "domain": "hostname",
  "score": 0-100,
  "verdict": "one concise sentence",
  "summary": "2-3 sentence plain-English overview",
  "sections": {
    "html":     { "bugs": [BugObject] },
    "css":      { "bugs": [BugObject] },
    "js":       { "bugs": [BugObject] },
    "backend":  { "bugs": [BugObject] },
    "security": { "bugs": [BugObject] }
  }
}

BugObject: { "severity":"critical|high|medium|low", "title":"≤8 words", "file":"specific filename or route", "description":"1-2 sentences", "fix":"one actionable hint" }

Rules:
- At least 2 bugs per section, all 5 sections required
- Diagnose: missing meta tags, accessibility, unused CSS, outdated libs, XSS, HTTPS, CSP, CORS, cookie flags, injection risks, rate limiting, open redirects
- Score: 0-30 critical present, 31-60 moderate, 61-85 minor, 86-100 clean
- Output ONLY the JSON object`;

function normaliseUrl(raw) {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
function getDomain(url) { try { return new URL(url).hostname; } catch (_) { return url; } }
function showError(msg) {
  const el = document.getElementById('errorBar');
  if (el) { el.textContent = '⚠ ' + msg; el.classList.add('on'); }
  toast(msg, 'err');
}
function hideError() {
  const el = document.getElementById('errorBar');
  if (el) el.classList.remove('on');
}

async function startScan() {
  const raw = urlInput?.value.trim();
  if (!raw) { showError('Please enter a URL to scan.'); return; }

  const url = normaliseUrl(raw);
  const domain = getDomain(url);

  _scanUrl = url;
  _scanData = null;

  hideError();
  updateClearBtn();

  // UI: scanning state
  const btn = document.getElementById('scanBtn');
  const prog = document.getElementById('scanProgress');
  const zone = document.getElementById('resultsZone');
  const statusEl = document.getElementById('statusTxt');
  const expBtn = document.getElementById('exportBtn');

  if (btn) { btn.disabled = true; btn.classList.add('scanning'); }
  if (prog) prog.classList.add('on');
  if (statusEl) statusEl.textContent = 'Scanning…';
  if (expBtn) expBtn.disabled = true;

  // Reset filter
  _activeFilter = 'all';
  document.querySelectorAll('.ftab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  const allTab = document.querySelector('.ftab[data-filter="all"]');
  if (allTab) { allTab.classList.add('active'); allTab.setAttribute('aria-selected', 'true'); }

  startSteps();

  // Show results zone immediately (preview + stats load instantly)
  zone?.classList.add('on');
  gsapEntranceResults();

  loadPreview(url);

  const stats = generateStats(domain);
  renderDash(domain, stats);
  renderBenchmarks(stats, stats.scores);

  toast(`Scanning ${domain}…`, 'info', 3000);

  // Claude API
  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `Scan this website for bugs, code quality issues, and security vulnerabilities: ${url}` }],
      }),
    });

    stopSteps(resp.ok);

    if (!resp.ok) {
      let m = `API error ${resp.status}`;
      try { const e = await resp.json(); m = e.error?.message || m; } catch (_) { }
      throw new Error(m);
    }

    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse results. Please try another URL.');

    const parsed = JSON.parse(match[0]);
    _scanData = parsed;

    renderBugReport(parsed);
    addToHistory(url, parsed);

    if (expBtn) expBtn.disabled = false;
    if (statusEl) statusEl.textContent = 'Scan complete';
    toast(`Scan complete — score ${parsed.score}/100`, 'ok');

    // Scroll to results
    zone?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    stopSteps(false);
    showError(err.message || 'Scan failed.');
    if (statusEl) statusEl.textContent = 'Error';
    console.error('[BugScope]', err);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('scanning'); }
  }
}

// Events
document.getElementById('scanBtn')?.addEventListener('click', startScan);
urlInput?.addEventListener('keydown', e => { if (e.key === 'Enter') startScan(); });

// Init
updateHistoryBadge();
renderHistory();

// GSAP hero entrance
if (typeof gsap !== 'undefined') {
  gsap.from('.hero-eyebrow', { opacity: 0, y: -10, duration: .5, delay: .1 });
  gsap.from('.hero-title', { opacity: 0, y: 20, duration: .65, delay: .2, ease: 'power3.out' });
  gsap.from('.hero-sub', { opacity: 0, y: 14, duration: .5, delay: .4 });
  gsap.from('.scan-card', { opacity: 0, y: 18, duration: .6, delay: .5, ease: 'power2.out' });
}
