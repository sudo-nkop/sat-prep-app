// SAT Practice — single-file app logic
// Data: data/questions.json
// Storage: localStorage under namespace "sat-app:*"

const KEY = {
  stats: 'sat-app:stats',
  history: 'sat-app:history',
  settings: 'sat-app:settings',
  lastOpen: 'sat-app:lastOpen',
  imported: 'sat-app:imported',
  seen: 'sat-app:seen',
  mastered: 'sat-app:mastered',
};

const DEFAULT_SETTINGS = { reminderHours: 24, theme: 'dark', accentColor: '' };

// ---------- state ----------
let allQuestions = [];
let cheatsheets = [];
let currentSession = null; // { mode, questions, answers, flagged, idx, startedAt, durationMs }
let fullSatState = null;
let timerHandle = null;
let deferredInstallPrompt = null;

// ---------- storage helpers ----------
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getSettings() { return { ...DEFAULT_SETTINGS, ...load(KEY.settings, {}) }; }
function getStats() { return load(KEY.stats, { answered: 0, correct: 0, streak: 0, lastDay: null }); }
function getHistory() { return load(KEY.history, []); }
function getSeenIds() { return new Set(load(KEY.seen, [])); }
function addSeenIds(ids) {
  const seen = getSeenIds();
  ids.forEach(id => { if (id) seen.add(id); });
  save(KEY.seen, [...seen]);
}
function getMasteredIds() { return new Set(load(KEY.mastered, [])); }
function addMasteredIds(ids) {
  const mastered = getMasteredIds();
  ids.forEach(id => { if (id) mastered.add(id); });
  save(KEY.mastered, [...mastered]);
}

// ---------- navigation ----------
const screens = ['home', 'practice-setup', 'test-setup', 'endless-setup', 'quiz', 'results', 'cheatsheets', 'history', 'settings', 'import', 'module-break', 'pre-review'];
const screenStack = ['screen-home'];

function go(id, push = true) {
  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.hidden = ('screen-' + s) !== id;
  });
  if (push) screenStack.push(id);
  document.getElementById('back-btn').hidden = screenStack.length <= 1;
  const titles = {
    'screen-home': 'SAT Practice',
    'screen-practice-setup': 'Practice',
    'screen-test-setup': 'Timed Test',
    'screen-quiz': currentSession?.mode === 'test' ? 'Test' : currentSession?.mode === 'endless' ? 'Endless' : 'Practice',
    'screen-endless-setup': 'Endless Mode',
    'screen-results': 'Results',
    'screen-cheatsheets': 'Cheatsheets',
    'screen-history': 'History',
    'screen-settings': 'Settings',
    'screen-import': 'Import Questions',
    'screen-module-break': 'Module Complete',
    'screen-pre-review': 'Review Answers',
  };
  document.getElementById('page-title').textContent = titles[id] || 'SAT Practice';
  if (id === 'screen-home') refreshHome();
  window.scrollTo(0, 0);
}
function back() {
  if (screenStack.length > 1) {
    if (screenStack[screenStack.length - 1] === 'screen-quiz' && currentSession) {
      const visitedIds = currentSession.questions
        .slice(0, (currentSession.maxIdx ?? currentSession.idx) + 1)
        .map(q => q.id);
      addSeenIds(visitedIds);
    }
    screenStack.pop();
    go(screenStack[screenStack.length - 1], false);
  }
}

// ---------- data load ----------
async function loadQuestions() {
  const res = await fetch('data/questions.json?v=18', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load questions');
  const data = await res.json();
  const imported = load(KEY.imported, []);
  allQuestions = [...data.questions, ...imported];
  populateTopicFilter();
  populateEndlessTopicFilter();
  const hint = document.getElementById('search-results');
  if (hint) hint.innerHTML = `<p class="search-hint muted small">Search across ${allQuestions.length} questions by keyword, topic, or phrase.</p>`;
}

function getSelectedDifficulties() {
  const active = [...document.querySelectorAll('#practice-difficulty .diff-btn.active')];
  if (active.length === 0 || active.length === 3) return 'all';
  return new Set(active.map(b => Number(b.dataset.diff)));
}

function updateUnseenLabel() {
  const el = document.getElementById('unseen-count-label');
  if (!el) return;
  const section = document.getElementById('practice-section').value;
  const topic   = document.getElementById('practice-topic').value;
  const diffs   = getSelectedDifficulties();
  const masteredIds = getMasteredIds();
  const pool = allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (topic   === 'all' || q.topic   === topic)   &&
    (diffs   === 'all' || diffs.has(q.difficulty))
  );
  const available = pool.filter(q => !masteredIds.has(q.id)).length;
  el.textContent = pool.length === 0
    ? 'No questions match these filters.'
    : `${available} question${available !== 1 ? 's' : ''} available (${pool.length} total)`;
}

function populateTopicFilter() {
  const sel = document.getElementById('practice-topic');
  const sectionSel = document.getElementById('practice-section');
  function refresh() {
    const sec = sectionSel.value;
    const topics = new Set();
    allQuestions.forEach(q => {
      if (sec === 'all' || q.section === sec) topics.add(q.topic);
    });
    sel.innerHTML = '<option value="all">All topics</option>' +
      [...topics].sort().map(t => `<option value="${t}">${t.replace('-', ' ')}</option>`).join('');
    updateUnseenLabel();
  }
  sectionSel.addEventListener('change', refresh);
  refresh();
}

// ---------- practice / test ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleChoices(q) {
  const letters = ['A', 'B', 'C', 'D'].filter(l => q.choices[l] != null);
  const vals = letters.map(l => q.choices[l]);
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  const correctText = q.choices[q.answer];
  const newChoices = {};
  letters.forEach((l, i) => { newChoices[l] = vals[i]; });
  const newAnswer = letters.find(l => newChoices[l] === correctText);
  return { ...q, choices: newChoices, answer: newAnswer };
}

function pickQuestions({ section, topic, difficulties, count }) {
  const seenIds = getSeenIds();
  const masteredIds = getMasteredIds();
  const pool = allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (topic === 'all' || q.topic === topic) &&
    (difficulties === 'all' || difficulties.has(q.difficulty))
  );
  if (pool.length === 0) return [];
  const available = pool.filter(q => !masteredIds.has(q.id));
  // Unseen questions first, then seen-but-unmastered (for review), both shuffled
  const unseen = shuffle(available.filter(q => !seenIds.has(q.id)));
  const seenUnmastered = shuffle(available.filter(q => seenIds.has(q.id)));
  return [...unseen, ...seenUnmastered].slice(0, count);
}

function startPractice() {
  const section = document.getElementById('practice-section').value;
  const topic = document.getElementById('practice-topic').value;
  const difficulties = getSelectedDifficulties();
  const count = Number(document.getElementById('practice-count').value);

  const masteredIds = getMasteredIds();
  const basePool = allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (topic === 'all' || q.topic === topic) &&
    (difficulties === 'all' || difficulties.has(q.difficulty))
  );
  if (basePool.length === 0) {
    alert('No questions match those filters. Try widening your criteria.');
    return;
  }
  const availableCount = basePool.filter(q => !masteredIds.has(q.id)).length;
  if (availableCount === 0) {
    if (confirm(`You've mastered all ${basePool.length} questions matching these filters!\n\nReset your progress to practice them again?`)) {
      save(KEY.mastered, []);
      startPractice();
    }
    return;
  }

  const qs = pickQuestions({ section, topic, difficulties, count }).map(shuffleChoices);
  currentSession = {
    mode: 'practice',
    questions: qs,
    answers: new Array(qs.length).fill(null),
    flagged: new Set(),
    idx: 0,
    startedAt: Date.now(),
    durationMs: null,
  };
  go('screen-quiz');
  renderQuiz();
}

function getSelectedEndlessDifficulties() {
  const active = [...document.querySelectorAll('#endless-difficulty .diff-btn.active')];
  if (active.length === 0 || active.length === 3) return 'all';
  return new Set(active.map(b => Number(b.dataset.diff)));
}

