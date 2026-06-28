/* ============================================================
   config.js — Configuration des habitudes
   ------------------------------------------------------------
   👉 C'est LE fichier à modifier pour changer tes habitudes
      sans toucher au reste du code.
      (Tu peux aussi tout faire depuis l'onglet « Paramètres ».)

   Chaque habitude possède :
     - id    : identifiant UNIQUE et STABLE (ne JAMAIS le changer,
               sinon l'historique de l'habitude est perdu)
     - emoji : petit pictogramme affiché à gauche
     - label : texte affiché

   Pour ajouter une habitude : ajoute une ligne au tableau.
   Pour en supprimer une      : retire sa ligne.
   Pour changer l'ordre       : déplace les lignes.
   ============================================================ */

const DEFAULT_HABITS = [
  // ── Focus business ──────────────────────────────
  { id: 'prod-business',   emoji: '🏗️', label: 'Avancée production (business)' },
  { id: 'vision-business', emoji: '🎯', label: 'Avancée vision / objectifs' },
  { id: 'video',           emoji: '🎬', label: 'Vidéo du jour' },
  { id: 'planning',        emoji: '📋', label: 'Planifier le lendemain' },
  // ── Focus aborder les filles ────────────────────
  { id: 'approach',        emoji: '💬', label: 'Aborder une ou plusieurs filles' },
  // ── Sport & bonnes habitudes ────────────────────
  { id: 'sport',           emoji: '💪', label: 'Sport ou course' },
  { id: 'no-sugar',        emoji: '🍩', label: 'Pas de mauvais sucre / plaisir court terme' },
  { id: 'no-fap',          emoji: '🚫', label: 'NoFap' },
  { id: 'god',             emoji: '🙏', label: 'Penser à Dieu' },
  { id: 'tidy',            emoji: '🧹', label: 'Rangement (10 min min.)' },
];
