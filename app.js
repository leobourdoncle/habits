/* ============================================================
   app.js — Logique de l'application et rendu de l'interface
   ------------------------------------------------------------
   Orchestre les 3 onglets (Aujourd'hui / Stats / Réglages),
   gère les interactions et s'appuie sur :
     - config.js   (habitudes par défaut)
     - storage.js  (lecture/écriture)
     - stats.js    (calculs)
   ============================================================ */

/* ── État en mémoire ────────────────────────────────────── */
let habits  = loadHabits();   // configuration courante des habitudes
let records = loadRecords();  // tout l'historique
const TODAY = dateKey();      // clé du jour (recalculée au besoin)

/* Constantes d'affichage des dates en français */
const DAYS   = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const DAYS_S = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet',
                'août','septembre','octobre','novembre','décembre'];

/* Petit raccourci */
const $ = (sel) => document.querySelector(sel);

/* ============================================================
   INITIALISATION
   ============================================================ */
function init() {
  applyTheme(loadTheme());
  renderHeaderDate();
  bindTabs();
  bindSettingsActions();
  renderToday();
}

/* ── Date de l'en-tête ──────────────────────────────────── */
function renderHeaderDate() {
  const now = new Date();
  $('#date-big').textContent = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  $('#day-name').textContent = DAYS[now.getDay()];
}

/* ============================================================
   NAVIGATION ENTRE ONGLETS
   ============================================================ */
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  // Affichage des panneaux
  $('#panel-today').style.display    = tab === 'today'    ? '' : 'none';
  $('#panel-stats').style.display    = tab === 'stats'    ? '' : 'none';
  $('#panel-settings').style.display = tab === 'settings' ? '' : 'none';

  // Onglet actif
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));

  // Rendu paresseux des onglets
  if (tab === 'stats')    renderStats();
  if (tab === 'settings') renderSettings();
}

/* ============================================================
   ONGLET « AUJOURD'HUI »
   ============================================================ */

// Renvoie (en le créant si besoin) l'objet du jour courant.
function todayRecord() {
  if (!records[TODAY]) records[TODAY] = {};
  return records[TODAY];
}

function renderToday() {
  const day = records[TODAY] || {};
  $('#habits-list').innerHTML = habits.map(h => `
    <div class="habit-row ${day[h.id] ? 'checked' : ''}" data-id="${h.id}">
      <div class="habit-box">
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
          <polyline points="2,6.5 5,9.5 11,3" stroke="var(--bg)"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="habit-emoji">${h.emoji}</span>
      <span class="habit-text">${escapeHtml(h.label)}</span>
    </div>`).join('');

  // Un seul écouteur par ligne (re-créées à chaque rendu)
  $('#habits-list').querySelectorAll('.habit-row').forEach(row => {
    row.addEventListener('click', () => toggleHabit(row.dataset.id, row));
  });

  refreshSummary();
}

function toggleHabit(id, row) {
  const day = todayRecord();
  day[id] = !day[id];
  saveRecords(records);                 // sauvegarde automatique immédiate

  const checked = day[id];
  row.classList.toggle('checked', checked);
  if (checked) {
    row.classList.add('just-checked');
    setTimeout(() => row.classList.remove('just-checked'), 350);
  }
  if (navigator.vibrate) navigator.vibrate(20);

  refreshSummary();
}

