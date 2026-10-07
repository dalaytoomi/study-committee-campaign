// Only replace these fields with confirmed personal information.
const profile = { name: '宋如一', className: '' };
const $ = (selector) => document.querySelector(selector);
const slides = [...document.querySelectorAll('.slide')];
const labels = ['首屏', '关于我', '理解·优势', '当选之后', '结尾'];
const particleColor = '#fff3b4';
const sceneLabels = { morning: ['☀', '春日 · 晨光', '晨间光影'], afternoon: ['☀', '午后 · 晴朗', '午后光影'], golden: ['◒', '黄昏 · 暖阳', '黄昏光影'], night: ['☾', '星夜 · 晴朗', '夜间光影'] };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let preferredMotion = true;
try { preferredMotion = localStorage.getItem('valley-motion') !== 'off'; } catch { /* Private mode still works. */ }
let motionEnabled = preferredMotion && !reducedMotion.matches;
let current = -1;
let manualScene = null;
let leavingTimer;
let pageAnimations = [];
let layoutFrame = 0;
let particleFrame = 0;
let lastFrame = 0;
let elapsed = 0;
let width = innerWidth;
let height = innerHeight;
let pointerX = .65;
let pointerY = .35;
let smoothX = .65;
let smoothY = .35;
let burst = [];
const canvas = $('#atmosphere');
const context = canvas.getContext('2d');
const particles = Array.from({ length: innerWidth < 650 ? 25 : 55 }, (_, i) => ({
  x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2,
  speed: .5 + Math.random() * .7, size: i % 4 === 0 ? 3 : 2,
}));

document.querySelectorAll('[data-profile]').forEach((el) => {
  const key = el.dataset.profile;
  if (profile[key]) el.textContent = key === 'className' ? `班级：${profile[key]}` : profile[key];
});
slides.forEach((slide, i) => {
  const stage = document.createElement('div');
  stage.className = 'slide-stage';
  slide.before(stage);
  stage.append(slide);
  slide.querySelectorAll('.reveal').forEach((el, j) => el.style.setProperty('--stagger', Math.min(j, 5)));
  const button = document.createElement('button');
  button.textContent = labels[i];
  button.title = slide.dataset.chapter;
  button.setAttribute('aria-label', `第 ${i + 1} 页：${slide.querySelector('h1,h2').textContent}`);
  button.addEventListener('click', () => go(i));
  $('#dots').append(button);
});

function setScene() {
  const scene = manualScene || slides[Math.max(current, 0)].dataset.scene;
  document.body.dataset.scene = scene;
  const [icon, label, caption] = sceneLabels[scene];
  $('#weather-icon').textContent = icon;
  $('#scene-label').textContent = label;
  $('#scene-caption').textContent = caption;
  $('#lighting').firstElementChild.textContent = scene === 'night' ? '☾' : '☀';
  $('#lighting').setAttribute('aria-label', scene === 'night' ? '切换日间光影' : '切换夜间光影');
  $('#lighting').title = scene === 'night' ? '切换日间光影' : '切换夜间光影';
}

function fitCurrentSlide() {
  layoutFrame = 0;
  if (current < 0 || matchMedia('print').matches) return;
  const slide = slides[current];
  const stage = slide.parentElement;
  const pages = $('.pages');
  const availableWidth = pages.clientWidth;
  const availableHeight = pages.clientHeight;
  if (!availableWidth || !availableHeight) return;
  slide.classList.add('fit-measuring');
  // Responsive layouts do the main work. Scale only when an unusually small
  // window still cannot contain the complete page; never crop the content.
  const fits = (scale) => {
    stage.style.width = `${availableWidth / scale}px`;
    stage.style.height = `${availableHeight / scale}px`;
    return slide.scrollHeight <= stage.clientHeight + 1 && slide.scrollWidth <= stage.clientWidth + 1;
  };
  let scale = 1;
  if (!fits(1)) {
    let low = .25, high = 1;
    for (let i = 0; i < 9; i++) {
      const candidate = (low + high) / 2;
      if (fits(candidate)) low = candidate;
      else high = candidate;
    }
    scale = low;
    fits(scale);
  }
  stage.style.transform = `scale(${scale})`;
  stage.dataset.scale = scale.toFixed(3);
  slide.classList.remove('fit-measuring');
}

function scheduleLayout() {
  if (!layoutFrame) layoutFrame = requestAnimationFrame(fitCurrentSlide);
}

