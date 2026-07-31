const AUTH_TOKEN_KEY = 'sm_auth_token';
const AUTH_NAME_KEY = 'sm_auth_name';

// ---------- Dark mode toggle ----------
(function () {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return; // agar button na mile, dark mode skip karo, baaki app chalta rahe

  const icon = toggleBtn.querySelector('.theme-icon');
  const saved = localStorage.getItem('studymate-theme');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      icon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      icon.textContent = '🌙';
    }
  }

  applyTheme(saved === 'dark' ? 'dark' : 'light');

  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('studymate-theme', next);
  });
})();

const state = {
  subject: '',
  recentSubjects: JSON.parse(localStorage.getItem('sm_recent_subjects') || '[]')
};

const subjectInput = document.getElementById('subjectInput');
const recentSubjectsEl = document.getElementById('recentSubjects');

function renderRecentSubjects() {
  recentSubjectsEl.innerHTML = '';
  state.recentSubjects.forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = s;
    chip.addEventListener('click', () => {
      subjectInput.value = s;
      state.subject = s;
    });
    recentSubjectsEl.appendChild(chip);
  });
}

function saveSubject(subject) {
  if (!subject) return;
  state.recentSubjects = [subject, ...state.recentSubjects.filter(s => s !== subject)].slice(0, 6);
  localStorage.setItem('sm_recent_subjects', JSON.stringify(state.recentSubjects));
  renderRecentSubjects();
}

subjectInput.addEventListener('change', () => {
  state.subject = subjectInput.value.trim();
  saveSubject(state.subject);
});

renderRecentSubjects();
// ---------- Copy button ----------
document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', async () => {
    const targetId = btn.dataset.copyTarget;
    const targetEl = document.getElementById(targetId);
    const text = targetEl.innerText.trim();

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // fallback for older browsers
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }

    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = '<i class="glyph">✓</i> Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 1500);
  });
});

// ---------- Download button (PDF) ----------
document.querySelectorAll('.btn-download').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-download-target');
    const filename = btn.getAttribute('data-filename') || 'studymate-output';
    const el = document.getElementById(targetId);
    if (!el) return;

    const text = el.innerText.trim();
    if (!text) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const marginLeft = 40;
    const marginTop = 50;
    const maxWidth = 515; // A4 width (595pt) minus margins
    const lineHeight = 16;
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(text, maxWidth);
    let y = marginTop;

    lines.forEach((line) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(line, marginLeft, y);
      y += lineHeight;
    });

    doc.save(`${filename}.pdf`);
  });
});

// ---------- Tab navigation ----------
const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`page-${tab.dataset.tab}`).classList.add('active');
  });
});

// ---------- Helpers ----------
function currentSubject() {
  const val = subjectInput.value.trim();
  if (val) { state.subject = val; saveSubject(val); }
  return state.subject;
}

function requireSubject() {
  if (!currentSubject()) {
    subjectInput.focus();
    subjectInput.style.borderColor = 'var(--margin-line)';
    setTimeout(() => { subjectInput.style.borderColor = ''; }, 900);
    return false;
  }
  return true;
}

async function runStream(button, endpoint, payload, outputEl, onDone) {
  if (!requireSubject()) return;
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = 'Working...';
  await streamInto(endpoint, payload, outputEl, {
    onDone: (text) => { if (onDone) onDone(text); }
  });
  button.disabled = false;
  button.innerHTML = original;
}

// ---------- 02 Notes ----------
document.getElementById('notesBtn').addEventListener('click', () => {
  const topic = document.getElementById('notesTopic').value.trim();
  const subject = currentSubject();
  runStream(
    document.getElementById('notesBtn'),
    '/api/notes',
    { subject, topic },
    document.getElementById('notesOutput'),
    (text) => { saveToHistory('notes', subject, topic, text); trackProgress('notes'); }
  );
});

// ---------- 03 Quiz ----------
document.getElementById('quizBtn').addEventListener('click', () => {
  const topic = document.getElementById('quizTopic').value.trim();
  const count = document.getElementById('quizCount').value;
  const difficulty = document.getElementById('quizDifficulty').value;
  const subject = currentSubject();
  runStream(
    document.getElementById('quizBtn'),
    '/api/quiz',
    { subject, topic, num_questions: Number(count), difficulty },
    document.getElementById('quizOutput'),
    (text) => { saveToHistory('quiz', subject, topic, text); trackProgress('quiz'); }
  );
});

