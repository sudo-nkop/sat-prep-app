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
  deleted: 'sat-app:deleted',
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
  const res = await fetch('data/questions.json?v=19', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load questions');
  const data = await res.json();
  const imported = load(KEY.imported, []);
  const deletedIds = new Set(load(KEY.deleted, []));
  allQuestions = [...data.questions, ...imported].filter(q => !deletedIds.has(q.id));
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

function deleteQuestion(id) {
  // Remove from imported list if it's a custom question
  const imported = load(KEY.imported, []);
  const newImported = imported.filter(q => q.id !== id);
  save(KEY.imported, newImported);

  // Track deleted built-in question IDs
  const deleted = load(KEY.deleted, []);
  if (!deleted.includes(id)) {
    save(KEY.deleted, [...deleted, id]);
  }

  allQuestions = allQuestions.filter(q => q.id !== id);
  populateTopicFilter();
  populateEndlessTopicFilter();
  renderManageList();
}

function renderManageList() {
  const search = (document.getElementById('manage-search')?.value || '').toLowerCase();
  const section = document.getElementById('manage-section-filter')?.value || 'all';
  const list = document.getElementById('manage-question-list');
  const countEl = document.getElementById('manage-count');
  if (!list) return;

  let display = allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (!search || q.prompt.toLowerCase().includes(search) || (q.topic || '').toLowerCase().includes(search))
  );

  countEl.textContent = `Showing ${display.length} of ${allQuestions.length} questions`;

  if (display.length === 0) {
    list.innerHTML = '<p class="muted">No questions match.</p>';
    return;
  }

  list.innerHTML = display.map(q => {
    const isImported = q.id.startsWith('imported-');
    const tag = isImported ? '<span class="manage-tag imported-tag">Custom</span>' : '';
    const diff = ['', 'Easy', 'Medium', 'Hard'][q.difficulty] || '';
    return `<div class="manage-question-card" data-id="${escapeHtml(q.id)}">
      <div class="manage-question-meta">${tag}<span class="manage-tag">${(q.section || '').toUpperCase()}</span><span class="manage-tag">${escapeHtml(q.topic || '')}</span><span class="manage-tag">${diff}</span></div>
      <p class="manage-question-prompt">${escapeHtml(q.prompt)}</p>
      <button class="btn danger small delete-q-btn" data-id="${escapeHtml(q.id)}">Delete</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.delete-q-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Delete this question? This cannot be undone.')) {
        deleteQuestion(btn.dataset.id);
      }
    };
  });
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
      document.getElementById('import-manage-panel').hidden = tab !== 'manage';
      if (tab === 'manage') renderManageList();
    };
  });

  document.getElementById('manage-search').addEventListener('input', renderManageList);
  document.getElementById('manage-section-filter').addEventListener('change', renderManageList);

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
    title: 'Math: Complete Formula & Rule Guide',
    desc: 'Every formula and rule the SAT tests — number properties, algebra, geometry, stats, trig, and more.',
    body: `
<h2>Number Properties &amp; Arithmetic</h2>
<h3>Even / Odd Rules</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Operation</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Result</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Example</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">even ± even</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">even</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">4+2=6</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">odd ± odd</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">even</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">3+5=8</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">even ± odd</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">odd</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">4+3=7</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">even × any</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">even</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">4×3=12</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">odd × odd</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">odd</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">3×5=15</td></tr>
</table>
<h3>Zero, Negatives, Absolute Value</h3>
<ul>
  <li><strong>Zero rules:</strong> $0 \\times n = 0$; $0 \\div n = 0$; $n \\div 0 =$ undefined</li>
  <li><strong>Negative rules:</strong> neg × neg = pos; neg × pos = neg</li>
  <li><strong>Absolute value:</strong> $|x| = x$ if $x \\ge 0$; $|x| = -x$ if $x &lt; 0$; $|ab| = |a||b|$</li>
</ul>
<h3>Order of Operations — PEMDAS</h3>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  Parentheses → Exponents → Multiplication/Division (left to right) → Addition/Subtraction (left to right)
</div>
<h3>Divisibility Rules</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Divisor</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Rule</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">2</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Last digit is even</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">3</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sum of digits divisible by 3</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">5</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Ends in 0 or 5</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">9</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sum of digits divisible by 9</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">10</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Ends in 0</td></tr>
</table>
<ul>
  <li><strong>Prime numbers:</strong> 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47 … (1 is NOT prime)</li>
  <li><strong>GCF:</strong> largest number dividing both; <strong>LCM:</strong> smallest multiple of both</li>
</ul>

<h2>Fractions, Decimals &amp; Percentages</h2>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  Part = Percent × Whole &nbsp;&nbsp;|&nbsp;&nbsp; % change = $\\dfrac{\\text{New} - \\text{Old}}{\\text{Old}} \\times 100$
</div>
<ul>
  <li>Successive % changes: multiply the factors — e.g. +20% then −10% → $1.20 \\times 0.90 = 1.08$ (+8% total)</li>
  <li>To convert fraction to percent: divide numerator by denominator, multiply by 100</li>
  <li>Complex fractions: $\\dfrac{a/b}{c/d} = \\dfrac{a}{b} \\times \\dfrac{d}{c}$</li>
</ul>

<h2>Ratios &amp; Proportions</h2>
<ul>
  <li>Part : Part vs Part : Whole — know which you have</li>
  <li>Cross-multiply to solve: $\\dfrac{a}{b} = \\dfrac{c}{d} \\Rightarrow ad = bc$</li>
  <li>Direct proportion: $y = kx$ (as x increases, y increases)</li>
  <li>Inverse proportion: $y = k/x$ (as x increases, y decreases)</li>
</ul>

<h2>Algebra — Linear Equations</h2>
<h3>Key Line Equations</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Form</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Equation</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Notes</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Slope-intercept</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$y = mx + b$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">m=slope, b=y-intercept</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Standard form</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$Ax + By = C$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">slope $= -A/B$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Point-slope</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$y - y_1 = m(x - x_1)$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">use when you have a point and slope</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Slope formula</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$m = \\dfrac{y_2 - y_1}{x_2 - x_1}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">rise over run</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Horizontal line</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$y = k$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">slope = 0</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Vertical line</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$x = k$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">slope = undefined</td></tr>
</table>
<div style="background:var(--surface-alt,#f5f5f5);padding:8px 12px;margin:6px 0;border-radius:6px;">
  <strong>Parallel lines:</strong> same slope, different intercepts &nbsp;&nbsp;|&nbsp;&nbsp;
  <strong>Perpendicular lines:</strong> slopes multiply to $-1$ (i.e., slopes are negative reciprocals)
</div>

<h2>Systems of Equations</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Situation</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Meaning</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Graph looks like</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">One solution</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Different slopes</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Lines intersect</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">No solution</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Same slope, different intercepts</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Parallel lines</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Infinite solutions</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Same slope AND same intercept (same line)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Overlapping lines</td></tr>
</table>
<ul>
  <li><strong>Substitution:</strong> solve one equation for a variable, substitute into the other</li>
  <li><strong>Elimination:</strong> add/subtract equations to cancel a variable</li>
</ul>

<h2>Inequalities</h2>
<div style="background:var(--accent-tint,#eff6ff);border:1px solid var(--accent,#3b82f6);padding:8px 12px;border-radius:6px;margin:8px 0;">
  <strong>Key rule:</strong> When multiplying or dividing both sides by a <em>negative number</em>, flip the inequality sign!
</div>
<ul>
  <li>Compound AND: $-3 &lt; x &lt; 5$ (x is between the values)</li>
  <li>Compound OR: $x &lt; -3$ or $x &gt; 5$ (x is outside the values)</li>
  <li>Absolute value: $|x| &lt; a \\Rightarrow -a &lt; x &lt; a$</li>
  <li>Absolute value: $|x| &gt; a \\Rightarrow x &lt; -a$ or $x &gt; a$</li>
</ul>

<h2>Quadratics</h2>
<h3>Three Forms</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Form</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Equation</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>What it reveals</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Standard</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$ax^2 + bx + c = 0$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">y-intercept = c</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Factored</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$a(x - r)(x - s) = 0$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">roots/zeros: x = r and x = s</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Vertex</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$a(x - h)^2 + k$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">vertex = (h, k)</td></tr>
</table>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  Quadratic Formula: $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
</div>
<h3>Discriminant $b^2 - 4ac$</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$&gt; 0$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Two distinct real roots</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$= 0$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">One real root (tangent to x-axis)</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$&lt; 0$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">No real roots (no x-intercepts)</td></tr>
</table>
<ul>
  <li>Sum of roots $= -b/a$; &nbsp; Product of roots $= c/a$</li>
  <li>Vertex x-coordinate: $x = -b/(2a)$</li>
  <li><strong>Difference of squares:</strong> $x^2 - a^2 = (x+a)(x-a)$</li>
  <li><strong>Perfect square trinomials:</strong> $x^2 + 2ax + a^2 = (x+a)^2$</li>
</ul>

<h2>Exponents &amp; Radicals</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$x^a \\cdot x^b = x^{a+b}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\dfrac{x^a}{x^b} = x^{a-b}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$(x^a)^b = x^{ab}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$(xy)^a = x^a y^a$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$x^0 = 1$ (x ≠ 0)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$x^{-a} = \\dfrac{1}{x^a}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$x^{1/n} = \\sqrt[n]{x}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$x^{m/n} = \\sqrt[n]{x^m}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\sqrt{ab} = \\sqrt{a}\\sqrt{b}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\sqrt{a/b} = \\sqrt{a}/\\sqrt{b}$</td></tr>
</table>
<ul>
  <li><strong>Rationalize denominators:</strong> multiply numerator and denominator by the conjugate or the radical</li>
  <li>e.g. $\\dfrac{1}{\\sqrt{3}} = \\dfrac{\\sqrt{3}}{3}$</li>
</ul>

<h2>Polynomials</h2>
<ul>
  <li>Add/subtract: combine like terms (same degree)</li>
  <li>Multiply: distribute every term (FOIL for two binomials)</li>
  <li><strong>Remainder Theorem:</strong> $f(a)$ = remainder when $f(x) \\div (x - a)$</li>
  <li><strong>Factor Theorem:</strong> $(x - a)$ is a factor of $f(x)$ if and only if $f(a) = 0$</li>
</ul>

<h2>Functions</h2>
<h3>Transformation Rules</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Transformation</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Effect</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$f(x) + k$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Shift up k units</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$f(x) - k$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Shift down k units</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$f(x + k)$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Shift left k units</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$f(x - k)$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Shift right k units</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$-f(x)$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Reflect over x-axis</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$f(-x)$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Reflect over y-axis</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$a \\ cdot f(x)$, $|a| &gt; 1$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Vertical stretch</td></tr>
</table>
<ul>
  <li><strong>Composite functions:</strong> $f(g(x))$ — plug $g(x)$ into $f$</li>
  <li><strong>Inverse functions:</strong> swap x and y, then solve for y; notation $f^{-1}(x)$</li>
</ul>
<h3>Exponential Functions</h3>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  Growth: $y = a(1 + r)^t$ &nbsp;&nbsp; Decay: $y = a(1 - r)^t$ &nbsp;&nbsp; Continuous: $y = ae^{kt}$
</div>

<h2>Rates, Distance &amp; Unit Conversions</h2>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  $D = R \\times T$ &nbsp;&nbsp;&nbsp; Speed = Distance / Time &nbsp;&nbsp;&nbsp; Time = Distance / Rate
</div>
<ul>
  <li>Unit conversion: multiply by conversion fractions until unwanted units cancel</li>
  <li>Average speed = total distance / total time (not the average of the speeds!)</li>
</ul>

<h2>Statistics &amp; Data Analysis</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Measure</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Definition</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Mean</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sum of values ÷ count; <em>sensitive to outliers</em></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Weighted mean</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\dfrac{\\sum w_i x_i}{\\sum w_i}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Median</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Middle value when sorted; average of two middle if even count; <em>resistant to outliers</em></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Mode</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Most frequently occurring value</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Range</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Max − Min</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Standard deviation</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Measures spread; larger SD = more spread from mean</td></tr>
</table>
<ul>
  <li><strong>Margin of error:</strong> larger sample size → smaller margin of error</li>
  <li><strong>Scatter plots:</strong> positive correlation (both increase), negative (one up, one down), no correlation</li>
</ul>
<h3>Probability</h3>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  $P(\\text{event}) = \\dfrac{\\text{favorable outcomes}}{\\text{total outcomes}}$
</div>
<ul>
  <li>$P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$</li>
  <li>$P(A \\text{ and } B) = P(A) \\times P(B)$ for <em>independent</em> events</li>
  <li>Conditional probability: $P(A|B) = \\dfrac{P(A \\text{ and } B)}{P(B)}$</li>
  <li><strong>Two-way tables:</strong> use row/column totals for conditional probability; be careful which total to use</li>
</ul>

<h2>Geometry — Given on SAT (Reference Sheet)</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Circle area</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$A = \\pi r^2$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Circumference</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$C = 2\\pi r$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Rectangle area</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$A = lw$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Triangle area</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$A = \\tfrac{1}{2}bh$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Pythagorean theorem</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$a^2 + b^2 = c^2$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">30-60-90 triangle</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sides: $x,\\ x\\sqrt{3},\\ 2x$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">45-45-90 triangle</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sides: $x,\\ x,\\ x\\sqrt{2}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Rectangular prism volume</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$V = lwh$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Cylinder volume</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$V = \\pi r^2 h$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sphere volume</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$V = \\tfrac{4}{3}\\pi r^3$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Cone volume</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$V = \\tfrac{1}{3}\\pi r^2 h$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Pyramid volume</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$V = \\tfrac{1}{3}Bh$ (B = base area)</td></tr>
</table>

<h2>Geometry — NOT Given (Must Memorize)</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Perimeter of rectangle</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$P = 2l + 2w$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Area of parallelogram</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$A = bh$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Area of trapezoid</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$A = \\tfrac{1}{2}(b_1 + b_2)h$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Diagonal of rectangle</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$d = \\sqrt{l^2 + w^2}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Distance formula</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Midpoint formula</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\left(\\dfrac{x_1+x_2}{2},\\ \\dfrac{y_1+y_2}{2}\\right)$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Circle equation</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$(x-h)^2 + (y-k)^2 = r^2$, center $(h,k)$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Arc length</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\dfrac{\\theta}{360} \\times 2\\pi r$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sector area</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\dfrac{\\theta}{360} \\times \\pi r^2$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sum of interior angles</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$(n-2) \\times 180°$ (n = number of sides)</td></tr>
</table>
<ul>
  <li><strong>Exterior angle of triangle</strong> = sum of the two non-adjacent interior angles</li>
  <li><strong>Central angle</strong> = arc measure; <strong>Inscribed angle</strong> = ½ × arc measure</li>
  <li><strong>Tangent to circle</strong> is perpendicular to the radius at the point of tangency</li>
</ul>

<h2>Trigonometry</h2>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;font-family:monospace;">
  SOH-CAH-TOA: $\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}}$ &nbsp;&nbsp; $\\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}}$ &nbsp;&nbsp; $\\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}}$
