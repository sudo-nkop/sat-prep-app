// SAT Practice — single-file app logic
// Data: data/questions.json
// Storage: localStorage under namespace "sat-app:*"

const KEY = {
  stats: 'sat-app:stats',
  history: 'sat-app:history',
  settings: 'sat-app:settings',
  lastOpen: 'sat-app:lastOpen',
  imported: 'sat-app:imported',
};

const DEFAULT_SETTINGS = { reminderHours: 24, theme: 'dark' };

// ---------- state ----------
let allQuestions = [];
let cheatsheets = [];
let currentSession = null; // { mode, questions, answers, flagged, idx, startedAt, durationMs }
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

// ---------- navigation ----------
const screens = ['home', 'practice-setup', 'test-setup', 'quiz', 'results', 'cheatsheets', 'history', 'settings', 'import'];
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
    'screen-quiz': currentSession?.mode === 'test' ? 'Test' : 'Practice',
    'screen-results': 'Results',
    'screen-cheatsheets': 'Cheatsheets',
    'screen-history': 'History',
    'screen-settings': 'Settings',
    'screen-import': 'Import Questions',
  };
  document.getElementById('page-title').textContent = titles[id] || 'SAT Practice';
  if (id === 'screen-home') refreshHome();
  window.scrollTo(0, 0);
}
function back() {
  if (screenStack.length > 1) {
    screenStack.pop();
    go(screenStack[screenStack.length - 1], false);
  }
}

