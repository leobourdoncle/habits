# Mes habitudes ⚡

Application web ultra-simple de suivi d'habitudes, pensée pour le téléphone.
Chaque soir, on coche en moins d'une minute les habitudes réalisées dans la journée.

## Utilisation

Ouvrir `index.html` (ou l'URL GitHub Pages) dans le navigateur. Tout est
enregistré **localement dans le navigateur** (localStorage) — aucune connexion,
aucun compte, aucune donnée envoyée ailleurs.

- **Aujourd'hui** : coche les habitudes du jour (sauvegarde automatique).
- **Stats** : taux de réussite 7j / 30j / 1 an / total, séries, jours parfaits.
- **Réglages** : ajouter / renommer / réordonner / supprimer des habitudes,
  mode sombre ou clair, export / import des données en JSON.

## Modifier la liste des habitudes

Deux possibilités :

1. **Le plus simple** : depuis l'onglet **Réglages** dans l'app.
2. **Dans le code** : éditer le tableau `DEFAULT_HABITS` dans `config.js`
   (utilisé uniquement à la première ouverture, tant que rien n'a été
   personnalisé dans les Réglages).

## Structure du projet

| Fichier       | Rôle                                                        |
|---------------|-------------------------------------------------------------|
| `index.html`  | Structure de la page (3 onglets)                            |
| `style.css`   | Mise en forme + thèmes sombre/clair + animations           |
| `config.js`   | Liste des habitudes par défaut                              |
| `storage.js`  | Lecture/écriture localStorage, export/import               |
| `stats.js`    | Calculs statistiques (fonctions pures)                      |
| `app.js`      | Logique de l'interface et interactions                      |

Scripts chargés dans l'ordre : `config → storage → stats → app`
(scripts classiques, donc fonctionne aussi bien en local qu'en ligne).

## Déploiement (GitHub Pages)

Pousser le contenu de ce dossier à la racine du dépôt, puis activer
GitHub Pages sur la branche principale. L'app est 100 % statique.