</div>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Identity</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Formula</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Pythagorean identity</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\sin^2\\theta + \\cos^2\\theta = 1$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complementary angles</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\sin\\theta = \\cos(90° - \\theta)$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Radian conversion</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$180° = \\pi$ rad; degrees $\\times \\dfrac{\\pi}{180}$ = radians</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Arc length (radians)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$s = r\\theta$ (θ must be in radians)</td></tr>
</table>
<h3>Key Trig Values</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Angle</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\sin$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\cos$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tan$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">0°</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">0</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">0</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">30°</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{1}{2}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{\\sqrt{3}}{2}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{1}{\\sqrt{3}}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">45°</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{\\sqrt{2}}{2}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{\\sqrt{2}}{2}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">60°</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{\\sqrt{3}}{2}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\tfrac{1}{2}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$\\sqrt{3}$</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">90°</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">0</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">undefined</td></tr>
</table>

<h2>Complex Numbers</h2>
<ul>
  <li>$i = \\sqrt{-1}$, &nbsp; $i^2 = -1$, &nbsp; $i^3 = -i$, &nbsp; $i^4 = 1$ (then repeats)</li>
  <li>Add/subtract: combine real and imaginary parts separately</li>
  <li>Multiply: use FOIL; replace $i^2$ with $-1$</li>
  <li>Complex conjugate of $a + bi$ is $a - bi$; product $(a+bi)(a-bi) = a^2 + b^2$</li>