function refreshSummary() {
  const day   = records[TODAY] || {};
  const total = habits.length;
  const done  = habits.filter(h => day[h.id]).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const pctEl = $('#summary-pct');
  pctEl.textContent = pct + '%';
  pctEl.className = 'summary-pct ' +
    (pct === 0 ? 'pct-zero' : pct < 40 ? 'pct-low' : pct < 80 ? 'pct-mid' : 'pct-high');

  $('#summary-fill').style.width = pct + '%';
  $('#summary-count').textContent = `${done} / ${total}`;

  // Badge motivant + message de félicitations
  const badge   = $('#streak-badge');
  const perfect = $('#perfect-msg');
  const wasComplete = perfect.classList.contains('show');
  const isComplete  = total > 0 && done === total;

  perfect.classList.toggle('show', isComplete);
  if (isComplete)        badge.textContent = '🏆 Journée parfaite !';
  else if (pct >= 70)    badge.textContent = '🔥 En feu ! Continue !';
  else if (pct >= 40)    badge.textContent = '💪 Bonne dynamique !';
  else                   badge.textContent = '⚡ La journée commence !';

  // Célébration uniquement au moment où on complète la dernière case
  if (isComplete && !wasComplete) {
    launchConfetti();
    if (navigator.vibrate) navigator.vibrate([100, 60, 100]);
  }
}

/* ============================================================
   ONGLET « STATISTIQUES »
   ============================================================ */
function renderStats() {
  records = loadRecords();
  const g = globalStats(records, habits);

  $('#s-streak').textContent  = g.currentStreak + ' j';
  $('#s-perfect').textContent = g.perfectDays;
  $('#s-days').textContent    = g.trackedDays;
  $('#s-global').textContent  = g.globalPct === null ? '—' : g.globalPct + '%';

  renderWeekDots();
  renderHabitStats();
}

function renderWeekDots() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = records[dateKey(d)];
    const total = habits.length || 1;
    const done = day ? habits.filter(h => day[h.id]).length : 0;
    const pct  = day ? Math.round((done / total) * 100) : -1;

    let bg, fg, label;
    if      (pct < 0)   { bg = 'var(--surf2)';          fg = 'var(--border)'; label = '·'; }
    else if (pct >= 80) { bg = 'rgba(52,211,153,.22)';  fg = 'var(--green)';  label = pct + '%'; }
    else if (pct >= 50) { bg = 'rgba(34,211,238,.18)';  fg = 'var(--cyan)';   label = pct + '%'; }
    else if (pct >= 20) { bg = 'rgba(251,191,36,.18)';  fg = 'var(--amber)';  label = pct + '%'; }
    else                { bg = 'rgba(244,114,182,.15)'; fg = 'var(--pink)';   label = pct + '%'; }

    const isToday  = i === 0;
    const outline  = isToday ? `outline:2px solid ${fg};outline-offset:2px;` : '';
    const lblStyle = isToday ? 'color:var(--text);font-weight:700;' : '';
    html += `<div class="week-day">
      <div class="week-dot" style="background:${bg};color:${fg};${outline}">${label}</div>
      <div class="week-dot-lbl" style="${lblStyle}">${DAYS_S[d.getDay()]}</div>
    </div>`;
  }
  $('#week-dots').innerHTML = html;
}