// ---------- data load ----------
async function loadQuestions() {
  const res = await fetch('data/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load questions');
  const data = await res.json();
  const imported = load(KEY.imported, []);
  allQuestions = [...data.questions, ...imported];
  populateTopicFilter();
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

function pickQuestions({ section, topic, difficulty, count }) {
  let pool = allQuestions.filter(q =>
    (section === 'all' || q.section === section) &&
    (topic === 'all' || q.topic === topic) &&
    (difficulty === 'all' || q.difficulty === Number(difficulty))
  );
  if (pool.length === 0) return [];
  const shuffled = shuffle(pool);
  // if pool < count, repeat by reshuffling
  const out = [];
  while (out.length < count) {
    out.push(...shuffled);
  }
  return out.slice(0, count);
}

function startPractice() {
  const section = document.getElementById('practice-section').value;
  const topic = document.getElementById('practice-topic').value;
  const difficulty = document.getElementById('practice-difficulty').value;
  const count = Number(document.getElementById('practice-count').value);
  const qs = pickQuestions({ section, topic, difficulty, count });
  if (qs.length === 0) {
    alert('No questions match those filters. Try widening your criteria.');
    return;
  }
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

function startTest(kind) {
  let qs;
  let durationMs;
  if (kind === 'rw') {
    qs = pickQuestions({ section: 'rw', topic: 'all', difficulty: 'all', count: 27 });
    durationMs = 32 * 60 * 1000;
  } else if (kind === 'math') {
    qs = pickQuestions({ section: 'math', topic: 'all', difficulty: 'all', count: 22 });
    durationMs = 35 * 60 * 1000;
  } else {
    qs = pickQuestions({ section: 'all', topic: 'all', difficulty: 'all', count: 15 });
    durationMs = 20 * 60 * 1000;
  }
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
  timerEl.hidden = false;
  function tick() {
    const remaining = currentSession.deadline - Date.now();
    if (remaining <= 0) {
      timerEl.textContent = '00:00';
      finishQuiz(true);
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (remaining < 60000) timerEl.classList.add('warning');
  }
  tick();
  timerHandle = setInterval(tick, 500);
}
function stopTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  document.getElementById('quiz-timer').hidden = true;
  document.getElementById('quiz-timer').classList.remove('warning');
}

function renderQuiz() {
  const s = currentSession;
  const q = s.questions[s.idx];
  document.getElementById('quiz-progress').textContent = `${s.idx + 1} / ${s.questions.length}`;
  const bar = document.getElementById('quiz-progress-bar');
  if (bar) bar.style.width = `${((s.idx + 1) / s.questions.length) * 100}%`;
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
    btn.onclick = () => {
      if (s.mode === 'practice' && s.answers[s.idx] != null && document.getElementById('q-explanation').hidden === false) return;
      s.answers[s.idx] = letter;
      // visual update
      [...choices.children].forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    };
    choices.appendChild(btn);
  });
  renderMath(choices);

  // flag visual
  const flagBtn = document.getElementById('quiz-flag');
  flagBtn.textContent = s.flagged.has(s.idx) ? 'Flagged' : 'Flag';

  // explanation reset
  const expl = document.getElementById('q-explanation');
  expl.hidden = true;

  // actions
  const submit = document.getElementById('quiz-submit');
  const skip = document.getElementById('quiz-skip');
  const next = document.getElementById('quiz-next');
  const prev = document.getElementById('quiz-prev');
  const finish = document.getElementById('quiz-finish');

  prev.hidden = s.idx === 0;
  if (s.mode === 'practice') {
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
    // test mode: navigation only
    submit.hidden = true;
    skip.hidden = true;
    next.hidden = s.idx === s.questions.length - 1;
    finish.hidden = s.idx !== s.questions.length - 1;
    prev.hidden = s.idx === 0;
  }
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
  // record in stats
  const q = s.questions[s.idx];
  const stats = getStats();
  stats.answered += 1;
  if (s.answers[s.idx] === q.answer) stats.correct += 1;
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
  if (currentSession.idx < currentSession.questions.length - 1) {
    currentSession.idx += 1;
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

function finishQuiz(timeUp = false) {
  stopTimer();
  const s = currentSession;
  s.durationMs = Date.now() - s.startedAt;
  let correct = 0;
  s.questions.forEach((q, i) => { if (s.answers[i] === q.answer) correct += 1; });
  // record history
  const hist = getHistory();
  hist.unshift({
    when: Date.now(),
    mode: s.mode,
    kind: s.kind || null,
    score: correct,
    total: s.questions.length,
    durationMs: s.durationMs,
  });
  save(KEY.history, hist.slice(0, 50));
  // show results
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
  if (s.mode === 'test') {
    const min = Math.floor(s.durationMs / 60000);
    const sec = Math.floor((s.durationMs % 60000) / 1000);
    timeEl.hidden = false;
    timeEl.textContent = `Time: ${min}m ${sec}s${timeUp ? ' (time expired)' : ''}`;
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
  const list = document.getElementById('history-list');
  const hist = getHistory();
  if (hist.length === 0) {
    list.innerHTML = '<div class="history-empty">No sessions yet — try a practice session!</div>';
    return;
  }
  list.innerHTML = hist.map(h => {
    const d = new Date(h.when);
    const date = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mode = h.mode === 'test' ? `Test (${h.kind})` : 'Practice';
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
function applySettings() {
  const s = getSettings();
  document.documentElement.dataset.theme = s.theme;
  document.getElementById('theme-select').value = s.theme;
  document.getElementById('reminder-interval').value = String(s.reminderHours);
}

// ---------- import ----------
function addImportedQuestions(newQs) {
  const existing = load(KEY.imported, []);
  save(KEY.imported, [...existing, ...newQs]);
  allQuestions = [...allQuestions, ...newQs];
  populateTopicFilter();
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
  document.getElementById('practice-start').onclick = startPractice;

  // test
  document.querySelectorAll('[data-test]').forEach(b => {
    b.onclick = () => startTest(b.dataset.test);
  });

  // quiz controls
  document.getElementById('quiz-submit').onclick = submitAnswer;
  document.getElementById('quiz-skip').onclick = skipQuestion;
  document.getElementById('quiz-next').onclick = nextQuestion;
  document.getElementById('quiz-prev').onclick = prevQuestion;
  document.getElementById('quiz-flag').onclick = toggleFlag;
  document.getElementById('quiz-finish').onclick = () => {
    if (currentSession.mode === 'test') {
      const unanswered = currentSession.answers.filter(a => a == null).length;
      if (unanswered > 0 && !confirm(`${unanswered} unanswered. Finish anyway?`)) return;
    }
    finishQuiz();
  };

  // settings
  document.getElementById('theme-select').onchange = (e) => {
    const s = getSettings(); s.theme = e.target.value; save(KEY.settings, s);
    document.documentElement.dataset.theme = s.theme;
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
    if (!confirm('Clear all history?')) return;
    save(KEY.history, []);
    renderHistory();
  };

  try {
    await loadQuestions();
  } catch (e) {
    alert('Could not load questions: ' + e.message + '\nMake sure data/questions.json is reachable.');
  }

  if ('Notification' in window) {
    document.getElementById('notif-status').textContent = `Permission: ${Notification.permission}`;
    if (Notification.permission === 'granted') scheduleReminder();
  }
});