</ul>

<h2>Sequences &amp; Series</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Type</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>nth term</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Key feature</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Arithmetic</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$a_n = a_1 + (n-1)d$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">constant difference d</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Geometric</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">$a_n = a_1 \\cdot r^{n-1}$</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">constant ratio r</td></tr>
</table>
<ul>
  <li>Sum of arithmetic series (n terms): $S = \\dfrac{n(a_1 + a_n)}{2}$</li>
</ul>
`
  },
  {
    id: 'grammar',
    title: 'Grammar & Writing: Every Rule',
    desc: 'Punctuation, subject-verb agreement, pronouns, modifiers, parallel structure, transitions, and concision — the complete SAT grammar rulebook.',
    body: `
<h2>Punctuation — The Complete Decision Tree</h2>
<div style="background:var(--accent-tint,#eff6ff);border:1px solid var(--accent,#3b82f6);padding:8px 12px;border-radius:6px;margin:8px 0;">
  <strong>Step 1: Is what comes BEFORE a complete sentence (independent clause)?</strong><br>
  <strong>Step 2: Is what comes AFTER a complete sentence?</strong>
</div>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Before</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>After</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Punctuation Options</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complete</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complete</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Period &nbsp;|&nbsp; Semicolon &nbsp;|&nbsp; Comma + FANBOYS</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complete</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">List / explanation / example</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Colon only</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complete</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Non-essential (extra) info</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Comma pair &nbsp;|&nbsp; Em-dash pair &nbsp;|&nbsp; Parentheses</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Fragment</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complete</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Comma only (never semicolon or colon)</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Complete</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Fragment (no meaning alone)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">No punctuation needed, or dash for emphasis</td></tr>
</table>
<div style="background:var(--surface-alt,#f5f5f5);padding:8px 12px;margin:6px 0;border-radius:6px;">
  <strong>FANBOYS:</strong> For, And, Nor, But, Or, Yet, So