function updateEndlessLabel() {
  const el = document.getElementById('endless-count-label');
  if (!el) return;
  const section = document.getElementById('endless-section').value;
  const topic   = document.getElementById('endless-topic').value;
  const diffs   = getSelectedEndlessDifficulties();
  const pool = allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (topic   === 'all' || q.topic   === topic)   &&
    (diffs   === 'all' || diffs.has(q.difficulty))
  );
  el.textContent = pool.length === 0
    ? 'No questions match these filters.'
    : `${pool.length} question${pool.length !== 1 ? 's' : ''} in pool — will cycle when exhausted`;
}

function populateEndlessTopicFilter() {
  const sel = document.getElementById('endless-topic');
  const sectionSel = document.getElementById('endless-section');
  function refresh() {
    const sec = sectionSel.value;
    const topics = new Set();
    allQuestions.forEach(q => {
      if (sec === 'all' || q.section === sec) topics.add(q.topic);
    });
    sel.innerHTML = '<option value="all">All topics</option>' +
      [...topics].sort().map(t => `<option value="${t}">${t.replace('-', ' ')}</option>`).join('');
    updateEndlessLabel();
  }
  sectionSel.addEventListener('change', refresh);
  refresh();
}

function buildEndlessPool(config) {
  const { section, topic, difficulties } = config;
  return shuffle(allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (topic === 'all' || q.topic === topic) &&
    (difficulties === 'all' || difficulties.has(q.difficulty))
  )).map(shuffleChoices);
}

function startEndless() {
  const section = document.getElementById('endless-section').value;
  const topic = document.getElementById('endless-topic').value;
  const difficulties = getSelectedEndlessDifficulties();
  const config = { section, topic, difficulties };

  const pool = buildEndlessPool(config);
  if (pool.length === 0) {
    alert('No questions match those filters. Try widening your criteria.');
    return;
  }

  currentSession = {
    mode: 'endless',
    questions: pool,
    answers: new Array(pool.length).fill(null),
    flagged: new Set(),
    idx: 0,
    startedAt: Date.now(),
    durationMs: null,
    _endlessConfig: config,
  };
  go('screen-quiz');
  renderQuiz();
}

function startTest(kind) {
  let section, targetCount, secPerQ;
  if (kind === 'rw') {
    section = 'rw'; targetCount = 27; secPerQ = (32 * 60) / 27;
  } else if (kind === 'math') {
    section = 'math'; targetCount = 22; secPerQ = (35 * 60) / 22;
  } else {
    section = 'all'; targetCount = 15; secPerQ = (20 * 60) / 15;
  }

  const masteredIds = getMasteredIds();
  const pool = allQuestions.filter(q => section === 'all' || q.section === section);
  const availableCount = pool.filter(q => !masteredIds.has(q.id)).length;
  if (availableCount === 0) {
    if (confirm(`You've mastered all ${pool.length} questions in this section!\n\nReset your progress to start fresh?`)) {
      save(KEY.mastered, []);
      startTest(kind);
    }
    return;
  }

  const qs = pickQuestions({ section, topic: 'all', difficulties: 'all', count: targetCount }).map(shuffleChoices);
  const durationMs = Math.round(qs.length * secPerQ * 1000);
  currentSession = {
    mode: 'test',
    kind,
    questions: qs,
    answers: new Array(qs.length).fill(null),
    flagged: new Set(),
    idx: 0,
    startedAt: Date.now(),
    durationMs,
    deadline: Date.now() + durationMs,
  };
  go('screen-quiz');
  renderQuiz();
  startTimer();
}

function startTimer() {
  const timerEl = document.getElementById('quiz-timer');
  const timerWrap = document.getElementById('quiz-timer-wrap');
  timerEl.hidden = false;
  delete timerEl.dataset.timerHidden;
  const toggleBtn = document.getElementById('quiz-timer-toggle');
  if (toggleBtn) toggleBtn.classList.remove('timer-off');
  if (timerWrap) timerWrap.hidden = false;
  function tick() {
    const remaining = currentSession.deadline - Date.now();
    if (remaining <= 0) {
      if (!timerEl.dataset.timerHidden) timerEl.textContent = '00:00';
      finishQuiz(true);
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (!timerEl.dataset.timerHidden) {
      timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    if (remaining < 300000) timerEl.classList.add('warning');
  }
  tick();
  timerHandle = setInterval(tick, 500);
}
function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  document.getElementById('quiz-timer').hidden = true;
  document.getElementById('quiz-timer').classList.remove('warning');
  const timerWrap = document.getElementById('quiz-timer-wrap');
  if (timerWrap) timerWrap.hidden = true;
}

function renderQuiz() {
  const s = currentSession;
  s.maxIdx = Math.max(s.maxIdx ?? 0, s.idx);
  const q = s.questions[s.idx];

  // section / module label
  const labelEl = document.getElementById('quiz-section-label');
  if (labelEl) {
    if (s.moduleLabel) labelEl.textContent = s.moduleLabel;
    else if (s.mode === 'test') labelEl.textContent = s.kind === 'rw' ? 'Reading & Writing' : s.kind === 'math' ? 'Math' : 'Mixed';
    else if (s.mode === 'endless') labelEl.textContent = '∞ Endless';
    else labelEl.textContent = '';
  }

  document.getElementById('quiz-calc').hidden = q.section !== 'math';
  const refBtn = document.getElementById('quiz-ref');
  if (refBtn) refBtn.hidden = q.section !== 'math';
  if (s.mode === 'endless') {
    document.getElementById('quiz-progress').textContent = `Q ${s.idx + 1}`;
  } else {
    document.getElementById('quiz-progress').textContent = `${s.idx + 1} of ${s.questions.length}`;
  }
  const qNumEl = document.getElementById('sat-q-num');
  if (qNumEl) qNumEl.textContent = s.idx + 1;
  const diffEl = document.getElementById('q-difficulty');
  if (diffEl) {
    const labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
    const keys   = { 1: 'easy', 2: 'medium', 3: 'hard' };
    diffEl.textContent = labels[q.difficulty] ?? '';
    diffEl.dataset.level = keys[q.difficulty] ?? '';
  }
  const bar = document.getElementById('quiz-progress-bar');
  if (bar) bar.style.width = s.mode === 'endless' ? '100%' : `${((s.idx + 1) / s.questions.length) * 100}%`;
  const promptEl = document.getElementById('q-prompt');
  promptEl.innerHTML = escapeHtml(q.prompt).replace(/\n/g, '<br>');
  renderMath(promptEl);
  const choices = document.getElementById('q-choices');
  choices.innerHTML = '';
  ['A','B','C','D'].forEach(letter => {
    if (!q.choices[letter]) return;
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.dataset.letter = letter;
    btn.innerHTML = `<span class="letter">${letter}</span><span class="ctxt">${escapeHtml(q.choices[letter])}</span>`;
    if (s.answers[s.idx] === letter) btn.classList.add('selected');
    // restore strikethrough state
    const struck = s._struck?.[s.idx];
    if (struck && struck.has(letter)) btn.classList.add('struck');
    btn.onclick = () => {
      // Eliminator mode: click to toggle strikethrough
      if (choices.classList.contains('elim-mode')) {
        if (btn.classList.contains('correct') || btn.classList.contains('incorrect')) return;
        s._struck = s._struck || {};
        s._struck[s.idx] = s._struck[s.idx] || new Set();
        if (s._struck[s.idx].has(letter)) {
          s._struck[s.idx].delete(letter);
          btn.classList.remove('struck');
        } else {
          s._struck[s.idx].add(letter);
          btn.classList.add('struck');
          if (s.answers[s.idx] === letter) {
            s.answers[s.idx] = null;
            btn.classList.remove('selected');
          }
        }
        updateNavigator();
        return;
      }
      if (s.mode === 'practice' && s.answers[s.idx] != null && !document.getElementById('q-explanation').hidden) return;
      s.answers[s.idx] = letter;
      [...choices.children].forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      updateNavigator();
    };
    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (btn.classList.contains('correct') || btn.classList.contains('incorrect')) return;
      s._struck = s._struck || {};
      s._struck[s.idx] = s._struck[s.idx] || new Set();
      if (s._struck[s.idx].has(letter)) {
        s._struck[s.idx].delete(letter);
        btn.classList.remove('struck');
      } else {
        s._struck[s.idx].add(letter);
        btn.classList.add('struck');
        if (s.answers[s.idx] === letter) {
          s.answers[s.idx] = null;
          btn.classList.remove('selected');
          updateNavigator();
        }
      }
    });
    choices.appendChild(btn);
  });
  renderMath(choices);

  // flag / mark for review visual
  const markBtn = document.getElementById('quiz-mark-review');
  if (markBtn) {
    markBtn.hidden = s.mode === 'practice';
    const isMarked = s.flagged.has(s.idx);
    markBtn.classList.toggle('marked', isMarked);
    const markLabel = markBtn.querySelector('.mark-label');
    if (markLabel) markLabel.textContent = isMarked ? 'Marked for Review' : 'Mark for Review';
  }
  const elimBtn = document.getElementById('quiz-eliminator');
  if (elimBtn) elimBtn.hidden = s.mode === 'practice';

  // explanation reset
  const expl = document.getElementById('q-explanation');
  expl.hidden = true;

  // actions
  const submit = document.getElementById('quiz-submit');
  const skip = document.getElementById('quiz-skip');
  const next = document.getElementById('quiz-next');
  const prev = document.getElementById('quiz-prev');
  const finish = document.getElementById('quiz-finish');
  // Reset button labels (may have been changed by endless mode)
  if (s.mode !== 'endless') {
    next.textContent = 'Next';
    finish.textContent = 'End Section';
  }

  prev.hidden = s.idx === 0;
  if (s.mode === 'endless') {
    finish.textContent = 'End Session';
    if (s.answers[s.idx] != null && s._reviewed?.[s.idx]) {
      submit.hidden = true;
      skip.hidden = true;
      next.hidden = false;
      next.textContent = 'Next Question';
      finish.hidden = false;
      showExplanation();
    } else {
      submit.hidden = false;
      skip.hidden = true;
      next.hidden = true;
      finish.hidden = false;
    }
  } else if (s.mode === 'practice') {
    if (s.answers[s.idx] != null && s._reviewed?.[s.idx]) {
      submit.hidden = true;
      skip.hidden = true;
      next.hidden = s.idx === s.questions.length - 1;
      finish.hidden = s.idx !== s.questions.length - 1;
      showExplanation();
    } else {
      submit.hidden = false;
      skip.hidden = false;
      next.hidden = true;
      finish.hidden = true;
    }
  } else {
    submit.hidden = true;
    skip.hidden = true;
    next.hidden = s.idx === s.questions.length - 1;
    finish.hidden = s.idx !== s.questions.length - 1;
    prev.hidden = s.idx === 0;
  }

  updateNavigator();
}

