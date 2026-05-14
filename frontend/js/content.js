/* ═══════════════════════════════════════════
   OpenSee · State Reveal Orchestrator
   所见即所在 — 直接淡入，不渲染过渡
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const resultEl   = document.getElementById('result');
  const nav        = document.getElementById('nav');
  const navDivider = document.getElementById('navDivider');
  const stage      = document.getElementById('carouselStage');
  const dots       = document.getElementById('carouselDots');
  const arrowUp    = document.getElementById('arrowUp');
  const arrowDown  = document.getElementById('arrowDown');

  let activeIdx = 0;
  let cardCount = 7;
  let busy = false;

  // ── Particle system ──

  const pCanvas = document.getElementById('particleCanvas');
  const pCtx = pCanvas.getContext('2d');
  let particles = [];
  let pRaf = null;

  function resizeParticles() {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
  }

  function spawnParticles() {
    const count = 25;
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * pCanvas.width,
        y: Math.random() * pCanvas.height,
        r: 0.4 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.12 - Math.random() * 0.35,
        a: 0.06 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
        period: 14 + Math.random() * 28,
      });
    }
  }

  function drawParticles(t) {
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    const s = t * 0.001;
    for (const p of particles) {
      p.x += p.vx + Math.sin(s * 0.4 + p.phase) * 0.06;
      p.y += p.vy;
      if (p.y < -10) { p.y = pCanvas.height + 10; p.x = Math.random() * pCanvas.width; }
      if (p.x < -10) p.x = pCanvas.width + 10;
      if (p.x > pCanvas.width + 10) p.x = -10;

      const pulse = 0.6 + 0.4 * Math.sin(s * 0.6 + p.phase);
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fillStyle = `rgba(195,155,105,${(p.a * pulse).toFixed(3)})`;
      pCtx.fill();
    }
    pRaf = requestAnimationFrame(drawParticles);
  }

  function startParticles() {
    resizeParticles();
    spawnParticles();
    pRaf = requestAnimationFrame(drawParticles);
  }

  window.addEventListener('resize', () => {
    resizeParticles();
    spawnParticles();
  });

  // ── Build content ──

  function populateContent(result) {
    const seg = result.main.segments || {};

    document.getElementById('cardSummary').textContent = result.summary || '';

    document.getElementById('cardReflection').textContent = seg.status || '';
    document.getElementById('cardMind').textContent = seg.mind || '';
    document.getElementById('cardFlow').textContent = seg.trend || '';
    document.getElementById('cardAttention').textContent = seg.risk || '';

    const movingLines = result.line_engine?.moving_lines || [];
    const linesData = result.main.lines || [];
    const movingWrapper = document.getElementById('cardMovingWrapper');
    if (movingLines.length > 0 && linesData.length > 0) {
      let html = '';
      for (const ml of movingLines) {
        const lineData = linesData.find(l => l.line === ml);
        const text = lineData?.text || '';
        if (text) html += `<div class="card-moving-item"><div>${text}</div></div>`;
      }
      document.getElementById('cardMoving').innerHTML = html;
      movingWrapper.style.display = '';
    } else {
      movingWrapper.style.display = 'none';
    }

    document.getElementById('cardAftermath').textContent = result.closing || '';

    buildDotIndicators();
  }

  function buildDotIndicators() {
    const cards = stage.querySelectorAll('.carousel-card');
    const visibleCards = [];
    cards.forEach((card, i) => {
      if (card.style.display === 'none') return;
      const body = card.querySelector('.card-body') || card.querySelector('.card-summary');
      if (body && !body.textContent.trim() && !body.innerHTML.trim()) return;
      visibleCards.push(i);
    });

    cardCount = visibleCards.length;
    if (cardCount === 0) return;

    dots.innerHTML = '';
    for (let i = 0; i < cardCount; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goTo(i));
      dots.appendChild(dot);
    }

    goTo(0, true);
    updateArrows();
  }

  function showPage() {
    resultEl.classList.add('visible');
    nav.classList.add('visible');
    navDivider.classList.add('visible');
    setTimeout(() => {
      arrowUp.classList.add('visible');
      arrowDown.classList.add('visible');
    }, 800);
  }

  // ── Vertical Carousel ──

  function goTo(idx, instant) {
    if (idx < 0 || idx >= cardCount || busy) return;
    busy = true;
    const prev = activeIdx;
    activeIdx = idx;

    const cards = getVisibleCards();
    if (instant) {
      cards.forEach((card, i) => {
        card.classList.remove('active', 'exit-up', 'exit-down');
        if (i === idx) card.classList.add('active');
      });
    } else if (idx > prev) {
      cards[prev].classList.add('exit-up');
      cards[prev].classList.remove('active');
      cards[idx].classList.add('active');
      cards[idx].classList.remove('exit-up', 'exit-down');
    } else {
      cards[prev].classList.add('exit-down');
      cards[prev].classList.remove('active');
      cards[idx].classList.add('active');
      cards[idx].classList.remove('exit-up', 'exit-down');
    }

    const allDots = dots.querySelectorAll('.carousel-dot');
    allDots.forEach((d, i) => d.classList.toggle('active', i === idx));

    updateArrows();
    setTimeout(() => { busy = false; }, 600);
  }

  function getVisibleCards() {
    return Array.from(stage.querySelectorAll('.carousel-card'))
      .filter(c => c.style.display !== 'none');
  }

  function updateArrows() {
    arrowUp.style.display   = '';
    arrowDown.style.display = '';
  }

  function next() { goTo((activeIdx + 1) % cardCount); }
  function prev() { goTo((activeIdx - 1 + cardCount) % cardCount); }

  arrowUp.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  arrowDown.addEventListener('click', (e) => { e.stopPropagation(); next(); });

  stage.addEventListener('click', () => { next(); });

  document.addEventListener('keydown', e => {
    if (!resultEl.classList.contains('visible')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); prev(); }
  });

  let touchStartY = 0;
  stage.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', e => {
    if (!resultEl.classList.contains('visible')) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) { dy > 0 ? next() : prev(); }
  }, { passive: true });

  stage.addEventListener('wheel', e => {
    if (!resultEl.classList.contains('visible')) return;
    if (Math.abs(e.deltaY) > 20) {
      e.preventDefault();
      e.deltaY > 0 ? next() : prev();
    }
  }, { passive: false });

  // ── Main ──

  async function init() {
    startParticles();

    const params = new URLSearchParams(location.search);
    const seed = params.get('seed');

    if (!seed) {
      document.getElementById('cardSummary').textContent = '返回首页，触碰任意位置开始';
      showPage();
      return;
    }

    let result = null;
    try {
      const parts = seed.split('|');
      result = await ZenTap.generateHexagramResult({
        timestamp: Number(parts[0]),
        uid: parts[2] || 'unknown'
      });
    } catch (e) {
      console.warn('Engine call failed:', e.message);
    }

    if (result) populateContent(result);
    showPage();
  }

  // ── Bootstrap ──

  function waitForEngine(retries) {
    retries = retries || 30;
    if (window.ZenTap?.generateHexagramResult) {
      init();
    } else if (retries > 0) {
      setTimeout(() => waitForEngine(retries - 1), 200);
    } else {
      init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForEngine());
  } else {
    waitForEngine();
  }
})();
