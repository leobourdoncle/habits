/* ============================================================
   sw.js — Service Worker (permet l'usage hors-ligne)
   ------------------------------------------------------------
   Stratégie « réseau d'abord, cache en secours » :
     - en ligne  → on prend la version fraîche (et on la met en cache)
     - hors-ligne → on sert la dernière version mise en cache
   Pour forcer une mise à jour du cache, incrémente CACHE_VERSION.
   ============================================================ */

const CACHE_VERSION = 'habitudes-v1';

// Fichiers de base à mettre en cache dès l'installation.
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './storage.js',
  './stats.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Installation : on précharge l'app dans le cache.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activation : on supprime les anciens caches.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Requêtes : réseau d'abord, puis cache si pas de connexion.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