</div>

<h2>Commas — 6 Specific Rules</h2>
<ol>
  <li><strong>Before FANBOYS</strong> joining two independent clauses<br>
    <code style="color:var(--green,#16a34a)">✓</code> "She studied hard, <em>and</em> she passed."<br>
    <code style="color:var(--red,#dc2626)">✗</code> "She studied hard, <em>however</em> she passed." (however is not FANBOYS)</li>
  <li><strong>After introductory phrase or clause</strong><br>
    <code style="color:var(--green,#16a34a)">✓</code> "After the exam<strong>,</strong> she celebrated."</li>
  <li><strong>Around non-essential (parenthetical) information</strong><br>
    <code style="color:var(--green,#16a34a)">✓</code> "Maria<strong>,</strong> my best friend<strong>,</strong> scored a 1500."<br>
    Test: remove the phrase — sentence still makes sense? Then it's non-essential → use commas.</li>
  <li><strong>Separating items in a list of three or more</strong><br>
    <code style="color:var(--green,#16a34a)">✓</code> "She bought apples, oranges<strong>,</strong> and bananas."</li>
  <li><strong>Between coordinate adjectives</strong> (adjectives you can reorder or join with "and")<br>
    <code style="color:var(--green,#16a34a)">✓</code> "a tall, dark building" (tall and dark building ✓)<br>
    <code style="color:var(--red,#dc2626)">✗</code> "a little old house" (little and old house sounds wrong → no comma)</li>
  <li><strong>Around direct address or appositives</strong><br>
    <code style="color:var(--green,#16a34a)">✓</code> "Dr. Smith<strong>,</strong> the lead researcher<strong>,</strong> presented."</li>
</ol>
<div style="background:var(--accent-tint,#eff6ff);border:1px solid var(--accent,#3b82f6);padding:8px 12px;border-radius:6px;margin:8px 0;">
  <strong>Comma Splice = ERROR:</strong> Two complete sentences joined only by a comma. Fix with period, semicolon, or comma + FANBOYS.
</div>

<h2>Semicolons</h2>
<ul>
  <li>Only between two <em>independent clauses</em> — think of it as a "soft period"</li>
  <li><code style="color:var(--green,#16a34a)">✓</code> "She studied all night<strong>;</strong> she still failed."</li>
  <li><code style="color:var(--red,#dc2626)">✗</code> "She was tired<strong>;</strong> having stayed up all night." (second part is a fragment)</li>
  <li>Also used to separate list items that already contain commas: "Paris, France<strong>;</strong> Rome, Italy<strong>;</strong> and Berlin, Germany"</li>
</ul>

<h2>Colons</h2>
<ul>
  <li>Must be preceded by a <em>complete sentence</em></li>
  <li>Introduces: a list, an explanation, a quotation, or an example</li>
  <li><code style="color:var(--green,#16a34a)">✓</code> "She had one goal<strong>:</strong> to win."</li>
  <li><code style="color:var(--red,#dc2626)">✗</code> "Her goals include<strong>:</strong> winning and learning." (fragment before colon)</li>
</ul>

<h2>Em-Dashes</h2>
<ul>
  <li><strong>One em-dash:</strong> adds emphasis or replaces a colon — "He had one weakness—pride."</li>
  <li><strong>Two em-dashes:</strong> surround non-essential info (like parentheses with stronger emphasis)<br>
    "The theory—once considered radical—is now mainstream."</li>
  <li>Both sides of a paired em-dash must be present</li>