// ---------- 04 Flashcards ----------
document.getElementById('flashBtn').addEventListener('click', async () => {
  const topic = document.getElementById('flashTopic').value.trim();
  const deck = document.getElementById('flashDeck');
  const btn = document.getElementById('flashBtn');
  if (!requireSubject()) return;

  const scratch = document.createElement('div');
  btn.disabled = true;
  btn.textContent = 'Working...';
  deck.innerHTML = '<p class="page-hint small">Writing your flashcards...</p>';
  document.getElementById('flashExportRow').style.display = 'none';

  const text = await streamInto('/api/flashcards', { subject: currentSubject(), topic }, scratch, {});
  renderFlashcards(text, deck);
  trackProgress('flashcards');
  btn.disabled = false;
  btn.innerHTML = '<i class="glyph">◆</i>Generate flashcards';
});

let lastFlashPairs = [];

function renderFlashcards(rawText, deck) {
  deck.innerHTML = '';
  const pairs = [];
  const blocks = rawText.split(/\n(?=Q[:.\d])/i).map(b => b.trim()).filter(Boolean);
  blocks.forEach(block => {
    const match = block.match(/Q[:.\d\s]*[:.]?\s*(.+?)\n+A[:.\d\s]*[:.]?\s*([\s\S]+)/i);
    if (match) {
      pairs.push({ q: match[1].trim(), a: match[2].trim() });
    }
  });

  if (pairs.length === 0) {
    deck.innerHTML = `<div class="stream-page">${rawText || 'No flashcards came back — try again.'}</div>`;
    lastFlashPairs = [];
    document.getElementById('flashExportRow').style.display = 'none';
    return;
  }

  pairs.forEach(({ q, a }) => {
    const card = document.createElement('div');
    card.className = 'flashcard';
    card.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-face front">${q}</div>
        <div class="flashcard-face back">${a}</div>
      </div>`;
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    deck.appendChild(card);
  });

  lastFlashPairs = pairs;
  document.getElementById('flashExportRow').style.display = 'flex';
}

// ---------- 05 Summary ----------
document.getElementById('summaryBtn').addEventListener('click', () => {
  const text = document.getElementById('summaryInput').value.trim();
  const subject = currentSubject();
  runStream(
    document.getElementById('summaryBtn'),
    '/api/summary',
    { subject, topic: subject, source_text: text },
    document.getElementById('summaryOutput'),
    (outText) => { saveToHistory('summary', subject, subject, outText); trackProgress('summary'); }
  );
});

// ---------- 06 Planner ----------
document.getElementById('plannerBtn').addEventListener('click', () => {
  const hours = document.getElementById('plannerHours').value;
  const days = Number(document.getElementById('plannerDays').value);
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + days);
  const examDateStr = examDate.toISOString().split('T')[0];

  const subjectsToSend = plannerSubjects.length > 0 ? plannerSubjects : [currentSubject()];

  runStream(
    document.getElementById('plannerBtn'),
    '/api/planner',
    {
      subjects: subjectsToSend,
      exam_date: examDateStr,
      hours_per_day: Number(hours)
    },
    document.getElementById('plannerOutput'),
    () => trackProgress('planner')
  );
});

// ---------- 07 ELI10 ----------
document.getElementById('eli10Btn').addEventListener('click', () => {
  const topic = document.getElementById('eli10Topic').value.trim();
  const subject = currentSubject();
  runStream(
    document.getElementById('eli10Btn'),
    '/api/eli10',
    { subject, topic },
    document.getElementById('eli10Output'),
    (text) => { saveToHistory('eli10', subject, topic, text); trackProgress('eli10'); }
  );
});

// ---------- 08 Doubt solver ----------
const doubtThread = document.getElementById('doubtThread');
const doubtInput = document.getElementById('doubtInput');
const doubtBtn = document.getElementById('doubtBtn');

function addChatMsg(text, who) {
  const empty = doubtThread.querySelector('.chat-empty');
  if (empty) empty.remove();
  const msg = document.createElement('div');
  msg.className = `chat-msg ${who}`;
  msg.textContent = text;
  doubtThread.appendChild(msg);
  doubtThread.scrollTop = doubtThread.scrollHeight;
  return msg;
}

async function askDoubt() {
  const question = doubtInput.value.trim();
  if (!question || !requireSubject()) return;
  addChatMsg(question, 'user');
  doubtInput.value = '';
  doubtBtn.disabled = true;

  const aiMsg = addChatMsg('', 'ai');
  await streamInto('/api/doubt', { subject: currentSubject(), question }, aiMsg, {});
  trackProgress('doubt');
  doubtBtn.disabled = false;
}

doubtBtn.addEventListener('click', askDoubt);
doubtInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') askDoubt();
});
// ---------- History / Recent items ----------
const HISTORY_KEY = 'sm_history';
const HISTORY_LIMIT = 5;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

async function saveToHistory(section, subject, topic, text) {
  if (!text) return;

  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ section, subject, topic, text })
      });
      await renderHistory(section);
      return;
    } catch (err) {
      // fall through to localStorage if backend call fails
    }
  }

  const all = loadHistory();
  if (!all[section]) all[section] = [];
  const label = (topic && topic.trim()) ? topic.trim() : subject;
  const entry = { label, subject, topic, text, ts: Date.now() };
  all[section] = [entry, ...all[section]].slice(0, HISTORY_LIMIT);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  renderHistory(section);
}

async function renderHistory(section) {
  const el = document.getElementById(`${section}History`);
  if (!el) return;

  let items = [];
  const token = getAuthToken();

  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/history/${section}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        items = data.map(d => ({ label: d.label, text: d.text }));
      }
    } catch (err) {
      // fall through to localStorage
    }
  }

  if (items.length === 0 && !token) {
    const all = loadHistory();
    items = all[section] || [];
  }

  el.innerHTML = '';
  if (items.length === 0) return;

  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = item.label.length > 28 ? item.label.slice(0, 28) + '…' : item.label;
    chip.title = `${item.label} — click to reload`;
    chip.addEventListener('click', () => {
      const outputEl = document.getElementById(`${section}Output`);
      if (outputEl) outputEl.textContent = item.text;
    });
    el.appendChild(chip);
  });
}

// ---------- Flashcard export ----------
document.getElementById('flashExportCsv').addEventListener('click', () => {
  if (!lastFlashPairs.length) return;

  const rows = lastFlashPairs.map(({ q, a }) => {
    const escQ = `"${q.replace(/"/g, '""')}"`;
    const escA = `"${a.replace(/"/g, '""')}"`;
    return `${escQ},${escA}`;
  });
  const csv = rows.join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards-anki.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById('flashExportPrint').addEventListener('click', () => {
  if (!lastFlashPairs.length) return;

  const win = window.open('', '_blank');
  const rows = lastFlashPairs.map(({ q, a }, i) => `
    <div style="page-break-inside:avoid; margin-bottom:18px; border:1px solid #ccc; border-radius:8px; padding:14px;">
      <p style="font-weight:600; margin:0 0 6px;">Q${i + 1}. ${q}</p>
      <p style="margin:0; color:#333;">${a}</p>
    </div>`).join('');

  win.document.write(`
    <html>
      <head>
        <title>Flashcards — Print</title>
        <style>
          body { font-family: sans-serif; padding: 24px; max-width: 700px; margin: 0 auto; }
          h1 { font-size: 1.4rem; }
        </style>
      </head>
      <body>
        <h1>StudyMate AI — Flashcards</h1>
        ${rows}
        <script>window.onload = () => window.print();</script>
      </body>
    </html>`);
  win.document.close();
});