function showExplanation() {
  const s = currentSession;
  const q = s.questions[s.idx];
  const ans = s.answers[s.idx];
  const correct = ans === q.answer;
  // mark choices
  [...document.getElementById('q-choices').children].forEach(btn => {
    const l = btn.dataset.letter;
    btn.disabled = true;
    btn.classList.remove('selected');
    if (l === q.answer) btn.classList.add('correct');
    if (l === ans && !correct) btn.classList.add('incorrect');
  });
  const expl = document.getElementById('q-explanation');
  expl.hidden = false;
  const result = document.getElementById('q-result');
  result.textContent = correct ? 'Correct' : (ans ? 'Incorrect' : 'Skipped');
  result.className = 'explanation-result ' + (correct ? 'correct' : 'incorrect');
  const explText = document.getElementById('q-explanation-text');
  explText.innerHTML = escapeHtml(q.explanation || '').replace(/\n/g, '<br>');
  renderMath(explText);
}

function submitAnswer() {
  const s = currentSession;
  if (s.answers[s.idx] == null) {
    alert('Pick an answer first (or use Flag to skip).');
    return;
  }
  s._reviewed = s._reviewed || {};
  s._reviewed[s.idx] = true;
  const q = s.questions[s.idx];
  const stats = getStats();
  stats.answered += 1;
  if (s.answers[s.idx] === q.answer) {
    stats.correct += 1;
    addMasteredIds([q.id]);
  }
  // streak: count today as a practiced day
  const today = new Date().toISOString().slice(0,10);
  if (stats.lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    stats.streak = (stats.lastDay === yesterday) ? (stats.streak + 1) : 1;
    stats.lastDay = today;
  }
  save(KEY.stats, stats);
  renderQuiz();
}

function nextQuestion() {
  const s = currentSession;
  if (s.mode === 'endless') {
    if (s.idx < s.questions.length - 1) {
      s.idx += 1;
    } else {
      // Pool exhausted — rebuild and append another cycle
      const more = buildEndlessPool(s._endlessConfig);
      const newIdx = s.questions.length;
      s.questions.push(...more);
      s.answers.push(...new Array(more.length).fill(null));
      s.idx = newIdx;
    }
    renderQuiz();
    return;
  }
  if (s.idx < s.questions.length - 1) {
    s.idx += 1;
    renderQuiz();
  }
}
function prevQuestion() {
  if (currentSession.idx > 0) {
    currentSession.idx -= 1;
    renderQuiz();
  }
}
function skipQuestion() {
  const s = currentSession;
  if (s.idx < s.questions.length - 1) {
    s.idx += 1;
    renderQuiz();
  } else {
    finishQuiz();
  }
}
function toggleFlag() {
  const i = currentSession.idx;
  if (currentSession.flagged.has(i)) currentSession.flagged.delete(i);
  else currentSession.flagged.add(i);
  renderQuiz();
}

function updateNavigator() {
  const s = currentSession;
  const grid = document.getElementById('nav-grid');
  if (!grid || !s) return;
  grid.innerHTML = s.questions.map((q, i) => {
    const isCurrent = i === s.idx;
    const isAnswered = s.answers[i] != null;
    const isFlagged = s.flagged.has(i);
    let cls = 'nav-q-btn';
    if (isCurrent) cls += ' nav-current';
    else if (isFlagged) cls += ' nav-flagged';
    else if (isAnswered) cls += ' nav-answered';
    return `<button class="${cls}" data-qi="${i}">${i+1}</button>`;
  }).join('');
  grid.querySelectorAll('[data-qi]').forEach(btn => {
    btn.onclick = () => {
      currentSession.idx = Number(btn.dataset.qi);
      hideNavigator();
      renderQuiz();
    };
  });
}
function showNavigator() { document.getElementById('nav-overlay').hidden = false; updateNavigator(); }
function hideNavigator() { document.getElementById('nav-overlay').hidden = true; }

function startFullSat() {
  const modules = [
    { section: 'rw',   count: 27, secPerQ: (32*60)/27, label: 'Reading & Writing · Module 1' },
    { section: 'rw',   count: 27, secPerQ: (32*60)/27, label: 'Reading & Writing · Module 2' },
    { section: 'math', count: 22, secPerQ: (35*60)/22, label: 'Math · Module 1' },
    { section: 'math', count: 22, secPerQ: (35*60)/22, label: 'Math · Module 2' },
  ];
  fullSatState = { modules, current: 0, results: [], usedIds: new Set() };
  startFullSatModule(0);
}