</ul>

<h2>Apostrophes</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Use</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Rule</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Example</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Singular possessive</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Add 's</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">the cat's toy</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Plural possessive (ends in s)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Add ' only</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">the cats' toys</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Plural possessive (irregular)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Add 's</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">the children's toys</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Contractions</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Apostrophe marks the missing letter</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">it's=it is, they're=they are, you're=you are</td></tr>
</table>
<div style="background:var(--surface-alt,#f5f5f5);padding:8px 12px;margin:6px 0;border-radius:6px;">
  <strong>No apostrophe ever for:</strong> <em>its</em> (possessive), <em>their</em>, <em>your</em>, <em>whose</em>
</div>

<h2>Subject–Verb Agreement — Every Rule</h2>
<ul>
  <li><strong>Basic:</strong> singular subject → singular verb (adds -s); plural subject → plural verb (no -s)</li>
  <li><strong>Prepositional phrase trap:</strong> ignore any phrase between subject and verb<br>
    <code style="color:var(--green,#16a34a)">✓</code> "The <u>box</u> of nails <strong>is</strong> heavy." (box = subject, not nails)</li>
  <li><strong>Compound with AND:</strong> always plural → "Tom and Maria <strong>are</strong> ready."</li>
  <li><strong>Compound with OR/NOR:</strong> verb agrees with nearest subject → "Neither the students nor the teacher <strong>is</strong> ready."</li>
  <li><strong>Always singular:</strong> each, every, either, neither, anyone, someone, everyone, nobody, somebody, no one</li>
  <li><strong>Collective nouns</strong> (team, committee, group, class): usually treated as singular in American English</li>
  <li><strong>Inverted sentences:</strong> find the real subject after the verb → "There <strong>are</strong> many reasons." (reasons = subject)</li>
</ul>

<h2>Pronoun Agreement &amp; Case</h2>
<h3>Subject vs. Object Pronouns</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Subject (does the action)</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">I, he, she, we, they, who</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Object (receives the action)</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">me, him, her, us, them, whom</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Possessive (no apostrophe!)</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">its, their, your, whose, his, her, our</td></tr>
</table>
<ul>
  <li><strong>Who vs. whom test:</strong> substitute he/him — if "he" fits → who; if "him" fits → whom<br>
    "Who/Whom called?" → "He called." → <code style="color:var(--green,#16a34a)">✓</code> who<br>
    "To who/whom did you speak?" → "You spoke to him." → <code style="color:var(--green,#16a34a)">✓</code> whom</li>
  <li><strong>Pronoun-antecedent agreement:</strong> pronoun must match its antecedent in number and gender</li>
  <li><strong>Reflexive pronouns:</strong> himself, herself, themselves (not "hisself" or "theirselves")</li>
</ul>

<h2>Verb Tense &amp; Mood</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Tense</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Form</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>When to use</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Simple past</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">walked</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Completed action in the past</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Past perfect</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">had walked</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Earlier of two past actions</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Present perfect</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">has/have walked</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Past action with present relevance, or ongoing since past</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Simple present</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">walks</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Habitual/general/right now</td></tr>
</table>
<ul>
  <li><strong>Subjunctive mood</strong> (hypothetical / contrary to fact): use "were" not "was"<br>
    <code style="color:var(--green,#16a34a)">✓</code> "If I <strong>were</strong> you, I would study." &nbsp;&nbsp; <code style="color:var(--red,#dc2626)">✗</code> "If I <strong>was</strong> you..."</li>
  <li><strong>Consistent tense:</strong> don't shift tenses within a passage unless the timeline changes</li>
</ul>

<h2>Modifiers</h2>
<div style="background:var(--surface-alt,#f5f5f5);padding:8px 12px;margin:6px 0;border-radius:6px;">
  <strong>Golden rule:</strong> A modifier must be placed immediately next to the word it modifies.
