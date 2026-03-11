// ============================================================
//  OP245-G Service Worker v6.0
//  Melhorias:
//  [1] Versionamento explícito — atualiza cache automaticamente
//  [2] Estratégia Network-First para HTML (sempre busca nova versão)
//  [3] Cache-First para assets estáticos (fonts, ícones)
//  [4] Limpeza de caches antigos no activate
// ============================================================

const CACHE_VERSION = 'op245-c-v9.9';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const ALL_CACHES    = [STATIC_CACHE, DYNAMIC_CACHE];

// Assets que vivem no cache estático (raramente mudam)
const STATIC_ASSETS = [
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

// ── Instalação ──────────────────────────────────────────────
self.addEventListener('install', event => {
    console.log(`[SW] Instalando ${CACHE_VERSION}`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.includes('icon')))) // ícones podem não existir
            .catch(err => console.warn('[SW] Falha no cache estático:', err))
    );
    // Força ativação imediata (não espera fechar aba)
    self.skipWaiting();
});

// ── Ativação — limpa caches antigos ────────────────────────
self.addEventListener('activate', event => {
    console.log(`[SW] Ativando ${CACHE_VERSION} — limpando versões antigas`);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => !ALL_CACHES.includes(name)) // não é da versão atual
                    .map(name => {
                        console.log(`[SW] Removendo cache obsoleto: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // assume controle de todas as abas
    );
});

// ── Fetch — estratégia por tipo de recurso ──────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requisições de APIs externas (TwelveData, Google Fonts)
    if (!url.origin.includes(self.location.origin)) {
        return; // deixa o browser tratar normalmente
    }

    // index.html → Network-First (garante versão mais recente)
    if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Assets estáticos → Cache-First
    event.respondWith(cacheFirst(request));
});

// ── Estratégia: Network-First ───────────────────────────────
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        // Offline: retorna do cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback mínimo
        return new Response('<h1 style="font-family:monospace;color:#ff3355;background:#020608;padding:40px;">OP245-G — Offline. Reconecte para continuar.</h1>', {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// ── Estratégia: Cache-First ─────────────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        return new Response('Recurso não disponível offline.', { status: 503 });
    }
}
