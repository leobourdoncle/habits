/* ============================================================
   storage.js — Persistance des données (localStorage)
   ------------------------------------------------------------
   Tout ce qui touche à la lecture/écriture des données passe
   par ici. Le reste de l'app ne manipule jamais localStorage
   directement.

   Deux choses sont stockées :
     1. La configuration des habitudes (modifiable dans Réglages)
     2. Les enregistrements quotidiens, au format :
          { "2026-06-28": { "business": true, "sport": true }, ... }
        → on stocke par ID d'habitude, jamais par position,
          pour que l'historique survive aux ajouts/suppressions.
   ============================================================ */

const STORAGE_KEYS = {
  habits:  'habits.config.v1',
  records: 'habits.records.v1',
  theme:   'habits.theme.v1',
};

/* ── Habitudes (configuration) ──────────────────────────── */

// Charge la liste des habitudes. Si rien n'est encore enregistré
// (première utilisation), on part de la config par défaut.
function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.habits);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (e) { /* données corrompues → on retombe sur les défauts */ }
  return DEFAULT_HABITS.map(h => ({ ...h }));
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
}

/* ── Enregistrements quotidiens ─────────────────────────── */

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.records)) || {};
  } catch (e) {
    return {};
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

/* ── Thème (sombre / clair) ─────────────────────────────── */

function loadTheme()  { return localStorage.getItem(STORAGE_KEYS.theme) || 'dark'; }
function saveTheme(t) { localStorage.setItem(STORAGE_KEYS.theme, t); }

/* ── Utilitaire : clé de date locale "YYYY-MM-DD" ───────── */

function dateKey(d = new Date()) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ── Export / Import (sauvegarde JSON) ──────────────────── */

// Renvoie une chaîne JSON contenant TOUTES les données.
function exportData() {
  return JSON.stringify({
    version:    1,
    exportedAt: new Date().toISOString(),
    habits:     loadHabits(),
    records:    loadRecords(),
  }, null, 2);
}

// Restaure les données depuis une chaîne JSON. Lève une erreur
// si le contenu n'est pas valide (gérée par l'appelant).
function importData(json) {
  const data = JSON.parse(json);
  if (Array.isArray(data.habits))           saveHabits(data.habits);
  if (data.records && typeof data.records === 'object') saveRecords(data.records);
}