function startFullSatModule(idx) {
  const mod = fullSatState.modules[idx];
  fullSatState.current = idx;
  const usedIds = fullSatState.usedIds;
  const masteredIds = getMasteredIds();
  const seenIds = getSeenIds();
  const pool = allQuestions.filter(q => q.section === mod.section && !masteredIds.has(q.id) && !usedIds.has(q.id));
  const unseen = shuffle(pool.filter(q => !seenIds.has(q.id)));
  const seenPool = shuffle(pool.filter(q => seenIds.has(q.id)));
  const qs = [...unseen, ...seenPool].slice(0, mod.count).map(shuffleChoices);
  qs.forEach(q => usedIds.add(q.id));
  const durationMs = Math.round(qs.length * mod.secPerQ * 1000);
  currentSession = {
    mode: 'test', kind: 'full', moduleLabel: mod.label, moduleIdx: idx,
    questions: qs, answers: new Array(qs.length).fill(null),
    flagged: new Set(), idx: 0, startedAt: Date.now(), durationMs,
    deadline: Date.now() + durationMs,
  };
  go('screen-quiz');
  renderQuiz();
  startTimer();
}

function showModuleBreak() {
  stopTimer();
  const s = currentSession;
  const mod = fullSatState.modules[s.moduleIdx];
  let correct = 0;
  s.questions.forEach((q, i) => { if (s.answers[i] === q.answer) correct++; });
  fullSatState.results.push({ label: mod.label, score: correct, total: s.questions.length, durationMs: Date.now() - s.startedAt });
  addSeenIds(s.questions.map(q => q.id));
  addMasteredIds(s.questions.filter((q, i) => s.answers[i] === q.answer).map(q => q.id));
  const nextIdx = s.moduleIdx + 1;
  const isLast = nextIdx >= fullSatState.modules.length;
  document.getElementById('break-module-name').textContent = mod.label;
  document.getElementById('break-score').textContent = `${correct} / ${s.questions.length}`;
  if (isLast) {
    document.getElementById('break-next-label').textContent = 'You have completed the full test!';
    const btn = document.getElementById('break-continue');
    btn.textContent = 'View Final Results';
    btn.onclick = showFullSatResults;
  } else {
    const next = fullSatState.modules[nextIdx];
    const isSectionBreak = s.moduleIdx === 1;
    document.getElementById('break-next-label').textContent = isSectionBreak
      ? `Section break — next up: ${next.label}` : `Next: ${next.label}`;
    const btn = document.getElementById('break-continue');
    btn.textContent = isSectionBreak ? 'Continue to Math Section' : 'Start Next Module';
    btn.onclick = () => startFullSatModule(nextIdx);
  }
  go('screen-module-break');
}

function showFullSatResults() {
  const results = fullSatState.results;
  const totalCorrect = results.reduce((s, r) => s + r.score, 0);
  const totalQ = results.reduce((s, r) => s + r.total, 0);
  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);
  const pct = Math.round(totalCorrect / totalQ * 100);
  document.getElementById('result-score').textContent = `${totalCorrect} / ${totalQ}`;
  document.getElementById('result-pct').textContent = pct + '%';
  const summary = document.getElementById('results-summary');
  if (summary) { summary.classList.remove('good','okay','low'); summary.classList.add(pct >= 80 ? 'good' : pct >= 60 ? 'okay' : 'low'); }
  const resultBar = document.getElementById('result-bar');
  if (resultBar) setTimeout(() => { resultBar.style.width = pct + '%'; }, 100);
  const timeEl = document.getElementById('result-time');
  const min = Math.floor(totalMs / 60000), sec = Math.floor((totalMs % 60000) / 1000);
  timeEl.hidden = false;
  timeEl.textContent = `Total time: ${min}m ${sec}s`;
  document.getElementById('result-breakdown').innerHTML = results.map(r =>
    `<div class="breakdown-item"><strong>${r.score}/${r.total}</strong>${r.label}</div>`
  ).join('');
  document.getElementById('review-list').innerHTML = '<p class="muted" style="text-align:center">Full test complete — see section breakdowns above.</p>';
  const hist = getHistory();
  hist.unshift({ when: Date.now(), mode: 'test', kind: 'full', score: totalCorrect, total: totalQ, durationMs: totalMs });
  save(KEY.history, hist.slice(0, 50));
  fullSatState = null;
  go('screen-results');
}

function finishQuiz(timeUp = false) {
  // If full SAT mode, show module break instead
  if (currentSession.kind === 'full' && fullSatState) {
    showModuleBreak();
    return;
  }
  stopTimer();
  const s = currentSession;
  // For endless mode, trim to only reviewed questions
  if (s.mode === 'endless') {
    const reviewedIdxs = Object.keys(s._reviewed || {}).map(Number).sort((a, b) => a - b);
    if (reviewedIdxs.length === 0) {
      alert('Answer at least one question before ending the session.');
      return;
    }
    s.questions = reviewedIdxs.map(i => s.questions[i]);
    s.answers = reviewedIdxs.map(i => s.answers[i]);
  }
  s.durationMs = Date.now() - s.startedAt;
  let correct = 0;
  s.questions.forEach((q, i) => { if (s.answers[i] === q.answer) correct += 1; });
  addSeenIds(s.questions.map(q => q.id));
  if (s.mode === 'test') {
    const correctIds = s.questions.filter((q, i) => s.answers[i] === q.answer).map(q => q.id);
    addMasteredIds(correctIds);
  }
  const hist = getHistory();
  hist.unshift({ when: Date.now(), mode: s.mode, kind: s.kind || null, score: correct, total: s.questions.length, durationMs: s.durationMs });
  save(KEY.history, hist.slice(0, 50));
  showResults(timeUp);
}

function showResults(timeUp) {
  const s = currentSession;
  let correct = 0;
  s.questions.forEach((q, i) => { if (s.answers[i] === q.answer) correct += 1; });
  const pct = Math.round(correct / s.questions.length * 100);
  document.getElementById('result-score').textContent = `${correct} / ${s.questions.length}`;
  document.getElementById('result-pct').textContent = pct + '%';
  const summary = document.getElementById('results-summary');
  if (summary) {
    summary.classList.remove('good', 'okay', 'low');
    summary.classList.add(pct >= 80 ? 'good' : pct >= 60 ? 'okay' : 'low');
  }
  const resultBar = document.getElementById('result-bar');
  if (resultBar) setTimeout(() => { resultBar.style.width = pct + '%'; }, 100);

  const timeEl = document.getElementById('result-time');
  if (s.mode === 'test' || s.mode === 'endless') {
    const min = Math.floor(s.durationMs / 60000);
    const sec = Math.floor((s.durationMs % 60000) / 1000);
    timeEl.hidden = false;
    timeEl.textContent = s.mode === 'endless'
      ? `Session time: ${min}m ${sec}s`
      : `Time: ${min}m ${sec}s${timeUp ? ' (time expired)' : ''}`;
  } else {
    timeEl.hidden = true;
  }

  // breakdown by section/topic
  const buckets = {};
  s.questions.forEach((q, i) => {
    const key = q.section;
    if (!buckets[key]) buckets[key] = { correct: 0, total: 0 };
    buckets[key].total += 1;
    if (s.answers[i] === q.answer) buckets[key].correct += 1;
  });
  const bd = document.getElementById('result-breakdown');
  bd.innerHTML = Object.entries(buckets).map(([k, v]) => `
    <div class="breakdown-item">
      <strong>${v.correct}/${v.total}</strong>
      ${k === 'math' ? 'Math' : 'Reading & Writing'}
    </div>
  `).join('');

  // review
  const review = document.getElementById('review-list');
  review.innerHTML = s.questions.map((q, i) => {
    const ans = s.answers[i];
    const correctChoice = q.answer;
    const cls = ans == null ? 'unanswered' : (ans === correctChoice ? 'correct' : 'incorrect');
    const status = ans == null ? 'Skipped' : (ans === correctChoice ? 'Correct' : `Your answer: ${ans}`);
    return `
      <div class="review-item ${cls}">
        <div class="review-q">${i + 1}. ${escapeHtml(q.prompt)}</div>
        <div class="review-meta"><strong>${status}</strong> · Correct: ${correctChoice} (${escapeHtml(q.choices[correctChoice] || '')})</div>
        <div class="review-expl">${escapeHtml(q.explanation || '')}</div>
      </div>
    `;
  }).join('');
  renderMath(review);
  go('screen-results');
}