// ---------- Planner: multi-subject chips (Feature 8) ----------
let plannerSubjects = [];
const plannerSubjectInput = document.getElementById('plannerSubjectInput');
const plannerSubjectChips = document.getElementById('plannerSubjectChips');

function renderPlannerChips() {
  plannerSubjectChips.innerHTML = '';
  plannerSubjects.forEach((s, idx) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.innerHTML = `${s} <span style="margin-left:6px;opacity:0.7;">✕</span>`;
    chip.addEventListener('click', () => {
      plannerSubjects.splice(idx, 1);
      renderPlannerChips();
    });
    plannerSubjectChips.appendChild(chip);
  });
}

plannerSubjectInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = plannerSubjectInput.value.trim();
    if (val && !plannerSubjects.includes(val)) {
      plannerSubjects.push(val);
      renderPlannerChips();
    }
    plannerSubjectInput.value = '';
  }
});

// ---------- Voice input for Doubt solver (Feature 9) ----------
const doubtMicBtn = document.getElementById('doubtMicBtn');
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognitionAPI && doubtMicBtn) {
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let listening = false;

  doubtMicBtn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    recognition.start();
  });

  recognition.addEventListener('start', () => {
    listening = true;
    doubtMicBtn.classList.add('listening');
  });

  recognition.addEventListener('end', () => {
    listening = false;
    doubtMicBtn.classList.remove('listening');
  });

  recognition.addEventListener('result', (e) => {
    doubtInput.value = e.results[0][0].transcript;
  });

  recognition.addEventListener('error', () => {
    listening = false;
    doubtMicBtn.classList.remove('listening');
  });
} else if (doubtMicBtn) {
  doubtMicBtn.style.display = 'none';
}

