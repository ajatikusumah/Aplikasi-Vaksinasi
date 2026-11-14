const CACHE_NAME="isikhnas-vaksinasi-v11";
const BASE_URL=new URL("./",self.location.href);
const BASE_PATH=BASE_URL.pathname;
const APP_SHELL=["./","index.html","install.html","styles.css","login.css","app.js","login.js","backend.js","coverage-map.js","supabase-config.js","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png"].map(path=>new URL(path,BASE_URL).pathname);
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin===self.location.origin){
   event.respondWith((async()=>{
     const cached=await caches.match(request);
     if(url.pathname.startsWith(BASE_PATH+"data/boundaries/")){
       try{const fresh=await fetch(request);if(fresh.ok)await caches.open(CACHE_NAME).then(cache=>cache.put(request,fresh.clone()));return fresh}catch(error){return cached||new Response("Boundary data unavailable",{status:503})}
     }
     if(url.pathname===BASE_PATH+"api/config"){
       try{const fresh=await fetch(request);if(fresh.ok){const copy=fresh.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return fresh}catch(error){return cached||new Response("{}",{headers:{"Content-Type":"application/json"}})}
     }
     if(cached){fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response))}).catch(()=>{});return cached}
     try{return await fetch(request)}catch(error){if(request.mode==="navigate")return caches.match(new URL("install.html",BASE_URL).pathname);return new Response("Offline",{status:503,statusText:"Offline"})}
   })());
 }else if(url.hostname.endsWith("esm.sh")){
   event.respondWith((async()=>{const cached=await caches.match(request);try{const response=await fetch(request);if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}catch(error){return cached||new Response("Offline dependency unavailable",{status:503})}})());
 }
});
