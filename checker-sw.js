const CACHE='checker-v1-final';
const CORE=['./','./index.html','./checker-manifest.webmanifest','./checker_logo.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(e.request.method==='GET'&&r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