// ---------- Progress tracker (Feature 11) ----------
const PROGRESS_KEY = 'sm_progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

async function trackProgress(type) {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activity_type: type })
      });
      await renderProgress();
      return;
    } catch (err) {
      // fall through to localStorage
    }
  }

  const data = loadProgress();
  data.counts = data.counts || {};
  data.counts[type] = (data.counts[type] || 0) + 1;

  const today = new Date().toISOString().split('T')[0];
  data.activeDays = data.activeDays || [];
  if (!data.activeDays.includes(today)) data.activeDays.push(today);

  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  renderProgress();
}

async function renderProgress() {
  const grid = document.getElementById('progressGrid');
  if (!grid) return;

  let counts = {};
  let activeDaysCount = 0;
  const token = getAuthToken();

  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        counts = data.counts || {};
        activeDaysCount = data.active_days || 0;
      }
    } catch (err) {
      // fall through to localStorage
    }
  }

  if (!token) {
    const data = loadProgress();
    counts = data.counts || {};
    activeDaysCount = (data.activeDays || []).length;
  }

  const items = [
    { label: 'Notes generated', key: 'notes' },
    { label: 'Quizzes taken', key: 'quiz' },
    { label: 'Flashcard sets', key: 'flashcards' },
    { label: 'Summaries made', key: 'summary' },
    { label: 'ELI10 explanations', key: 'eli10' },
    { label: 'Doubts asked', key: 'doubt' },
    { label: 'Plans built', key: 'planner' }
  ];

  grid.innerHTML = '';

  const streakCard = document.createElement('div');
  streakCard.className = 'progress-card';
  streakCard.innerHTML = `<p class="progress-num">${activeDaysCount}</p><p class="progress-label">Days active</p>`;
  grid.appendChild(streakCard);

  items.forEach(({ label, key }) => {
    const card = document.createElement('div');
    card.className = 'progress-card';
    card.innerHTML = `<p class="progress-num">${counts[key] || 0}</p><p class="progress-label">${label}</p>`;
    grid.appendChild(card);
  });
}

renderProgress();

// Render all history rows on page load
['notes', 'quiz', 'summary', 'eli10'].forEach(renderHistory);

// ---------- Auth ----------

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthSession(token, name) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_NAME_KEY, name);
  updateAuthUI();
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_NAME_KEY);
  updateAuthUI();
}

function updateAuthUI() {
  const token = getAuthToken();
  const name = localStorage.getItem(AUTH_NAME_KEY);
  const loginBtn = document.getElementById('loginOpenBtn');
  const userChip = document.getElementById('userChip');
  const userNameLabel = document.getElementById('userNameLabel');

  if (token && name) {
    loginBtn.style.display = 'none';
    userChip.style.display = 'flex';
    userNameLabel.textContent = `Hi, ${name}`;
  } else {
    loginBtn.style.display = 'inline-flex';
    userChip.style.display = 'none';
  }
}

// Modal open/close
// Modal open/close + compulsory auth gate
const authModal = document.getElementById('authModal');
const authCloseBtn = document.getElementById('authCloseBtn');
const notebookEl = document.querySelector('.notebook');

function checkAuthGate() {
  const token = getAuthToken();
  if (!token) {
    // Login nahi hua — app hide, modal force-show, close button hide
    if (notebookEl) notebookEl.style.display = 'none';
    authModal.style.display = 'flex';
    if (authCloseBtn) authCloseBtn.style.display = 'none';
  } else {
    // Login ho chuka — app dikhao, modal hatao
    if (notebookEl) notebookEl.style.display = 'flex';
    authModal.style.display = 'none';
  }
}

document.getElementById('loginOpenBtn').addEventListener('click', () => {
  authModal.style.display = 'flex';
});
// Note: close button aur outside-click-to-close jaanbujh kar hata diya hai —
// login/signup ab compulsory hai, isliye modal skip nahi ho sakta.
// Tab switching inside modal
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.authtab}Form`).classList.add('active');
  });
});

// Login submit
document.getElementById('loginSubmitBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');

    setAuthSession(data.token, data.name);
    authModal.style.display = 'none';
    checkAuthGate();
    renderProgress();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Signup submit
document.getElementById('signupSubmitBtn').addEventListener('click', async () => {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errorEl = document.getElementById('signupError');
  errorEl.textContent = '';

  try {
    const res = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Signup failed');

    setAuthSession(data.token, data.name);
    authModal.style.display = 'none';
    checkAuthGate();
    renderProgress();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearAuthSession();
  checkAuthGate();
  renderProgress();
});

updateAuthUI();
checkAuthGate();