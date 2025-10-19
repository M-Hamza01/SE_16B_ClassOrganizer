// Give cache a name
const CACHE_NAME = 'se16b-organizer-v1.0';

// List all the files your app needs to work offline
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/script.js',
  '/style.css',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/images/background.jpg' 
  // Add any other specific images or files you need
];

// 1. When the service worker is INSTALLED, save all
//    our app shell files to the cache.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
  );
});

// 2. When the app requests a file, handle it with our
//    "Network-First" strategy.
self.addEventListener('fetch', event => {
  event.respondWith(
    // Try to get the file from the network (newest version)
    fetch(event.request)
      .then(response => {
        // If we get it, save a copy to our cache
        // and then give the new file to the app.
        return caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
      })
      .catch(() => {
        // If the network fails (offline),
        // try to get the file from the cache (old version).
        return caches.match(event.request);
      })
  );
});

// 3. When a NEW service worker is ACTIVATED,
//    clean up all the old caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});