</div>
<ul>
  <li><strong>Dangling modifier:</strong> the implied subject of the modifier ≠ the subject of the main clause<br>
    <code style="color:var(--red,#dc2626)">✗</code> "Walking down the street, the trees were beautiful." (trees aren't walking)<br>
    <code style="color:var(--green,#16a34a)">✓</code> "Walking down the street, <strong>I</strong> saw beautiful trees."</li>
  <li><strong>Misplaced modifier:</strong> modifier is in the wrong position<br>
    <code style="color:var(--red,#dc2626)">✗</code> "I only eat vegetables on Tuesdays." (only modifies eat?)<br>
    <code style="color:var(--green,#16a34a)">✓</code> "I eat only vegetables on Tuesdays."</li>
  <li><strong>Restrictive (essential):</strong> no commas — "The student <strong>who studies hard</strong> will pass." (tells you which student)</li>
  <li><strong>Non-restrictive (non-essential):</strong> use commas — "Maria<strong>,</strong> who studies hard<strong>,</strong> will pass." (extra info)</li>
</ul>

<h2>Parallel Structure</h2>
<ul>
  <li>All items in a list or comparison must be the same grammatical form</li>
  <li><code style="color:var(--green,#16a34a)">✓</code> "She likes <strong>hiking</strong>, <strong>swimming</strong>, and <strong>biking</strong>."</li>
  <li><code style="color:var(--red,#dc2626)">✗</code> "She likes <strong>hiking</strong>, <strong>swimming</strong>, and <strong>to bike</strong>."</li>
  <li><strong>Correlative conjunctions require parallel:</strong> both X and Y; either X or Y; neither X nor Y; not only X but also Y</li>
  <li><strong>Comparisons must be like-to-like:</strong><br>
    <code style="color:var(--red,#dc2626)">✗</code> "The cost of a car is higher than a bike." (comparing cost to bike)<br>
    <code style="color:var(--green,#16a34a)">✓</code> "The cost of a car is higher than <strong>the cost of</strong> a bike." or "...than <strong>that of</strong> a bike."</li>
</ul>

<h2>Concision &amp; Redundancy</h2>
<div style="background:var(--accent-tint,#eff6ff);border:1px solid var(--accent,#3b82f6);padding:8px 12px;border-radius:6px;margin:8px 0;">
  <strong>SAT rule:</strong> When two choices are grammatically correct, always choose the shorter, more direct one.
</div>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Wordy</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Concise</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">due to the fact that</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">because</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">in the event that</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">if</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">at this point in time</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">now</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">for the purpose of</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">to</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">end result / past history / future plans</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">result / history / plans</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">completely eliminate / totally destroy</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">eliminate / destroy</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">the reason why is because</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">because (or: the reason is that)</td></tr>
</table>

<h2>Sentence Boundaries</h2>
<ul>
  <li><strong>Run-on:</strong> two independent clauses with no punctuation, or only a comma (comma splice)<br>
    Fix: add a period, semicolon, or comma + FANBOYS, or restructure one clause</li>
  <li><strong>Fragment:</strong> missing a subject, a verb, or a complete thought<br>
    Fix: add the missing element, or attach the fragment to an adjacent sentence</li>
</ul>

<h2>Transitions — The Complete List</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Purpose</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Words</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Addition</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">also, furthermore, moreover, in addition, additionally, likewise</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Contrast</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">however, but, yet, nevertheless, on the other hand, although, while, whereas, despite, in contrast, conversely</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Cause / Effect</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">therefore, thus, consequently, as a result, hence, so, for this reason</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Concession</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">although, even though, while, granted that, admittedly, to be sure</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Example</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">for instance, for example, specifically, namely, to illustrate</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Sequence</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">first, then, next, subsequently, finally, meanwhile, afterward</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Summary</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">in short, in summary, in conclusion, overall, in brief, to summarize</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Emphasis</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">indeed, in fact, certainly, above all, most importantly</td></tr>
</table>

<h2>Style &amp; Rhetoric (Writing Questions)</h2>
<ul>
  <li><strong>Adding/deleting information:</strong> ask — does it serve the stated goal of the passage?</li>
  <li><strong>Sentence placement:</strong> new information should follow what sets it up logically</li>
  <li><strong>Introductions/conclusions:</strong> must match the passage's tone, scope, and main argument</li>
  <li><strong>Word choice (precision):</strong> choose the word whose exact meaning fits — consider connotation, not just denotation</li>
</ul>
`
  },
  {
    id: 'reading',
    title: 'Reading & Analysis: Complete Strategy',
    desc: 'All 8 question types with strategies, wrong-answer traps, passage approaches, and pacing — everything you need for the Reading & Writing module.',
    body: `
<h2>The 8 Question Types</h2>

<h3>1. Words in Context</h3>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;">
  <strong>Strategy:</strong> Cover the answer choices. Read the sentence and think of your own word that fits the context. Then match your word to the closest choice.
</div>
<ul>
  <li>Plug your chosen answer back into the sentence — does it make complete sense?</li>
  <li>Watch for <em>secondary meanings</em> — SAT loves less common meanings of common words (e.g., "novel" = new/original, not just a book)</li>
  <li>Pay attention to positive/negative tone of the surrounding context</li>
</ul>

<h3>2. Main Idea / Central Claim</h3>
<ul>
  <li>Ask: what is the author's <em>primary</em> point across the whole passage?</li>
  <li><code style="color:var(--green,#16a34a)">✓</code> Right answer covers the <em>entire</em> passage</li>
  <li><code style="color:var(--red,#dc2626)">✗</code> Too narrow: covers only one detail or paragraph</li>
  <li><code style="color:var(--red,#dc2626)">✗</code> Too broad: goes beyond what the text actually claims</li>
  <li><code style="color:var(--red,#dc2626)">✗</code> Too extreme: uses stronger language than the author does</li>
</ul>

<h3>3. Purpose / Function</h3>
<ul>
  <li>Why does the author include this sentence/paragraph/detail?</li>
  <li>Common purposes: <em>to illustrate, to contrast, to introduce, to support, to qualify, to challenge, to concede, to provide evidence, to transition</em></li>
  <li>Answer the question "why is this here?" — not "what does this say?"</li>
</ul>

<h3>4. Detail / Evidence (Text Evidence)</h3>
<ul>
  <li>Locate the <em>specific lines</em> in the text before choosing an answer</li>
  <li>The answer must be <em>directly stated or clearly implied</em> — no inferring beyond what's written</li>
  <li>Wrong answers often use details from the wrong part of the passage</li>
</ul>

<h3>5. Inference / "Most Logically Completes the Text"</h3>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;">
  <strong>Strategy:</strong> Identify the <em>direction</em> of the passage before reading choices — is it setting up a contrast? Continuing a point? Reaching a conclusion? The right answer follows that direction.
</div>
<ul>
  <li>Right answer is a <em>logical step forward</em> from the evidence — no new ideas introduced</li>
  <li>Wrong answers are often too extreme, outside scope, or go in the opposite direction</li>
</ul>

<h3>6. Two-Text Comparison</h3>
<ul>
  <li>Read Passage 1 fully first, then Passage 2</li>
  <li>Identify: where do the authors <em>agree</em> and <em>disagree</em>?</li>
  <li>"How would Author 2 respond to Author 1?" — find the relevant claim in Author 1, then find Author 2's position on it</li>
  <li>Answer must be grounded in <em>both</em> texts</li>
</ul>

<h3>7. Quantitative (Passage + Chart/Graph)</h3>
<ul>
  <li>Read the data carefully — check axes, units, labels, and legend</li>
  <li>The correct answer is <em>directly and specifically supported</em> by the data</li>
  <li>Wrong answers often: misread a trend, cherry-pick one data point, or overstate the conclusion</li>
  <li>The passage and the graphic must both support the answer</li>
</ul>

<h3>8. Notes-Based Rhetorical Synthesis</h3>
<div style="background:var(--surface-alt,#f5f5f5);border-left:3px solid var(--accent,#3b82f6);padding:8px 12px;margin:6px 0;border-radius:4px;">
  <strong>Strategy:</strong> Read the GOAL first (stated in the question). The right answer fulfills that <em>exact</em> goal — not a related one, not a better one.
</div>
<ul>
  <li>Wrong answers are often factually accurate but miss the goal (wrong emphasis, wrong audience, wrong purpose)</li>
  <li>Make sure the answer uses information from the notes</li>
</ul>

<h2>Universal Process — Every Question</h2>
<ol>
  <li><strong>Read the question</strong> (not the choices) — understand exactly what's being asked</li>
  <li><strong>Read the relevant passage section</strong> (re-read if needed)</li>
  <li><strong>Form your own answer</strong> — predict before looking at choices</li>
  <li><strong>Match your prediction</strong> to the choices</li>
  <li><strong>Eliminate</strong> wrong answers, then select the best remaining choice</li>
</ol>

<h2>Wrong Answer Traps — The Complete List</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Trap</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>What it looks like</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>How to catch it</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Out of scope</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">True-sounding, but not in the text</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Can you point to the line that proves it?</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Half-right</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">First part correct, second part wrong or twisted</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Read every word of the choice — all must be true</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Extreme language</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">"always," "never," "all," "none," "completely"</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Does the passage really say ALL/NEVER?</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Opposite</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Right concept, wrong direction (undermines vs. supports)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Check direction: does it support or contradict?</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Right answer, wrong question</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">True and in the text, but doesn't answer THIS question</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Re-read the question stem before confirming</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Too narrow</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Only addresses a detail, not the main point</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Does it cover the whole scope of the question?</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Too broad</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Goes beyond what the text actually claims</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Is this actually in the text, or just likely?</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Tone mismatch</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Text is neutral, answer is judgmental (or vice versa)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Match the author's level of intensity</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Paraphrase trap</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Uses the same words as the text, but changes the meaning</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Familiar words ≠ correct answer — check meaning</td></tr>
</table>

<h2>Passage Types &amp; How to Read Each</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Type</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Focus on</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Literary (fiction/narrative)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Character, tone, narrator's perspective, what's implied vs. stated</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Informational (science/history)</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Main argument, evidence used, cause/effect relationships</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Argumentative</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Claim, evidence, counterargument, how author responds to objections</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Two-passage</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Read P1 fully first, then P2; note agreement/disagreement for comparison questions</td></tr>
</table>

<h2>Vocabulary Strategy</h2>
<ul>
  <li>Context is everything — the same word can mean different things in different passages</li>
  <li>Watch for positive/negative tone signals in surrounding sentences</li>
  <li>If unsure of the meaning, use process of elimination: which choices clearly don't fit the context?</li>
  <li>SAT especially likes: <em>novel</em> (new), <em>critical</em> (important or evaluating), <em>challenge</em> (dispute), <em>significant</em> (important or large)</li>
</ul>

<h2>Pacing Strategy</h2>
<div style="background:var(--accent-tint,#eff6ff);border:1px solid var(--accent,#3b82f6);padding:8px 12px;border-radius:6px;margin:8px 0;">
  R&amp;W: 27 questions in 32 minutes ≈ <strong>70 seconds per question</strong>
</div>
<ul>
  <li>Don't spend more than 90 seconds on any single question — flag it and move on</li>
  <li>In the last 60 seconds of each module: answer every blank (no penalty for wrong answers)</li>
  <li>Prediction before reading choices saves time — you won't be drawn into attractive wrong answers</li>
</ul>
`
  },
  {
    id: 'testday',
    title: 'Test Day: Complete Playbook',
    desc: 'SAT format, pacing targets, Desmos tips, adaptive module strategy, skip-and-return system, and every practical tip for test day.',
    body: `
<h2>SAT Format — Know This Cold</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Section</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Modules</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Questions</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Time</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Reading &amp; Writing</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">2 modules</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">27 questions each</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">32 minutes each</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Math</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">2 modules</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">22 questions each</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">35 minutes each</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Break</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);" colspan="3">10 minutes between R&amp;W and Math</td></tr>
</table>
<div style="background:var(--surface-alt,#f5f5f5);padding:8px 12px;margin:6px 0;border-radius:6px;">
  <strong>No penalty for wrong answers.</strong> Always make a guess — never leave a blank.
