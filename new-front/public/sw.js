self.addEventListener('fetch', function(event) {
  // Cache strategy for static assets
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open('images-v1').then(function(cache) {
        return cache.match(event.request).then(function(response) {
          return response || fetch(event.request).then(function(response) {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});