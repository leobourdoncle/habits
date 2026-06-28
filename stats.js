/* ============================================================
   stats.js — Calculs statistiques
   ------------------------------------------------------------
   Fonctions pures qui transforment les enregistrements bruts
   en chiffres affichables. Aucune manipulation du DOM ici.

   Vocabulaire :
     - "jour suivi" : une date présente dans les enregistrements
       (= un jour où tu as ouvert l'app et coché/décoché au moins
       une fois). Les taux sont calculés sur les jours suivis,
       pas sur le calendrier complet, pour rester justes au début.
     - "jour parfait" : un jour où TOUTES les habitudes actuelles
       sont cochées.
   ============================================================ */

/* Renvoie les clés de dates des N derniers jours (aujourd'hui inclus). */
function lastNDayKeys(n) {
  const keys = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    keys.push(dateKey(d));
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

/* Taux de réussite (%) d'une habitude sur une fenêtre de N jours.
   On ne compte que parmi les jours réellement suivis dans la fenêtre. */
function habitRate(records, habitId, windowDays) {
  const keys = windowDays ? lastNDayKeys(windowDays) : Object.keys(records);
  let tracked = 0, done = 0;
  for (const key of keys) {
    const day = records[key];
    if (!day) continue;        // jour non suivi → ignoré
    tracked++;
    if (day[habitId]) done++;
  }
  if (tracked === 0) return null;            // pas de données → on affichera "—"
  return Math.round((done / tracked) * 100);
}

/* Nombre total de jours où l'habitude a été réussie. */
function habitTotalDone(records, habitId) {
  return Object.values(records).filter(day => day && day[habitId]).length;
}

/* Série en cours (jours consécutifs réussis) pour une habitude.
   La série n'est PAS cassée tant que la journée d'aujourd'hui n'est
   pas terminée : si aujourd'hui n'est pas encore coché, on démarre
   le décompte à hier. */
function habitStreak(records, habitId) {
  const d = new Date();
  // Si aujourd'hui n'est pas (encore) fait, on commence à hier.
  if (!(records[dateKey(d)] && records[dateKey(d)][habitId])) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const day = records[dateKey(d)];
    if (!day || !day[habitId]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* ── Statistiques globales ──────────────────────────────── */

// Un jour est "parfait" si toutes les habitudes fournies y sont cochées.
function isPerfectDay(day, habits) {
  if (!day || habits.length === 0) return false;
  return habits.every(h => day[h.id]);
}

// Série de jours parfaits en cours (même logique que habitStreak).
function perfectStreak(records, habits) {
  const d = new Date();
  if (!isPerfectDay(records[dateKey(d)], habits)) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (isPerfectDay(records[dateKey(d)], habits)) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Calcule l'ensemble des chiffres globaux affichés sur la page Stats.
function globalStats(records, habits) {
  const dayKeys = Object.keys(records);
  const trackedDays = dayKeys.length;

  let perfectDays = 0;
  let totalChecks = 0;
  for (const key of dayKeys) {
    const day = records[key];
    if (isPerfectDay(day, habits)) perfectDays++;
    for (const h of habits) if (day[h.id]) totalChecks++;
  }

  // Pourcentage global : cases cochées / cases possibles (sur les jours suivis).
  const possible = trackedDays * habits.length;
  const globalPct = possible ? Math.round((totalChecks / possible) * 100) : null;

  return {
    trackedDays,
    perfectDays,
    globalPct,
    currentStreak: perfectStreak(records, habits),
  };
}