function renderHabitStats() {
  if (Object.keys(records).length === 0 || habits.length === 0) {
    $('#habit-stats').innerHTML =
      `<div class="no-data"><span class="no-data-icon">📊</span>
       Commence à cocher tes habitudes<br>pour voir tes stats apparaître ici !</div>`;
    return;
  }

  const fmt = (v) => v === null ? '—' : v + '%';
  $('#habit-stats').innerHTML = habits.map(h => {
    const streak = habitStreak(records, h.id);
    return `
    <div class="hstat-row">
      <div class="hstat-top">
        <div class="hstat-left">
          <span class="hstat-emoji">${h.emoji}</span>
          <span class="hstat-name">${escapeHtml(h.label)}</span>
        </div>
        <span class="hstat-streak">🔥 ${streak} j</span>
      </div>
      <div class="rate-grid">
        <div class="rate-cell"><div class="rate-val">${fmt(habitRate(records, h.id, 7))}</div><div class="rate-lbl">7 j</div></div>
        <div class="rate-cell"><div class="rate-val">${fmt(habitRate(records, h.id, 30))}</div><div class="rate-lbl">30 j</div></div>
        <div class="rate-cell"><div class="rate-val">${fmt(habitRate(records, h.id, 365))}</div><div class="rate-lbl">1 an</div></div>
        <div class="rate-cell"><div class="rate-val">${fmt(habitRate(records, h.id, 0))}</div><div class="rate-lbl">Total</div></div>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   ONGLET « PARAMÈTRES »
   ============================================================ */

function bindSettingsActions() {
  // Interrupteur de thème
  $('#theme-switch').addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    applyTheme(theme);
    saveTheme(theme);
  });

  // Ajouter une habitude
  $('#btn-add').addEventListener('click', addHabit);

  // Export / Import
  $('#btn-export').addEventListener('click', doExport);
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', doImport);
}

function renderSettings() {
  $('#theme-switch').checked = loadTheme() === 'dark';

  $('#settings-list').innerHTML = habits.map((h, i) => `
    <div class="setting-row" data-index="${i}">
      <input class="emoji-input" type="text" value="${escapeAttr(h.emoji)}" maxlength="4" data-field="emoji" />
      <input class="name-input"  type="text" value="${escapeAttr(h.label)}" data-field="label" placeholder="Nom de l'habitude" />
      <button class="icon-btn" data-act="up"     ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="icon-btn" data-act="down"   ${i === habits.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="icon-btn danger" data-act="delete">✕</button>
    </div>`).join('');

  // Édition du texte / emoji → mise à jour immédiate
  $('#settings-list').querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const i = +e.target.closest('.setting-row').dataset.index;
      habits[i][e.target.dataset.field] = e.target.value;
      saveHabits(habits);
    });
  });

  // Boutons monter / descendre / supprimer
  $('#settings-list').querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = +e.target.closest('.setting-row').dataset.index;
      const act = e.target.dataset.act;
      if (act === 'up')     moveHabit(i, -1);
      if (act === 'down')   moveHabit(i, +1);
      if (act === 'delete') deleteHabit(i);
    });
  });
}

// Génère un id unique à partir du nom (ou un id aléatoire de secours).
function makeId(label) {
  let base = label.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // retire les accents
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!base) base = 'habitude';
  let id = base, n = 1;
  while (habits.some(h => h.id === id)) id = `${base}-${++n}`;
  return id;
}

function addHabit() {
  habits.push({ id: makeId('habitude-' + Date.now()), emoji: '✨', label: 'Nouvelle habitude' });
  saveHabits(habits);
  renderSettings();
  showToast('➕ Habitude ajoutée');
}

function moveHabit(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= habits.length) return;
  [habits[i], habits[j]] = [habits[j], habits[i]];
  saveHabits(habits);
  renderSettings();
}

function deleteHabit(i) {
  // Suppression directe (les données historiques de l'habitude restent
  // stockées mais ne sont plus affichées — rien n'est détruit).
  habits.splice(i, 1);
  saveHabits(habits);
  renderSettings();
  showToast('🗑 Habitude supprimée');
}

/* ── Export / Import JSON ───────────────────────────────── */
function doExport() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `habitudes-${dateKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('⬇️ Sauvegarde exportée');
}

function doImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importData(reader.result);
      habits  = loadHabits();
      records = loadRecords();
      renderToday();
      renderSettings();
      showToast('✅ Données importées');
    } catch (err) {
      showToast('❌ Fichier invalide');
    }
  };
  reader.readAsText(file);
  e.target.value = '';  // permet de réimporter le même fichier plus tard
}

/* ============================================================
   THÈME
   ============================================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#080810' : '#f4f5fb');
}

/* ============================================================
   PETITS UTILITAIRES (toast, confettis, échappement HTML)
   ============================================================ */
let toastTimer;
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// Petite pluie de confettis lors d'une journée parfaite.
function launchConfetti() {
  const colors = ['#8b5cf6', '#34d399', '#22d3ee', '#f472b6', '#fbbf24'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
    c.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}

// Échappement pour éviter tout souci d'affichage avec les libellés saisis.
function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

/* ── Sécurités de persistance ───────────────────────────── */
// Sauvegarde de secours quand l'app passe en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveRecords(records);
});

/* C'est parti ! */
init();