</div>
<ul>
  <li>Calculator is allowed for the <em>entire</em> Math section — use the built-in Desmos</li>
  <li>The test is adaptive: Module 2 difficulty depends on your Module 1 performance</li>
</ul>

<h2>Pacing Targets</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Section</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Target pace</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Flag if over</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">R&amp;W</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">≈ 70 sec / question</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">80–90 sec</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Math</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">≈ 95 sec / question</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">2 min</td></tr>
</table>

<h2>Skip-and-Return System</h2>
<ol>
  <li><strong>First pass:</strong> answer every question you can do in ≤ ~80 seconds (R&amp;W) or ≤ ~2 min (Math). Click the flag icon for anything harder.</li>
  <li><strong>Second pass:</strong> return to all flagged questions with remaining time.</li>
  <li><strong>Final 60 seconds:</strong> select an answer for every single blank — no blank should remain unanswered. There is no penalty.</li>
</ol>
<div style="background:var(--accent-tint,#eff6ff);border:1px solid var(--accent,#3b82f6);padding:8px 12px;border-radius:6px;margin:8px 0;">
  Never leave a question blank. A random guess has a 25% chance of being right. A blank is 0%.
</div>

<h2>Desmos Calculator — Power Tips</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Task</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>How to do it in Desmos</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Graph a line</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Type y = 2x + 3 directly</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Find intersection</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Graph both equations; click the intersection point</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Solve quadratic</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Graph y = ax² + bx + c; find x-intercepts (zeros)</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Use a slider</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Type a = 1; a slider appears — drag to find the right value of k</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Evaluate a function</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Define f(x) = ..., then type f(3) to get the value</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Make a table</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Click + → Table; enter x values to see outputs</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Check trig</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Confirm degrees vs. radians mode in settings (gear icon)</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Systems of equations</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Graph both lines; click the intersection for the solution</td></tr>
</table>