function showPreSubmitReview() {
  const s = currentSession;
  stopTimer();
  const answered = s.answers.filter(a => a != null).length;
  const unanswered = s.questions.length - answered;
  const flagged = [...s.flagged].length;
  document.getElementById('pre-review-summary').innerHTML = `
    <div class="pre-review-stat"><span class="pre-review-num">${answered}</span><small>Answered</small></div>
    <div class="pre-review-stat${unanswered > 0 ? ' pre-review-warn' : ''}"><span class="pre-review-num">${unanswered}</span><small>Unanswered</small></div>
    <div class="pre-review-stat${flagged > 0 ? ' pre-review-flag' : ''}"><span class="pre-review-num">${flagged}</span><small>Marked for Review</small></div>
  `;
  const grid = document.getElementById('pre-review-grid');
  grid.innerHTML = s.questions.map((q, i) => {
    const isAnswered = s.answers[i] != null;
    const isFlagged = s.flagged.has(i);
    let cls = 'nav-q-btn';
    if (isFlagged) cls += ' nav-flagged';
    else if (isAnswered) cls += ' nav-answered';
    return `<button class="${cls}" data-qidx="${i}" title="Q${i+1}">${i+1}</button>`;
  }).join('');
  grid.querySelectorAll('[data-qidx]').forEach(btn => {
    btn.onclick = () => {
      currentSession.idx = Number(btn.dataset.qidx);
      if (currentSession.deadline) {
        currentSession.deadline = Date.now() + Math.max(0, currentSession.deadline - Date.now());
        startTimer();
      }
      screenStack.pop();
      go('screen-quiz', false);
      renderQuiz();
    };
  });
  go('screen-pre-review');
}

// ---------- search ----------
let _searchResults = [];
let _searchSection = 'all';
let _searchDebounce = null;

function openSearch() {
  document.getElementById('search-overlay').hidden = false;
  setTimeout(() => document.getElementById('search-input').focus(), 80);
}
function closeSearch() {
  document.getElementById('search-overlay').hidden = true;
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').hidden = true;
  document.getElementById('search-results').innerHTML =
    '<p class="search-hint muted small">Search across all questions by keyword, topic, or phrase.</p>';
  document.getElementById('search-actions').hidden = true;
  _searchResults = [];
}

function runSearch() {
  const raw = document.getElementById('search-input').value;
  const query = raw.trim().toLowerCase();
  document.getElementById('search-clear').hidden = !raw;
  const container = document.getElementById('search-results');
  const actionsEl = document.getElementById('search-actions');

  if (!query) {
    container.innerHTML = '<p class="search-hint muted small">Search across all questions by keyword, topic, or phrase.</p>';
    actionsEl.hidden = true;
    _searchResults = [];
    return;
  }

  const words = query.split(/\s+/).filter(Boolean);
  _searchResults = allQuestions.filter(q => {
    if (_searchSection !== 'all' && q.section !== _searchSection) return false;
    const hay = [q.prompt, q.topic, q.explanation || '', ...Object.values(q.choices)].join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  });

  if (_searchResults.length === 0) {
    container.innerHTML = '<p class="search-empty muted">No questions match your search.</p>';
    actionsEl.hidden = true;
    return;
  }

  const shown = _searchResults.slice(0, 60);
  container.innerHTML = shown.map(q => {
    const sec = q.section === 'math' ? 'Math' : 'R&amp;W';
    const diff = q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : 'Hard';
    const prompt = escapeHtml(q.prompt.length > 150 ? q.prompt.slice(0, 150) + '…' : q.prompt);
    return `<div class="sr-item">
      <div class="sr-tags">
        <span class="sr-badge sr-${q.section}">${sec}</span>
        <span class="sr-badge">${escapeHtml(q.topic.replace(/-/g,' '))}</span>
        <span class="sr-badge sr-d${q.difficulty}">${diff}</span>
      </div>
      <div class="sr-prompt">${prompt}</div>
    </div>`;
  }).join('');

  if (_searchResults.length > 60) {
    container.insertAdjacentHTML('beforeend',
      `<p class="muted small" style="padding:10px 16px 4px">Showing 60 of ${_searchResults.length} matches.</p>`);
  }

  const practiceN = Math.min(_searchResults.length, 50);
  document.getElementById('search-practice-btn').textContent =
    `Practice ${practiceN} question${practiceN !== 1 ? 's' : ''}`;
  actionsEl.hidden = false;
}

function startSearchPractice() {
  if (_searchResults.length === 0) return;
  const qs = shuffle(_searchResults).slice(0, 50).map(shuffleChoices);
  currentSession = {
    mode: 'practice', questions: qs,
    answers: new Array(qs.length).fill(null),
    flagged: new Set(), idx: 0,
    startedAt: Date.now(), durationMs: null,
  };
  addSeenIds(qs.map(q => q.id));
  closeSearch();
  go('screen-quiz');
  renderQuiz();
}

// ---------- export ----------
function exportSessionCSV() {
  const s = currentSession;
  if (!s || !s.questions || s.questions.length === 0) {
    alert('No session data to export. Complete a practice or test first.');
    return;
  }
  const rows = [
    ['Q', 'Section', 'Topic', 'Difficulty', 'Prompt', 'Correct_Answer', 'Your_Answer', 'Result'],
    ...s.questions.map((q, i) => {
      const ans = s.answers[i] || '';
      const result = !ans ? 'Skipped' : ans === q.answer ? 'Correct' : 'Incorrect';
      return [i + 1, q.section, q.topic, q.difficulty,
        q.prompt.replace(/"/g, '""'), q.answer, ans, result];
    })
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'sat-session-results.csv' });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportHistoryCSV() {
  const hist = getHistory();
  if (hist.length === 0) { alert('No history to export.'); return; }
  const rows = [
    ['Date', 'Mode', 'Score', 'Total', 'Percent', 'Duration_s'],
    ...hist.map(h => {
      const d = new Date(h.when).toISOString().slice(0,10);
      const mode = h.mode === 'test' ? `Test_${h.kind || 'mixed'}` : h.mode === 'endless' ? 'Endless' : 'Practice';
      const pct = Math.round(h.score / h.total * 100);
      const dur = Math.round((h.durationMs || 0) / 1000);
      return [d, mode, h.score, h.total, pct, dur];
    })
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'sat-history.csv' });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderMath(el) {
  if (!el || typeof renderMathInElement !== 'function') return;
  try {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$',  right: '$',  display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      ignoredTags: ['script','noscript','style','textarea','pre','code'],
    });
  } catch {}
}

// ---------- home stats ----------
function refreshHome() {
  const stats = getStats();
  document.getElementById('streak-num').textContent = stats.streak || 0;
  document.getElementById('stat-questions').textContent = stats.answered || 0;
  document.getElementById('stat-accuracy').textContent =
    stats.answered ? Math.round((stats.correct / stats.answered) * 100) + '%' : '—';

  // reminder banner
  const settings = getSettings();
  const hours = settings.reminderHours;
  const banner = document.getElementById('reminder-banner');
  if (hours > 0) {
    const last = load(KEY.lastOpen, 0);
    const elapsed = Date.now() - last;
    if (elapsed > hours * 3600 * 1000) {
      banner.hidden = false;
      const days = stats.streak || 0;
      document.getElementById('reminder-text').textContent =
        days > 0 ? `Don't break your ${days}-day streak — practice now!` : 'Time for some SAT practice!';
    } else {
      banner.hidden = true;
    }
  } else {
    banner.hidden = true;
  }
  save(KEY.lastOpen, Date.now());
}

