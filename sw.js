// お出かけクエスト用サービスワーカー(オフラインキャッシュ)
//
// ファイルの中身を更新した時は、必ずこのCACHE_NAMEの数字を1つ上げてください。
// (index.html・style.css・app.jsのどれか1つでも変えたら、ここも変更が必要です)
const CACHE_NAME = "okake-quest-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js?v=9",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // キャッシュがあれば即表示(速い・オフラインでも動く)、裏側で最新版も取りに行く
      return cached || networkFetch;
    })
  );
});