<h2>Adaptive Module 2 — What It Means</h2>
<ul>
  <li>If Module 1 goes well → Module 2 is <strong>harder</strong> — this puts you on the high-scoring track (up to 800)</li>
  <li>If Module 1 goes poorly → Module 2 is <strong>easier</strong> — your score is capped around 600</li>
  <li><strong>Do not panic</strong> if Module 2 feels very hard — it means you're on track for a high score</li>
  <li>Maintain the same pacing and strategy regardless of perceived difficulty</li>
  <li>In Module 1: aim to answer every question (no tactical skipping for adaptive purposes)</li>
</ul>

<h2>Math-Specific Tips</h2>
<ul>
  <li><strong>Re-read what they're asking:</strong> is it x, or x + 2, or 2x? SAT loves to ask for an expression, not just the variable</li>
  <li><strong>Draw diagrams</strong> for geometry problems — even rough sketches help</li>
  <li><strong>Backsolve:</strong> plug answer choices (start with B or C) back into the problem</li>
  <li><strong>Pick numbers:</strong> replace variables with concrete numbers to test abstract claims</li>
  <li><strong>Estimate:</strong> when answer choices are spread far apart, estimation is faster than exact calculation</li>
  <li><strong>Units:</strong> watch for unit mismatches in word problems (miles vs. km, minutes vs. hours)</li>
  <li><strong>Rate problems:</strong> always set up D = RT (or equivalent) before calculating</li>
  <li><strong>Check your answer:</strong> for SPR (student-produced response), double-check units and reasonableness</li>
</ul>

<h2>Reading-Specific Tips</h2>
<ul>
  <li><strong>Always predict</strong> before reading answer choices — prediction prevents being drawn to attractive wrong answers</li>
  <li><strong>Classify the transition word first</strong> for transition questions (addition? contrast? cause-effect?)</li>
  <li>For "most logically completes" questions, identify the <em>direction</em> of the passage before reading choices</li>
  <li>For evidence questions, <em>locate the specific line</em> before choosing</li>
  <li>When stuck between two choices, ask: which one does the text <em>directly prove</em>?</li>
</ul>

<h2>Night Before Checklist</h2>
<div style="background:var(--surface-alt,#f5f5f5);padding:8px 12px;margin:6px 0;border-radius:6px;">
  <ul style="margin:0;">
    <li>Government-issued photo ID</li>
    <li>Admission ticket (printed or on device)</li>
    <li>Fully charged testing device + charger</li>
    <li>Snacks and water bottle</li>
    <li>Watch (analog or digital — no smartwatch)</li>
    <li>No cramming — light review only</li>
    <li>7+ hours of sleep</li>
    <li>Know where your testing center is and how long it takes to get there</li>
  </ul>
</div>

<h2>Score Conversion Guide</h2>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Score</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Approx. % correct</strong></td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);"><strong>Context</strong></td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1200</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">~70%</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">About 34/49 correct per module</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1300</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">~77%</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Can miss ~11 questions per module</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1400</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">~85%</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Can miss ~7 questions per module</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1500</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">~92%</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Can miss ~4 questions per module</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1550+</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">~96–98%</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Near-perfect; each error at this range costs ~10–20 pts</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">1600</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">100%</td><td style="padding:4px 8px;border:1px solid var(--border,#e5e7eb);">Perfect score</td></tr>
</table>
`
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
  content.innerHTML = `<h1>${escapeHtml(c.title)}</h1>${c.body}`;
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

  // report button
  document.getElementById('quiz-report').onclick = () => {
    const q = currentSession?.questions[currentSession?.idx];
    const title = encodeURIComponent('Bad question report');
    const body = encodeURIComponent(
      `**Question ID:** ${q?.id ?? 'unknown'}\n\n` +
      `**Question:** ${q?.prompt ?? ''}\n\n` +
      `**Issue:**\n<!-- Describe what's wrong: incorrect answer, bad wording, not SAT-relevant, etc. -->`
    );
    window.open(
      `https://github.com/sudo-nkop/sat-prep-app/issues/new?labels=bad-question&title=${title}&body=${body}`,
      '_blank', 'noopener'
    );
  };

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
