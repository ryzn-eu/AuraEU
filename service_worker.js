// service_worker.js

// 1. Versione della Cache - Aggiornata per forzare il refresh sul nuovo dominio
const CACHE_VERSION = 'aura-cache-v1.1'; 
const CACHE_NAME = CACHE_VERSION;

// Lista dei file essenziali per l'interfaccia (App Shell)
const URLS_TO_CACHE = [
    '/',                // Radice del sito
    '/index.html',      // File principale
    '/manifest.json',   // Manifest
    '/service_worker.js', // Questo file stesso
    // DIPENDENZE ESTERNE ESSENZIALI (CDN)
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// =================================================================
// 2. Evento 'install': Installazione e Caching Iniziale
// =================================================================
self.addEventListener('install', (event) => {
    console.log('SW: Installazione...', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Caching file essenziali');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('SW: Errore nel caching:', error);
            })
    );
});

// =================================================================
// 3. Evento 'activate': Pulizia vecchie cache
// =================================================================
self.addEventListener('activate', (event) => {
    console.log('SW: Attivazione e pulizia...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Rimozione vecchia cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// =================================================================
// 4. Evento 'fetch': Strategia di Recupero Dati
// =================================================================
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // A. Ignora richieste verso domini video/esterni pesanti
    if (
        url.includes('youtube.com') ||
        url.includes('ytimg.com') ||
        url.includes('googlevideo.com')
    ) {
        return; // Lascia al browser
    }

    // B. Network-Only: Per file che devono essere sempre aggiornati (JSON dati) o streaming
    if (
        url.includes('tracks.json') || 
        url.includes('artist.json') || 
        url.includes('User_videos.json') || 
        event.request.destination === 'video' ||
        event.request.destination === 'audio'
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    // C. Cache-First: Per tutto il resto (CSS, JS, Immagini statiche, App Shell)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 1. Se è in cache, usalo
                if (response) {
                    return response;
                }
                
                // 2. Altrimenti scaricalo dalla rete
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Controlla validità risposta
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Metti in cache per la prossima volta
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        return networkResponse;
                    }
                ).catch(() => {
                    // Opzionale: qui potresti restituire una pagina offline di fallback
                    // return caches.match('/offline.html');
                });
            })
    );
});
