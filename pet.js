(() => {
  const pet = document.querySelector('#pet');
  const text = document.querySelector('#pet-text');
  const status = document.querySelector('#pet-status');
  const replay = document.querySelector('#pet-replay');
  const voiceButton = document.querySelector('#pet-voice');
  const buddy = { name: '啾啾', animal: '像素小鸡' };
  const narration = [
    '欢迎来看宋如一的学委竞选！',
    '一起来认识一下她吧！',
    '这是她对学委的理解与优势。',
    '当选后，她将落实四件实事。',
    '件件有着落，事事有回音，谢谢大家！',
  ];
  // 预生成的电子合成语音，翻页时播放对应音频
  const audioFiles = narration.map((_, i) => `assets/audio/narration-${i + 1}.mp3`);
  const audio = new Audio();
  let chapter = 0;
  let voiceEnabled = false; // Sound always starts muted, including after a reload.
  let speechRun = 0;
  let greetingTimer;
  let idleTimer;
  let voiceTimer;

  const canMove = () => !document.hidden && !document.body.classList.contains('motion-paused');

  function stopMotion() {
    clearTimeout(greetingTimer);
    clearTimeout(idleTimer);
    pet.dataset.state = 'idle';
  }

  function animateExplanation() {
    stopMotion();
    if (!canMove()) return;
    pet.dataset.state = chapter === narration.length - 1 ? 'happy' : 'pointing';
    greetingTimer = setTimeout(() => { if (canMove()) pet.dataset.state = 'talking'; }, 650);
    idleTimer = setTimeout(() => { pet.dataset.state = 'idle'; }, Math.max(6500, narration[chapter].length * 220));
  }

  function stopSpeech() {
    speechRun++;
    clearTimeout(voiceTimer);
    audio.onplay = audio.onended = audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
  }

  function updateVoiceButton() {
    voiceButton.setAttribute('aria-pressed', String(voiceEnabled));
    voiceButton.querySelector('span').textContent = voiceEnabled ? '关声音' : '开声音';
    voiceButton.setAttribute('aria-label', voiceEnabled ? '关闭桌宠语音讲解' : '开启桌宠语音讲解');
    voiceButton.title = voiceEnabled ? '关闭声音，保留文字讲解' : '开启后，翻页会讲解当前内容';
  }

  function speechUnavailable() {
    stopSpeech();
    voiceEnabled = false;
    updateVoiceButton();
    voiceButton.querySelector('span').textContent = '暂不可用';
    voiceButton.setAttribute('aria-label', '语音暂不可用，点击重试');
    voiceButton.title = '语音文件加载失败，文字讲解仍可使用';
    status.textContent = '语音暂不可用，先看文字讲解吧';
    animateExplanation();
  }

  function speak() {
    if (!voiceEnabled || document.hidden) return;
    const run = ++speechRun;
    audio.src = audioFiles[chapter];
    audio.onplay = () => {
      if (run !== speechRun) return;
      clearTimeout(greetingTimer);
      clearTimeout(idleTimer);
      pet.dataset.state = canMove() ? 'talking' : 'idle';
      status.textContent = '正在讲解这一页';
    };
    audio.onended = () => {
      if (run !== speechRun) return;
      clearTimeout(voiceTimer);
      stopMotion();
      status.textContent = '讲完啦，点我可以再讲一遍';
    };
    audio.onerror = () => { if (run === speechRun) speechUnavailable(); };
    voiceTimer = setTimeout(() => { if (run === speechRun) speechUnavailable(); }, 10000);
    try { audio.play().catch(() => speechUnavailable()); } catch { speechUnavailable(); }
  }

  function explain() {
    stopSpeech();
    status.textContent = voiceEnabled ? '准备讲解这一页' : '点桌宠，可以再讲一遍';
    animateExplanation();
    speak();
  }

  function setupBuddy() {
    pet.dataset.pet = 'valley';
    document.querySelector('#pet-name').textContent = buddy.name;
    pet.setAttribute('aria-label', `${buddy.animal}${buddy.name}的本页讲解`);
    replay.setAttribute('aria-label', `让${buddy.name}再讲一遍本页`);
  }

  function updateChapter() {
    const slides = [...document.querySelectorAll('.slide')];
    chapter = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
    pet.dataset.chapter = String(chapter + 1);
    text.textContent = narration[chapter];
    document.querySelector('#pet-chapter').textContent = slides[chapter].dataset.chapter;
    explain();
  }

  replay.addEventListener('click', explain);
  voiceButton.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    updateVoiceButton();
    explain();
  });
  document.addEventListener('campaign:slide', updateChapter);
  document.addEventListener('campaign:motion', () => {
    if (!canMove()) stopMotion();
    else if (!audio.paused) pet.dataset.state = 'talking';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSpeech();
      stopMotion();
      status.textContent = '点我，继续讲这一页';
    }
  });
  for (const event of ['pagehide', 'beforeprint']) window.addEventListener(event, () => { stopSpeech(); stopMotion(); });
  setupBuddy();
  updateChapter();
  updateVoiceButton();
})();