// ---------- history ----------
function renderHistory() {
  const masteredIds = getMasteredIds();
  const total = allQuestions.length;
  const masteredCount = [...masteredIds].filter(id => allQuestions.some(q => q.id === id)).length;
  const remaining = total - masteredCount;
  const seenInfo = document.getElementById('seen-count-info');
  if (seenInfo) {
    seenInfo.textContent = `${masteredCount} of ${total} questions mastered · ${remaining} remaining`;
  }

  const list = document.getElementById('history-list');
  const hist = getHistory();
  if (hist.length === 0) {
    list.innerHTML = '<div class="history-empty">No sessions yet — try a practice session!</div>';
    return;
  }
  list.innerHTML = hist.map(h => {
    const d = new Date(h.when);
    const date = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mode = h.mode === 'test' ? `Test (${h.kind})` : h.mode === 'endless' ? 'Endless' : 'Practice';
    const pct = Math.round(h.score / h.total * 100);
    return `<div class="history-item">
      <div>
        <strong>${h.score} / ${h.total}</strong> <span class="history-item-meta">· ${pct}% · ${mode}</span>
        <div class="history-item-meta">${date}</div>
      </div>
    </div>`;
  }).join('');
}

// ---------- settings ----------
function darkenHex(hex, factor) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return '#' + [r,g,b].map(c => Math.round(c * factor).toString(16).padStart(2,'0')).join('');
}

function applyAccentColor(hex) {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-dark');
    return;
  }
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-dark', darkenHex(hex, 0.78));
}

function applySettings() {
  const s = getSettings();
  document.documentElement.dataset.theme = s.theme;
  document.getElementById('theme-select').value = s.theme;
  document.getElementById('reminder-interval').value = String(s.reminderHours);
  applyAccentColor(s.accentColor || '');
  document.getElementById('accent-color').value =
    s.accentColor || (s.theme === 'dark' ? '#66bb6a' : '#2e7d32');
}

// ---------- import ----------
function addImportedQuestions(newQs) {
  const existing = load(KEY.imported, []);
  save(KEY.imported, [...existing, ...newQs]);
  allQuestions = [...allQuestions, ...newQs];
  populateTopicFilter();
  populateEndlessTopicFilter();
}

function parseImportText(text) {
  const blocks = text.split(/\n---+\n?/).filter(b => b.trim());
  const results = [];
  const errors = [];
  blocks.forEach((block, idx) => {
    const q = { choices: {} };
    block.trim().split('\n').forEach(line => {
      const m = line.match(/^([A-Za-z]+):\s*(.*)/);
      if (!m) return;
      const key = m[1].toUpperCase();
      const val = m[2].trim();
      if (key === 'Q') q.prompt = val;
      else if (key === 'A') q.choices.A = val;
      else if (key === 'B') q.choices.B = val;
      else if (key === 'C') q.choices.C = val;
      else if (key === 'D') q.choices.D = val;
      else if (key === 'ANSWER') q.answer = val.toUpperCase().charAt(0);
      else if (key === 'SECTION') q.section = val.toLowerCase().includes('math') ? 'math' : 'rw';
      else if (key === 'TOPIC') q.topic = val.toLowerCase();
      else if (key === 'DIFFICULTY') q.difficulty = Math.min(3, Math.max(1, parseInt(val) || 2));
      else if (key === 'EXPLAIN' || key === 'EXPLANATION') q.explanation = val;
    });
    if (q.prompt && q.choices.A && q.choices.B && ['A','B','C','D'].includes(q.answer)) {
      q.section = q.section || 'math';
      q.topic = q.topic || 'general';
      q.difficulty = q.difficulty || 2;
      q.explanation = q.explanation || '';
      q.id = `imported-${Date.now()}-${idx}`;
      results.push(q);
    } else {
      errors.push(idx + 1);
    }
  });
  return { results, errors };
}

function initImportScreen() {
  // tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('import-paste-panel').hidden = tab !== 'paste';
      document.getElementById('import-manual-panel').hidden = tab !== 'manual';
    };
  });

  // parse button
  let parsedQuestions = [];
  document.getElementById('import-parse-btn').onclick = () => {
    const text = document.getElementById('import-text').value;
    const { results, errors } = parseImportText(text);
    parsedQuestions = results;
    const preview = document.getElementById('import-preview');
    const confirmBtn = document.getElementById('import-confirm-btn');
    if (results.length === 0) {
      preview.hidden = false;
      preview.innerHTML = '<div class="preview-item preview-error">No valid questions found. Check the format above.</div>';
      confirmBtn.hidden = true;
      return;
    }
    preview.hidden = false;
    preview.innerHTML = results.map((q, i) => `
      <div class="preview-item">
        <strong>${i + 1}.</strong> ${escapeHtml(q.prompt)}
        <div class="preview-meta">${q.section.toUpperCase()} · ${q.topic} · Difficulty ${q.difficulty} · Answer: ${q.answer}</div>
      </div>
    `).join('') + (errors.length ? `<div class="preview-item preview-error">Skipped blocks (missing required fields): ${errors.join(', ')}</div>` : '');
    confirmBtn.hidden = false;
    confirmBtn.textContent = `Add ${results.length} Question${results.length !== 1 ? 's' : ''}`;
  };

  // confirm button
  document.getElementById('import-confirm-btn').onclick = () => {
    if (parsedQuestions.length === 0) return;
    addImportedQuestions(parsedQuestions);
    document.getElementById('import-text').value = '';
    document.getElementById('import-preview').hidden = true;
    document.getElementById('import-confirm-btn').hidden = true;
    parsedQuestions = [];
    alert(`Added! Your bank now has ${allQuestions.length} questions.`);
  };

  // manual add
  document.getElementById('mq-add-btn').onclick = () => {
    const prompt = document.getElementById('mq-prompt').value.trim();
    const a = document.getElementById('mq-a').value.trim();
    const b = document.getElementById('mq-b').value.trim();
    const answer = document.getElementById('mq-answer').value;
    if (!prompt || !a || !b) {
      document.getElementById('mq-status').textContent = 'Prompt, Choice A, and Choice B are required.';
      return;
    }
    const c = document.getElementById('mq-c').value.trim();
    const d = document.getElementById('mq-d').value.trim();
    const q = {
      id: `imported-${Date.now()}`,
      prompt,
      choices: { A: a, B: b },
      answer,
      section: document.getElementById('mq-section').value,
      topic: document.getElementById('mq-topic').value.trim().toLowerCase() || 'general',
      difficulty: Number(document.getElementById('mq-difficulty').value),
      explanation: document.getElementById('mq-explain').value.trim(),
    };
    if (c) q.choices.C = c;
    if (d) q.choices.D = d;
    addImportedQuestions([q]);
    ['mq-prompt','mq-a','mq-b','mq-c','mq-d','mq-topic','mq-explain'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('mq-status').textContent = `Saved! Bank has ${allQuestions.length} questions total.`;
  };
}

