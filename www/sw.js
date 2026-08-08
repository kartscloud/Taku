/* taku service worker · versioned shell + runtime image cache
   RULE: bump VER and the ?v= asset query (also in index.html) together on every shell change. */
const VER="taku-v117";
const AV="117";
const SHELL=["./","./index.html","./manifest.webmanifest","./icons/icon.svg","./icons/maskable.svg",
"./css/app.css?v="+AV,
"./js/data.js?v="+AV,"./js/state.js?v="+AV,"./js/api.js?v="+AV,"./js/rec.js?v="+AV,
"./js/deck.js?v="+AV,"./js/lists.js?v="+AV,"./js/search.js?v="+AV,"./js/art.js?v="+AV,"./js/settings.js?v="+AV,"./js/compat.js?v="+AV,"./js/profile.js?v="+AV,"./js/detail.js?v="+AV,"./js/browse.js?v="+AV,"./js/demo.js?v="+AV,"./js/auth.js?v="+AV,"./auth-config.js?v="+AV,"./js/share.js?v="+AV,"./js/main.js?v="+AV];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER&&k!==VER+"-img").map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET")return;                       // GraphQL POSTs go straight to network

  // navigations: network-first so the newest HTML (which pins asset versions) always wins; cache is the offline fallback
  if(e.request.mode==="navigate"){
    e.respondWith(
      fetch(e.request).then(res=>{
        const copy=res.clone();caches.open(VER).then(c=>c.put("./index.html",copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match("./index.html"))
    );
    return;
  }
  if(u.origin===location.origin){                           // versioned assets: cache-first (immutable per version)
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
    return;
  }
  if(/anilistcdn|anilist\.co/.test(u.host)&&/\.(jpg|jpeg|png|webp)$/i.test(u.pathname)){ // posters
    if(e.request.mode==="cors"){e.respondWith(fetch(e.request));return;} // share-card canvas needs a real CORS response, not a cached opaque one
    e.respondWith(
      caches.open(VER+"-img").then(async c=>{
        const hit=await c.match(e.request);
        if(hit)return hit;
        const res=await fetch(e.request);
        if(res.ok)c.put(e.request,res.clone());
        return res;
      })
    );
  }
});