function go(index, updateHash = true) {
  const target = Math.max(0, Math.min(slides.length - 1, index));
  if (target === current) return;
  const previous = current;
  const direction = target > previous ? 1 : -1;
  current = target;
  clearTimeout(leavingTimer);
  pageAnimations.forEach((animation) => animation.cancel());
  pageAnimations = [];
  slides.forEach((slide, i) => {
    slide.classList.remove('leaving');
    slide.classList.toggle('active', i === current);
    slide.setAttribute('aria-hidden', String(i !== current));
    slide.inert = i !== current;
  });
  fitCurrentSlide();
  if (motionEnabled && previous >= 0 && typeof slides[current].animate === 'function') {
    const oldSlide = slides[previous];
    oldSlide.classList.add('leaving');
    pageAnimations.push(oldSlide.animate([
      { opacity: 1, transform: 'translateX(0) rotateY(0deg)' },
      { opacity: 0, transform: `translateX(${-direction * 55}px) rotateY(${-direction * 4}deg)` },
    ], { duration: 300, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
    pageAnimations.push(slides[current].animate([
      { opacity: 0, transform: `translateX(${direction * 65}px) rotateY(${direction * 3}deg)` },
      { opacity: 1, transform: 'translateX(0) rotateY(0deg)' },
    ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' }));
    leavingTimer = setTimeout(() => oldSlide.classList.remove('leaving'), 320);
  }
  [...$('#dots').children].forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
  $('#counter').textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  $('#chapter-label').textContent = slides[current].dataset.chapter;
  $('#progress').style.width = `${(current + 1) / slides.length * 100}%`;
  $('#prev').disabled = current === 0;
  $('#next').disabled = current === slides.length - 1;
  setScene();
  if (current === slides.length - 1 && motionEnabled) celebrate();
  document.dispatchEvent(new CustomEvent('campaign:slide'));
  if (updateHash) {
    try { history.replaceState(null, '', `#${current + 1}`); } catch { /* Supports offline file:// use. */ }
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function fromHash() {
  const n = Number(location.hash.slice(1));
  go(Number.isInteger(n) && n > 0 ? n - 1 : 0, false);
}

async function fullscreen() {
  const button = $('#fullscreen');
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else throw new Error('Fullscreen is unavailable');
  } catch {
    button.querySelector('.tool-label').textContent = '浏览器全屏';
    button.title = '当前浏览器不支持此按钮，请使用浏览器菜单中的全屏功能';
    button.setAttribute('aria-label', button.title);
  }
}

function resizeCanvas() {
  width = innerWidth;
  height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function celebrate() {
  // A finite, quiet scattering of light on the final page, behind the journal.
  burst = Array.from({ length: 32 }, () => ({
    x: width * (.15 + Math.random() * .7), y: height * (.1 + Math.random() * .8),
    vx: (Math.random() - .5) * 1.7, vy: -Math.random() * 2 - .2,
    life: 1, size: Math.random() * 3 + 2,
  }));
}

function frame(now) {
  particleFrame = 0;
  if (!motionEnabled || document.hidden || !context) return;
  particleFrame = requestAnimationFrame(frame);
  if (now - lastFrame < 32) return; // Cap the ambient layer to ~30 fps.
  const delta = Math.min((now - lastFrame) / 1000, .08);
  lastFrame = now;
  elapsed += delta;
  context.clearRect(0, 0, width, height);
  const night = document.body.dataset.scene === 'night';
  smoothX += (pointerX - smoothX) * .06;
  smoothY += (pointerY - smoothY) * .06;
  document.documentElement.style.setProperty('--parallax-x', `${(smoothX - .5) * -12}px`);
  document.documentElement.style.setProperty('--parallax-y', `${(smoothY - .5) * -8}px`);
  document.documentElement.style.setProperty('--pointer-x', `${smoothX * 100}%`);
  document.documentElement.style.setProperty('--pointer-y', `${smoothY * 100}%`);
  for (const p of particles) {
    const x = (p.x * width + Math.sin(elapsed * .25 * p.speed + p.phase) * 42 + width) % width;
    const y = (p.y * height - elapsed * p.speed * 6 + height * 100) % height;
    const alpha = .2 + (Math.sin(elapsed * p.speed + p.phase) + 1) * .22;
    context.globalAlpha = alpha;
    context.fillStyle = night ? '#edffb8' : particleColor;
    context.shadowColor = context.fillStyle;
    context.shadowBlur = night ? 14 : 6;
    context.fillRect(Math.round(x), Math.round(y), p.size, p.size);
    if (night && p.size === 3 && alpha > .5) {
      context.globalAlpha = alpha * .45;
      context.fillRect(Math.round(x) - 2, Math.round(y) + 1, 7, 1);
      context.fillRect(Math.round(x) + 1, Math.round(y) - 2, 1, 7);
    }
  }
  for (const p of burst) {
    p.x += p.vx * delta * 30; p.y += p.vy * delta * 30; p.life -= delta * .26;
    context.globalAlpha = Math.max(0, p.life) * .8;
    context.fillStyle = '#ffefb3'; context.shadowColor = '#ffda78'; context.shadowBlur = 12;
    context.fillRect(p.x, p.y, p.size, p.size);
  }
  burst = burst.filter((p) => p.life > 0);
  context.globalAlpha = 1; context.shadowBlur = 0;
}

function syncMotion() {
  motionEnabled = preferredMotion && !reducedMotion.matches;
  document.body.classList.toggle('motion-paused', !motionEnabled);
  document.body.classList.toggle('tab-hidden', document.hidden);
  const button = $('#motion');
  button.setAttribute('aria-pressed', String(motionEnabled));
  button.querySelector('.tool-label').textContent = motionEnabled ? '动效开' : '动效关';
  button.firstElementChild.textContent = motionEnabled ? '✧' : 'Ⅱ';
  button.title = reducedMotion.matches ? '已遵循系统的减少动态效果设置' : motionEnabled ? '暂停动态效果' : '启用动态效果';
  button.setAttribute('aria-label', button.title);
  if (particleFrame) cancelAnimationFrame(particleFrame);
  particleFrame = 0;
  if (motionEnabled && !document.hidden) { lastFrame = performance.now(); particleFrame = requestAnimationFrame(frame); }
  else {
    context?.clearRect(0, 0, width, height);
    burst = [];
    pageAnimations.forEach((animation) => animation.cancel());
    pageAnimations = [];
    clearTimeout(leavingTimer);
    slides.forEach((slide) => slide.classList.remove('leaving'));
  }
  document.dispatchEvent(new CustomEvent('campaign:motion'));
}

$('#prev').addEventListener('click', () => go(current - 1));
$('#next').addEventListener('click', () => go(current + 1));
$('#fullscreen').addEventListener('click', fullscreen);
$('#lighting').addEventListener('click', () => { manualScene = document.body.dataset.scene === 'night' ? 'morning' : 'night'; setScene(); });
$('#motion').addEventListener('click', () => {
  if (reducedMotion.matches) return;
  preferredMotion = !preferredMotion;
  try { localStorage.setItem('valley-motion', preferredMotion ? 'on' : 'off'); } catch { /* Optional preference. */ }
  syncMotion();
});
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  $('#fullscreen').querySelector('.tool-label').textContent = active ? '退出全屏' : '全屏';
  $('#fullscreen').title = active ? '退出全屏（F / Esc）' : '全屏演示（F）';
  $('#fullscreen').setAttribute('aria-label', active ? '退出全屏' : '全屏演示');
});
document.addEventListener('keydown', (event) => {
  if (event.target.closest('input,textarea,select,[contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest('button,a') && [' ', 'Enter'].includes(event.key)) return;
  if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); go(current + 1); }
  if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(current - 1); }
  if (event.key === 'Home') { event.preventDefault(); go(0); }
  if (event.key === 'End') { event.preventDefault(); go(slides.length - 1); }
  if (event.key.toLowerCase() === 'f' && !event.repeat) fullscreen();
});
let touchStart = null;
$('#deck').addEventListener('touchstart', (event) => {
  if (event.touches.length !== 1) { touchStart = null; return; }
  const t = event.changedTouches[0]; touchStart = [t.clientX, t.clientY];
}, { passive: true });
$('#deck').addEventListener('touchend', (event) => {
  if (!touchStart) return;
  const t = event.changedTouches[0], dx = t.clientX - touchStart[0], dy = t.clientY - touchStart[1];
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
$('#deck').addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
window.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse' && motionEnabled) { pointerX = event.clientX / width; pointerY = event.clientY / height; } }, { passive: true });
window.addEventListener('resize', resizeCanvas);
new ResizeObserver(scheduleLayout).observe($('.pages'));
document.fonts.ready.then(scheduleLayout);
window.addEventListener('afterprint', scheduleLayout);
window.addEventListener('hashchange', fromHash);
document.addEventListener('visibilitychange', syncMotion);
reducedMotion.addEventListener('change', syncMotion);
resizeCanvas();
fromHash();
syncMotion();