// ---------- cheatsheets ----------
const CHEATSHEETS = [
  {
    id: 'math',
    title: 'Math Formulas',
    desc: 'Algebra, geometry, exponents, trig — what to memorize.',
    body: `## Given on the test

$A = \\pi r^2 \\qquad C = 2\\pi r$
$A = lw \\qquad A = \\tfrac{1}{2}bh$
$a^2 + b^2 = c^2$  (Pythagorean)
30-60-90: $x,\\ x\\sqrt{3},\\ 2x$   45-45-90: $x,\\ x,\\ x\\sqrt{2}$
$V_{\\text{box}} = lwh \\qquad V_{\\text{cyl}} = \\pi r^2 h$
$V_{\\text{sphere}} = \\tfrac{4}{3}\\pi r^3$
$V_{\\text{cone}} = \\tfrac{1}{3}\\pi r^2 h$

## NOT given — memorize

Slope: $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$
Slope-intercept: $y = mx + b$
Distance: $\\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$
Midpoint: $\\left(\\dfrac{x_1+x_2}{2},\\ \\dfrac{y_1+y_2}{2}\\right)$
Quadratic: $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
Discriminant $b^2 - 4ac$:
  $> 0$  two real roots
  $= 0$  one real root
  $< 0$  no real roots
Vertex of parabola: $x = -\\dfrac{b}{2a}$

## Exponents
$x^a \\cdot x^b = x^{a+b}$
$\\dfrac{x^a}{x^b} = x^{a-b}$
$(x^a)^b = x^{ab}$
$x^{-a} = \\dfrac{1}{x^a}$

## Circles (coordinate)
$(x - h)^2 + (y - k)^2 = r^2$

## Trig (right triangle)
$\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}},\\ \\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}},\\ \\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}}$
$\\sin^2\\theta + \\cos^2\\theta = 1$
$\\sin\\theta = \\cos(90^\\circ - \\theta)$

## Stats
Mean = sum/count
Median = middle of sorted list
Lower SD = data closer to mean

## Lines
Parallel → same slope.
Perpendicular → slopes multiply to $-1$.
System has NO solution if slopes equal but intercepts differ.
System has INFINITE solutions if equations are scalar multiples.`
  },
  {
    id: 'grammar',
    title: 'Grammar & Punctuation',
    desc: 'The finite list of rules the SAT actually tests.',
    body: `## Punctuation decision tree
Is BEFORE complete? Is AFTER complete?

Complete + Complete → period, semicolon, OR comma+FANBOYS
Complete + List/explanation → colon
Complete + Fragment (extra info) → dash or comma
Fragment + Complete → comma
Fragment + Fragment → comma or nothing

## Subject–verb agreement
- Singular subject → singular verb. Plural → plural.
- Watch for "of" phrases: "The box of nails IS heavy."
- Either/or, neither/nor → verb agrees with NEAREST subject.
- "Each, every, anyone, neither" → singular.

## Pronouns
- "Its" = possessive (no apostrophe). "It's" = it is.
- They're / their / there.  Who's / whose.

## Modifiers
- A modifier must sit next to what it modifies.
- "Walking down the street, the trees..." ❌  →  "..., I saw trees..." ✓

## Parallel structure
- Items in a list/comparison share grammatical form.
- "She likes hiking, swimming, and biking." ✓

## Concision
- Pick the SHORTEST grammatically correct option.
- Cut "due to the fact that" → "because"
- Cut redundancy ("annual yearly" → "annual")

## Transitions
ADD: also, furthermore, moreover, in addition
CONTRAST: however, but, yet, nevertheless, on the other hand
CAUSE: therefore, thus, consequently, as a result
EXAMPLE: for instance, for example
SEQUENCE: first, next, finally`
  },
  {
    id: 'reading',
    title: 'Reading Strategies',
    desc: 'Question types and traps to avoid.',
    body: `## Question types
1. Words in context
2. Main idea / central claim
3. Purpose
4. Detail / evidence
5. "Most logically completes the text" (inference)
6. Two-text comparison
7. Quantitative (passage + chart)
8. Notes-based rhetorical synthesis

## Universal strategy
1. Read the QUESTION first.
2. Read the passage actively. Mark the main claim.
3. PREDICT an answer in your own words.
4. Eliminate before selecting.

## Common wrong-answer traps
- Out of scope (true-sounding, not in text)
- Half-right (first half ok, second twists)
- Extreme language ("always", "never")
- Opposite (right concept, wrong direction)
- Right answer to wrong question
- Too narrow / too broad

## Words in context
Cover choices → substitute your own simple word → match → plug back in.

## Most-logically-completes
- Identify direction (continue / contrast / conclude).
- Identify subject the text is leading toward.
- Right answer mirrors both. No new ideas.

## Notes-based synthesis
Read the GOAL first. Right answer hits the goal exactly.
Wrong answers are usually true but don't fulfill the goal.

## Pacing
~70 sec per question. Don't camp on hard ones.`
  },
  {
    id: 'testday',
    title: 'Test Day Strategy',
    desc: 'Pacing, mindset, Desmos tips.',
    body: `## Night before
Pack ID, ticket, charged laptop, charger, snacks, water, watch.
Sleep 7+ hours. Don't cram.

## Pacing
R&W: 27 questions in 32 min ≈ 70 sec/q.
Math: 22 questions in 35 min ≈ 95 sec/q.

## Skip-and-return
1. First pass: answer every <90-sec question.
2. Flag the rest.
3. Second pass: hit flagged.
4. Last 60 sec: bubble EVERY blank — no penalty.

## Math
- USE DESMOS. Graph it.
- For "value of k": graph + slider.
- Re-read: are they asking x or x+2?

## Reading
- Predict before peeking at choices.
- Classify transitions (add/contrast/cause).

## Adaptive Module 2
Hard Module 2 = good sign (high-scoring track).
Don't psych yourself out.

## Score targets
1200 ≈ 70% correct
1400 ≈ 85%
1500 ≈ 92%
1550+ ≈ near-perfect`
  },
];

function renderCheatsheets() {
  const listEl = document.getElementById('cheatsheet-list');
  const contentEl = document.getElementById('cheatsheet-content');
  contentEl.hidden = true;
  listEl.hidden = false;
  listEl.innerHTML = CHEATSHEETS.map(c => `
    <button class="cheat-card" data-id="${c.id}">
      <strong>${c.title}</strong>
      <small>${c.desc}</small>
    </button>
  `).join('');
  listEl.querySelectorAll('.cheat-card').forEach(b => {
    b.onclick = () => openCheatsheet(b.dataset.id);
  });
}
function openCheatsheet(id) {
  const c = CHEATSHEETS.find(x => x.id === id);
  if (!c) return;
  const list = document.getElementById('cheatsheet-list');
  const content = document.getElementById('cheatsheet-content');
  list.hidden = true;
  content.hidden = false;
  // basic markdown rendering: headings + paragraphs + code lines
  const html = c.body
    .split('\n')
    .map(line => {
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.trim() === '') return '<br>';
      return `<div>${escapeHtml(line)}</div>`;
    })
    .join('');
  content.innerHTML = `<h1>${escapeHtml(c.title)}</h1>${html}`;
  renderMath(content);
  document.getElementById('page-title').textContent = c.title;
}

// ---------- notifications / reminders ----------
async function enableNotifications() {
  if (!('Notification' in window)) {
    document.getElementById('notif-status').textContent = 'Notifications not supported on this device.';
    return;
  }
  const perm = await Notification.requestPermission();
  document.getElementById('notif-status').textContent = `Permission: ${perm}`;
  if (perm === 'granted') {
    new Notification('SAT Practice', { body: 'Reminders enabled. Keep up the streak!' });
    scheduleReminder();
  }
}
function scheduleReminder() {
  const s = getSettings();
  if (s.reminderHours <= 0) return;
  if (Notification.permission !== 'granted') return;
  const last = load(KEY.lastOpen, Date.now());
  const next = last + s.reminderHours * 3600 * 1000;
  const wait = next - Date.now();
  if (wait <= 0) {
    new Notification('SAT Practice', { body: 'Time for some practice!' });
    save(KEY.lastOpen, Date.now());
  } else {
    setTimeout(() => {
      if (document.hidden) {
        new Notification('SAT Practice', { body: 'Time for some practice!' });
      }
      scheduleReminder();
    }, Math.min(wait, 6 * 3600 * 1000));
  }
}

// ---------- service worker / PWA ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('install-prompt').hidden = false;
});
document.getElementById('install-btn').onclick = async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-prompt').hidden = true;
};

