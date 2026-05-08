const recBtn = document.getElementById("recBtn");
const recLabel = document.getElementById("recLabel");
const timerEl = document.getElementById("timer");
const fileInput = document.getElementById("fileInput");
const fileNameEl = document.getElementById("fileName");
const recorderSec = document.getElementById("recorder");
const statusSec = document.getElementById("status");
const statusText = document.getElementById("statusText");
const resultsSec = document.getElementById("results");
const newBtn = document.getElementById("newBtn");

let mediaRecorder = null;
let chunks = [];
let startTime = 0;
let timerInt = null;
let isRecording = false;

function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  startTime = Date.now();
  timerInt = setInterval(() => {
    timerEl.textContent = fmt(Math.floor((Date.now() - startTime) / 1000));
  }, 500);
}
function stopTimer() { clearInterval(timerInt); timerInt = null; }

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    chunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: mime });
      await uploadAudio(blob, `lecture-${Date.now()}.webm`);
    };
    mediaRecorder.start();
    isRecording = true;
    recBtn.classList.add("recording");
    recLabel.textContent = "Tap to stop";
    timerEl.textContent = "00:00";
    startTimer();
  } catch (err) {
    alert("Microphone access denied. Try uploading a file instead.\n\n" + err.message);
  }
}

function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  isRecording = false;
  recBtn.classList.remove("recording");
  recLabel.textContent = "Tap to record";
  stopTimer();
}

recBtn.addEventListener("click", () => {
  if (isRecording) stopRecording();
  else startRecording();
});

fileInput.addEventListener("change", async () => {
  const f = fileInput.files[0];
  if (!f) return;
  fileNameEl.textContent = f.name;
  await uploadAudio(f, f.name);
});

async function uploadAudio(blob, name) {
  recorderSec.classList.add("hidden");
  statusSec.classList.remove("hidden");
  statusText.textContent = "Transcribing…";

  const fd = new FormData();
  fd.append("audio", blob, name);

  try {
    const res = await fetch("/api/process", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }
    statusText.textContent = "Generating notes…";
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    statusSec.classList.add("hidden");
    recorderSec.classList.remove("hidden");
    alert("Failed: " + err.message);
  }
}

function renderMarkdown(src) {
  const esc = s => s.replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  const lines = src.split("\n");
  let html = "", inList = null;
  const flush = () => { if (inList) { html += `</${inList}>`; inList = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flush();
      html += `<h${m[1].length}>${esc(m[2])}</h${m[1].length}>`;
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      if (inList !== "ul") { flush(); html += "<ul>"; inList = "ul"; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      if (inList !== "ol") { flush(); html += "<ol>"; inList = "ol"; }
      html += `<li>${inline(m[1])}</li>`;
    } else if (line === "") {
      flush();
    } else {
      flush();
      html += `<p>${inline(line)}</p>`;
    }
  }
  flush();
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  return html;
}

let cards = [];
let cardIdx = 0;

function showCard(i) {
  cardIdx = (i + cards.length) % cards.length;
  const { front, back } = cards[cardIdx];
  const stack = document.getElementById("cardStack");
  stack.innerHTML = `
    <div class="flashcard" id="fc">
      <div class="face front">${escapeHtml(front)}</div>
      <div class="face back">${escapeHtml(back)}</div>
    </div>`;
  document.getElementById("fc").addEventListener("click", () => {
    document.getElementById("fc").classList.toggle("flipped");
  });
  document.getElementById("cardCount").textContent = `${cardIdx + 1} / ${cards.length}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function renderResults(data) {
  statusSec.classList.add("hidden");
  resultsSec.classList.remove("hidden");

  const notes = data.notes;
  document.getElementById("noteTitle").textContent = notes.title || "Lecture notes";
  document.getElementById("summaryText").innerHTML = renderMarkdown(notes.summary || "");

  cards = notes.flashcards || [];
  if (cards.length) showCard(0);

  const examList = document.getElementById("examList");
  examList.innerHTML = "";
  for (const q of notes.exam_questions || []) {
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(q.question)}<div class="hint-line">💡 ${escapeHtml(q.answer_hint)}</div>`;
    examList.appendChild(li);
  }

  document.getElementById("transcriptText").textContent = data.transcript || "";
}

document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".tab-body").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    document.getElementById("tab-" + t.dataset.tab).classList.add("active");
  });
});

document.getElementById("prevCard").addEventListener("click", () => showCard(cardIdx - 1));
document.getElementById("nextCard").addEventListener("click", () => showCard(cardIdx + 1));

newBtn.addEventListener("click", () => {
  resultsSec.classList.add("hidden");
  recorderSec.classList.remove("hidden");
  fileInput.value = "";
  fileNameEl.textContent = "";
  timerEl.textContent = "00:00";
});