// ---------- wire up ----------
document.addEventListener('DOMContentLoaded', async () => {
  applySettings();
  refreshHome();

  // back button
  document.getElementById('back-btn').onclick = back;
  document.getElementById('settings-btn').onclick = () => go('screen-settings');

  // navigation tiles
  document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.go;
      if (target === 'screen-cheatsheets') renderCheatsheets();
      if (target === 'screen-history') renderHistory();
      go(target);
    });
  });

  initImportScreen();

  document.getElementById('reminder-dismiss').onclick = () => {
    document.getElementById('reminder-banner').hidden = true;
    save(KEY.lastOpen, Date.now());
  };

  // practice
  document.querySelectorAll('#practice-difficulty .diff-btn').forEach(btn => {
    btn.addEventListener('click', () => { btn.classList.toggle('active'); updateUnseenLabel(); });
  });
  document.getElementById('practice-topic').addEventListener('change', updateUnseenLabel);
  document.getElementById('practice-start').onclick = startPractice;

  // endless mode
  document.querySelectorAll('#endless-difficulty .diff-btn').forEach(btn => {
    btn.addEventListener('click', () => { btn.classList.toggle('active'); updateEndlessLabel(); });
  });
  document.getElementById('endless-section').addEventListener('change', () => {
    populateEndlessTopicFilter();
  });
  document.getElementById('endless-topic').addEventListener('change', updateEndlessLabel);
  document.getElementById('endless-start').onclick = startEndless;

  // test
  document.querySelectorAll('[data-test]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.test === 'full') startFullSat();
      else startTest(b.dataset.test);
    };
  });

  // quiz controls
  document.getElementById('quiz-submit').onclick = submitAnswer;
  document.getElementById('quiz-skip').onclick = skipQuestion;
  document.getElementById('quiz-next').onclick = nextQuestion;
  document.getElementById('quiz-prev').onclick = prevQuestion;

  // calculator panel
  const calcPanel = document.getElementById('calc-panel');
  const calcBackdrop = document.getElementById('calc-backdrop');
  function openCalc() {
    calcPanel.setAttribute('aria-hidden', 'false');
    calcBackdrop.hidden = false;
    document.body.classList.add('calc-open');
  }
  function closeCalc() {
    calcPanel.setAttribute('aria-hidden', 'true');
    calcBackdrop.hidden = true;
    document.body.classList.remove('calc-open');
  }
  document.getElementById('quiz-calc').onclick = openCalc;
  document.getElementById('calc-close').onclick = closeCalc;
  calcBackdrop.addEventListener('click', closeCalc);

  // theme toggle inside calc panel
  const moonIcon = document.getElementById('calc-icon-moon');
  const sunIcon  = document.getElementById('calc-icon-sun');
  function syncCalcThemeIcon() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    moonIcon.hidden = isDark;
    sunIcon.hidden  = !isDark;
  }
  syncCalcThemeIcon();
  document.getElementById('calc-theme-toggle').onclick = () => {
    const s = getSettings();
    s.theme = s.theme === 'dark' ? 'light' : 'dark';
    save(KEY.settings, s);
    document.documentElement.dataset.theme = s.theme;
    document.getElementById('theme-select').value = s.theme;
    syncCalcThemeIcon();
  };
  document.getElementById('quiz-finish').onclick = () => {
    if (currentSession.mode === 'test') {
      showPreSubmitReview();
    } else if (currentSession.mode === 'endless') {
      if (confirm('End session and see your results?')) finishQuiz();
    } else {
      finishQuiz();
    }
  };

  // Quiz exit (← back button in SAT header)
  document.getElementById('quiz-exit-btn')?.addEventListener('click', () => {
    if (currentSession?.mode === 'test') {
      if (!confirm('Exit test? Your progress on this section will not be saved.')) return;
    } else if (currentSession?.mode === 'endless') {
      if (!confirm('Exit endless session? Progress will not be saved.')) return;
    }
    stopTimer();
    back();
  });

  // Timer show/hide toggle
  document.getElementById('quiz-timer-toggle')?.addEventListener('click', function() {
    const timer = document.getElementById('quiz-timer');
    if (timer.dataset.timerHidden) {
      delete timer.dataset.timerHidden;
      this.classList.remove('timer-off');
    } else {
      timer.dataset.timerHidden = '1';
      timer.textContent = '--:--';
      this.classList.add('timer-off');
    }
  });

  // ABC Eliminator toggle
  document.getElementById('quiz-eliminator')?.addEventListener('click', function() {
    const choicesEl = document.getElementById('q-choices');
    const active = choicesEl.classList.toggle('elim-mode');
    this.classList.toggle('active', active);
  });

  // Navigator
  document.getElementById('quiz-nav-toggle').onclick = showNavigator;
  document.getElementById('nav-close').onclick = hideNavigator;
  document.getElementById('nav-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('nav-overlay')) hideNavigator();
  });

  // Mark for Review button
  document.getElementById('quiz-mark-review').onclick = toggleFlag;

  // Reference sheet
  const refPanel = document.getElementById('ref-panel');
  const refBackdrop = document.getElementById('ref-backdrop');
  document.getElementById('quiz-ref').onclick = () => { refPanel.hidden = false; refBackdrop.hidden = false; };
  document.getElementById('ref-close').onclick = () => { refPanel.hidden = true; refBackdrop.hidden = true; };
  refBackdrop.addEventListener('click', () => { refPanel.hidden = true; refBackdrop.hidden = true; });

  // Pre-submit review
  document.getElementById('pre-review-back').onclick = () => {
    if (currentSession?.deadline) {
      currentSession.deadline = Date.now() + Math.max(0, currentSession.deadline - Date.now());
      startTimer();
    }
    screenStack.pop();
    go('screen-quiz', false);
    renderQuiz();
  };
  document.getElementById('pre-review-submit').onclick = () => finishQuiz();

  // Full SAT module break
  document.getElementById('break-quit').onclick = () => {
    if (fullSatState) showFullSatResults(); else finishQuiz();
  };

  // Export history CSV
  document.getElementById('export-csv').onclick = exportHistoryCSV;

  // Export session CSV (on results screen)
  document.getElementById('export-session-csv').onclick = exportSessionCSV;

  // Search
  document.getElementById('search-btn').onclick = openSearch;
  document.getElementById('search-close').onclick = closeSearch;
  document.getElementById('search-clear').onclick = () => {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').hidden = true;
    runSearch();
    document.getElementById('search-input').focus();
  };
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(runSearch, 220);
  });
  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });
  document.getElementById('search-practice-btn').onclick = startSearchPractice;
  document.querySelectorAll('.sf-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _searchSection = btn.dataset.sf;
      runSearch();
    };
  });

  // settings
  document.getElementById('theme-select').onchange = (e) => {
    const s = getSettings(); s.theme = e.target.value; save(KEY.settings, s);
    document.documentElement.dataset.theme = s.theme;
    if (!s.accentColor) {
      document.getElementById('accent-color').value = s.theme === 'dark' ? '#66bb6a' : '#2e7d32';
    }
  };
  document.getElementById('accent-color').oninput = (e) => {
    const s = getSettings(); s.accentColor = e.target.value; save(KEY.settings, s);
    applyAccentColor(e.target.value);
  };
  document.getElementById('accent-reset').onclick = () => {
    const s = getSettings(); s.accentColor = ''; save(KEY.settings, s);
    applyAccentColor('');
    document.getElementById('accent-color').value =
      s.theme === 'dark' ? '#66bb6a' : '#2e7d32';
  };
  document.getElementById('reminder-interval').onchange = (e) => {
    const s = getSettings(); s.reminderHours = Number(e.target.value); save(KEY.settings, s);
  };
  document.getElementById('enable-notifs').onclick = enableNotifications;
  document.getElementById('reset-app').onclick = () => {
    if (!confirm('Erase all stats, history, and settings?')) return;
    Object.values(KEY).forEach(k => localStorage.removeItem(k));
    location.reload();
  };
  document.getElementById('clear-history').onclick = () => {
    if (!confirm('Clear all history and reset mastered questions? You\'ll see all questions again.')) return;
    save(KEY.history, []);
    save(KEY.seen, []);
    save(KEY.mastered, []);
    renderHistory();
  };
  document.getElementById('reset-seen').onclick = () => {
    if (!confirm('Reset mastered questions? All questions will become available again.')) return;
    save(KEY.mastered, []);
    renderHistory();
  };

  try {
    await loadQuestions();
    updateUnseenLabel();
  } catch (e) {
    alert('Could not load questions: ' + e.message + '\nMake sure data/questions.json is reachable.');
  }

  if ('Notification' in window) {
    document.getElementById('notif-status').textContent = `Permission: ${Notification.permission}`;
    if (Notification.permission === 'granted') scheduleReminder();
  }
});
